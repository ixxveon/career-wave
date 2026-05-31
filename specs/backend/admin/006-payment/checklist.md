# Checklist: 결제·정산 관리 API (Payment & Settlement)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.

---

## Phase 1 — ERD & Enum 정합성

- [ ] `PaymentStatus` 값이 ERD 기준 `PENDING / DONE / CANCELED / FAILED`만 사용한다.
- [ ] `PaymentType` 값이 ERD 기준 `MANUAL / AUTO_RENEWAL`만 사용한다.
- [ ] `RefundStatus` 값이 ERD 기준 `PENDING / COMPLETED / FAILED / REJECTED`만 사용한다.
- [ ] `SubStatus` 값이 ERD 기준 `ACTIVE / RENEWAL_SCHEDULED / CANCEL_SCHEDULED / AT_RISK`만 사용한다.
- [ ] 모든 Enum 필드에 `@Enumerated(EnumType.STRING)`이 적용되어 있다.
- [ ] `Payment` PK가 UUID, `Refund` PK가 BIGSERIAL(IDENTITY)를 사용한다.
- [ ] 멘토 정산 관련 Enum 값이 코드에 없다.

---

## Phase 2 — Entity 설계

- [ ] 모든 Entity에 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`가 선언되어 있다.
- [ ] 모든 Entity에 public setter가 없다.
- [ ] `Payment.cancel()` 메서드가 `paymentStatus → CANCELED`로 전이한다.
- [ ] `Refund.complete(adminId)` 메서드가 `refundStatus → COMPLETED`, `refundedAt` 기록한다.
- [ ] `Refund.reject(adminId, rejectReason)` 메서드가 `refundStatus → REJECTED`, `rejectReason` 기록한다.
- [ ] `Refund.fail()` 메서드가 `refundStatus → FAILED`로 전이한다.
- [ ] `admin/payment/` 패키지가 `user/` 패키지 클래스를 직접 참조하지 않는다.

---

## Phase 3 — 상태 전이 정합성

- [ ] 환불 확정 시 `refund.complete()` + `payment.cancel()`이 동일 `@Transactional` 범위 내에서 처리된다.
- [ ] Toss 환불 API 실패 시 `payment_status`가 변경되지 않는다. `refund_status → FAILED`만 기록된다.
- [ ] `refund_status = COMPLETED` 건 재처리 시도 → `REFUND_NOT_PENDING(409)` 반환된다.
- [ ] `refund_status = REJECTED` 건 재처리 시도 → `REFUND_NOT_PENDING(409)` 반환된다.
- [ ] 환불 확정 성공 응답에 `paymentStatus: CANCELED`, `refundStatus: COMPLETED`가 포함된다.
- [ ] 환불 불가 처리 성공 응답에 `paymentStatus: DONE`, `refundStatus: REJECTED`가 포함된다.

---

## Phase 4 — API 응답 형식

- [ ] 모든 API 응답이 `ApiResponse<T>` 래퍼를 사용한다.
- [ ] Entity 또는 Spring `Page<T>` 객체를 직접 반환하지 않는다.
- [ ] 목록 조회 응답이 `items`, `page`, `size`, `totalItems`, `totalPages` 키를 포함한다.
- [ ] `page=1` 요청 시 첫 번째 페이지 결과가 반환된다. (1-based → 0-based 변환 확인)
- [ ] 결제 상세 응답에 `aiUsage(resumePaidCount, interviewPaidCount)`가 포함된다.
- [ ] 결제 목록 응답에 `refundStatus` 필드가 포함된다. (refunds LEFT JOIN, 없으면 null)

---

## Phase 5 — ErrorCode & 예외 처리

- [ ] `PAYMENT_NOT_FOUND(404)`, `SUBSCRIPTION_NOT_FOUND(404)`가 `ErrorCode`에 등록되어 있다.
- [ ] `REFUND_NOT_PENDING(409)`이 `ErrorCode`에 등록되어 있다.
- [ ] `REJECT_REASON_REQUIRED(400)`, `TOSS_REFUND_FAILED(502)`이 `ErrorCode`에 등록되어 있다.
- [ ] Controller에서 `try-catch`로 비즈니스 예외를 처리하지 않는다.
- [ ] `new RuntimeException(...)`을 직접 생성하지 않는다. `CustomException(ErrorCode.xxx)`를 사용한다.

---

## Phase 6 — 도메인 분리 & 컨벤션

- [ ] `admin/payment/` 패키지가 `user/` 패키지를 직접 참조하지 않는다.
- [ ] subscriptions 조회는 admin 전용 SubscriptionRepository로 처리한다.
- [ ] DTO가 inner class 패턴(`PaymentDTO.ResponseList` 등)을 사용한다.
- [ ] Swagger Annotation이 Controller가 아닌 `docs/` 패키지 인터페이스로 분리되어 있다.
- [ ] 관리자 ID가 `@AuthenticationPrincipal`로 추출된다.
- [ ] ADMIN 권한 검사가 적용되어 있다.
- [ ] 멘토 정산 관련 코드가 없다.
- [ ] 정산 리포트 API가 v1에 구현되어 있지 않다.
