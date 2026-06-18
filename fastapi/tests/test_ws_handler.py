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
from dataclasses import dataclass, field
from typing import Any
from unittest.mock import AsyncMock

import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from tests.conftest import TEST_SESSION_ID, make_token
from user.interview.websocket.interview_ws_handler import (
    InterviewErrorCode,
    _SessionContext,
    _sessions,
    send_error,
    send_stt_final,
    send_stt_partial,
    send_tts_audio,
)

WS_PATH = f"/ws/user/interview/{TEST_SESSION_ID}/ai"


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
    _sessions.clear()
    with client.websocket_connect(f"{WS_PATH}?token={valid_token}"):
        assert TEST_SESSION_ID in _sessions
    _sessions.clear()


# ── 중복 연결 (TestClient 통합 테스트) ──────────────────────────────────────

def test_duplicate_connection_sends_error_to_existing(client: TestClient, valid_token: str):
    """두 번째 연결 시 첫 번째 소켓에 INTERVIEW_DUPLICATED_CONNECTION ERROR가 전송된다."""
    _sessions.clear()
    url = f"{WS_PATH}?token={valid_token}"

    with client.websocket_connect(url) as ws1:
        with client.websocket_connect(url):
            msg = json.loads(ws1.receive_text())
            assert msg["type"] == "ERROR"
            assert msg["errorCode"] == InterviewErrorCode.DUPLICATED_CONNECTION

    _sessions.clear()


# ── sequenceNumber (AsyncMock 단위 테스트) ───────────────────────────────────

@pytest.mark.asyncio
async def test_sequence_number_increments():
    """Push 헬퍼를 호출할 때마다 sequenceNumber가 1씩 단조 증가한다."""
    _sessions.clear()
    mock_ws = AsyncMock()
    _sessions[TEST_SESSION_ID] = _SessionContext(ws=mock_ws)

    await send_stt_partial(TEST_SESSION_ID, "안녕하세요", 1, 0)
    await send_stt_partial(TEST_SESSION_ID, "저는", 1, 1)

    sent = [json.loads(c.args[0]) for c in mock_ws.send_text.call_args_list]
    assert sent[0]["sequenceNumber"] == 1
    assert sent[1]["sequenceNumber"] == 2

    _sessions.clear()


@pytest.mark.asyncio
async def test_reconnect_replays_missed_messages():
    """lastReceivedSequenceNumber 이후 버퍼 메시지를 순서대로 재전송한다."""
    _sessions.clear()

    # 버퍼에 seq 1~3 미리 적재
    buffered: list[dict[str, Any]] = [
        {"type": "STT_PARTIAL", "sequenceNumber": i, "content": f"chunk{i}"}
        for i in range(1, 4)
    ]
    mock_ws_old = AsyncMock()
    _sessions[TEST_SESSION_ID] = _SessionContext(ws=mock_ws_old, seq=3, msg_buffer=buffered)

    # 재연결: seq=1까지 수신 완료 → seq 2, 3 재전송 기대
    mock_ws_new = AsyncMock()
    new_ctx = _SessionContext(
        ws=mock_ws_new,
        seq=_sessions[TEST_SESSION_ID].seq,
        msg_buffer=list(_sessions[TEST_SESSION_ID].msg_buffer),
    )
    _sessions[TEST_SESSION_ID] = new_ctx

    last_received = 1
    pending = [m for m in new_ctx.msg_buffer if m["sequenceNumber"] > last_received]
    for msg in pending:
        await mock_ws_new.send_text(json.dumps(msg))

    replayed = [json.loads(c.args[0]) for c in mock_ws_new.send_text.call_args_list]
    assert [m["sequenceNumber"] for m in replayed] == [2, 3]

    _sessions.clear()


# ── send_* 헬퍼 메시지 구조 (AsyncMock 단위 테스트) ──────────────────────────

@pytest.mark.asyncio
async def test_send_stt_partial_message_structure():
    _sessions.clear()
    mock_ws = AsyncMock()
    _sessions[TEST_SESSION_ID] = _SessionContext(ws=mock_ws)

    await send_stt_partial(TEST_SESSION_ID, "테스트 내용", 1, 0)

    msg = json.loads(mock_ws.send_text.call_args.args[0])
    assert msg["type"] == "STT_PARTIAL"
    assert msg["content"] == "테스트 내용"
    assert msg["questionOrder"] == 1
    assert msg["chunkIndex"] == 0
    assert msg["isFinal"] is False
    assert isinstance(msg["sequenceNumber"], int)

    _sessions.clear()


@pytest.mark.asyncio
async def test_send_stt_final_message_structure():
    _sessions.clear()
    mock_ws = AsyncMock()
    _sessions[TEST_SESSION_ID] = _SessionContext(ws=mock_ws)

    await send_stt_final(TEST_SESSION_ID, "최종 답변입니다.", 1, 92.5)

    msg = json.loads(mock_ws.send_text.call_args.args[0])
    assert msg["type"] == "STT_FINAL"
    assert msg["isFinal"] is True
    assert msg["voiceQualityRatio"] == pytest.approx(92.5)
    assert msg["chunkIndex"] is None

    _sessions.clear()


@pytest.mark.asyncio
async def test_send_tts_audio_chunk_message_structure():
    _sessions.clear()
    mock_ws = AsyncMock()
    _sessions[TEST_SESSION_ID] = _SessionContext(ws=mock_ws)

    await send_tts_audio(TEST_SESSION_ID, "base64data==", 2, 0, is_final=False)

    msg = json.loads(mock_ws.send_text.call_args.args[0])
    assert msg["type"] == "TTS_AUDIO"
    assert msg["audioData"] == "base64data=="
    assert msg["isFinal"] is False
    assert msg["chunkIndex"] == 0

    _sessions.clear()


@pytest.mark.asyncio
async def test_send_tts_audio_end_message_structure():
    _sessions.clear()
    mock_ws = AsyncMock()
    _sessions[TEST_SESSION_ID] = _SessionContext(ws=mock_ws)

    await send_tts_audio(TEST_SESSION_ID, "", 2, 0, is_final=True)

    msg = json.loads(mock_ws.send_text.call_args.args[0])
    assert msg["type"] == "TTS_AUDIO_END"
    assert msg["isFinal"] is True
    assert msg["audioData"] is None

    _sessions.clear()


@pytest.mark.asyncio
async def test_send_error_message_structure():
    _sessions.clear()
    mock_ws = AsyncMock()
    _sessions[TEST_SESSION_ID] = _SessionContext(ws=mock_ws)

    await send_error(TEST_SESSION_ID, "STT 처리 실패", InterviewErrorCode.STT_FAILED, question_order=1)

    msg = json.loads(mock_ws.send_text.call_args.args[0])
    assert msg["type"] == "ERROR"
    assert msg["errorCode"] == "INTERVIEW_STT_FAILED"
    assert msg["questionOrder"] == 1

    _sessions.clear()
