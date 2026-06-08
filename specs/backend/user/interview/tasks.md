# Tasks: AI 면접 API (User Interview)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — Entity & Type 정의

- [ ] `SessionType.java` Enum
  - [ ] `TEXT` / `VOICE` / `VIDEO`
  - [ ] `@Enumerated(EnumType.STRING)` 적용 확인

- [ ] `SessionStatus.java` Enum
  - [ ] `IN_PROGRESS` / `COMPLETED` / `FAILED`

- [ ] `InterviewType.java` Enum
  - [ ] `TECHNICAL` / `PERSONALITY` / `PROJECT`

- [ ] `MessageSender.java` Enum
  - [ ] `AI` / `USER`

- [ ] `MessageType.java` Enum
  - [ ] `QUESTION` / `ANSWER` / `SYSTEM`

- [ ] `InterviewSession.java` Entity
  - [ ] `session_id` UUID PK (DB DEFAULT gen_random_uuid())
  - [ ] `member_id` UUID nullable — 비회원 세션 허용
  - [ ] `document_id` UUID nullable
  - [ ] `session_type` SessionType Enum (`@Enumerated(EnumType.STRING)`)
  - [ ] `session_status` SessionStatus Enum (`@Enumerated(EnumType.STRING)`)
  - [ ] `interview_type` InterviewType Enum nullable
  - [ ] `target_company` VARCHAR(100) nullable
  - [ ] `total_score` INTEGER nullable
  - [ ] `started_at` / `ended_at` / `created_at` / `updated_at` ZonedDateTime
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)` 적용
  - [ ] `complete(ZonedDateTime endedAt)` 상태 전이 메서드

- [ ] `InterviewMessage.java` Entity
  - [ ] `message_id` BIGSERIAL PK
  - [ ] `session_id` UUID NOT NULL FK
  - [ ] `sender` MessageSender Enum NOT NULL
  - [ ] `message_type` MessageType Enum NOT NULL (`QUESTION` / `ANSWER` / `SYSTEM`)
  - [ ] `message_content` TEXT NOT NULL
  - [ ] `created_at` ZonedDateTime NOT NULL
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)` 적용

- [ ] `AIInterviewFeedback.java` Entity
  - [ ] `interviewFeedbackId` BIGSERIAL PK (컬럼명 `interview_feedback_id`)
  - [ ] `session_id` UUID NOT NULL FK
  - [ ] `question_order` INTEGER NOT NULL
  - [ ] `question_text` / `answer_text` TEXT NOT NULL
  - [ ] `relevance_score` / `depth_score` / `delivery_score` / `fluency_score` INTEGER nullable, CHECK (0~100)
  - [ ] `voice_quality_ratio` DECIMAL(5,2) nullable, CHECK (0.00~100.00)
  - [ ] `ai_feedback` TEXT nullable
  - [ ] `created_at` ZonedDateTime NOT NULL
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)` 적용

- [ ] `CareerHistory.java` Entity
  - [ ] `career_history_id` BIGSERIAL PK
  - [ ] `member_id` UUID NOT NULL FK
  - [ ] `session_id` UUID NOT NULL FK
  - [ ] `document_id` UUID nullable FK
  - [ ] `total_score` INTEGER nullable
  - [ ] `feedback` TEXT nullable
  - [ ] `pdf_url` VARCHAR(500) nullable
  - [ ] `created_at` ZonedDateTime NOT NULL
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)` 적용

---

## Phase 2 — DTO 정의

