# AI 면접 API 로컬 테스트 가이드

> 대상: user-backend, user-fastapi 담당 팀원  
> 관련 브랜치: `feature/fastapi-user-interview-setup` ~ `feature/fastapi-user-interview-validation`

---

## 사전 준비

### 1. 환경 변수 설정

**Spring Boot `.env`**
```env
FASTAPI_BASE_URL=http://localhost:8000
WEBHOOK_SECRET=<팀 공유 시크릿 값>
```

**FastAPI `.env`**
```env
SPRING_BASE_URL=http://localhost:8080
WEBHOOK_SECRET=<Spring Boot와 동일한 값>
JWT_SECRET=<Spring Boot와 동일한 값>
OPENAI_API_KEY=<본인 OpenAI API 키>
OPENAI_MODEL_INTERVIEW=gpt-4o
OPENAI_MODEL_STT=whisper-1
OPENAI_MODEL_TTS=tts-1
OPENAI_TTS_VOICE=alloy
OPENAI_LLM_TIMEOUT_SECONDS=10
VOICE_QUALITY_THRESHOLD=50.0
```

> `WEBHOOK_SECRET` 값이 양쪽에서 반드시 일치해야 합니다.  
> 다르면 FastAPI → Spring Boot 콜백 수신 시 `403 Forbidden`이 발생합니다.
>
> `JWT_SECRET` 값도 양쪽에서 반드시 일치해야 합니다.  
> 다르면 WebSocket 연결 시 `1008`로 거절됩니다.

### 2. 서버 실행 순서

```bash
# 터미널 1 — Spring Boot
cd backend && ./gradlew bootRun

# 터미널 2 — FastAPI
cd fastapi && uvicorn main:app --reload --port 8000
```

> Spring Boot 기본 포트: `8080`, FastAPI: `8000`

---

## 테스트 시나리오

Swagger UI: `http://localhost:8080/swagger-ui.html`

### Step 0. 로그인 (공통)

```
POST /api/v1/user/members/login
```
```json
{
  "loginId": "테스트 계정 아이디",
  "password": "비밀번호"
}
```
응답의 `accessToken`을 복사해 Swagger 우측 상단 **Authorize** → `Bearer {토큰}` 입력

---

### Step 1. WebSocket 연결 (FastAPI AI 채널)

면접 진행 중 STT 결과·LLM 질문·TTS 오디오를 실시간으로 수신하려면 FastAPI WebSocket에 먼저 연결해야 합니다.

#### 테스트 JWT 토큰 발급 (Spring Boot 없이 로컬 테스트 시)

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

#### wscat으로 연결

```bash
# wscat 설치 (최초 1회)
npm install -g wscat

# 연결 (위에서 발급한 토큰 사용)
wscat -c "ws://localhost:8000/ws/user/interview/{sessionId}/ai?token=<발급한_토큰>"
```

연결 성공 시 `Connected` 상태가 됩니다. 이후 STT·LLM·TTS 결과가 이 채널로 실시간 수신됩니다.

#### 인증 실패 케이스

```bash
# 토큰 없음 → 1008 종료
wscat -c "ws://localhost:8000/ws/user/interview/test-session-001/ai"

# 잘못된 토큰 → 1008 종료
wscat -c "ws://localhost:8000/ws/user/interview/test-session-001/ai?token=invalid"
```

---

### 시나리오 1 — 텍스트 면접 전체 플로우

**① 면접 세션 시작**
```
POST /api/v1/user/interview/sessions
```
```json
{
  "sessionType": "TEXT",
  "interviewType": "TECHNICAL"
}
```
응답에서 `sessionId` 확인

**② WebSocket 연결** (Step 1 참고 — `sessionId` 사용)

**③ 첫 번째 질문 수신 대기**

Spring Boot가 FastAPI LLM 파이프라인을 트리거하면 WebSocket으로 질문이 수신됩니다.

```json
{
  "type": "LLM_QUESTION",
  "content": "본인의 기술 스택 중 가장 자신 있는 부분을 말씀해 주세요.",
  "questionOrder": 1,
  "sequenceNumber": 1
}
```

**④ 텍스트 답변 제출**
```
POST /api/v1/user/interview/sessions/{sessionId}/answers/text
```
```json
{
  "questionOrder": 1,
  "answerText": "저는 Java와 Spring Boot를 주로 사용하며..."
}
```

**⑤ 다음 질문 수신 → 반복**

**⑥ 면접 종료**
```
POST /api/v1/user/interview/sessions/{sessionId}/end
```

약 10~30초 후 Spring Boot WebSocket `/chat` 채널로 `REPORT_READY` 수신

**⑦ 리포트 조회**
```
GET /api/v1/user/interview/sessions/{sessionId}/report
```

---

### 시나리오 2 — 음성 면접 전체 플로우

**① ~ ②** 텍스트 면접과 동일 (sessionType: `VOICE`)

