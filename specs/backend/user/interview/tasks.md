# Tasks: AI 면접 API (User Interview)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — Entity & Type 정의

- [x] `SessionType.java` Enum
  - [x] `TEXT` / `VOICE` / `VIDEO`
  - [x] `@Enumerated(EnumType.STRING)` 적용 확인

- [x] `SessionStatus.java` Enum
  - [x] `IN_PROGRESS` / `COMPLETED` / `FAILED`

- [x] `InterviewType.java` Enum
  - [x] `TECHNICAL` / `PERSONALITY` / `PROJECT`

- [x] `MessageSender.java` Enum
  - [x] `AI` / `USER`

- [x] `MessageType.java` Enum
  - [x] `QUESTION` / `ANSWER` / `SYSTEM`

- [x] `InterviewSession.java` Entity
  - [x] `session_id` UUID PK (DB DEFAULT gen_random_uuid())
  - [x] `member_id` UUID nullable — 비회원 세션 허용
  - [x] `document_id` UUID nullable
  - [x] `session_type` SessionType Enum (`@Enumerated(EnumType.STRING)`)
  - [x] `session_status` SessionStatus Enum (`@Enumerated(EnumType.STRING)`)
  - [x] `interview_type` InterviewType Enum nullable
  - [x] `target_company` VARCHAR(100) nullable
  - [x] `total_score` INTEGER nullable
  - [x] `started_at` / `ended_at` / `created_at` / `updated_at` ZonedDateTime
  - [x] `@NoArgsConstructor(access = AccessLevel.PROTECTED)` 적용
  - [x] `complete(ZonedDateTime endedAt)` 상태 전이 메서드 — COMPLETED + endedAt 기록
  - [x] `fail(ZonedDateTime endedAt)` 상태 전이 메서드 — FAILED + endedAt 기록

- [x] `InterviewMessage.java` Entity
  - [x] `message_id` BIGSERIAL PK
  - [x] `session_id` UUID NOT NULL FK
  - [x] `sender` MessageSender Enum NOT NULL
  - [x] `message_type` MessageType Enum NOT NULL (`QUESTION` / `ANSWER` / `SYSTEM`)
  - [x] `message_content` TEXT NOT NULL
  - [x] `created_at` ZonedDateTime NOT NULL
  - [x] `@NoArgsConstructor(access = AccessLevel.PROTECTED)` 적용

- [x] `AIInterviewFeedback.java` Entity
  - [x] `interviewFeedbackId` BIGSERIAL PK (컬럼명 `interview_feedback_id`)
  - [x] `session_id` UUID NOT NULL FK
  - [x] `question_order` INTEGER NOT NULL
  - [x] `question_text` / `answer_text` TEXT NOT NULL
  - [x] `relevance_score` / `depth_score` / `delivery_score` / `fluency_score` INTEGER nullable, CHECK (0~100)
  - [x] `voice_quality_ratio` DECIMAL(5,2) nullable, CHECK (0.00~100.00)
  - [x] `@org.hibernate.annotations.Check` — 5개 점수 필드 범위 DB CHECK 제약 적용
  - [x] `ai_feedback` TEXT nullable
  - [x] `created_at` ZonedDateTime NOT NULL
  - [x] `@NoArgsConstructor(access = AccessLevel.PROTECTED)` 적용

- [x] `CareerHistory.java` Entity
  - [x] `career_history_id` BIGSERIAL PK
  - [x] `member_id` UUID NOT NULL FK
  - [x] `session_id` UUID NOT NULL FK
  - [x] `document_id` UUID nullable FK
  - [x] `total_score` INTEGER nullable
  - [x] `feedback` TEXT nullable
  - [x] `pdf_url` VARCHAR(500) nullable
  - [x] `created_at` ZonedDateTime NOT NULL
  - [x] `@NoArgsConstructor(access = AccessLevel.PROTECTED)` 적용

---

## Phase 2 — DTO 정의

