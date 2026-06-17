# Spec: AI 면접 API (User Interview)

**Feature Branch**: `feature/user-interview-be`  
**버전**: v1  
**Status**: 스펙 완료  
**관련 FE 스펙**: `specs/frontend/user/interview/spec.md`

---

## 도메인 개요

회원이 AI 면접관과 텍스트 또는 음성으로 모의 면접을 진행하고,
종료 후 역량 지표(Relevance·Depth·Delivery·Fluency) 기반의 피드백 리포트를 확인하는 REST + WebSocket API.

- 모든 면접 API는 JWT 인증 + USER 권한 필수
- 면접 세션(`interview_sessions`)과 피드백(`ai_interview_feedbacks`)은 소유권(`member_id`) 검증 필수
- 타인 세션 접근 시 403 반환 (IDOR 방어)
- 음성 면접 STT·LLM·TTS 처리는 FastAPI 서버가 담당하며, Spring은 세션 생명주기와 답변 저장을 담당한다

---

## ERD

### interview_sessions

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `session_id` | UUID | PK, DEFAULT gen_random_uuid() | 면접 세션 고유 식별자 |
| `member_id` | UUID | NULL | 회원 FK (비회원 세션 허용) |
| `document_id` | UUID | NULL | RAG 컨텍스트용 서류 FK |
| `session_type` | VARCHAR(10) | NOT NULL | `TEXT` \| `VOICE` \| `VIDEO` |
| `session_status` | VARCHAR(20) | NOT NULL, DEFAULT 'IN_PROGRESS' | `IN_PROGRESS` \| `COMPLETED` \| `FAILED` |
| `interview_type` | VARCHAR(20) | NULL | `TECHNICAL` \| `PERSONALITY` \| `PROJECT` |
| `target_company` | VARCHAR(100) | NULL | 준비 대상 기업명 |
| `total_score` | INTEGER | NULL | 종합 점수 (리포트 완료 후 산정) |
| `started_at` | TIMESTAMPTZ | NULL | 면접 시작 일시 |
| `ended_at` | TIMESTAMPTZ | NULL | 면접 종료 일시 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 세션 생성 일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 상태·점수 변경 일시 |

### interview_messages

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `message_id` | BIGSERIAL | PK | 메시지 식별자 |
| `session_id` | UUID | NOT NULL | 소속 세션 FK |
| `sender` | VARCHAR(10) | NOT NULL | `AI` \| `USER` |
| `message_type` | VARCHAR(20) | NOT NULL | `QUESTION` \| `ANSWER` \| `SYSTEM` |
| `message_content` | TEXT | NOT NULL | 메시지 본문 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 메시지 전송 일시 |

### ai_interview_feedbacks

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `interview_feedback_id` | BIGSERIAL | PK | 피드백 고유 식별자 |
| `session_id` | UUID | NOT NULL | 소속 세션 FK |
| `question_order` | INTEGER | NOT NULL | 질문 순서 (1-based) |
| `question_text` | TEXT | NOT NULL | 질문 본문 |
| `answer_text` | TEXT | NOT NULL | 답변 본문 (STT 변환 결과 포함) |
| `relevance_score` | INTEGER | NULL, CHECK (0~100) | 직무 연관성 점수 |
| `depth_score` | INTEGER | NULL, CHECK (0~100) | 답변 깊이 점수 |
| `delivery_score` | INTEGER | NULL, CHECK (0~100) | 전달력 점수 — 텍스트 면접 또는 음성 품질 미달 시 NULL |
| `fluency_score` | INTEGER | NULL, CHECK (0~100) | 유창성 점수 — 텍스트 면접 또는 음성 품질 미달 시 NULL |
| `voice_quality_ratio` | DECIMAL(5,2) | NULL, CHECK (0.00~100.00) | 음성 인식 유효 비율 — 텍스트 면접 시 NULL |
| `ai_feedback` | TEXT | NULL | 질문별 AI 피드백 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |

### career_histories

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `career_history_id` | BIGSERIAL | PK | 기록 고유 식별자 |
| `member_id` | UUID | NOT NULL | 회원 FK |
| `session_id` | UUID | NOT NULL | 면접 세션 FK |
| `document_id` | UUID | NULL | 연결 서류 FK |
| `total_score` | INTEGER | NULL | 최종 종합 점수 |
| `feedback` | TEXT | NULL | AI 종합 피드백 |
| `pdf_url` | VARCHAR(500) | NULL | 종합 진단 PDF URL (S3) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 기록 생성 일시 |

