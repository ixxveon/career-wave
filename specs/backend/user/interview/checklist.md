# Checklist: AI 면접 API (User Interview)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.  
> 관련 FE 스펙: `specs/frontend/user/interview/checklist.md`

---

## 이 체크리스트 활용법

**1. GitHub Issue 연동**  
각 Phase를 이슈로 등록하고 하위 항목을 체크박스로 관리한다. 하나씩 닫힐 때마다 진척이 눈에 보인다.

**2. 테스트 코드 먼저 (TDD 가볍게)**  
Phase 10 "먼저 작성할 3가지 ★"를 구현 코드보다 먼저 작성한다.  
이 세 가지가 통과하면 나머지 비즈니스 로직을 훨씬 안전하게 짤 수 있다.

**3. 배포 후 E2E 재검증**  
첫 배포 후 Phase 11 전체 플로우를 다시 한번 수행한다.  
텍스트·음성 두 흐름이 모두 통과하면 면접 서비스 구현 완료다.

---

## Phase 1 — Entity & Type 설계

- [x] `SessionType` / `SessionStatus` / `InterviewType` / `MessageSender` / `MessageType` Enum이 `type/` 패키지에 선언되어 있다.
- [x] 모든 Enum 필드에 `@Enumerated(EnumType.STRING)`이 적용되어 있다.
- [x] `InterviewSession` Entity에 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`가 있다.
- [x] `InterviewSession.session_id`가 UUID 타입으로 선언되어 있고, DB DEFAULT `gen_random_uuid()`를 사용한다.
- [x] `InterviewSession.member_id`가 nullable로 선언되어 있다 (비회원 세션 허용).
- [x] `InterviewSession.updated_at` 필드가 선언되어 있다.
- [x] `InterviewSession`의 상태 변경이 `complete(ZonedDateTime)` / `fail(ZonedDateTime)` 의미 있는 메서드로만 수행된다.
- [x] `InterviewSession.fail(ZonedDateTime endedAt)` — FAILED 전이 시 `endedAt`도 함께 기록된다.
- [x] `InterviewMessage.message_type`이 `QUESTION` / `ANSWER` / `SYSTEM` 3종으로 선언되어 있다 (`ANSWER_TEXT`·`ANSWER_VOICE` 없음).
- [x] `AIInterviewFeedback` Entity의 PK 필드명이 `interviewFeedbackId` (컬럼명 `interview_feedback_id`)이다.
- [x] `AIInterviewFeedback` 점수 필드에 DB CHECK 제약이 적용되어 있다 — 점수(0~100), voiceQualityRatio(0.00~100.00).
- [x] `AIInterviewFeedback.ai_feedback`이 nullable이다.
- [x] `CareerHistory` Entity가 `career_histories` 테이블과 매핑되어 있다.
- [x] Entity 필드에 public setter가 없다.

---

## Phase 2 — DTO 설계

- [ ] `InterviewDTO.java`에 9종 inner class/record가 선언되어 있다.
- [ ] `RequestStartSession.sessionType`에 `@NotBlank` 검증이 적용되어 있다.
- [ ] `RequestSubmitTextAnswer.questionOrder`에 `@NotNull @Min(1)` 검증이 적용되어 있다.
- [ ] `RequestSubmitTextAnswer.messageContent`에 `@NotBlank` 검증이 적용되어 있다.
- [ ] `FeedbackItem.deliveryScore` / `fluencyScore`가 `Integer` (nullable) 타입이다.
- [ ] `FeedbackItem.voiceQualityRatio`가 `BigDecimal` (nullable) 타입이다.
- [ ] `HistoryItem.totalScore`가 `Integer` (nullable) 타입이다.

---

## Phase 3 — 소유권 & IDOR 방어

- [ ] 세션 조회·답변 제출·리포트 조회 모든 Service 메서드에서 `memberId` 소유권 검증이 수행된다.
- [ ] 소유권 불일치 시 `INTERVIEW_SESSION_FORBIDDEN(403)`이 반환된다.
- [ ] 이력 목록 조회에 `member_id = memberId` 필터가 항상 적용된다.

---

## Phase 4 — 비즈니스 로직

### 세션 관리
- [ ] 세션 생성 시 `session_status = IN_PROGRESS`, `started_at = 현재 시각`으로 저장된다.
- [ ] 동일 회원이 `IN_PROGRESS` 상태인 세션을 이미 보유한 경우 신규 세션 시작이 차단되고 `INTERVIEW_SESSION_DUPLICATE(409)`가 반환된다.
- [ ] 세션 종료 시 `endSession`에서 `session_status`가 `IN_PROGRESS`인지 확인 후 `COMPLETED`로 전이한다.
- [ ] `COMPLETED` / `FAILED` 세션 재종료 시 `INTERVIEW_SESSION_ALREADY_ENDED(400)`이 반환된다.

### 음성·텍스트 답변
- [ ] 답변 제출(`submitTextAnswer` / `submitVoiceChunk`) 시 해당 세션의 `session_status`가 `IN_PROGRESS`인지 DB에서 재검증한다.
- [ ] `submitVoiceChunk` 호출 시 인증 토큰 유효성 외에 해당 `sessionId`가 요청자의 `IN_PROGRESS` 세션인지 재검증한다.
- [ ] `submitVoiceChunk`에서 `audioChunk`의 Content-Type이 `audio/webm`, `audio/mp4`, `audio/ogg` 중 하나인지 검증하며, 불일치 시 400을 반환한다.

### 리포트 생성
- [ ] 리포트 생성이 완료될 때 `career_histories`에 레코드가 INSERT된다 (세션 종료 API 응답이 아닌 FastAPI 완료 콜백 시점).
- [ ] `getReport` 호출 시 리포트가 아직 생성 중인 경우 `INTERVIEW_REPORT_NOT_READY`를 반환하며, HTTP 상태코드는 **409 Conflict**이다.
- [ ] `voiceQualityRatio < 50.00`인 피드백 항목의 `deliveryScore` / `fluencyScore`가 `null`로 반환된다.
- [ ] `voiceQualityRatio`가 `null`인 피드백 항목의 `deliveryScore` / `fluencyScore`가 `null`로 반환된다.
- [ ] 피드백이 `question_order ASC` 순으로 정렬되어 반환된다.

### 이력 조회
- [ ] 이력 목록이 `career_histories.created_at DESC` 최신순으로 반환된다.
- [ ] 이력 목록이 `career_histories` 기반으로 조회되며, `interview_sessions` JOIN으로 세션 정보를 가져온다.
- [ ] 이력 목록에서 본인(`career_histories.member_id`) 기록만 반환된다.

---

## Phase 5 — 트랜잭션 & 외부 I/O

- [ ] 세션 생성 / 텍스트 답변 저장 / 세션 종료에 `@Transactional`이 적용되어 있다.
- [ ] 음성 청크 FastAPI 전달 로직이 `@Transactional` 범위 밖에서 수행된다.

---

## Phase 6 — API 응답 형식

- [ ] 모든 API 응답이 `ApiResponse<T>` 래퍼를 사용한다.
- [ ] 이력 목록 응답이 `PaginationResponse<T>` 형식을 사용한다.
- [ ] Controller에서 Entity를 직접 반환하지 않는다.
- [ ] Controller에서 `try-catch`로 비즈니스 예외를 처리하지 않는다.
- [ ] Spring 기본 `Page<T>` 객체를 API 응답으로 직접 반환하지 않는다.

---

## Phase 7 — Security

- [ ] 모든 `/api/v1/user/interview/**` 엔드포인트가 `hasRole('USER')`로 보호된다.
- [ ] 미인증 요청이 401을 반환한다.
- [ ] WebSocket 연결 시 토큰 검증 실패가 Close 1008로 처리된다.
- [ ] WebSocket 연결 시 소유권 검증 실패가 Close 1008로 처리된다.
- [ ] 클라이언트 비정상 종료(브라우저 닫기·네트워크 끊김) 시 서버가 이를 감지하여 `FAILED` 마킹 또는 로그 기록 전략이 구현되어 있다 (`설계 보완 포인트 참고`).

---

## Phase 6-1 — 세션 타임아웃 스케줄러

- [ ] `InterviewSessionScheduler`가 1시간 주기로 실행된다.
- [ ] 쿼리 조건에 `started_at < NOW() - 24h` AND `IN_PROGRESS` AND `updated_at < NOW() - 5min` 세 조건이 모두 포함된다.
- [ ] `updated_at < NOW() - 5min` 유예 조건이 없으면 현재 답변 중인 세션이 강제 종료될 수 있다 — 반드시 포함.
- [ ] 타임아웃 처리된 세션이 `FAILED`로 전이된다.
- [ ] 처리 건수 및 세션 ID가 `log.info`로 기록된다.

## Phase 6-2 — FastAPI 콜백 수신

- [ ] `POST /internal/api/v1/interview/callback/{sessionId}/report` 엔드포인트가 구현되어 있다.
- [ ] `X-Internal-Secret` 헤더 검증이 구현되어 있으며, 시크릿 값이 환경 변수로 관리된다 (코드 하드코딩 금지).
- [ ] `/internal/**` 경로가 Spring Security에서 외부 접근 차단된다.
- [ ] `existsBySessionId` 멱등성 체크가 구현되어 있다 — 콜백 2회 수신 시 피드백 중복 저장이 발생하지 않는다.
- [ ] 콜백 수신 후 `ai_interview_feedbacks` / `interview_sessions` / `career_histories` 세 곳이 모두 업데이트된다.
- [ ] `REPORT_READY` WebSocket 메시지에 `data.reportUrl`이 포함된다.
- [ ] 콜백 처리 실패 시 재시도 로직 및 `log.error` 기록이 동작한다.

---

## Phase 7-1 — 응답 포맷 최종 점검

- [ ] `getReport` 409 응답에 `data.status = "ANALYZING"`, `data.estimatedWaitSeconds` 필드가 포함되어 있다.
- [ ] WebSocket `REPORT_READY` 메시지에 `data.reportUrl` 필드가 포함되어 있다.
- [ ] WebSocket `ERROR` 메시지에 `errorCode` 필드가 포함되어 있다 (예: `INTERVIEW_AI_PIPELINE_ERROR`).
- [ ] 모든 WebSocket 메시지에 `data` / `errorCode` 필드가 일관되게 포함되어 있다 (없으면 `null`).
- [ ] `ZonedDateTime` 직렬화 설정 확인 — Jackson `JavaTimeModule`이 등록되어 ISO 8601 형식으로 직렬화된다.

---

## Phase 8 — Swagger & 계약 일치

- [ ] Swagger Annotation이 Controller가 아닌 `docs/` 패키지 인터페이스로 분리되어 있다.
- [ ] 응답 필드명이 FE `api-schema.md` 계약과 일치한다 (`sessionId`, `sessionStatus`, `sessionType` 등 camelCase).
- [ ] 날짜 포맷이 ISO 8601 형식으로 반환된다 (`ZonedDateTime` → JSON 직렬화 확인).
- [ ] 이력 목록의 `page` / `size` / `totalElements` / `totalPages` 필드가 응답에 포함된다.
- [ ] `POST /end` API의 멱등성 검증 — 동일 `sessionId`로 2회 이상 호출해도 리포트 생성 트리거가 1회만 동작하는지 확인.
- [ ] `IN_PROGRESS` 세션 중복 방지 — 동일 회원이 `startSession`을 2번 호출했을 때 `409 INTERVIEW_SESSION_DUPLICATE`가 반환되는지 확인.

---

## Phase 9 — 도메인 분리

- [ ] `user/interview/` 패키지가 다른 user 도메인 패키지(`resume`, `member` 등)를 직접 참조하지 않는다.
- [ ] `admin/` 패키지를 `user/interview/`에서 직접 참조하지 않는다.

---

## Phase 10 — 테스트 코드

> 이 도메인은 상태 머신·WebSocket·비동기 파이프라인이 얽혀 있어 테스트 코드 없이 유지보수가 어렵다.
> Phase 4~6 구현 항목마다 테스트 작성 여부를 함께 체크한다.

**먼저 작성할 3가지** (핵심 불변 규칙 — 다른 기능 추가 시 가장 쉽게 깨짐)

- [ ] `InterviewSessionService.endSession` — ★ 이미 `COMPLETED`인 세션 재종료 시 `INTERVIEW_SESSION_ALREADY_ENDED(400)` 반환
- [ ] `InterviewReportService.getReport` — ★ 타인 `sessionId`로 호출 시 `INTERVIEW_SESSION_FORBIDDEN(403)` 반환 (소유권)
- [ ] `InterviewReportService.getReport` — ★ `voiceQualityRatio = 49.99`이면 delivery/fluency null, `50.00`이면 정상값

**이후 순서대로 작성**

- [ ] `InterviewSessionService.startSession` — 정상 생성 / 중복 세션(409) 단위 테스트
- [ ] `InterviewSessionService.endSession` — 멱등성(2회 호출 시 트리거 1회) 단위 테스트
- [ ] `InterviewSessionService.submitTextAnswer` — IN_PROGRESS 아닌 세션 거부 단위 테스트
- [ ] `InterviewReportService.getReport` — 리포트 미완료(409) 단위 테스트
- [ ] `InterviewHistoryService.getHistory` — 본인 기록만 반환 / 페이징 단위 테스트
- [ ] FastAPI 콜백 처리 — `career_histories` INSERT 성공 / 실패 시 재시도 로그 기록 단위 테스트
- [ ] WebSocket 핸들러 — 토큰 검증 실패(Close 1008) / 소유권 검증 실패(Close 1008) 통합 테스트
- [ ] WebSocket 재연결 시 `REPORT_READY` 재전송 — `career_histories` 존재 시 연결 직후 즉시 전송 확인

---

## Phase 11 — 면접 도메인 핵심 시나리오 검증

> 기능 구현 완료 후 아래 시나리오를 수동 또는 통합 테스트로 검증한다.

### 세션 관리
- [ ] 동일 회원이 동시에 2개 이상의 세션을 시작하려 하면 409가 반환된다.
- [ ] `endSession` 호출 시 세션 상태가 `IN_PROGRESS`인지 확인하고 `COMPLETED`로 전이된다 (중복 종료 방지).

### 음성·텍스트 답변
- [ ] 답변 제출 시 `sessionId`와 `questionOrder`가 현재 진행 중인 질문 순서와 일치하는지 검증한다 (순서 조작 방지 — v1 적용 범위 팀 협의 필요).
- [ ] `submitVoiceChunk` 호출 시 `IN_PROGRESS` 세션 소유 여부를 DB에서 재검증한다.

### 리포트 조회
- [ ] 리포트가 아직 생성되지 않은 상태에서 `getReport` 호출 시 UI에 노출할 적절한 상태값 또는 에러 메시지가 응답에 포함된다.
- [ ] `career_histories` 레코드는 FastAPI 리포트 완료 콜백 시점에만 INSERT된다 (`endSession` 응답 시점 아님).

### 전체 플로우 (E2E)
- [ ] 텍스트 면접 전체 흐름 — 세션 시작 → 답변 제출 → 세션 종료 → `REPORT_READY` WebSocket 수신 → 리포트 조회 → `career_histories` 기록 생성 확인.
- [ ] 음성 면접 전체 흐름 — 세션 시작 → 청크 업로드(`isFinal=true`) → 세션 종료 → 리포트 조회 → `voiceQualityRatio < 50` 항목의 지표 null 처리 확인.
