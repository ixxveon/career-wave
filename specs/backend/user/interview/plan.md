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

- FastAPI와의 내부 통신 방식: **FE 스펙 기준 확정** — FastAPI WebSocket(`WS /ws/interview/{sessionId}/ai`)으로 LLM·STT·TTS 결과 직접 전달
- `documentId` 유효성 검증: **FE 스펙 기준 확정** — 서버에서 검증 후 유효하지 않으면 403/404 반환, 없으면 RAG 없이 일반 면접 진행
- WebSocket 최대 재연결 횟수 및 heartbeat 주기: FE 스펙 기준 준수
- `session_status = FAILED` 전이 조건: **FE 스펙 기준 확정** — 클라이언트 비정상 종료 시 `sessionStorage` 기반 복구, 재진입 시 `IN_PROGRESS` 상태면 복구 안내 노출. 서버는 비정상 종료를 감지하여 `FAILED` 마킹 또는 로그 기록
- 음성 청크 전달 방식: **FE 스펙 기준 확정** — `POST /answer/voice` Multipart 직접 전송 (S3 Presigned URL 미사용)

---

## 설계 확정 사항

> FE 스펙(`specs/frontend/user/interview/`)을 기준으로 아래 항목이 확정되었다.

### A. 세션 종료 → 리포트 생성 흐름 (Race Condition 대응)

`endSession` 직후 FastAPI 리포트 생성은 비동기로 수행된다.
FE는 결과 페이지 진입 시 Spring WebSocket의 `REPORT_READY` 이벤트를 대기하는 방식으로 이미 구현되어 있다.

**확정된 흐름**

```
클라이언트                       Spring                        FastAPI
   │── POST /end ──────────────▶ │  session_status = COMPLETED  │
   │◀─ { sessionStatus: COMPLETED } ─ │                         │
   │                             │── 리포트 생성 트리거 ────────▶│
   │  (결과 페이지 REPORT_READY 대기)  │                         │  AI 분석
   │                             │◀─ 완료 콜백 ─────────────────│
   │◀─ WS: REPORT_READY ─────────│  career_histories INSERT      │
   │  (결과 페이지 렌더링)        │                              │
```

- `endSession` 응답은 `sessionStatus: "COMPLETED"`만 반환 (별도 PROCESSING 상태 없음)
- `getReport` 미완료 시 `INTERVIEW_REPORT_NOT_READY` 에러 반환 (HTTP 상태코드는 구현 시 확정)

### B. 답변 메시지 순서 무결성

- 텍스트 답변: `interview_messages.created_at` 정밀도(milliseconds)로 순서 보장
- 음성 청크: FE → Spring 전달 시 `chunkIndex`(0-based) 파라미터 포함 — FastAPI가 `chunkIndex` 기준으로 조립
- 누락 청크 재전송 정책: 1회 재시도 후 폴백 처리 (FE 스펙 기준)

### C. 음성 청크 전달 방식

FE 스펙이 `POST /answer/voice` Multipart 전송으로 확정되어 있으므로, v1은 **Spring 중계 방식**으로 구현한다.

```
FE → POST /answer/voice (Multipart) → Spring → FastAPI STT 파이프라인
```

---

## Phases

### Phase 1 — Entity & Type 정의

- [ ] `SessionType.java` Enum — `TEXT` / `VOICE` / `VIDEO`
- [ ] `SessionStatus.java` Enum — `IN_PROGRESS` / `COMPLETED` / `FAILED`
- [ ] `InterviewType.java` Enum — `TECHNICAL` / `PERSONALITY` / `PROJECT`
- [ ] `MessageSender.java` Enum — `AI` / `USER`
- [ ] `MessageType.java` Enum — `QUESTION` / `ANSWER` / `SYSTEM`
- [ ] `InterviewSession.java` Entity — `member_id` nullable, `updated_at` 포함
- [ ] `InterviewMessage.java` Entity — `message_type`: `QUESTION` / `ANSWER` / `SYSTEM`
- [ ] `AIInterviewFeedback.java` Entity — PK `interview_feedback_id`, `ai_feedback` nullable
- [ ] `CareerHistory.java` Entity — 이력 누적 보관 테이블

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
- [ ] `InterviewMessageRepository.java`
  - [ ] `findBySessionIdOrderByCreatedAtAsc(UUID sessionId)` — 세션 메시지 조회