- [x] `InterviewDTO.java`
  - [x] `RequestStartSession` — documentId(nullable) / sessionType(@NotBlank) / interviewType(nullable) / targetCompany(@Size(max=100), nullable)
  - [x] `ResponseStartSession` — sessionId / sessionStatus / sessionType / documentId / createdAt
  - [x] `RequestSubmitTextAnswer` — questionOrder(@NotNull @Min(1)) / messageContent(@NotBlank)
  - [x] `ResponseSubmitTextAnswer` — messageId / createdAt
  - [x] `ResponseSubmitVoiceChunk` — chunkIndex / received
  - [x] `ResponseEndSession` — sessionId / sessionStatus / endedAt
  - [x] `FeedbackItem` — questionOrder / questionText / answerText / relevanceScore / depthScore / deliveryScore(nullable) / fluencyScore(nullable) / voiceQualityRatio(nullable) / aiFeedback / createdAt
  - [x] `ResponseReport` — sessionId / sessionStatus / sessionType / totalScore(nullable) / feedbacks / createdAt
  - [x] `HistoryItem` — careerHistoryId / sessionId / sessionType / interviewType(nullable) / targetCompany(nullable) / sessionStatus / totalScore(nullable) / pdfUrl(nullable) / createdAt

---

## Phase 3 — Repository 구현

- [x] `InterviewSessionRepository.java`
  - [x] `findBySessionId(UUID sessionId)` — 단순 조회
  - [x] `findBySessionIdAndMemberId(UUID sessionId, UUID memberId)` — 소유권 검증용
  - [x] `findInProgressByMemberId(UUID memberId, SessionStatus status)` — `@Lock(PESSIMISTIC_WRITE)` 적용, 중복 세션 체크용 (SessionStatus 파라미터로 IN_PROGRESS 전달)

- [x] `InterviewMessageRepository.java`
  - [x] `findBySessionIdOrderByCreatedAtAsc(UUID sessionId)` — 세션 메시지 전체 조회

- [x] `AIInterviewFeedbackRepository.java`
  - [x] `findBySessionIdOrderByQuestionOrderAsc(UUID sessionId)` — 리포트 피드백 조회

- [x] `CareerHistoryRepository.java`
  - [x] `findByMemberIdOrderByCreatedAtDesc(UUID memberId, Pageable pageable)` — 이력 페이징
  - [x] `findByMemberIdAndSessionId(UUID memberId, UUID sessionId)` — 단건 조회

---

## Phase 4 — Service 구현

> **@Transactional 범위 원칙**: `@Transactional`은 DB 저장에만 짧게 적용하고, FastAPI 호출은 트랜잭션 종료 후 수행한다.
> DB Connection이 외부 네트워크 통신을 기다리면 Connection Pool 고갈로 서버 전체가 응답 불가 상태가 될 수 있다.
> `submitTextAnswer` / `endSession` 모두 동일 원칙 적용.

### InterviewSessionService

- [x] `startSession(UUID memberId, RequestStartSession dto)`
  - [x] `SessionType` 유효성 검증 — 유효하지 않으면 `INTERVIEW_INVALID_SESSION_TYPE(400)`
  - [x] `documentId` 존재 시 유효성 검증 — 없으면 `INTERVIEW_DOCUMENT_NOT_FOUND(404)`
  - [x] `InterviewSession` 저장 (`session_status = IN_PROGRESS`, `started_at = 현재 시각`)
  - [x] FastAPI RAG 컨텍스트 비동기 등록 (documentId 있는 경우, 트랜잭션 외부)
  - [x] DB 저장은 `@Transactional` 내부 메서드로 분리, FastAPI 호출은 트랜잭션 외부
  - [x] 반환: `ResponseStartSession`

