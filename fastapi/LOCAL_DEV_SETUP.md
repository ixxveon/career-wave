# Career Wave FastAPI — 로컬 실행 가이드

---

## Step 1. Python 환경 설정

Python 3.11 이상이 필요합니다.

```bash
python --version
# → Python 3.11.x 이상이어야 함
```

가상환경 생성 및 활성화:

### Mac / Linux
```bash
cd fastapi
python -m venv venv
source venv/bin/activate
```

### Windows
```bash
cd fastapi
python -m venv venv
venv\Scripts\activate
```

---

## Step 2. 의존성 설치

```bash
pip install -r requirements.txt
```

---

## Step 3. 환경변수 설정

```bash
cp .env.example .env
```

Windows:
```cmd
copy .env.example .env
```

`fastapi/.env` 파일을 열어 아래 값을 채워주세요.

```env
# Spring 연동
SPRING_BASE_URL=http://localhost:8080
WEBHOOK_SECRET=아무_문자열_입력  ← Spring Boot .env의 WEBHOOK_SECRET과 동일한 값

# OpenAI (Phase 4 AI 분석 구현 전까지는 없어도 됩니다)
OPENAI_API_KEY=sk-...

# AWS S3 (인프라팀 요청 후 발급)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET_NAME=
```

> `WEBHOOK_SECRET`은 Spring Boot `.env`의 값과 반드시 동일하게 설정해야 합니다.

---

## Step 4. 서버 실행

`fastapi/` 디렉토리 안에서 실행합니다.

```bash
uvicorn main:app --reload
```

서버가 정상 실행되면:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## Step 5. 동작 확인

### Swagger UI
브라우저에서 `http://localhost:8000/docs` 접속

### 헬스 체크
```bash
curl http://localhost:8000/health
# → {"status":"ok"}
```

### API 테스트 (Phase 2 이후)

**403 확인 — X-Internal-Secret 헤더 누락**
```bash
curl -X POST http://localhost:8000/internal/user/resume/analyze \
  -H "Content-Type: application/json" \
  -d '{"documentId":"test-id","fileType":"RESUME","fileUrl":"https://s3.test/test.pdf"}'
# → 403 Forbidden
```

**202 확인 — RESUME 타입**
```bash
curl -X POST http://localhost:8000/internal/user/resume/analyze \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: {WEBHOOK_SECRET 값}" \
  -d '{
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "fileType": "RESUME",
    "fileUrl": "https://s3.test/resume.pdf",
    "originalName": "이력서.pdf"
  }'
# → 202 Accepted
```

**202 확인 — COVER_LETTER 타입**
```bash
curl -X POST http://localhost:8000/internal/user/resume/analyze \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: {WEBHOOK_SECRET 값}" \
  -d '{
    "documentId": "660f9511-f30c-52e5-b827-557766551111",
    "fileType": "COVER_LETTER",
    "company": "카카오",
    "job": "백엔드 개발자",
    "content": [
      { "order": 1, "question": "지원 동기를 작성하세요.", "answer": "저는..." }
    ]
  }'
# → 202 Accepted
```

**409 확인 — 동일 documentId 중복 요청**

위 요청을 동일한 `documentId`로 연속 두 번 전송하면 `409 Conflict` 반환.

---

## 면접 AI 파이프라인 테스트 (feature/user-interview-fastapi-setup 이후)

### 환경변수 추가 설정

`fastapi/.env`에 아래 항목을 추가합니다.

```env
# JWT (Spring Boot .env의 JWT_SECRET 값과 동일하게)
JWT_SECRET=아무_문자열_입력

# 면접 AI 모델 (OpenAI 키 필요)
OPENAI_MODEL_INTERVIEW=gpt-4o
OPENAI_MODEL_STT=whisper-1
OPENAI_MODEL_TTS=tts-1
OPENAI_TTS_VOICE=alloy
OPENAI_LLM_TIMEOUT_SECONDS=10

# 음성 품질 임계값 (기본값 사용 가능)
VOICE_QUALITY_THRESHOLD=50.0
```

---

### WebSocket 연결 테스트

#### 테스트 JWT 토큰 발급 (로컬 전용)

Spring Boot 서버 없이 테스트하려면 아래 스크립트로 토큰을 발급합니다.

