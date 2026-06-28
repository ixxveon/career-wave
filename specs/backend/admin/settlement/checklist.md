# Checklist: 정산 리포트 관리 API (Settlement Report)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.

---

## Phase 1 — ERD & Enum 정합성

- [ ] `SettlementStatus` 값이 ERD 기준 `PENDING / CONFIRMED`만 사용한다.
- [ ] `SettlementItemType` 값이 ERD 기준 `PAYMENT / REFUND`만 사용한다.
- [ ] 모든 Enum 필드에 `@Enumerated(EnumType.STRING)`이 적용되어 있다.
- [ ] `SettlementReport` PK가 BIGSERIAL(IDENTITY), `SettlementItem` PK가 BIGSERIAL(IDENTITY)을 사용한다.

---

## Phase 2 — Entity 설계

- [ ] 모든 Entity에 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`가 선언되어 있다.
- [ ] 모든 Entity에 public setter가 없다.
- [ ] `SettlementReport.confirm(Long adminId)` 메서드가 `settlementStatus → CONFIRMED`, `settledAt`, `settledBy` 기록한다.
- [ ] `SettlementReport.create(...)` 팩토리 메서드가 PENDING 상태로 생성한다.
- [ ] `SettlementItem.create(...)` 팩토리 메서드가 정상 동작한다.
- [ ] `admin/settlement/` 패키지가 `user/` 패키지 클래스를 직접 참조하지 않는다.

---

## Phase 3 — 상태 전이 정합성

- [ ] `settlement_status = CONFIRMED` 건 재확정 시도 → `ALREADY_CONFIRMED(409)` 반환된다.
- [ ] 동일 기간 중복 생성 시도 → `DUPLICATE_PERIOD(409)` 반환된다.
- [ ] `periodStart >= periodEnd` → `INVALID_PERIOD(400)` 반환된다.
- [ ] 정산 확정 성공 응답에 `settlementStatus: CONFIRMED`, `settledAt`이 포함된다.
- [ ] 정산 생성 시 payments/refunds 원본 데이터가 수정되지 않는다.

---

## Phase 4 — API 응답 형식

- [ ] 모든 API 응답이 `ApiResponse<T>` 래퍼를 사용한다.
- [ ] Entity 또는 Spring `Page<T>` 객체를 직접 반환하지 않는다.
- [ ] 목록 조회 응답이 `items`, `page`, `size`, `totalItems`, `totalPages` 키를 포함한다.
- [ ] `page=1` 요청 시 첫 번째 페이지 결과가 반환된다. (1-based → 0-based 변환 확인)
- [ ] 정산 상세 응답에 `items`(결제/환불 항목 목록)이 포함된다.
- [ ] 정산 상세 응답에 `settledByName`(확정 관리자 이름)이 포함된다.

---

## Phase 5 — ErrorCode & 예외 처리

- [ ] `SETTLEMENT_NOT_FOUND(404)`이 `AdminSettlementErrorCode`에 등록되어 있다.
- [ ] `DUPLICATE_PERIOD(409)`이 `AdminSettlementErrorCode`에 등록되어 있다.
- [ ] `INVALID_PERIOD(400)`이 `AdminSettlementErrorCode`에 등록되어 있다.
- [ ] `ALREADY_CONFIRMED(409)`이 `AdminSettlementErrorCode`에 등록되어 있다.
- [ ] Controller에서 `try-catch`로 비즈니스 예외를 처리하지 않는다.
- [ ] `new RuntimeException(...)`을 직접 생성하지 않는다. `CustomException(ErrorCode.xxx)`를 사용한다.

---

## Phase 6 — 도메인 분리 & 컨벤션

- [ ] `admin/settlement/` 패키지가 `user/` 패키지를 직접 참조하지 않는다.
- [ ] DTO가 inner class 패턴(`SettlementDTO.ResponseList` 등)을 사용한다.
- [ ] Swagger Annotation이 Controller가 아닌 `docs/` 패키지 인터페이스로 분리되어 있다.
- [ ] 관리자 ID가 `@AuthenticationPrincipal`로 추출된다.
- [ ] ADMIN 권한 검사가 적용되어 있다.
- [ ] 감사 로그가 정산 생성·확정 시 기록된다.
- [ ] 멘토 정산 관련 코드가 없다.

---

## 머지 전 최종 확인

- [ ] `api-schema.md` 실제 구현과 일치
- [ ] `constitution.md` 불변 규칙과 실제 구현 일치 확인
- [ ] PR 제목 형식 준수
- [ ] `tasks.md` 모든 항목 완료 체크