---

## 패키지 구조

```text
user/interview/
├── controller/
│   ├── InterviewSessionController.java
│   ├── InterviewCallbackController.java
│   ├── InterviewReportController.java
│   └── InterviewHistoryController.java
├── service/
│   ├── InterviewSessionService.java
│   ├── InterviewCallbackService.java
│   ├── InterviewReportService.java
│   └── InterviewHistoryService.java
├── scheduler/
│   └── InterviewSessionScheduler.java       ← 24시간 타임아웃 배치
├── repository/
│   ├── InterviewSessionRepository.java
│   ├── InterviewMessageRepository.java
│   ├── AIInterviewFeedbackRepository.java
│   └── CareerHistoryRepository.java
├── entity/
│   ├── InterviewSession.java
│   ├── InterviewMessage.java
│   ├── AIInterviewFeedback.java
│   └── CareerHistory.java
├── type/
│   ├── SessionType.java
│   ├── SessionStatus.java
│   ├── InterviewType.java
│   ├── MessageSender.java
│   └── MessageType.java
├── dto/
│   └── InterviewDTO.java
├── websocket/
│   ├── InterviewHandshakeInterceptor.java   ← JWT 핸드셰이크 검증
│   ├── InterviewStompChannelInterceptor.java ← SUBSCRIBE 소유권 검증 + 스냅샷 전송
│   └── WebSocketMessage.java                ← STOMP 메시지 구조체
└── docs/
    ├── InterviewSessionControllerDocs.java
    ├── InterviewReportControllerDocs.java
    └── InterviewHistoryControllerDocs.java
```

> **WebSocket 설정**: `global/config/WebSocketConfig.java`에 resume STOMP 설정과 함께 통합. 별도 `InterviewWebSocketConfig`는 없다.

---

## DTO 구조

### InterviewDTO.java

```java
public class InterviewDTO {

    // 세션 시작 요청
    public record RequestStartSession(
        String documentId,                           // nullable — RAG 컨텍스트용
        @NotBlank String sessionType,                // TEXT | VOICE | VIDEO
        String interviewType,                        // nullable — TECHNICAL | PERSONALITY | PROJECT
        @Size(max = 100) String targetCompany        // nullable
    ) {}

    // 세션 시작 응답
    public record ResponseStartSession(
        String sessionId,
        String sessionStatus,
        String sessionType,
        String documentId,
        ZonedDateTime createdAt
    ) {}

    // 텍스트 답변 제출 요청
    public record RequestSubmitTextAnswer(
        @NotNull @Min(1) Integer questionOrder,
        @NotBlank String messageContent
    ) {}

    // 텍스트 답변 제출 응답
    public record ResponseSubmitTextAnswer(
        Long messageId,
        ZonedDateTime createdAt
    ) {}

    // 음성 청크 제출 응답
    public record ResponseSubmitVoiceChunk(
        Integer chunkIndex,
        boolean received
    ) {}

    // 세션 종료 응답
    public record ResponseEndSession(
        String sessionId,
        String sessionStatus,
        ZonedDateTime endedAt
    ) {}

    // 피드백 항목 (리포트용)
    public record FeedbackItem(
        Integer questionOrder,
        String questionText,
        String answerText,
        Integer relevanceScore,
        Integer depthScore,
        Integer deliveryScore,       // 음성 품질 미달 또는 텍스트 면접 시 null
        Integer fluencyScore,        // 음성 품질 미달 또는 텍스트 면접 시 null
        BigDecimal voiceQualityRatio, // 텍스트 면접 시 null
        String aiFeedback,
        ZonedDateTime createdAt
    ) {}

    // 리포트 조회 응답
    public record ResponseReport(
        String sessionId,
        String sessionStatus,
        String sessionType,
        Integer totalScore,          // 리포트 미완료 시 null
        List<FeedbackItem> feedbacks,
        ZonedDateTime createdAt
    ) {}

    // 이력 목록 항목 (career_histories 기반)
    public record HistoryItem(
        Long careerHistoryId,
        String sessionId,
        String sessionType,
        String interviewType,        // nullable
        String targetCompany,        // nullable
        String sessionStatus,
        Integer totalScore,          // nullable
        String pdfUrl,               // nullable — 종합 진단 PDF URL
        ZonedDateTime createdAt
    ) {}
}
```