```bash
cd fastapi
python -c "
from jose import jwt
import time
token = jwt.encode(
    {'sub': 'test-user-id', 'exp': int(time.time()) + 3600},
    'JWT_SECRET에_입력한_값',
    algorithm='HS256'
)
print(token)
"
```

#### wscat으로 연결 확인

```bash
# wscat 설치 (최초 1회)
npm install -g wscat

# 연결 테스트 (위에서 발급한 토큰 사용)
wscat -c "ws://localhost:8000/ws/user/interview/test-session-001/ai?token=<발급한_토큰>"
```

연결 성공 시 서버가 응답을 기다리는 상태(`Connected`)가 됩니다.

#### 인증 실패 확인

```bash
# 토큰 없음 → 1008 종료
wscat -c "ws://localhost:8000/ws/user/interview/test-session-001/ai"

# 잘못된 토큰 → 1008 종료
wscat -c "ws://localhost:8000/ws/user/interview/test-session-001/ai?token=invalid"
```

#### 중복 연결 확인 (터미널 2개 사용)

```bash
# 터미널 1
wscat -c "ws://localhost:8000/ws/user/interview/same-session/ai?token=<토큰>"

# 터미널 2 (동일 sessionId로 재연결)
wscat -c "ws://localhost:8000/ws/user/interview/same-session/ai?token=<토큰>"
```

터미널 1에서 `INTERVIEW_DUPLICATED_CONNECTION` ERROR 메시지가 수신된 뒤 연결이 종료됩니다.

---

### Spring 내부 API 테스트 (X-Internal-Secret 필요)

```bash
# 헤더 없음 → 403
curl -X POST http://localhost:8000/internal/user/interview/sessions/test-session-001/trigger/report \
  -H "Content-Type: application/json"

# 헤더 있음 → 200 (Phase 5 구현 전까지는 404 반환)
curl -X POST http://localhost:8000/internal/user/interview/sessions/test-session-001/trigger/report \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: WEBHOOK_SECRET에_입력한_값" \
  -d '{"sessionId": "test-session-001", "sessionType": "VOICE"}'
```

---

### 단위 테스트 실행

```bash
cd fastapi
python -m pytest tests/ -v
```

#### 테스트 목록

| 파일 | 테스트 | 설명 |
|------|--------|------|
| `test_spring_client.py` | `test_callback_success_on_first_attempt` | 1차 콜백 성공 |
| `test_spring_client.py` | `test_callback_retry_then_success` | 2회 실패 → 3차 성공 (백오프) |
| `test_spring_client.py` | `test_callback_all_fail_logs_error` | 3회 모두 실패 → log.error |
| `test_spring_client.py` | `test_callback_duplicated_response_is_success` | Spring `duplicated: true` 멱등 처리 |
| `test_spring_client.py` | `test_payload_null_scores_when_voice_quality_low` | voiceQualityRatio < 50 → score null |
| `test_spring_client.py` | `test_payload_null_scores_for_text_interview` | 텍스트 면접 → score null |
| `test_ws_handler.py` | `test_connect_without_token_closes_1008` | 토큰 누락 → Close 1008 |
| `test_ws_handler.py` | `test_connect_with_expired_token_closes_1008` | 만료 토큰 → Close 1008 |
| `test_ws_handler.py` | `test_connect_with_wrong_secret_closes_1008` | 잘못된 시크릿 → Close 1008 |
| `test_ws_handler.py` | `test_connect_with_valid_token_accepted` | 유효 토큰 → 연결 수립 |
| `test_ws_handler.py` | `test_duplicate_connection_sends_error_to_existing` | 중복 연결 → DUPLICATED_CONNECTION |
| `test_ws_handler.py` | `test_sequence_number_increments` | sequenceNumber 단조 증가 |
| `test_ws_handler.py` | `test_reconnect_replays_missed_messages` | 재연결 시 미전달 메시지 재전송 |
| `test_ws_handler.py` | `test_send_stt_partial_message_structure` | STT_PARTIAL 메시지 구조 |
| `test_ws_handler.py` | `test_send_stt_final_message_structure` | STT_FINAL + voiceQualityRatio 포함 |
| `test_ws_handler.py` | `test_send_tts_audio_end_message_structure` | TTS_AUDIO_END 구조 |
| `test_ws_handler.py` | `test_send_error_message_structure` | ERROR + errorCode 구조 |
