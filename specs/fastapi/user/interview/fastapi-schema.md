# FastAPI Schema: User Interview

> Spring Boot ↔ FastAPI 간 `user/interview` 도메인 내부 API 계약 문서.  
> 본 문서는 프론트엔드 공개용 API 문서가 아니며, 클라이언트는 Spring Boot의 REST 및 WebSocket만 공개 채널로 사용한다.  
> 단, FastAPI WebSocket(`/ws/user/interview/{sessionId}/ai`)은 클라이언트가 직접 연결한다.

---

## 1. 공통 원칙

- FastAPI는 AI 파이프라인(STT·LLM·TTS) 전담 서버다. Spring Boot가 세션 생명주기와 DB 저장을 담당한다.
- 프론트엔드는 Spring Boot REST API와 두 채널의 WebSocket을 사용한다.
  - **Spring WebSocket** (`/ws/user/interview/{sessionId}/chat`): 세션 이벤트, AI 질문 전달
  - **FastAPI WebSocket** (`/ws/user/interview/{sessionId}/ai`): STT 결과, TTS 오디오, AI 오류
- FastAPI는 DB에 직접 접근하지 않는다. 모든 영속성은 Spring Boot가 담당한다.
- FastAPI는 외부 `ApiResponse<T>`를 생성하지 않으며, 내부 JSON 계약 형식으로만 응답한다.
- 내부 인증은 `X-Internal-Secret` 헤더로 수행한다. 시크릿 값은 환경 변수로 관리한다.

### 통신 방식

| 방향 | 프로토콜 | 설명 |
|------|----------|------|
| Spring → FastAPI | HTTP/JSON | 트리거 전달 (RAG 등록, LLM 트리거, 리포트 생성 트리거) |
| Spring → FastAPI | Multipart HTTP | 음성 청크 전달 |
| FastAPI → Spring | HTTP/JSON | 리포트 완료 콜백 |
| FastAPI → Client | WebSocket | STT 결과, TTS 오디오, AI 오류 메시지 |
| Client → FastAPI | WebSocket | 연결 수립 (읽기 전용, 서버 Push 채널) |

### 처리 책임 분리

#### Spring Boot 책임

- 세션 생성·종료·상태 관리 (`interview_sessions` DB 쓰기)
- 텍스트/음성 답변 메시지 저장 (`interview_messages` DB 쓰기)
- 면접 피드백 저장 (`ai_interview_feedbacks` DB 쓰기) — FastAPI 콜백 수신 후
- 면접 이력 저장 (`career_histories` DB 쓰기) — FastAPI 콜백 수신 후
- Spring WebSocket 세션 이벤트 전달 (`SESSION_START` / `REPORT_READY` / `ERROR`)
- 외부 REST API 제공 및 JWT 인증·인가
- FastAPI 내부 오류를 도메인 ErrorCode로 변환

#### FastAPI 책임

- 음성 청크 STT 변환
- `voiceQualityRatio` 산정 및 조건부 점수 null 처리
- LLM 기반 AI 질문 생성 (꼬리 질문·압박 질문 포함)
- RAG 컨텍스트 주입 (서류 기반)
- TTS 오디오 생성 및 클라이언트 스트리밍
- 전체 답변 분석을 통한 피드백 리포트 생성
- Spring 리포트 완료 콜백 전송 (재시도 포함)
- AI 사용 토큰·비용 로깅

---

## 2. Spring → FastAPI 내부 API

### 2.1 RAG 컨텍스트 등록

```
POST /internal/user/interview/sessions/{sessionId}/rag-context
```

**호출 시점**: Spring이 `documentId`가 있는 세션을 생성한 직후 비동기 호출.

#### Request

```json
{
  "sessionId": "uuid-v4",
  "memberId": "uuid-v4",
  "documentId": "uuid-v4",
  "documentFilePath": "/documents/2026/06/resume.pdf"
}
```

| Field | Type | 설명 |
|-------|------|------|
| `sessionId` | `String` (UUID) | 면접 세션 ID |
| `memberId` | `String` (UUID) | 회원 ID |
| `documentId` | `String` (UUID) | 서류 ID |
| `documentFilePath` | `String` | 서류 파일 경로 (S3 또는 로컬) |

#### Response (200 OK)

```json
{
  "accepted": true,
  "sessionId": "uuid-v4"
}
```

#### 처리 책임

- 서류 파일 로드 → 텍스트 추출 → 청크 분리 → 벡터 인덱싱 (비동기)
- 실패 시 일반 면접 모드로 폴백 (세션 중단 없음)

#### 비동기 여부

