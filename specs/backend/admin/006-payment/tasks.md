# Tasks: 결제·정산 관리 API (Payment & Settlement)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — Enum & Entity 정의

### Enum (type/)

- [ ] `PaymentStatus.java` — `PENDING / DONE / CANCELED / FAILED`
- [ ] `PaymentType.java` — `MANUAL / AUTO_RENEWAL`
- [ ] `RefundStatus.java` — `PENDING / COMPLETED / FAILED / REJECTED`
- [ ] `SubStatus.java` — `ACTIVE / RENEWAL_SCHEDULED / CANCEL_SCHEDULED / AT_RISK`

### Entity (entity/)

- [ ] `Payment.java`
  - [ ] `@GeneratedValue(generator = "UUID")` — UUID PK
  - [ ] `@Column(name = "member_id", columnDefinition = "UUID") UUID memberId`
  - [ ] `@Enumerated(EnumType.STRING) PaymentStatus paymentStatus`
  - [ ] `@Enumerated(EnumType.STRING) PaymentType paymentType`
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
  - [ ] public setter 없음
  - [ ] `@PrePersist` — `createdAt` 설정
  - [ ] `cancel()` 비즈니스 메서드 — `paymentStatus → CANCELED`

- [ ] `Refund.java`
  - [ ] `@GeneratedValue(strategy = GenerationType.IDENTITY)` — BIGSERIAL PK
  - [ ] `@Column(name = "payment_id", columnDefinition = "UUID") UUID paymentId`
  - [ ] `@Enumerated(EnumType.STRING) RefundStatus refundStatus`
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
  - [ ] public setter 없음
  - [ ] `@PrePersist` — `refundStatus = PENDING`, `createdAt` 설정
  - [ ] `complete(Long adminId)` — `COMPLETED` 전이, `refundedAt` 기록
  - [ ] `reject(Long adminId, String rejectReason)` — `REJECTED` 전이, `rejectReason` 기록
  - [ ] `fail()` — `FAILED` 전이

---

## Phase 2 — Repository 구현

- [ ] `PaymentRepository.java`
  - [ ] 동적 필터 쿼리 (`keyword` LIKE: `order_id / payment_id / buyer_name`, `status`)
  - [ ] `refunds` LEFT JOIN → `refundStatus` 포함
  - [ ] KPI 집계용: `countByPaymentStatus`, `sumAmountByPaymentStatus`
  - [ ] 기본 정렬: `created_at DESC`

- [ ] `RefundRepository.java`
  - [ ] `findByPaymentId(UUID paymentId)` — 환불 건 단건 조회
  - [ ] `countByRefundStatus(RefundStatus status)` — KPI용

- [ ] `SubscriptionRepository.java` — admin 전용 (조회 전용)
  - [ ] 동적 필터 쿼리 (`status`)
  - [ ] `AT_RISK` 필터: 서브쿼리로 가장 최근 `AUTO_RENEWAL` 결제가 `FAILED`인 `member_id` 추출
  - [ ] `memberName` 포함을 위한 `members` 테이블 조인
  - [ ] `user/` 패키지 직접 import 금지

---

## Phase 3 — Service 구현

### AdminPaymentService

- [ ] `getSummary()` — KPI 집계
  - [ ] `DONE` 건 COUNT & SUM → `paidCount`, `totalRevenue`
  - [ ] `refund_status = PENDING` 건 COUNT → `refundPendingCount`
  - [ ] `FAILED` 건 COUNT → `failedCount`
  - [ ] 반환: `PaymentDTO.ResponseSummary`

- [ ] `getPayments(keyword, status, page, size)` — 결제 목록
  - [ ] 동적 필터 + LEFT JOIN
  - [ ] page 1-based → 0-based 변환
  - [ ] 반환: `PaginationResponse<PaymentDTO.ResponseList>`