- [x] `submitTextAnswer(UUID memberId, UUID sessionId, RequestSubmitTextAnswer dto)`
  - [x] `session_id` 존재 여부 검증 — 없으면 `INTERVIEW_SESSION_NOT_FOUND(404)`
  - [x] `session_id` 소유권 검증 — 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`
  - [x] `InterviewMessage` 저장 (`sender = USER`, `message_type = ANSWER`)
  - [x] FastAPI LLM 파이프라인 비동기 트리거 (트랜잭션 외부)
  - [x] 반환: `ResponseSubmitTextAnswer`

- [x] `submitVoiceChunk(UUID memberId, UUID sessionId, MultipartFile audioChunk, int questionOrder, int chunkIndex, boolean isFinal)`
  - [x] Content-Type 검증 — audio/webm, audio/mp4, audio/ogg만 허용 (`INTERVIEW_INVALID_AUDIO_FORMAT(400)`)
  - [x] `session_id` 존재 여부 검증 — 없으면 `INTERVIEW_SESSION_NOT_FOUND(404)`
  - [x] `session_id` 소유권 검증 — 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`
  - [x] FastAPI STT 파이프라인으로 오디오 청크 비동기 전달 (트랜잭션 외부)
  - [x] 반환: `ResponseSubmitVoiceChunk`

- [x] `endSession(UUID memberId, UUID sessionId)`
  - [x] `session_id` 존재 여부 검증 — 없으면 `INTERVIEW_SESSION_NOT_FOUND(404)`
  - [x] `session_id` 소유권 검증 — 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`
  - [x] `COMPLETED` / `FAILED` 세션 재종료 시 `INTERVIEW_SESSION_ALREADY_ENDED(400)` — 멱등성 체크
  - [x] `complete(endedAt)` 메서드로 상태 변경 (`COMPLETED`, `ended_at = 현재 시각`)
  - [x] FastAPI 리포트 생성 비동기 트리거 (트랜잭션 외부)
  - [x] 반환: `ResponseEndSession`

### InterviewReportService

- [x] `getReport(UUID memberId, UUID sessionId)`
  - [x] `findBySessionIdAndMemberId`로 세션 조회 — 존재하지 않거나 소유권 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)` (IDOR 방어: 타인 세션 존재 여부 미노출)
  - [x] 피드백 미존재 시 `INTERVIEW_REPORT_NOT_READY(409)` — additionalData: `ResponseReportNotReady("ANALYZING", 15)`
  - [x] `ai_interview_feedbacks` 조회 (`question_order ASC`)
  - [x] `voiceQualityRatio`가 `null`이거나 `50.00 미만`인 피드백 → `deliveryScore` / `fluencyScore` null 처리 (`50.00` 이상이면 정상 반환)
  - [x] 반환: `ResponseReport`

### InterviewHistoryService

- [x] `getHistory(UUID memberId, int page, int size)`
  - [x] `career_histories` 기반 조회 — `member_id = memberId` 필터 필수 (타인 조회 차단)
  - [x] 2-query N+1 방지: CareerHistory 페이지 조회 → `findAllBySessionIdIn` 벌크 fetch → Map 조인
  - [x] `career_histories.created_at DESC` 정렬, PageRequest 0-based
  - [x] 세션 삭제된 이력은 sessionType/sessionStatus null 처리
  - [x] 반환: `PaginationResponse<HistoryItem>`

---

## Phase 5 — Controller & Swagger Docs

- [x] `InterviewSessionController.java`
  - [x] `POST /api/v1/user/interview/sessions` — `@RequestBody @Valid RequestStartSession`
  - [x] `POST /api/v1/user/interview/sessions/{sessionId}/answer/text` — `@PathVariable UUID`, `@RequestBody @Valid RequestSubmitTextAnswer`
  - [x] `POST /api/v1/user/interview/sessions/{sessionId}/answer/voice` — `@PathVariable UUID`, `@RequestParam MultipartFile audioChunk` + 파라미터, `consumes = MULTIPART_FORM_DATA`, `questionOrder @Min(1)` / `chunkIndex @Min(0)` 하한값 검증 (`@Min` 어노테이션은 `InterviewSessionControllerDocs` 인터페이스로 이동, Controller에서 `@Validated` 제거됨)
  - [x] `POST /api/v1/user/interview/sessions/{sessionId}/end` — `@PathVariable UUID`
  - [x] 모든 메서드에 `@AuthenticationPrincipal AuthPrincipal` 적용
  - [x] Controller에서 `try-catch` 사용 금지