- 비동기 (수락 응답 즉시 반환 후 백그라운드 처리)

---

### 2.2 LLM 파이프라인 트리거 (텍스트 답변)

```
POST /internal/user/interview/sessions/{sessionId}/trigger/text-answer
```

**호출 시점**: Spring이 텍스트 답변 메시지 저장 완료 후 비동기 호출.

#### Request

```json
{
  "sessionId": "uuid-v4",
  "memberId": "uuid-v4",
  "questionOrder": 1,
  "answerText": "저는 Spring Boot와 JPA를 활용한 백엔드 개발 경험이 있습니다...",
  "questionText": "자신의 가장 큰 강점은 무엇이라고 생각하시나요?",
  "sessionType": "TEXT",
  "interviewType": "TECHNICAL",
  "focusType": "TECHNICAL_DEPTH",
  "targetCompany": "카카오"
}
```

| Field | Type | 설명 |
|-------|------|------|
| `sessionId` | `String` (UUID) | 면접 세션 ID |
| `memberId` | `String` (UUID) | 회원 ID |
| `questionOrder` | `Integer` | 현재 답변 완료된 질문 순서 (1-based) |
| `answerText` | `String` | 사용자 답변 텍스트 |
| `questionText` | `String` | 현재 답변 완료된 질문 텍스트 (answer_history 기록용, 최초 트리거 시 빈 문자열) |
| `sessionType` | `String` | `TEXT` \| `VOICE` |
| `interviewType` | `String` \| `null` | `TECHNICAL` \| `PERSONALITY` \| `PROJECT` — LLM 시스템 프롬프트 선택용 |
| `focusType` | `String` \| `null` | `FOLLOW_UP` \| `TECHNICAL_DEPTH` \| `DELIVERY` \| `FLUENCY` — 집중 목표 오버레이용 |
| `targetCompany` | `String` \| `null` | 목표 기업명 — LLM 기업 맞춤 오버레이용 |

#### Response (200 OK)

```json
{
  "accepted": true,
  "sessionId": "uuid-v4",
  "questionOrder": 1
}
```

#### 처리 책임

- 이전 답변 이력 + RAG 컨텍스트 조합 → LLM 질문 생성
- 생성된 질문을 Spring WebSocket 채널 경유로 클라이언트에 전달 (Spring 내부 API 호출)
- TTS 변환 후 FastAPI WebSocket으로 클라이언트에 오디오 스트리밍 (음성 모드 시)
- 타임아웃 시 폴백 질문으로 대체
- `next_question_order > 10` (최대 질문 수: 10개) 이면 LLM 질문 생성 없이 `report_pipeline.generate_and_send_report()` 직접 호출

#### LLM 응답 JSON 포맷 계약

FastAPI는 LLM에게 아래 JSON 형식으로만 응답하도록 시스템 프롬프트에 명시한다.  
`json.JSONDecodeError` 발생 시 "JSON 형식으로만 답해줘" 재요청을 1회 시도하고, 재시도 후에도 실패하면 폴백 질문을 사용한다.

```json
{
  "question": "Spring에서 트랜잭션 전파 방식에 대해 설명해 주세요.",
  "questionType": "FOLLOW_UP"
}
```

| Field | Type | 허용값 | 설명 |
|-------|------|--------|------|
| `question` | `String` | — | 다음 질문 텍스트 |
| `questionType` | `String` | `FOLLOW_UP` \| `PRESSURE` \| `NEXT` | 꼬리 질문 / 압박 질문 / 다음 주제 |

#### 비동기 여부

- 비동기

---

### 2.3 STT 파이프라인 트리거 (음성 청크)

```
POST /internal/user/interview/sessions/{sessionId}/trigger/voice-chunk
```

**호출 시점**: Spring이 `POST /answer/voice` Multipart 수신 후 FastAPI로 청크 전달.

#### Request (multipart/form-data)

| Field | Type | 설명 |
|-------|------|------|
| `sessionId` | `String` | 면접 세션 ID |
| `memberId` | `String` | 회원 ID |
| `questionOrder` | `Integer` | 현재 답변 중인 질문 순서 (1-based) |
| `chunkIndex` | `Integer` | 청크 순서 인덱스 (0-based) |
| `isFinal` | `Boolean` | 해당 답변의 마지막 청크 여부 |
| `audioChunk` | `File` | 음성 청크 파일 (WebM / MP4 / OGG) |

#### Response (200 OK)

```json
{
  "accepted": true,
  "sessionId": "uuid-v4",
  "chunkIndex": 0
}
```

#### 처리 책임