- [ ] `AIInterviewFeedbackRepository.java`
  - [ ] `findBySessionIdOrderByQuestionOrderAsc(UUID sessionId)` — 리포트 피드백 조회
- [ ] `CareerHistoryRepository.java`
  - [ ] `findByMemberIdOrderByCreatedAtDesc(UUID memberId, Pageable pageable)` — 이력 페이징

### Phase 4 — Service 구현

- [ ] `InterviewSessionService.java`
  - [ ] `startSession(UUID memberId, RequestStartSession dto)` — 동시 세션 방어(IN_PROGRESS 중복 체크) + 세션 생성 + FastAPI 비동기 트리거
  - [ ] `submitTextAnswer(UUID memberId, String sessionId, RequestSubmitTextAnswer dto)` — 소유권 검증 + IN_PROGRESS 상태 확인 + 저장 + FastAPI 트리거
  - [ ] `submitVoiceChunk(UUID memberId, String sessionId, MultipartFile audioChunk, int questionOrder, int chunkIndex, boolean isFinal)` — 소유권 검증 + IN_PROGRESS 상태 확인 + FastAPI 전달 (트랜잭션 외부)
  - [ ] `endSession(UUID memberId, String sessionId)` — 소유권 검증 + 상태 변경 + 리포트 트리거
- [ ] `InterviewReportService.java`
  - [ ] `getReport(UUID memberId, String sessionId)` — 소유권 검증 + 리포트 미완료 시 응답 처리 (설계 보완 포인트 A 결정 후 반영) + 피드백 조회 + null 처리
- [ ] `InterviewHistoryService.java`
  - [ ] `getHistory(UUID memberId, int page, int size)` — 본인 이력 페이징 (`career_histories` 기반)

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
- [ ] FastAPI 리포트 완료 콜백 수신 후 `career_histories` INSERT + `REPORT_READY` 메시지 전송
- [ ] 클라이언트 비정상 종료(브라우저 닫기·네트워크 끊김) 감지 전략 수립 — `onClose` / heartbeat timeout 기준으로 `FAILED` 마킹 또는 로그 기록 여부 결정 (설계 보완 포인트 참고)

### Phase 7 — Security & ErrorCode

- [ ] `POST /api/v1/user/interview/**` → `hasRole('USER')`
- [ ] `GET /api/v1/user/interview/**` → `hasRole('USER')`
- [ ] ErrorCode 등록
  - [ ] `INTERVIEW_SESSION_NOT_FOUND` (404)
  - [ ] `INTERVIEW_SESSION_FORBIDDEN` (403)
  - [ ] `INTERVIEW_SESSION_ALREADY_ENDED` (400)
  - [ ] `INTERVIEW_INVALID_SESSION_TYPE` (400)
  - [ ] `INTERVIEW_DOCUMENT_NOT_FOUND` (404)
  - [ ] `INTERVIEW_SESSION_DUPLICATE` (409) — 동일 회원이 IN_PROGRESS 세션을 이미 보유한 경우
  - [ ] `INTERVIEW_REPORT_NOT_READY` (설계 보완 포인트 A 결정 후 HTTP 상태코드 확정)

### Phase 8 — 검증

- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] Swagger UI에서 전체 API 요청/응답 확인
- [ ] FE `api-schema.md` 계약과 실제 응답 형식 일치 여부 확인
- [ ] 타인 세션 ID로 API 호출 시 403 반환 확인
- [ ] `voiceQualityRatio < 50.00` 항목의 delivery/fluency가 null로 반환되는지 확인
- [ ] 이미 종료된 세션 재종료 시 400 반환 확인
- [ ] 미인증 상태에서 API 호출 시 401 반환 확인
