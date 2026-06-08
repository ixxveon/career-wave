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

### A-0. startSession 동시성 처리

`startSession`에서 동일 회원의 `IN_PROGRESS` 세션 중복을 체크할 때, 두 요청이 동시에 들어오면 단순 조회 후 체크만으로는 Race Condition이 발생할 수 있다.

**v1 채택 방식**: `InterviewSessionRepository`에서 `IN_PROGRESS` 세션 존재 여부를 조회할 때 **비관적 락(`SELECT FOR UPDATE`)**을 사용한다.

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
Optional<InterviewSession> findInProgressByMemberId(UUID memberId);
```

- v1 단일 서버 환경에서는 이것으로 충분하다.
- 추후 서버가 Scale-out될 경우 Redis 분산 락으로 전환을 검토한다 (v2 이후).

---

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
- `endSession`은 멱등성을 보장한다 — 이미 `COMPLETED` 세션이면 리포트 트리거 없이 즉시 기존 응답 반환 (`if (session.isCompleted()) return;`)
- `getReport` 미완료 시 `INTERVIEW_REPORT_NOT_READY` 에러 반환 — **HTTP 409 Conflict** ("리소스가 생성 중이라 처리할 수 없음")

### B. 답변 메시지 순서 무결성

- 텍스트 답변: `interview_messages.created_at` 정밀도(milliseconds)로 순서 보장
- 음성 청크: FE → Spring 전달 시 `chunkIndex`(0-based) 파라미터 포함 — FastAPI가 `chunkIndex` 기준으로 조립
- 누락 청크 재전송 정책: 1회 재시도 후 폴백 처리 (FE 스펙 기준)

### C. 음성 청크 전달 방식

FE 스펙이 `POST /answer/voice` Multipart 전송으로 확정되어 있으므로, v1은 **Spring 중계 방식**으로 구현한다.

```
FE → POST /answer/voice (Multipart) → Spring → FastAPI STT 파이프라인
```

**구현 시 필수 설정**: `application.yml`에 아래 값을 명시적으로 추가한다. 이 설정이 없으면 대용량 파일 업로드 시 메모리 고갈 또는 기본값(1MB) 초과 오류가 발생한다.

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 5MB
      max-request-size: 10MB
```

면접은 청크가 연속 업로드되는 스트리밍 구조이므로, `MultipartFile`이 메모리에 올라가지 않도록 디스크 기반 임시 저장 여부도 확인한다.

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

> **@Transactional 범위 원칙**: DB 저장 로직에만 짧게 적용하고, FastAPI 호출은 트랜잭션 종료 후 수행한다.
> DB 트랜잭션이 외부 네트워크 통신을 기다리면 DB Connection Pool이 고갈되어 서버 전체가 응답 불가 상태가 될 수 있다.
>
> ```
> // 올바른 구조
> @Transactional
> public ResponseXxx saveAndReturn(...) { ... DB 저장만 ... }
>
> public ResponseXxx handleRequest(...) {
>     var result = saveAndReturn(...);   // 트랜잭션 종료
>     fastApiClient.send(...);           // 트랜잭션 밖에서 FastAPI 호출
>     return result;
> }
> ```
>
> `submitTextAnswer` / `endSession` 모두 동일 원칙 적용.

- [ ] `InterviewSessionService.java`
  - [ ] `startSession(UUID memberId, RequestStartSession dto)` — 동시 세션 방어(IN_PROGRESS 중복 체크, **비관적 락 `SELECT FOR UPDATE`** 적용) + 세션 생성 + FastAPI 비동기 트리거
  - [ ] `submitTextAnswer(UUID memberId, String sessionId, RequestSubmitTextAnswer dto)` — 소유권 검증 + IN_PROGRESS 상태 확인 + 저장 + FastAPI 트리거
  - [ ] `submitVoiceChunk(UUID memberId, String sessionId, MultipartFile audioChunk, int questionOrder, int chunkIndex, boolean isFinal)` — 소유권 검증 + IN_PROGRESS 상태 확인 + FastAPI 전달 (트랜잭션 외부)
  - [ ] `endSession(UUID memberId, String sessionId)` — 소유권 검증 + 멱등성 체크(COMPLETED면 즉시 반환) + 상태 변경 + 리포트 트리거 1회 보장
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

> **Scale-out 메모**: v1은 단일 서버이므로 `ConcurrentHashMap<String, WebSocketSession>`으로 세션을 관리하면 충분하다.
> 추후 서버가 여러 대로 늘어날 경우, 어떤 서버에 WebSocket 세션이 연결되어 있는지 추적하기 위해
> Redis Pub/Sub 기반 메시지 브로드캐스트 구조로의 전환을 고려한다 (v1 단계에서는 구현 불필요).
>
> **REPORT_READY 유실 방지**: 클라이언트가 재연결될 때, 연결 직후 해당 세션의 `career_histories` 레코드 존재 여부(또는 `session_status = COMPLETED` + 피드백 존재 여부)를 DB에서 확인하여 이미 완료 상태라면 `REPORT_READY` 메시지를 즉시 재전송한다. 이렇게 하면 네트워크 순단으로 메시지를 놓친 사용자도 결과 페이지로 정상 진입할 수 있다.

- [ ] Spring WebSocket 핸들러 구현 (`/ws/interview/{sessionId}/chat`)
- [ ] 연결 시 `sessionId` 소유권 + 토큰 검증, 실패 시 Close 1008
- [ ] `SYSTEM(SESSION_START)` / `QUESTION` / `SYSTEM(REPORT_READY)` / `ERROR` 메시지 전송 구현
- [ ] FastAPI 리포트 완료 콜백 수신 후 `career_histories` INSERT + `REPORT_READY` 메시지 전송
- [ ] FastAPI 콜백 처리 실패 시 재시도(Retry) 로직 구현 — `career_histories` INSERT 또는 WebSocket 전송 실패 시 Spring 트랜잭션 에러 로그 확인 및 재시도 전략 적용 (최소 1회 재시도 + 실패 로그 기록)
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
  - [ ] `INTERVIEW_REPORT_NOT_READY` (409) — 리포트 생성 중 상태에서 `getReport` 호출 시

### Phase 8 — 검증

> **우선 작성할 테스트 코드 3가지** — 아래 항목은 다른 기능 추가 중 실수로 깨뜨리기 쉬운 핵심 불변 규칙이다.
> 나머지 검증 항목보다 먼저 JUnit 테스트로 작성해둔다.
>
> 1. `endSession` 멱등성 — 이미 `COMPLETED`인 세션 재종료 시 `INTERVIEW_SESSION_ALREADY_ENDED(400)` 반환 확인
> 2. 소유권 검증 — 타인의 `sessionId`로 API 호출 시 `INTERVIEW_SESSION_FORBIDDEN(403)` 반환 확인
> 3. `voiceQualityRatio` 조건부 null 처리 — `49.99`이면 delivery/fluency null, `50.00`이면 정상값 반환 확인

- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] Swagger UI에서 전체 API 요청/응답 확인
- [ ] FE `api-schema.md` 계약과 실제 응답 형식 일치 여부 확인
- [ ] 타인 세션 ID로 API 호출 시 403 반환 확인
- [ ] `voiceQualityRatio < 50.00` 항목의 delivery/fluency가 null로 반환되는지 확인
- [ ] 이미 종료된 세션 재종료 시 400 반환 확인
- [ ] 미인증 상태에서 API 호출 시 401 반환 확인