- [ ] `InterviewDTO.java`
  - [ ] `RequestStartSession` — documentId(nullable) / sessionType(@NotBlank) / interviewType(nullable) / targetCompany(@Size(max=100), nullable)
  - [ ] `ResponseStartSession` — sessionId / sessionStatus / sessionType / documentId / createdAt
  - [ ] `RequestSubmitTextAnswer` — questionOrder(@NotNull @Min(1)) / messageContent(@NotBlank)
  - [ ] `ResponseSubmitTextAnswer` — messageId / createdAt
  - [ ] `ResponseSubmitVoiceChunk` — chunkIndex / received
  - [ ] `ResponseEndSession` — sessionId / sessionStatus / endedAt
  - [ ] `FeedbackItem` — questionOrder / questionText / answerText / relevanceScore / depthScore / deliveryScore(nullable) / fluencyScore(nullable) / voiceQualityRatio(nullable) / aiFeedback / createdAt
  - [ ] `ResponseReport` — sessionId / sessionStatus / sessionType / totalScore(nullable) / feedbacks / createdAt
  - [ ] `HistoryItem` — careerHistoryId / sessionId / sessionType / interviewType(nullable) / targetCompany(nullable) / sessionStatus / totalScore(nullable) / pdfUrl(nullable) / createdAt

---

## Phase 3 — Repository 구현

- [ ] `InterviewSessionRepository.java`
  - [ ] `findBySessionId(UUID sessionId)` — 단순 조회
  - [ ] `findBySessionIdAndMemberId(UUID sessionId, UUID memberId)` — 소유권 검증용
  - [ ] `findInProgressByMemberId(UUID memberId)` — `@Lock(PESSIMISTIC_WRITE)` 적용, 중복 세션 체크용

- [ ] `InterviewMessageRepository.java`
  - [ ] `findBySessionIdOrderByCreatedAtAsc(UUID sessionId)` — 세션 메시지 전체 조회

- [ ] `AIInterviewFeedbackRepository.java`
  - [ ] `findBySessionIdOrderByQuestionOrderAsc(UUID sessionId)` — 리포트 피드백 조회

- [ ] `CareerHistoryRepository.java`
  - [ ] `findByMemberIdOrderByCreatedAtDesc(UUID memberId, Pageable pageable)` — 이력 페이징
  - [ ] `findByMemberIdAndSessionId(UUID memberId, UUID sessionId)` — 단건 조회

---

## Phase 4 — Service 구현

### InterviewSessionService

- [ ] `startSession(UUID memberId, RequestStartSession dto)`
  - [ ] `SessionType` 유효성 검증 — 유효하지 않으면 `INTERVIEW_INVALID_SESSION_TYPE(400)`
  - [ ] `documentId` 존재 시 유효성 검증 — 없으면 `INTERVIEW_DOCUMENT_NOT_FOUND(404)`
  - [ ] `InterviewSession` 저장 (`session_status = IN_PROGRESS`, `started_at = 현재 시각`)
  - [ ] FastAPI RAG 컨텍스트 비동기 등록 (documentId 있는 경우, 구현 방식 팀 협의)
  - [ ] `@Transactional` 적용
  - [ ] 반환: `ResponseStartSession`

- [ ] `submitTextAnswer(UUID memberId, String sessionId, RequestSubmitTextAnswer dto)`
  - [ ] `session_id` 소유권 검증 — 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`
  - [ ] 존재하지 않으면 `INTERVIEW_SESSION_NOT_FOUND(404)`
  - [ ] `InterviewMessage` 저장 (`sender = USER`, `message_type = ANSWER`)
  - [ ] FastAPI LLM 파이프라인 비동기 트리거
  - [ ] `@Transactional` 적용
  - [ ] 반환: `ResponseSubmitTextAnswer`

- [ ] `submitVoiceChunk(UUID memberId, String sessionId, MultipartFile audioChunk, int questionOrder, int chunkIndex, boolean isFinal)`
  - [ ] `session_id` 소유권 검증 — 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`
  - [ ] FastAPI STT 파이프라인으로 오디오 청크 비동기 전달 (트랜잭션 외부)
  - [ ] `isFinal = true`이면 해당 질문 답변 완료 처리
  - [ ] 반환: `ResponseSubmitVoiceChunk`

