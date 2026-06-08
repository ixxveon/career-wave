# Plan: AI 면접 API (User Interview)

**Feature Branch**: `feature/user-interview-be`  
**담당**: 백엔드 팀  
**버전**: v1  
**상태**: 스펙 완료 / 구현 예정  
**관련 FE 스펙**: `specs/frontend/user/interview/plan.md`

---

## Summary

회원이 AI 면접관과 텍스트 또는 음성으로 모의 면접을 진행하고, 종료 후
역량 지표(Relevance·Depth·Delivery·Fluency) 기반의 피드백 리포트를 조회하는 백엔드 API.

Spring은 세션 생명주기·답변 저장·리포트 조회를 담당하고,
AI 파이프라인(STT·LLM·TTS)은 FastAPI 서버가 전담한다.

---

## Technical Context

| 분류 | 선택 | 근거 |
|------|------|------|
| 세션 ID | UUID | 외부 노출 식별자, 추측 불가능 (CONVENTION.md §10) |
| WebSocket | Spring WebSocket (STOMP 제외) | 세션 생명주기 이벤트 전달, 단순 구조 유지 |
| 음성 청크 처리 | Multipart 수신 후 FastAPI 비동기 전달 | AI 처리를 Spring에 포함하지 않음 |
| 리포트 생성 | FastAPI 비동기 트리거 → Spring WS 콜백 | 종료 API 응답 지연 방지 |
| ORM | Spring Data JPA + JPQL fetch join | N+1 방지 |
| 페이징 | `PageRequest` 0-based | FE api-schema.md 계약 준수 |
| 점수 null 처리 | Service 계층 조립 시 처리 | `voiceQualityRatio < 50.00` 판단 후 DTO에 null 세팅 |

### 전제 조건 및 협의 사항

- FastAPI와의 내부 통신 방식 (HTTP 비동기 / 이벤트 메시지): **구현 착수 전 팀 협의 필요**
- `documentId` 유효성 검증 방법 (서류 도메인 Repository 참조 vs API 호출): **팀 합의 필요**
- WebSocket 최대 재연결 횟수 및 heartbeat 주기: FE 스펙 기준 준수
- `session_status = FAILED` 전이 조건 (비정상 종료 감지 시나리오): **v1 적용 범위 협의 필요**

---

## Phases

### Phase 1 — Entity & Type 정의

- [ ] `SessionType.java` Enum — `TEXT` / `VOICE` / `VIDEO`
- [ ] `SessionStatus.java` Enum — `IN_PROGRESS` / `COMPLETED` / `FAILED`
- [ ] `InterviewType.java` Enum — `TECHNICAL` / `PERSONALITY` / `PROJECT`
- [ ] `MessageSender.java` Enum — `AI` / `USER`
- [ ] `MessageType.java` Enum — `QUESTION` / `ANSWER_TEXT` / `ANSWER_VOICE` / `SYSTEM`
- [ ] `InterviewSession.java` Entity
  - `@NoArgsConstructor(access = AccessLevel.PROTECTED)` 적용
  - `session_id` UUID, `session_status` 변경은 의미 있는 메서드로 처리
- [ ] `InterviewMessage.java` Entity
- [ ] `AIInterviewFeedback.java` Entity

### Phase 2 — DTO 정의

- [ ] `InterviewDTO.java`
  - [ ] `RequestStartSession` — documentId / sessionType / interviewType / targetCompany
  - [ ] `ResponseStartSession` — sessionId / sessionStatus / sessionType / documentId / createdAt
  - [ ] `RequestSubmitTextAnswer` — questionOrder / messageContent
  - [ ] `ResponseSubmitTextAnswer` — messageId / createdAt
  - [ ] `ResponseSubmitVoiceChunk` — chunkIndex / received
  - [ ] `ResponseEndSession` — sessionId / sessionStatus / endedAt
  - [ ] `FeedbackItem` — 4개 지표 + voiceQualityRatio + aiFeedback
  - [ ] `ResponseReport` — sessionId / sessionStatus / sessionType / totalScore / feedbacks / createdAt
  - [ ] `HistoryItem` — sessionId / sessionType / interviewType / targetCompany / sessionStatus / totalScore / createdAt

### Phase 3 — Repository 구현