- [x] `InterviewReportController.java`
  - [x] `GET /api/v1/user/interview/sessions/{sessionId}/report` — `@PathVariable UUID sessionId`

- [x] `InterviewHistoryController.java`
  - [x] `GET /api/v1/user/interview/history` — `@RequestParam(defaultValue="0") int page`, `@RequestParam(defaultValue="10") int size`
  - [x] `@Validated` 적용 — Docs 인터페이스 `@Min(0)` / `@Min(1)` 제약 검증 활성화

- [x] Swagger Docs 인터페이스 분리
  - [x] `InterviewSessionControllerDocs.java` — `@Tag(name = "User Interview Session")`
  - [x] `InterviewReportControllerDocs.java` — `@Tag(name = "User Interview Report")`
  - [x] `InterviewHistoryControllerDocs.java` — `@Tag(name = "User Interview History")`, `@Min(0) page` / `@Min(1) size` 검증 추가

---

## Phase 6 — WebSocket 구현 (STOMP)

> resume 도메인과 동일하게 STOMP 프로토콜 사용. `global/config/WebSocketConfig.java`에 통합.
> **REPORT_READY 유실 방지**: 구독(`SUBSCRIBE`) 시점에 피드백 존재 여부를 DB로 확인하여
> 이미 완료 상태라면 `REPORT_READY`, 진행 중이면 `SESSION_START`를 스냅샷으로 즉시 전송한다.

- [x] STOMP 엔드포인트 등록 — `WebSocketConfig`에 `/ws/user/interview` 추가
- [x] `InterviewHandshakeInterceptor` — `?token=` JWT 검증 → `memberId`를 세션 attributes에 저장
- [x] `InterviewStompChannelInterceptor` — STOMP 프레임 인터셉터
  - [x] `CONNECT`: `memberId` 존재 여부 재검증
  - [x] `SUBSCRIBE /topic/interview/{sessionId}`: sessionId 소유권 검증 (IDOR 방지)
  - [x] 구독 완료 후 스냅샷 전송 (`SessionSubscribeEvent` 기반) — `REPORT_READY` 또는 `SESSION_START`
- [x] 메시지 전송 (`SimpMessagingTemplate`)
  - [x] `SESSION_START` — 세션 시작 안내
  - [x] `REPORT_READY` — 리포트 생성 완료 알림 (`data.reportUrl` 포함)
  - [x] `ERROR` — 처리 오류 발생 시 클라이언트에 전송

---

## Phase 6-1 — 세션 타임아웃 스케줄러

- [x] `InterviewSessionScheduler.java` 구현
  - [x] `@Scheduled(cron = "0 0 * * * *")` — 1시간 주기 실행
  - [x] 조회 조건: `started_at < NOW() - 24h` AND `session_status = 'IN_PROGRESS'` AND `updated_at < NOW() - 5min`
  - [x] `findTimedOutSessions(cutoff, recentCutoff, SessionStatus.IN_PROGRESS)` — `SessionStatus` 파라미터 명시 전달
  - [x] 해당 세션 일괄 `FAILED` 전이
  - [x] 처리 건수 `log.info` 기록 (timedOut 비어 있으면 로그 생략)
  - [x] `ZonedDateTime.now(ZoneId.of("Asia/Seoul"))` — KST 고정 (JVM 기본 timezone 사용 금지)

## Phase 6-2 — FastAPI 콜백 수신 Controller

