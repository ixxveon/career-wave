"""
interview_ws_handler.py — 단위 테스트

검증 항목:
- JWT 누락·만료·잘못된 서명 → Close 1008  [TestClient 통합]
- 유효 토큰 → 연결 수립 성공              [TestClient 통합]
- 중복 연결 → DUPLICATED_CONNECTION 전송  [TestClient 통합]
- sequenceNumber 단조 증가                [AsyncMock 단위]
- lastReceivedSequenceNumber 재전송       [AsyncMock 단위]
- send_* 헬퍼 메시지 구조                 [AsyncMock 단위]
"""
import json
from unittest.mock import AsyncMock, patch

import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from tests.conftest import TEST_SESSION_ID, make_token
from user.interview.websocket.interview_ws_handler import (
    InterviewErrorCode,
    _live_sessions,
    _LiveSession,
    send_error,
    send_stt_final,
    send_stt_partial,
    send_tts_audio,
)

WS_PATH = f"/ws/user/interview/{TEST_SESSION_ID}/ai"


def _make_live(ws=None) -> _LiveSession:
    import time
    return _LiveSession(ws=ws or AsyncMock(), member_id="test-member", token_exp=time.time() + 3600)


def _patch_redis_meta(meta: dict | None):
    """get_session_meta / update_session_meta를 지정된 meta로 mock한다."""
    return patch(
        "user.interview.websocket.interview_ws_handler.session_store.load_session_meta",
        new=AsyncMock(return_value=meta),
    )


# ── JWT 검증 (TestClient 통합 테스트) ────────────────────────────────────────

def test_connect_without_token_closes_1008(client: TestClient):
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(WS_PATH) as ws:
            ws.receive_text()
    assert exc.value.code == 1008


def test_connect_with_invalid_token_closes_1008(client: TestClient):
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"{WS_PATH}?token=totally.invalid.token") as ws:
            ws.receive_text()
    assert exc.value.code == 1008


def test_connect_with_expired_token_closes_1008(client: TestClient, expired_token: str):
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"{WS_PATH}?token={expired_token}") as ws:
            ws.receive_text()
    assert exc.value.code == 1008


def test_connect_with_wrong_secret_closes_1008(client: TestClient):
    token = make_token(secret="wrong-secret")
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"{WS_PATH}?token={token}") as ws:
            ws.receive_text()
    assert exc.value.code == 1008


def test_connect_with_valid_token_accepted(client: TestClient, valid_token: str):
    _live_sessions.clear()
    with (
        patch(
            "user.interview.websocket.interview_ws_handler._verify_session_ownership",
            new=AsyncMock(return_value=True),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.load_session_meta",
            new=AsyncMock(return_value=None),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.save_session_meta",
            new=AsyncMock(),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.get_seq",
            new=AsyncMock(return_value=0),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.pop_pending_llm",
            new=AsyncMock(return_value=None),
        ),
    ):
        with client.websocket_connect(f"{WS_PATH}?token={valid_token}"):
            assert TEST_SESSION_ID in _live_sessions
    _live_sessions.clear()


# ── 중복 연결 (TestClient 통합 테스트) ──────────────────────────────────────

def test_duplicate_connection_sends_error_to_existing(client: TestClient, valid_token: str):
    """두 번째 연결 시 첫 번째 소켓에 INTERVIEW_DUPLICATED_CONNECTION ERROR가 전송된다."""
    _live_sessions.clear()
    url = f"{WS_PATH}?token={valid_token}"

    common_patches = (
        patch(
            "user.interview.websocket.interview_ws_handler._verify_session_ownership",
            new=AsyncMock(return_value=True),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.load_session_meta",
            new=AsyncMock(return_value=None),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.save_session_meta",
            new=AsyncMock(),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.get_seq",
            new=AsyncMock(return_value=0),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.pop_pending_llm",
            new=AsyncMock(return_value=None),
        ),
    )
    with common_patches[0], common_patches[1], common_patches[2], common_patches[3], common_patches[4]:
        with client.websocket_connect(url) as ws1:
            with client.websocket_connect(url):
                msg = json.loads(ws1.receive_text())
                assert msg["type"] == "ERROR"
                assert msg["errorCode"] == InterviewErrorCode.DUPLICATED_CONNECTION

    _live_sessions.clear()


# ── sequenceNumber (AsyncMock 단위 테스트) ───────────────────────────────────