- [ ] `getPaymentDetail(String paymentId)`
  - [ ] `PAYMENT_NOT_FOUND(404)` 예외 처리
  - [ ] AI 이용 현황: `resume_analysis_logs`, `interview_logs` COUNT 조회
  - [ ] 반환: `PaymentDTO.ResponseDetail`

- [ ] `approveRefund(String paymentId, Long adminId)`
  - [ ] `PAYMENT_NOT_FOUND(404)` 예외 처리
  - [ ] `refund_status != PENDING` → `REFUND_NOT_PENDING(409)` 예외
  - [ ] Toss 환불 API 호출 (`payment_key` 사용)
  - [ ] 성공: `refund.complete(adminId)` + `payment.cancel()` — `@Transactional`
  - [ ] 실패: `refund.fail()` → `TOSS_REFUND_FAILED(502)` 예외
  - [ ] 반환: `RefundDTO.ResponseApprove`

- [ ] `rejectRefund(String paymentId, String rejectReason, Long adminId)`
  - [ ] `PAYMENT_NOT_FOUND(404)` 예외 처리
  - [ ] `refund_status != PENDING` → `REFUND_NOT_PENDING(409)` 예외
  - [ ] `rejectReason` blank → `REJECT_REASON_REQUIRED(400)` 예외
  - [ ] `refund.reject(adminId, rejectReason)` — `@Transactional`
  - [ ] 반환: `RefundDTO.ResponseReject`

### AdminSubscriptionService

- [ ] `getSubscriptions(status, page, size)`
  - [ ] 동적 필터 + `AT_RISK` 서브쿼리
  - [ ] page 1-based → 0-based 변환
  - [ ] 반환: `PaginationResponse<SubscriptionDTO.ResponseList>`

---

## Phase 4 — Controller & Swagger Docs

- [ ] `AdminPaymentController.java`
  - [ ] `GET /api/admin/payments/summary`
  - [ ] `GET /api/admin/payments`
  - [ ] `GET /api/admin/payments/{paymentId}`
  - [ ] `POST /api/admin/payments/{paymentId}/refund`
  - [ ] `POST /api/admin/payments/{paymentId}/refund-reject`
  - [ ] `@AuthenticationPrincipal AdminPrincipal` — 환불 처리 시 adminId 추출
  - [ ] `@PreAuthorize("hasRole('ADMIN')")` 또는 Security Config 적용
  - [ ] Controller에서 `try-catch` 사용 금지
- [ ] `AdminSubscriptionController.java`
  - [ ] `GET /api/admin/subscriptions`
- [ ] Swagger Docs 분리
  - [ ] `AdminPaymentControllerDocs.java`
  - [ ] `AdminSubscriptionControllerDocs.java`

---

## Phase 5 — ErrorCode 등록 & 검증

### ErrorCode 추가

- [ ] `PAYMENT_NOT_FOUND` (404)
- [ ] `REFUND_NOT_PENDING` (409)
- [ ] `REJECT_REASON_REQUIRED` (400)
- [ ] `TOSS_REFUND_FAILED` (502)
- [ ] `SUBSCRIPTION_NOT_FOUND` (404)

### 검증

- [ ] Swagger UI에서 전체 API 요청/응답 확인
- [ ] FE `api-schema.md` 계약과 실제 응답 형식 일치 여부 확인
- [ ] `page=1` 요청 시 첫 번째 페이지 반환 확인 (1-based → 0-based 변환)
- [ ] `COMPLETED` / `REJECTED` 환불 건 재처리 시도 → `REFUND_NOT_PENDING(409)` 응답 확인
- [ ] `rejectReason` 미입력 시 → `REJECT_REASON_REQUIRED(400)` 응답 확인
- [ ] Toss 환불 API 실패 시 `payment_status` 변경 없음 확인
- [ ] 환불 확정 성공 시 `payment_status → CANCELED`, `refund_status → COMPLETED` 트랜잭션 원자적 처리 확인