- 청크를 세션별로 누적 버퍼에 저장
- `isFinal = true` 시 누적 청크를 합쳐 Whisper에 일괄 전송
- STT 결과 확정 후 `STT_FINAL` 메시지를 FastAPI WebSocket으로 전송
- `voiceQualityRatio` 산정 및 세션 컨텍스트에 저장
- LLM 트리거는 Spring이 `STT_FINAL` 수신 후 `sendTextAnswer`로 처리 (FastAPI STT 파이프라인이 직접 LLM을 트리거하지 않음)

#### 비동기 여부

- 비동기

---

### 2.4 리포트 생성 트리거

```
POST /internal/user/interview/sessions/{sessionId}/trigger/report
```

**호출 시점**: Spring이 `endSession` 처리 완료 후 비동기 호출.

#### Request

```json
{
  "sessionId": "uuid-v4",
  "memberId": "uuid-v4",
  "sessionType": "VOICE"
}
```

| Field | Type | 설명 |
|-------|------|------|
| `sessionId` | `String` (UUID) | 면접 세션 ID |
| `memberId` | `String` (UUID) | 회원 ID |
| `sessionType` | `String` | `TEXT` \| `VOICE` \| `VIDEO` |

#### Response (200 OK)

```json
{
  "accepted": true,
  "sessionId": "uuid-v4"
}
```

#### 처리 책임

- 전체 면접 답변 이력 분석
- 질문별 4개 역량 지표 + `voiceQualityRatio` + `aiFeedback` 생성
- `totalScore` 산출 (0~100)
- Spring 콜백 (`POST /internal/api/v1/interview/callback/{sessionId}/report`) 전송

#### 비동기 여부

- 비동기

---

## 3. FastAPI → Spring 콜백 계약

### 3.1 리포트 완료 콜백

```
POST /internal/api/v1/interview/callback/{sessionId}/report
```

**호출 시점**: FastAPI 리포트 생성 완료 후 Spring에 결과 전달.

#### 인증 헤더

```
X-Internal-Secret: {INTERVIEW_INTERNAL_SECRET 환경 변수 값}
```

#### Request Body

```json
{
  "sessionId": "uuid-v4",
  "totalScore": 78,
  "feedbacks": [
    {
      "questionOrder": 1,
      "questionText": "Spring Boot에서 트랜잭션을 어떻게 관리하시나요?",
      "answerText": "@Transactional 어노테이션을 활용하여...",
      "relevanceScore": 85,
      "depthScore": 70,
      "deliveryScore": 80,
      "fluencyScore": 75,
      "voiceQualityRatio": 92.5,
      "aiFeedback": "직무 관련성은 높으나 구체적인 예시가 부족합니다."
    },
    {
      "questionOrder": 2,
      "questionText": "JPA N+1 문제를 어떻게 해결하시나요?",
      "answerText": "fetch join을 사용하거나...",
      "relevanceScore": 80,
      "depthScore": 75,
      "deliveryScore": null,
      "fluencyScore": null,
      "voiceQualityRatio": 42.3,
      "aiFeedback": "핵심 개념을 잘 이해하고 있습니다."
    }
  ]
}
```

#### 필드 계약

| Field | Type | 설명 |
|-------|------|------|
| `sessionId` | `String` (UUID) | 면접 세션 ID |
| `totalScore` | `Integer` | 종합 점수 (0~100) |
| `feedbacks[].questionOrder` | `Integer` | 질문 순서 (1-based) |
| `feedbacks[].questionText` | `String` | 질문 본문 |
| `feedbacks[].answerText` | `String` | 최종 STT 또는 텍스트 답변 |
| `feedbacks[].relevanceScore` | `Integer` \| `null` | 직무 연관성 점수 (0~100) |
| `feedbacks[].depthScore` | `Integer` \| `null` | 답변 깊이 점수 (0~100) |
| `feedbacks[].deliveryScore` | `Integer` \| `null` | 전달력 점수 — `voiceQualityRatio < 50.00` 또는 텍스트 면접 시 `null` |
| `feedbacks[].fluencyScore` | `Integer` \| `null` | 유창성 점수 — `voiceQualityRatio < 50.00` 또는 텍스트 면접 시 `null` |
| `feedbacks[].voiceQualityRatio` | `Number` \| `null` | 음성 인식 유효 비율 (0.00~100.00) — 텍스트 면접 시 `null` |
| `feedbacks[].aiFeedback` | `String` \| `null` | 질문별 AI 피드백 |

