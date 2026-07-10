"""
session_store.py — LLM 분산 락 단위 테스트

검증 항목:
- 동일 (session_id, question_order)에 대해 첫 호출 True, 두 번째 호출 False
- redis.set() 예외 시 True 반환 (완전 중단보다 드문 중복 허용 정책)
- release_llm_lock() 호출 후 동일 order 재획득 가능
"""
import pytest
from unittest.mock import AsyncMock, MagicMock

from user.interview.store.session_store import acquire_llm_lock, release_llm_lock


def _make_redis(set_return=True, raises=None):
    redis = AsyncMock()
    if raises:
        redis.set.side_effect = raises
        redis.delete.side_effect = raises
    else:
        redis.set.return_value = set_return
        redis.delete.return_value = 1
    return redis


@pytest.mark.asyncio
async def test_acquire_llm_lock_first_call_returns_true():
    """첫 번째 호출은 락을 획득하고 True를 반환한다."""
    redis = _make_redis(set_return=True)

    result = await acquire_llm_lock(redis, "session-1", 2)

    assert result is True
    redis.set.assert_awaited_once()
    call_kwargs = redis.set.call_args
    assert call_kwargs.kwargs.get("nx") is True


@pytest.mark.asyncio
async def test_acquire_llm_lock_second_call_returns_false():
    """같은 (session_id, question_order)에 대한 두 번째 호출은 False를 반환한다."""
    redis = _make_redis(set_return=None)  # Redis SETNX 실패 시 None 반환

    result = await acquire_llm_lock(redis, "session-1", 2)

    assert result is False


@pytest.mark.asyncio
async def test_acquire_llm_lock_redis_exception_allows_execution():
    """redis.set() 예외 시 True를 반환해 실행을 허용한다 (완전 중단 방지 정책)."""
    redis = _make_redis(raises=Exception("Redis connection error"))

    result = await acquire_llm_lock(redis, "session-1", 2)

    assert result is True


@pytest.mark.asyncio
async def test_release_llm_lock_enables_reacquisition():
    """release 후 동일 order에 대해 락 재획득이 가능하다."""
    redis = AsyncMock()
    redis.set.return_value = True
    redis.delete.return_value = 1

    await release_llm_lock(redis, "session-1", 2)

    redis.delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_release_llm_lock_redis_exception_does_not_raise():
    """release 중 예외가 발생해도 호출부로 전파되지 않는다."""
    redis = _make_redis(raises=Exception("Redis connection error"))

    await release_llm_lock(redis, "session-1", 2)  # 예외 없이 완료


@pytest.mark.asyncio
async def test_acquire_lock_uses_correct_key_format():
    """락 키가 interview:llm_lock:{session_id}:{question_order} 형식임을 검증한다."""
    redis = _make_redis(set_return=True)

    await acquire_llm_lock(redis, "abc-123", 5)

    key_used = redis.set.call_args.args[0]
    assert key_used == "interview:llm_lock:abc-123:5"