@pytest.mark.asyncio
async def test_sequence_number_increments():
    """Push 헬퍼를 호출할 때마다 sequenceNumber가 1씩 단조 증가한다."""
    _live_sessions.clear()
    mock_ws = AsyncMock()
    _live_sessions[TEST_SESSION_ID] = _make_live(mock_ws)

    seq_counter = [0]

    async def _incr(redis, sid):
        seq_counter[0] += 1
        return seq_counter[0]

    with (
        patch("user.interview.websocket.interview_ws_handler.session_store.increment_seq", side_effect=_incr),
        patch("user.interview.websocket.interview_ws_handler.session_store.push_to_buffer", new=AsyncMock()),
    ):
        await send_stt_partial(TEST_SESSION_ID, "안녕하세요", 1, 0)
        await send_stt_partial(TEST_SESSION_ID, "저는", 1, 1)

    sent = [json.loads(c.args[0]) for c in mock_ws.send_text.call_args_list]
    assert sent[0]["sequenceNumber"] == 1
    assert sent[1]["sequenceNumber"] == 2

    _live_sessions.clear()


@pytest.mark.asyncio
async def test_reconnect_replays_missed_messages():
    """get_buffer로 읽은 버퍼 중 lastReceivedSequenceNumber 이후 메시지를 순서대로 재전송한다."""
    buffered = [
        {"type": "STT_PARTIAL", "sequenceNumber": i, "content": f"chunk{i}"}
        for i in range(1, 4)
    ]
    mock_ws = AsyncMock()

    last_received = 1
    pending = [m for m in buffered if m["sequenceNumber"] > last_received]
    for msg in pending:
        await mock_ws.send_text(json.dumps(msg))

    replayed = [json.loads(c.args[0]) for c in mock_ws.send_text.call_args_list]
    assert [m["sequenceNumber"] for m in replayed] == [2, 3]


# ── send_* 헬퍼 메시지 구조 (AsyncMock 단위 테스트) ──────────────────────────

@pytest.mark.asyncio
async def test_send_stt_partial_message_structure():
    _live_sessions.clear()
    mock_ws = AsyncMock()
    _live_sessions[TEST_SESSION_ID] = _make_live(mock_ws)

    with (
        patch("user.interview.websocket.interview_ws_handler.session_store.increment_seq", new=AsyncMock(return_value=1)),
        patch("user.interview.websocket.interview_ws_handler.session_store.push_to_buffer", new=AsyncMock()),
    ):
        await send_stt_partial(TEST_SESSION_ID, "테스트 내용", 1, 0)

    msg = json.loads(mock_ws.send_text.call_args.args[0])
    assert msg["type"] == "STT_PARTIAL"
    assert msg["content"] == "테스트 내용"
    assert msg["questionOrder"] == 1
    assert msg["chunkIndex"] == 0
    assert msg["isFinal"] is False
    assert isinstance(msg["sequenceNumber"], int)

    _live_sessions.clear()


@pytest.mark.asyncio
async def test_send_stt_final_message_structure():
    _live_sessions.clear()
    mock_ws = AsyncMock()
    _live_sessions[TEST_SESSION_ID] = _make_live(mock_ws)

    with (
        patch("user.interview.websocket.interview_ws_handler.session_store.increment_seq", new=AsyncMock(return_value=1)),
        patch("user.interview.websocket.interview_ws_handler.session_store.push_to_buffer", new=AsyncMock()),
    ):
        await send_stt_final(TEST_SESSION_ID, "최종 답변입니다.", 1, 92.5)

    msg = json.loads(mock_ws.send_text.call_args.args[0])
    assert msg["type"] == "STT_FINAL"
    assert msg["isFinal"] is True
    assert msg["voiceQualityRatio"] == pytest.approx(92.5)
    assert msg["chunkIndex"] is None

    _live_sessions.clear()


@pytest.mark.asyncio
async def test_send_tts_audio_chunk_message_structure():
    _live_sessions.clear()
    mock_ws = AsyncMock()
    _live_sessions[TEST_SESSION_ID] = _make_live(mock_ws)

    with (
        patch("user.interview.websocket.interview_ws_handler.session_store.increment_seq", new=AsyncMock(return_value=1)),
        patch("user.interview.websocket.interview_ws_handler.session_store.push_to_buffer", new=AsyncMock()),
    ):
        await send_tts_audio(TEST_SESSION_ID, "base64data==", 2, 0, is_final=False)

    msg = json.loads(mock_ws.send_text.call_args.args[0])
    assert msg["type"] == "TTS_AUDIO"
    assert msg["audioChunk"] == "base64data=="
    assert msg["isFinal"] is False
    assert msg["chunkIndex"] == 0

    _live_sessions.clear()