- [ ] `endSession(UUID memberId, String sessionId)`
  - [ ] `session_id` 소유권 검증 — 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`
  - [ ] 존재하지 않으면 `INTERVIEW_SESSION_NOT_FOUND(404)`
  - [ ] `COMPLETED` / `FAILED` 세션 재종료 시 `INTERVIEW_SESSION_ALREADY_ENDED(400)`
  - [ ] `complete(endedAt)` 메서드로 상태 변경 (`COMPLETED`, `ended_at = 현재 시각`)
  - [ ] FastAPI 리포트 생성 비동기 트리거
  - [ ] `@Transactional` 적용
  - [ ] 반환: `ResponseEndSession`

### InterviewReportService

- [ ] `getReport(UUID memberId, String sessionId)`
  - [ ] `session_id` 소유권 검증 — 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`
  - [ ] 존재하지 않으면 `INTERVIEW_SESSION_NOT_FOUND(404)`
  - [ ] `ai_interview_feedbacks` 조회 (`question_order ASC`)
  - [ ] `voiceQualityRatio`가 null이거나 50.00 미만인 피드백 → `deliveryScore` / `fluencyScore` null 처리
  - [ ] 반환: `ResponseReport`

### InterviewHistoryService

- [ ] `getHistory(UUID memberId, int page, int size)`
  - [ ] `career_histories` 기반 조회 — `member_id = memberId` 필터 필수 (타인 조회 차단)
  - [ ] `interview_sessions` JOIN — `session_type` / `interview_type` / `target_company` / `session_status` 취득
  - [ ] `career_histories.created_at DESC` 정렬, PageRequest 0-based
  - [ ] 반환: `PaginationResponse<HistoryItem>`

---

## Phase 5 — Controller & Swagger Docs

- [ ] `InterviewSessionController.java`
  - [ ] `POST /api/v1/user/interview/sessions` — `@RequestBody @Valid RequestStartSession`
  - [ ] `POST /api/v1/user/interview/sessions/{sessionId}/answer/text` — `@RequestBody @Valid RequestSubmitTextAnswer`
  - [ ] `POST /api/v1/user/interview/sessions/{sessionId}/answer/voice` — `@RequestParam MultipartFile audioChunk` + 파라미터
  - [ ] `POST /api/v1/user/interview/sessions/{sessionId}/end`
  - [ ] 모든 메서드에 `@AuthenticationPrincipal UserPrincipal` 적용
  - [ ] Controller에서 `try-catch` 사용 금지

- [ ] `InterviewReportController.java`
  - [ ] `GET /api/v1/user/interview/sessions/{sessionId}/report`

- [ ] `InterviewHistoryController.java`
  - [ ] `GET /api/v1/user/interview/history` — `@RequestParam(defaultValue="0") int page`, `@RequestParam(defaultValue="10") int size`

- [ ] Swagger Docs 인터페이스 분리
  - [ ] `InterviewSessionControllerDocs.java`
  - [ ] `InterviewReportControllerDocs.java`
  - [ ] `InterviewHistoryControllerDocs.java`

---

## Phase 6 — WebSocket 구현

- [ ] Spring WebSocket 핸들러 구현
  - [ ] 엔드포인트: `WS /ws/interview/{sessionId}/chat?token={accessToken}`
  - [ ] 연결 시 토큰 검증 — 실패 시 Close 1008
  - [ ] 연결 시 `sessionId` 소유권 검증 — 실패 시 Close 1008
- [ ] 메시지 전송 구현
  - [ ] `SYSTEM(SESSION_START)` — 세션 시작 안내
  - [ ] `QUESTION` — AI 질문 전달 (FastAPI 콜백 수신 후 릴레이)
  - [ ] `SYSTEM(REPORT_READY)` — 리포트 생성 완료 알림
  - [ ] `ERROR` — 처리 오류 발생 시 클라이언트에 전송
- [ ] FastAPI 콜백 처리 실패 시 재시도 로직
  - [ ] `career_histories` INSERT 실패 시 최소 1회 재시도 + 실패 로그 기록
  - [ ] `REPORT_READY` WebSocket 전송 실패 시 최소 1회 재시도 + 실패 로그 기록

---

## Phase 7 — Security & ErrorCode

- [ ] Security 설정
  - [ ] `POST /api/v1/user/interview/**` → `hasRole('USER')`
  - [ ] `GET /api/v1/user/interview/**` → `hasRole('USER')`

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
