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
│   ├── InterviewReportController.java
│   └── InterviewHistoryController.java
├── service/
│   ├── InterviewSessionService.java
│   ├── InterviewReportService.java
│   └── InterviewHistoryService.java
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
└── docs/
    ├── InterviewSessionControllerDocs.java
    ├── InterviewReportControllerDocs.java
    └── InterviewHistoryControllerDocs.java
```

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
- `document_id`가 있으면 FastAPI 측 RAG 컨텍스트 비동기 등록 요청 (v1 구현 범위 협의 필요)
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
- Spring WebSocket `REPORT_READY` 메시지 전송 (리포트 완료 콜백)
- `@Transactional` 적용
- 반환: `ResponseEndSession`

### InterviewReportService

#### getReport(UUID memberId, String sessionId)
- `session_id` 소유권 검증 — 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`
- 존재하지 않는 `session_id` → `INTERVIEW_SESSION_NOT_FOUND(404)`
- `ai_interview_feedbacks` 조회 후 `question_order ASC` 정렬
- `voiceQualityRatio < 50.00`인 항목의 `deliveryScore` / `fluencyScore`는 `null` 반환
- 반환: `ResponseReport`

### InterviewHistoryService

#### getHistory(UUID memberId, int page, int size)
- `career_histories` 기반 조회 — `member_id = memberId` 필터 필수 (타인 조회 차단)
- `interview_sessions` JOIN — `session_type` / `interview_type` / `target_company` / `session_status` 취득
- `career_histories.created_at DESC`, 페이징 처리
- 반환: `PaginationResponse<HistoryItem>`

---

## WebSocket 채널 (Spring 담당)

### 연결
```
WS /ws/user/interview/{sessionId}/chat?token={accessToken}
```
- 연결 시 `sessionId` 소유권 + 토큰 검증
- 검증 실패 시 Close 1008

### Server → Client 메시지

```json
{ "type": "SYSTEM", "content": "면접이 시작되었습니다.", "questionOrder": null, "subType": "SESSION_START" }
{ "type": "QUESTION", "content": "지원 동기를 말씀해 주세요.", "questionOrder": 1, "subType": null }
{ "type": "SYSTEM", "content": "리포트 생성이 완료되었습니다.", "questionOrder": null, "subType": "REPORT_READY" }
{ "type": "ERROR", "content": "세션 처리 중 오류가 발생했습니다.", "questionOrder": null, "subType": null }
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

## Assumptions

- 음성 STT·LLM·TTS 처리는 FastAPI 서버가 전담하며, Spring은 결과 수신 및 저장만 담당한다
- FastAPI와의 통신 방식(HTTP 비동기 / 내부 이벤트)은 구현 단계에서 팀 협의 필요
- WebSocket 재연결 정책(heartbeat 주기, 최대 횟수)은 프론트엔드 스펙 기준 준수
- `voiceQualityRatio` 계산은 FastAPI 파이프라인 결과를 그대로 저장하며, Spring에서 재산정하지 않는다
- `document_id` 유효성 검증 방법(서류 도메인 연동 여부)은 구현 단계에서 협의 필요
- 리포트 생성 완료 알림은 FastAPI → Spring 콜백 → Spring WebSocket 경유로 프론트엔드에 전달
