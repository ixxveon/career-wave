# Checklist: AI 면접 API (User Interview)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.  
> 관련 FE 스펙: `specs/frontend/user/interview/checklist.md`

---

## Phase 1 — Entity & Type 설계

- [ ] `SessionType` / `SessionStatus` / `InterviewType` / `MessageSender` / `MessageType` Enum이 `type/` 패키지에 선언되어 있다.
- [ ] 모든 Enum 필드에 `@Enumerated(EnumType.STRING)`이 적용되어 있다.
- [ ] `InterviewSession` Entity에 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`가 있다.
- [ ] `InterviewSession.session_id`가 UUID 타입으로 선언되어 있다.
- [ ] `InterviewSession`의 상태 변경이 `complete()` 등 의미 있는 메서드로만 수행된다.
- [ ] Entity 필드에 public setter가 없다.

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

- [ ] 세션 생성 시 `session_status = IN_PROGRESS`, `started_at = 현재 시각`으로 저장된다.
- [ ] 세션 종료 시 `session_status = COMPLETED`, `ended_at = 현재 시각`으로 업데이트된다.
- [ ] `COMPLETED` / `FAILED` 세션 재종료 시 `INTERVIEW_SESSION_ALREADY_ENDED(400)`이 반환된다.
- [ ] `voiceQualityRatio < 50.00`인 피드백 항목의 `deliveryScore` / `fluencyScore`가 `null`로 반환된다.
- [ ] `voiceQualityRatio`가 `null`인 피드백 항목의 `deliveryScore` / `fluencyScore`가 `null`로 반환된다.
- [ ] 피드백이 `question_order ASC` 순으로 정렬되어 반환된다.
- [ ] 이력 목록이 `created_at DESC` 최신순으로 반환된다.

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

---

## Phase 8 — Swagger & 계약 일치

- [ ] Swagger Annotation이 Controller가 아닌 `docs/` 패키지 인터페이스로 분리되어 있다.
- [ ] 응답 필드명이 FE `api-schema.md` 계약과 일치한다 (`sessionId`, `sessionStatus`, `sessionType` 등 camelCase).
- [ ] 날짜 포맷이 ISO 8601 형식으로 반환된다 (`ZonedDateTime` → JSON 직렬화 확인).
- [ ] 이력 목록의 `page` / `size` / `totalElements` / `totalPages` 필드가 응답에 포함된다.

---

## Phase 9 — 도메인 분리

- [ ] `user/interview/` 패키지가 다른 user 도메인 패키지(`resume`, `member` 등)를 직접 참조하지 않는다.
- [ ] `admin/` 패키지를 `user/interview/`에서 직접 참조하지 않는다.