> `voiceQualityRatio < 50.00`이면 FastAPI가 콜백 전송 전에 이미 `deliveryScore` / `fluencyScore`를 `null`로 처리한다.  
> Spring은 수신한 값을 그대로 저장한다.

#### Spring 응답 (성공)

```json
{ "success": true }
```

#### Spring 응답 (중복 콜백 — 이미 처리됨)

```json
{ "success": true, "duplicated": true }
```

Spring은 멱등성 처리 후 200 OK를 반환한다. FastAPI는 `duplicated: true` 여부와 무관하게 200을 성공으로 간주한다.

#### 재시도 정책

| 시도 | 대기 시간 |
|------|----------|
| 1차 시도 | 즉시 |
| 2차 시도 (1차 실패 시) | 1초 후 |
| 3차 시도 (2차 실패 시) | 3초 후 |
| 최종 실패 | `log.error` 기록 후 종료 |

---

## 4. FastAPI WebSocket 메시지 계약

### 채널

```
WS /ws/user/interview/{sessionId}/ai?token={accessToken}[&lastReceivedSequenceNumber={N}]
```

클라이언트가 직접 연결. FastAPI가 STT 결과·TTS 오디오·AI 오류를 Push.

| 쿼리 파라미터 | Type | 설명 |
|-------------|------|------|
| `token` | `String` | JWT 액세스 토큰 (필수) |
| `lastReceivedSequenceNumber` | `Integer` | 재연결 시 마지막으로 수신한 sequenceNumber. 생략 시 최초 연결로 간주. |

### 인증

연결 시 `token` 쿼리 파라미터로 JWT 검증. 실패 시 Close 1008.

### 재연결 메시지 재전송

`lastReceivedSequenceNumber`가 전달된 경우, FastAPI는 해당 번호보다 큰 `sequenceNumber`를 가진 미전달 메시지를 순서대로 즉시 재전송한다.  
v1은 서버 메모리에 세션별 미전달 메시지 목록을 보관한다 (Scale-out 시 Redis 전환).

### Server → Client 메시지 형식

모든 서버 Push 메시지에 `sequenceNumber`가 포함된다.

```json
{
  "type": "STT_FINAL",
  "sequenceNumber": 7,
  "content": "저는 Spring Boot와 JPA를 활용한 백엔드 개발 경험이 있습니다.",
  "questionOrder": 1,
  "chunkIndex": null,
  "isFinal": true,
  "voiceQualityRatio": 92.5,
  "audioChunk": null,
  "errorCode": null
}
```

| Field | Type | 설명 |
|-------|------|------|
| `sequenceNumber` | `Integer` | 세션 내 단조 증가 메시지 순서 번호 (1-based). 재연결 시 미전달 메시지 재전송 기준. |

#### 메시지 타입별 정의

**STT_FINAL** — 최종 STT 결과 (`isFinal = true` 청크 처리 완료)

```json
{
  "type": "STT_FINAL",
  "sequenceNumber": 7,
  "content": "저는 Spring Boot와 JPA를 활용한 백엔드 개발 경험이 있습니다.",
  "questionOrder": 1,
  "chunkIndex": null,
  "isFinal": true,
  "voiceQualityRatio": 92.5,
  "audioChunk": null,
  "errorCode": null
}
```

**TTS_AUDIO** — TTS 오디오 청크 (Base64 인코딩)

```json
{
  "type": "TTS_AUDIO",
  "sequenceNumber": 8,
  "content": null,
  "questionOrder": 2,
  "chunkIndex": 0,
  "isFinal": false,
  "voiceQualityRatio": null,
  "audioChunk": "base64-encoded-audio-chunk",
  "errorCode": null
}
```

**TTS_AUDIO_END** — TTS 오디오 전송 완료

```json
{
  "type": "TTS_AUDIO_END",
  "sequenceNumber": 12,
  "content": null,
  "questionOrder": 2,
  "chunkIndex": null,
  "isFinal": true,
  "voiceQualityRatio": null,
  "audioChunk": null,
  "errorCode": null
}
```

**ERROR** — AI 파이프라인 오류

```json
{
  "type": "ERROR",
  "sequenceNumber": 9,
  "content": "음성 인식 처리 중 오류가 발생했습니다.",
  "questionOrder": 1,
  "chunkIndex": null,
  "isFinal": null,
  "voiceQualityRatio": null,
  "audioChunk": null,
  "errorCode": "INTERVIEW_STT_FAILED"
}
```

#### WebSocket errorCode 상수