---

## API 명세

### 면접 세션

```http
POST /api/v1/user/interview/sessions
     Body: InterviewDTO.RequestStartSession
     → ApiResponse<InterviewDTO.ResponseStartSession>  (200)
     세션 생성 후 sessionId 반환, FastAPI에 RAG 컨텍스트 비동기 전달

POST /api/v1/user/interview/sessions/{sessionId}/answer/text
     Body: InterviewDTO.RequestSubmitTextAnswer
     → ApiResponse<InterviewDTO.ResponseSubmitTextAnswer>  (200)
     소유권 검증 필수, 저장 후 FastAPI LLM 파이프라인 트리거

POST /api/v1/user/interview/sessions/{sessionId}/answer/voice
     Body: multipart/form-data (audioChunk + questionOrder + chunkIndex + isFinal)
     → ApiResponse<InterviewDTO.ResponseSubmitVoiceChunk>  (200)
     소유권 검증 필수, FastAPI STT 파이프라인 트리거
     제약: 청크당 최대 5MB / 허용 포맷: audio/webm, audio/mp4, audio/ogg / Content-Type 검증 필수

POST /api/v1/user/interview/sessions/{sessionId}/end
     → ApiResponse<InterviewDTO.ResponseEndSession>  (200)
     소유권 검증 필수, session_status = COMPLETED, FastAPI 리포트 생성 트리거
```

### 리포트 조회

```http
GET /api/v1/user/interview/sessions/{sessionId}/report
    → ApiResponse<InterviewDTO.ResponseReport>
    소유권 검증 필수, COMPLETED 세션의 전체 피드백 반환
```

### 면접 이력

```http
GET /api/v1/user/interview/history?page=0&size=10
    → ApiResponse<PaginationResponse<InterviewDTO.HistoryItem>>
    career_histories 기반 본인 기록만 created_at DESC 페이징 반환
```

---

## 서비스 로직

### InterviewSessionService

#### startSession(UUID memberId, RequestStartSession dto)
- `session_id` UUID 생성
- `document_id`가 있으면 FastAPI 측 RAG 컨텍스트 비동기 등록 요청
- `session_status = IN_PROGRESS`, `started_at = 현재 시각`으로 저장
- `@Transactional` 적용
- 반환: `ResponseStartSession`

#### submitTextAnswer(UUID memberId, String sessionId, RequestSubmitTextAnswer dto)
- `session_id` 소유권 검증 — 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`
- `InterviewMessage` 저장 (`sender = USER`, `message_type = ANSWER`)
- FastAPI WebSocket으로 LLM 파이프라인 트리거 (비동기)
- `@Transactional` 적용
- 반환: `ResponseSubmitTextAnswer`

#### submitVoiceChunk(UUID memberId, String sessionId, MultipartFile audioChunk, int questionOrder, int chunkIndex, boolean isFinal)
- `session_id` 소유권 검증 — 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`
- FastAPI STT 파이프라인으로 오디오 청크 전달 (비동기, 트랜잭션 외부)
- `isFinal = true`이면 해당 질문 답변 완료 처리
- 반환: `ResponseSubmitVoiceChunk`

