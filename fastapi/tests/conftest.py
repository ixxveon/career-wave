import os

import pytest
from jose import jwt
from starlette.testclient import TestClient

# 테스트 환경 환경변수 주입 (실제 .env 파일 없이도 동작)
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")
os.environ.setdefault("WEBHOOK_SECRET", "test-webhook-secret")
os.environ.setdefault("SPRING_BASE_URL", "http://localhost:8080")
os.environ.setdefault("OPENAI_API_KEY", "sk-test")

# Settings 캐시 무효화 후 테스트용 값으로 재로드
from core.config import get_settings  # noqa: E402

get_settings.cache_clear()

TEST_JWT_SECRET = "test-jwt-secret"
TEST_WEBHOOK_SECRET = "test-webhook-secret"
TEST_SESSION_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_MEMBER_ID = "user-member-uuid"


def make_token(secret: str = TEST_JWT_SECRET, expired: bool = False) -> str:
    import time

    exp = int(time.time()) + (-60 if expired else 3600)
    return jwt.encode(
        {"sub": TEST_MEMBER_ID, "exp": exp, "aud": "user"},
        secret,
        algorithm="HS256",
    )


@pytest.fixture()
def client() -> TestClient:
    from main import app

    return TestClient(app)


@pytest.fixture()
def valid_token() -> str:
    return make_token()


@pytest.fixture()
def expired_token() -> str:
    return make_token(expired=True)