| errorCode | 설명 |
|-----------|------|
| `INTERVIEW_AI_PIPELINE_ERROR` | AI 파이프라인 전반 오류 |
| `INTERVIEW_STT_FAILED` | STT 변환 실패 |
| `INTERVIEW_TTS_FAILED` | TTS 변환 실패 (텍스트 질문으로 대체 가능) |
| `INTERVIEW_LLM_FAILED` | LLM 질문 생성 실패 (폴백 사용) |
| `INTERVIEW_SESSION_EXPIRED` | 세션 타임아웃 (FastAPI 감지) |
| `INTERVIEW_CALLBACK_FAILED` | Spring 콜백 최종 실패 |
| `INTERVIEW_DUPLICATED_CONNECTION` | 동일 sessionId로 중복 WebSocket 연결 시도 — 기존 연결에 전송 후 `close(code=1000)` |

---

## 5. 환경 변수

```env
# Spring 연동
SPRING_BASE_URL=http://localhost:8080
INTERVIEW_INTERNAL_SECRET=             # X-Internal-Secret 헤더 값 (필수, Spring과 동일한 값으로 맞춰야 함)

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL_INTERVIEW=gpt-4o          # LLM 질문 생성·리포트 분석 모델
OPENAI_MODEL_STT=whisper-1             # STT 모델
OPENAI_MODEL_TTS=tts-1                 # TTS 모델
OPENAI_TTS_VOICE=alloy                 # TTS 음성 종류 (alloy / echo / fable / onyx / nova / shimmer)
OPENAI_LLM_TIMEOUT_SECONDS=10         # LLM 응답 타임아웃 (초)
VOICE_QUALITY_THRESHOLD=50.0          # voiceQualityRatio 하한값 — 미달 시 delivery/fluency null 처리

# JWT (Spring 공유 시크릿)
JWT_SECRET=                            # FastAPI WebSocket 연결 시 토큰 검증용

# 내부 서버 설정
INTERNAL_HOST=0.0.0.0
INTERNAL_PORT=8001
```

---

## 6. 패키지 구조

```text
fastapi/user/
├── api/
│   └── interview_router.py            # /internal/user/interview/** 라우터
├── websocket/
│   └── interview_ws_handler.py        # WS /ws/user/interview/{sessionId}/ai 핸들러
├── prompts/
│   ├── interview_prompts.py           # LLM 시스템 프롬프트, 폴백 질문 목록
│   └── report_prompts.py              # 리포트 분석 프롬프트
└── pipeline/
    ├── stt_pipeline.py                # Whisper STT 파이프라인
    ├── tts_pipeline.py                # TTS 생성 파이프라인
    ├── llm_pipeline.py                # LLM 질문 생성 파이프라인
    └── report_pipeline.py             # 리포트 분석 파이프라인

fastapi/core/
├── config.py                          # 환경 변수 설정 (pydantic-settings)
└── spring_client.py                   # Spring Boot 내부 API 클라이언트
```

---

## 7. 내부 오류 계약

### 공통 오류 응답 형식

```json
{
  "success": false,
  "errorCode": "INTERVIEW_STT_FAILED",
  "message": "음성 인식 처리에 실패했습니다.",
  "detail": {
    "sessionId": "uuid-v4",
    "questionOrder": 1,
    "chunkIndex": 3
  }
}
```

### FastAPI → Spring 내부 오류 매핑

| FastAPI ErrorCode | 설명 |
|---|---|
| `INTERVIEW_STT_FAILED` | STT 변환 실패 |
| `INTERVIEW_TTS_FAILED` | TTS 변환 실패 |
| `INTERVIEW_LLM_FAILED` | LLM 질문 생성 실패 |
| `INTERVIEW_REPORT_GENERATION_FAILED` | 리포트 생성 실패 |
| `INTERVIEW_RAG_INDEXING_FAILED` | RAG 컨텍스트 인덱싱 실패 |
| `INTERVIEW_CALLBACK_FAILED` | Spring 콜백 최종 실패 |
| `OPENAI_API_ERROR` | OpenAI API 호출 실패 |

---

## 8. FastAPI DB 접근 정책

FastAPI는 DB에 직접 접근하지 않는다.  
모든 데이터는 Spring Boot 내부 API 계약을 통해 교환한다.

| 테이블 | FastAPI 접근 | 설명 |
|--------|-------------|------|
| `interview_sessions` | 없음 | Spring이 관리, FastAPI는 sessionId만 사용 |
| `interview_messages` | 없음 | Spring이 저장, FastAPI는 콜백으로 전달 |
| `ai_interview_feedbacks` | 없음 | FastAPI 콜백 → Spring이 저장 |
| `career_histories` | 없음 | FastAPI 콜백 → Spring이 저장 |