#### endSession(UUID memberId, String sessionId)
- `session_id` 소유권 검증 — 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`
- 이미 종료된 세션(`COMPLETED` / `FAILED`) 재종료 시 `INTERVIEW_SESSION_ALREADY_ENDED(400)`
- `session_status = COMPLETED`, `ended_at = 현재 시각` 업데이트
- FastAPI 리포트 생성 비동기 트리거
- `@Transactional` 적용
- 반환: `ResponseEndSession`

### InterviewReportService

#### getReport(UUID memberId, UUID sessionId)
- `findBySessionIdAndMemberId`로 세션 조회 — 존재하지 않거나 소유권 불일치 시 둘 다 `INTERVIEW_SESSION_FORBIDDEN(403)` 반환 (IDOR 방어: 타인 세션 존재 여부를 노출하지 않음)
- `ai_interview_feedbacks` 미존재 시 `INTERVIEW_REPORT_NOT_READY(409)` — additionalData: `ResponseReportNotReady("ANALYZING", 15)`
- `ai_interview_feedbacks` 조회 후 `question_order ASC` 정렬
- `voiceQualityRatio`가 `null`이거나 `50.00 미만`인 항목의 `deliveryScore` / `fluencyScore`는 `null` 반환
- 반환: `ResponseReport`

### InterviewHistoryService

#### getHistory(UUID memberId, int page, int size)
- `career_histories` 기반 조회 — `member_id = memberId` 필터 필수 (타인 조회 차단)
- `interview_sessions` JOIN — `session_type` / `interview_type` / `target_company` / `session_status` 취득
- `career_histories.created_at DESC`, 페이징 처리
- 반환: `PaginationResponse<HistoryItem>`

---

## WebSocket 채널 (Spring 담당, STOMP)

> resume 도메인과 동일하게 STOMP 프로토콜을 사용한다. `WebSocketConfig`의 단일 STOMP 브로커에 통합되어 있다.

### 연결 엔드포인트
```
WS /ws/user/interview?token={accessToken}
```
- 핸드셰이크 시 `?token=` 쿼리 파라미터로 JWT 검증 → `memberId`를 세션 attributes에 저장
- 검증 실패 시 연결 거부

### 구독 경로
```
SUBSCRIBE /topic/interview/{sessionId}
```
- SUBSCRIBE 시 `sessionId` 소유권 검증 (IDOR 방지)
- 소유권 불일치 시 `MessageDeliveryException` 발생 → 연결 종료
- 구독 직후 현재 상태 스냅샷 1회 전송
  - 리포트 완성 여부에 따라 `REPORT_READY` 또는 `SESSION_START` 메시지 전송

### Server → Client 메시지

```json
{ "type": "SYSTEM",   "content": "면접 세션이 시작되었습니다.",       "questionOrder": null, "subType": "SESSION_START",  "data": null,                                                               "errorCode": null }
{ "type": "QUESTION", "content": "지원 동기를 말씀해 주세요.",         "questionOrder": 1,    "subType": null,             "data": null,                                                               "errorCode": null }
{ "type": "SYSTEM",   "content": "리포트 생성이 완료되었습니다.",       "questionOrder": null, "subType": "REPORT_READY",   "data": { "reportUrl": "/api/v1/user/interview/sessions/{sessionId}/report" }, "errorCode": null }
{ "type": "ERROR",    "content": "세션 처리 중 오류가 발생했습니다.",   "questionOrder": null, "subType": null,             "data": null,                                                               "errorCode": "INTERVIEW_AI_PIPELINE_ERROR" }
```

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|-----------|------|----------|
| `INTERVIEW_SESSION_NOT_FOUND` | 404 | 존재하지 않는 `sessionId` |
| `INTERVIEW_SESSION_FORBIDDEN` | 403 | 본인 소유가 아닌 세션 접근 |
| `INTERVIEW_SESSION_ALREADY_ENDED` | 400 | 이미 종료된 세션 재종료 시도 |
| `INTERVIEW_INVALID_SESSION_TYPE` | 400 | 유효하지 않은 `sessionType` 값 |
| `INTERVIEW_DOCUMENT_NOT_FOUND` | 404 | 유효하지 않은 `documentId` |
| `INTERVIEW_SESSION_DUPLICATE` | 409 | 동일 회원이 `IN_PROGRESS` 세션을 이미 보유한 상태에서 신규 세션 시작 시도 |
| `INTERVIEW_REPORT_NOT_READY` | 409 | 리포트 생성 중 상태에서 `getReport` 호출 |
| `UNAUTHORIZED` | 401 | 토큰 없음 또는 만료 |

---

## 세션 타임아웃 정책

- 세션 생성 후 **24시간** 동안 `endSession` 요청이 없으면 서버 스케줄러가 해당 세션을 강제로 `FAILED` 처리한다.
- 배치 주기: 1시간 단위 (`@Scheduled(cron = "0 0 * * * *")`)
- 시간 기준: 모든 `ZonedDateTime.now()` 호출은 **KST (`Asia/Seoul`)** 기준으로 고정한다. JVM 기본 timezone 사용 금지.
- Repository: `findTimedOutSessions(ZonedDateTime cutoff, ZonedDateTime recentCutoff, SessionStatus status)` — `SessionStatus.IN_PROGRESS` 파라미터 명시 전달
- 쿼리 조건: `started_at < NOW() - INTERVAL '24 hours'` **AND** `session_status = 'IN_PROGRESS'` **AND** `updated_at < NOW() - INTERVAL '5 minutes'`
  - `updated_at` 조건은 방금 답변을 제출한 세션이 배치 실행 타이밍과 겹쳐 의도치 않게 `FAILED` 처리되는 상황을 방지하는 유예 조건이다.
- `FAILED` 전이 후 FastAPI 파이프라인 세션 별도 정리 요청은 하지 않는다. FastAPI가 자체 TTL로 만료 처리하며, Spring은 FAILED 마킹 + 처리 건수 `log.info` 기록만 담당한다.

---

## FastAPI 콜백 인터페이스 계약

FastAPI는 리포트 생성 완료 후 Spring 내부 API를 호출하여 결과를 전달한다.

### Endpoint (Spring 수신)

```
POST /internal/api/v1/interview/callback/{sessionId}/report
```

### Request Body

```json
{
  "sessionId": "uuid-v4",
  "totalScore": 78,
  "feedbacks": [
    {
      "questionOrder": 1,
      "questionText": "...",
      "answerText": "...",
      "relevanceScore": 85,
      "depthScore": 70,
      "deliveryScore": 80,
      "fluencyScore": 75,
      "voiceQualityRatio": 92.5,
      "aiFeedback": "..."
    }
  ]
}
```

### 인증

내부망 통신이라도 외부 호출을 반드시 차단해야 한다. 아래 두 가지 중 하나를 적용한다.

| 방식 | 설명 |
|------|------|
| `X-Internal-Secret` 헤더 | FastAPI가 요청 헤더에 사전 공유 시크릿 값을 포함. Spring이 검증 후 불일치 시 401 반환 |
| IP 화이트리스트 | Spring Security에서 FastAPI 서버 IP만 허용, 그 외 403 반환 |

> v1에서는 `X-Internal-Secret` 헤더 방식을 권장한다. 시크릿 값은 환경 변수로 관리하며 코드에 하드코딩하지 않는다.

### Spring 처리 순서 (멱등성 보장)

1. `AIInterviewFeedbackRepository.existsBySessionId(sessionId)` 확인
   - **이미 존재하면**: 중복 콜백으로 판단하고 `200 OK`를 반환한 뒤 이하 DB 로직을 건너뛴다
   - **존재하지 않으면**: 아래 순서 진행 (단일 `@Transactional` 경계 안에서 원자적으로 처리)
2. `ai_interview_feedbacks` 저장
3. `interview_sessions.total_score` 업데이트
4. `career_histories` INSERT
5. **DB 커밋 완료 후** WebSocket `REPORT_READY` 메시지 전송 (`TransactionSynchronization.afterCommit()` 활용)
   - WebSocket 전송(외부 I/O)은 트랜잭션 범위 밖에서 수행한다

> FastAPI가 네트워크 오류로 콜백을 2회 이상 호출할 수 있다. 멱등성 체크 외에도 `(session_id, question_order)` DB 유니크 제약이 최종 중복 방어선 역할을 한다.

### DB 유니크 제약

| 테이블 | 제약 |
|--------|------|
| `ai_interview_feedbacks` | `(session_id, question_order)` 복합 유니크 |
| `career_histories` | `session_id` 유니크 |

---

## Assumptions

- 음성 STT·LLM·TTS 처리는 FastAPI 서버가 전담하며, Spring은 결과 수신 및 저장만 담당한다
- WebSocket 재연결 정책(heartbeat 주기, 최대 횟수)은 프론트엔드 스펙 기준 준수
- `voiceQualityRatio` 계산은 FastAPI 파이프라인 결과를 그대로 저장하며, Spring에서 재산정하지 않는다
- `document_id` 유효성 검증 방법(서류 도메인 연동 여부)은 구현 단계에서 협의 필요
- 리포트 생성 완료 알림은 FastAPI → Spring 콜백(`/internal/api/v1/interview/callback/{sessionId}/report`) → Spring WebSocket 경유로 프론트엔드에 전달