- [x] `InterviewCallbackController.java` — `POST /internal/api/v1/interview/callback/{sessionId}/report`
- [x] `InterviewCallbackController.java` — `POST /internal/api/v1/interview/callback/{sessionId}/question`
  - [x] `X-Internal-Secret` 헤더 검증
  - [x] `processQuestionCallback` — `SimpMessagingTemplate`으로 `/topic/interview/{sessionId}` STOMP 릴레이
  - [x] Spring Security `permitAll` 등록 (`/internal/api/v1/interview/callback/*/question`)
  - [x] `X-Internal-Secret` 헤더 검증 — 불일치 시 401 반환 (값은 `${INTERVIEW_INTERNAL_SECRET}` 환경변수)
  - [x] `AIInterviewFeedbackRepository.existsBySessionId(sessionId)` 멱등성 체크 — 이미 존재하면 REPORT_READY 재전송 후 200 반환
  - [x] `processReportCallback`에 `@Transactional` 적용 — DB 저장 전체를 단일 트랜잭션으로 보장 (self-invocation 방지)
  - [x] `ai_interview_feedbacks` 저장 + `(session_id, question_order)` 복합 유니크 제약
  - [x] `interview_sessions.total_score` 업데이트
  - [x] `career_histories` INSERT + `session_id` 유니크 제약
  - [x] WebSocket `REPORT_READY` 전송 — `TransactionSynchronization.afterCommit()` 사용, 트랜잭션 외부 I/O 원칙 준수

---

## Phase 7 — Security & ErrorCode

- [ ] Security 설정
  - [ ] `POST /api/v1/user/interview/**` → `hasRole('USER')`
  - [ ] `GET /api/v1/user/interview/**` → `hasRole('USER')`
  - [ ] `POST /internal/**` → 외부 접근 차단 (내부망 전용)

- [ ] ErrorCode 추가
  - [ ] `INTERVIEW_SESSION_NOT_FOUND` (404)
  - [ ] `INTERVIEW_SESSION_FORBIDDEN` (403)
  - [ ] `INTERVIEW_SESSION_ALREADY_ENDED` (400)
  - [ ] `INTERVIEW_INVALID_SESSION_TYPE` (400)
  - [ ] `INTERVIEW_DOCUMENT_NOT_FOUND` (404)
  - [ ] `INTERVIEW_SESSION_DUPLICATE` (409) — 동일 회원이 `IN_PROGRESS` 세션을 이미 보유한 경우
  - [ ] `INTERVIEW_REPORT_NOT_READY` (409) — 리포트 생성 중 상태에서 `getReport` 호출 시
  - [ ] 중복 선언 금지 — 기존 ErrorCode 재사용 여부 먼저 확인

---

## Phase 8 — 검증

> **먼저 작성할 JUnit 테스트 3가지** — 다른 기능 추가 중 가장 쉽게 깨지는 핵심 불변 규칙이다.
>
> 1. `endSession` 멱등성 — 이미 `COMPLETED`인 세션 재종료 시 `INTERVIEW_SESSION_ALREADY_ENDED(400)` 반환
> 2. 소유권 검증 — 타인 `sessionId`로 API 호출 시 `INTERVIEW_SESSION_FORBIDDEN(403)` 반환
> 3. `voiceQualityRatio` null 처리 — `49.99`이면 delivery/fluency null, `50.00`이면 정상값 반환

- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] Swagger UI에서 전체 API 요청/응답 확인
- [ ] FE `api-schema.md` 계약과 실제 응답 필드명·타입 일치 확인
- [ ] 타인 `sessionId`로 API 호출 시 403 반환 확인
- [ ] `voiceQualityRatio = 49.99` 항목의 delivery/fluency가 null로 반환되는지 확인
- [ ] `voiceQualityRatio = 50.00` 항목의 delivery/fluency가 정상 반환되는지 확인
- [ ] 이미 `COMPLETED` 세션 재종료 시 400 반환 확인
- [ ] 미인증 상태에서 API 호출 시 401 반환 확인
- [ ] 잘못된 `sessionType` 값 전송 시 400 반환 확인
- [ ] 이력 목록이 `created_at DESC` 최신순으로 반환되는지 확인
- [ ] 이력 목록에서 본인 세션만 반환되는지 확인 (타인 세션 미포함)