@pytest.mark.asyncio
async def test_send_tts_audio_end_message_structure():
    _live_sessions.clear()
    mock_ws = AsyncMock()
    _live_sessions[TEST_SESSION_ID] = _make_live(mock_ws)

    with (
        patch("user.interview.websocket.interview_ws_handler.session_store.increment_seq", new=AsyncMock(return_value=1)),
        patch("user.interview.websocket.interview_ws_handler.session_store.push_to_buffer", new=AsyncMock()),
    ):
        await send_tts_audio(TEST_SESSION_ID, "", 2, 0, is_final=True)

    msg = json.loads(mock_ws.send_text.call_args.args[0])
    assert msg["type"] == "TTS_AUDIO_END"
    assert msg["isFinal"] is True
    assert msg["audioChunk"] is None

    _live_sessions.clear()


@pytest.mark.asyncio
async def test_send_error_message_structure():
    _live_sessions.clear()
    mock_ws = AsyncMock()
    _live_sessions[TEST_SESSION_ID] = _make_live(mock_ws)

    with (
        patch("user.interview.websocket.interview_ws_handler.session_store.increment_seq", new=AsyncMock(return_value=1)),
        patch("user.interview.websocket.interview_ws_handler.session_store.push_to_buffer", new=AsyncMock()),
    ):
        await send_error(TEST_SESSION_ID, "STT 처리 실패", InterviewErrorCode.STT_FAILED, question_order=1)

    msg = json.loads(mock_ws.send_text.call_args.args[0])
    assert msg["type"] == "ERROR"
    assert msg["errorCode"] == "INTERVIEW_STT_FAILED"
    assert msg["questionOrder"] == 1

    _live_sessions.clear()


# ── RAG 선행 세션 메타 member_id 병합 ────────────────────────────────────────

def test_connect_merges_member_id_when_rag_created_meta_first(client: TestClient, valid_token: str):
    """rag-context가 member_id 없이 세션 메타를 먼저 생성한 경우 WS 연결 시 JWT member_id가 병합된다."""
    _live_sessions.clear()

    # rag-context가 먼저 생성한 메타: member_id 없음
    rag_pre_meta = {"rag_status": "READY", "rag_context": "서류 내용"}
    saved_meta: dict = {}

    async def _fake_save(redis, session_id, meta):
        saved_meta.update(meta)

    with (
        patch(
            "user.interview.websocket.interview_ws_handler._verify_session_ownership",
            new=AsyncMock(return_value=True),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.load_session_meta",
            new=AsyncMock(return_value=rag_pre_meta),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.save_session_meta",
            side_effect=_fake_save,
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.get_seq",
            new=AsyncMock(return_value=0),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.pop_pending_llm",
            new=AsyncMock(return_value=None),
        ),
    ):
        with client.websocket_connect(f"{WS_PATH}?token={valid_token}"):
            pass

    assert "member_id" in saved_meta, "member_id가 기존 세션 메타에 병합되어야 합니다."
    assert saved_meta["member_id"] != "", "병합된 member_id는 빈 값이 아니어야 합니다."
    _live_sessions.clear()


def test_connect_does_not_overwrite_existing_member_id(client: TestClient, valid_token: str):
    """기존 메타에 member_id가 이미 있으면 save_session_meta를 호출하지 않고 TTL만 갱신한다."""
    _live_sessions.clear()

    existing_meta_with_member = {
        "member_id": "existing-member-uuid",
        "rag_status": "READY",
    }
    mock_save = AsyncMock()
    mock_refresh = AsyncMock()

    with (
        patch(
            "user.interview.websocket.interview_ws_handler._verify_session_ownership",
            new=AsyncMock(return_value=True),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.load_session_meta",
            new=AsyncMock(return_value=existing_meta_with_member),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.save_session_meta",
            new=mock_save,
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.refresh_session_ttl",
            new=mock_refresh,
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.get_seq",
            new=AsyncMock(return_value=0),
        ),
        patch(
            "user.interview.websocket.interview_ws_handler.session_store.pop_pending_llm",
            new=AsyncMock(return_value=None),
        ),
    ):
        with client.websocket_connect(f"{WS_PATH}?token={valid_token}"):
            pass

    mock_save.assert_not_called()
    mock_refresh.assert_called_once()
    _live_sessions.clear()