- [ ] `InterviewSessionRepository.java`
  - [ ] `findBySessionIdAndMemberId(UUID sessionId, UUID memberId)` — 소유권 검증용
  - [ ] `findByMemberIdOrderByCreatedAtDesc(UUID memberId, Pageable pageable)` — 이력 페이징
- [ ] `InterviewMessageRepository.java`
  - [ ] `findBySessionIdOrderByCreatedAtAsc(UUID sessionId)` — 세션 메시지 조회
- [ ] `AIInterviewFeedbackRepository.java`
  - [ ] `findBySessionIdOrderByQuestionOrderAsc(UUID sessionId)` — 리포트 피드백 조회

### Phase 4 — Service 구현

- [ ] `InterviewSessionService.java`
  - [ ] `startSession(UUID memberId, RequestStartSession dto)` — 세션 생성 + FastAPI 비동기 트리거
  - [ ] `submitTextAnswer(UUID memberId, String sessionId, RequestSubmitTextAnswer dto)` — 소유권 검증 + 저장 + FastAPI 트리거
  - [ ] `submitVoiceChunk(UUID memberId, String sessionId, MultipartFile audioChunk, int questionOrder, int chunkIndex, boolean isFinal)` — 소유권 검증 + FastAPI 전달 (트랜잭션 외부)
  - [ ] `endSession(UUID memberId, String sessionId)` — 소유권 검증 + 상태 변경 + 리포트 트리거
- [ ] `InterviewReportService.java`
  - [ ] `getReport(UUID memberId, String sessionId)` — 소유권 검증 + 피드백 조회 + null 처리
- [ ] `InterviewHistoryService.java`
  - [ ] `getHistory(UUID memberId, int page, int size)` — 본인 이력 페이징

### Phase 5 — Controller & Swagger Docs

- [ ] `InterviewSessionController.java`
  - [ ] `POST /api/v1/user/interview/sessions`
  - [ ] `POST /api/v1/user/interview/sessions/{sessionId}/answer/text`
  - [ ] `POST /api/v1/user/interview/sessions/{sessionId}/answer/voice`
  - [ ] `POST /api/v1/user/interview/sessions/{sessionId}/end`
  - [ ] `@AuthenticationPrincipal UserPrincipal` — memberId 추출
  - [ ] Controller에서 `try-catch` 사용 금지
- [ ] `InterviewReportController.java`
  - [ ] `GET /api/v1/user/interview/sessions/{sessionId}/report`
- [ ] `InterviewHistoryController.java`
  - [ ] `GET /api/v1/user/interview/history`
- [ ] Swagger Docs 분리
  - [ ] `InterviewSessionControllerDocs.java`
  - [ ] `InterviewReportControllerDocs.java`
  - [ ] `InterviewHistoryControllerDocs.java`

### Phase 6 — WebSocket 구현

- [ ] Spring WebSocket 핸들러 구현 (`/ws/interview/{sessionId}/chat`)
- [ ] 연결 시 `sessionId` 소유권 + 토큰 검증, 실패 시 Close 1008
- [ ] `SYSTEM(SESSION_START)` / `QUESTION` / `SYSTEM(REPORT_READY)` / `ERROR` 메시지 전송 구현
- [ ] FastAPI 리포트 완료 콜백 수신 후 `REPORT_READY` 메시지 전송

### Phase 7 — Security & ErrorCode

- [ ] `POST /api/v1/user/interview/**` → `hasRole('USER')`
- [ ] `GET /api/v1/user/interview/**` → `hasRole('USER')`
- [ ] ErrorCode 등록
  - [ ] `INTERVIEW_SESSION_NOT_FOUND` (404)
  - [ ] `INTERVIEW_SESSION_FORBIDDEN` (403)
  - [ ] `INTERVIEW_SESSION_ALREADY_ENDED` (400)
  - [ ] `INTERVIEW_INVALID_SESSION_TYPE` (400)
  - [ ] `INTERVIEW_DOCUMENT_NOT_FOUND` (404)

### Phase 8 — 검증

- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] Swagger UI에서 전체 API 요청/응답 확인
- [ ] FE `api-schema.md` 계약과 실제 응답 형식 일치 여부 확인
- [ ] 타인 세션 ID로 API 호출 시 403 반환 확인
- [ ] `voiceQualityRatio < 50.00` 항목의 delivery/fluency가 null로 반환되는지 확인
- [ ] 이미 종료된 세션 재종료 시 400 반환 확인
- [ ] 미인증 상태에서 API 호출 시 401 반환 확인