**③ 음성 청크 전송** (Spring Boot가 자동 처리)

Spring Boot가 5초 단위 음성 청크를 FastAPI에 전달하면, WebSocket으로 STT 결과가 실시간 수신됩니다.

```json
// 중간 결과
{ "type": "STT_PARTIAL", "content": "저는 Java를", "questionOrder": 1, "chunkIndex": 0 }

// 최종 결과
{ "type": "STT_FINAL", "content": "저는 Java와 Spring Boot를 주로 사용하며...", "questionOrder": 1, "voiceQualityRatio": 87.5 }
```

**④ TTS 오디오 수신**

LLM이 다음 질문을 생성하면 TTS 오디오가 순차 전송됩니다.

```json
{ "type": "TTS_AUDIO", "audioData": "<base64>", "questionOrder": 2, "chunkIndex": 0 }
{ "type": "TTS_AUDIO_END", "questionOrder": 2 }
```

**⑤ ~ ⑦** 텍스트 면접과 동일

---

### 시나리오 3 — 오류 케이스

| 케이스 | 방법 | 예상 응답 |
|--------|------|-----------|
| WebSocket 토큰 누락 | 토큰 없이 연결 | `1008 Policy Violation` |
| WebSocket 토큰 만료 | 만료된 토큰으로 연결 | `1008 Policy Violation` |
| X-Internal-Secret 누락 | 헤더 없이 내부 API 호출 | `403 Forbidden` |
| 존재하지 않는 sessionId | 임의 UUID로 요청 | `404` |
| 중복 WebSocket 연결 | 동일 sessionId로 두 번 연결 | 기존 소켓에 `INTERVIEW_DUPLICATED_CONNECTION` 후 종료 |

---

## FastAPI 내부 API 직접 테스트 (Spring Boot 없이)

### voice-chunk 트리거

```bash
# 정상 요청 → 202
python -c "
import requests
url = 'http://localhost:8000/internal/user/interview/sessions/test-session-001/trigger/voice-chunk'
headers = {'X-Internal-Secret': 'WEBHOOK_SECRET에_입력한_값'}
files = {'audio_chunk': ('test.webm', b'\x00' * 100, 'audio/webm')}
data = {'question_order': '1', 'chunk_index': '0', 'is_final': 'false'}
resp = requests.post(url, headers=headers, files=files, data=data)
print('HTTP Status:', resp.status_code)
print('Response:', resp.text)
"

# 헤더 없음 → 403
python -c "
import requests
url = 'http://localhost:8000/internal/user/interview/sessions/test-session-001/trigger/voice-chunk'
files = {'audio_chunk': ('test.webm', b'\x00' * 100, 'audio/webm')}
data = {'question_order': '1', 'chunk_index': '0', 'is_final': 'false'}
resp = requests.post(url, files=files, data=data)
print('HTTP Status:', resp.status_code)
print('Response:', resp.text)
"
```

---

## 단위 테스트 실행

```bash
cd fastapi
python -m pytest tests/ -v
```

| 파일 | 테스트 항목 |
|------|-------------|
| `test_spring_client.py` | 콜백 성공·재시도·최종 실패·duplicated 멱등 처리·voiceQualityRatio null 처리 |
| `test_ws_handler.py` | JWT 검증·중복 연결·sequenceNumber·재연결 재전송·send_* 메시지 구조 |

---

## 메시지 타입 레퍼런스

| type | 방향 | 설명 |
|------|------|------|
| `STT_PARTIAL` | FastAPI → Client | 음성 청크 중간 변환 결과 |
| `STT_FINAL` | FastAPI → Client | 최종 STT 결과 + `voiceQualityRatio` |
| `LLM_QUESTION` | FastAPI → Client | LLM이 생성한 다음 질문 텍스트 |
| `TTS_AUDIO` | FastAPI → Client | TTS 오디오 청크 (base64) |
| `TTS_AUDIO_END` | FastAPI → Client | TTS 전송 완료 |
| `ERROR` | FastAPI → Client | 파이프라인 오류 (`errorCode` 포함) |

---

## 자주 발생하는 오류

### WebSocket 연결이 1008로 거절됨
- `JWT_SECRET`이 Spring Boot `.env`와 FastAPI `.env`에서 동일한지 확인

### FastAPI 콜백 수신 시 403
- `WEBHOOK_SECRET` 값이 양쪽 `.env`에서 동일한지 확인

### STT 결과가 WebSocket으로 수신되지 않음
- FastAPI 터미널 로그에서 `STT pipeline triggered` 이후 오류 확인
- `OPENAI_API_KEY`가 유효한지 확인

### LLM 질문이 10초 내에 수신되지 않음
- `OPENAI_LLM_TIMEOUT_SECONDS` 설정 확인 (기본값 `10`)
- 타임아웃 시 폴백 질문이 자동 전송됩니다
