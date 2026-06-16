# Plan: 결제·정산 관리 API (Payment & Settlement)

**Feature Branch**: `feature/admin-payment-api`
**담당**: 신보라
**버전**: v1
**Status**: 구현 예정

---

## Summary

결제 내역 조회, 환불 처리 확정·불가, 구독 현황 조회 어드민 REST API.
Toss Payments 환불 API 연동 포함. 정산 리포트는 v2 예정.

---

## Technical Context

- Spring Boot + JPA 기반 어드민 백엔드
- 패키지: `admin/payment/`
- Native Query 패턴 (EntityManager 직접 사용)
- Toss Payments 환불 API: `POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel`
- AI 이용 현황 조회: `ai_usage_logs` 테이블 feature_type별 COUNT

---

## Project Structure

```text
admin/payment/
├── entity/
│   ├── Payment.java
│   └── Refund.java
├── repository/
│   ├── PaymentRepository.java
│   ├── PaymentQueryRepository.java
│   ├── RefundRepository.java
│   └── SubscriptionQueryRepository.java
├── type/
│   ├── PaymentStatus.java             -- READY/CONFIRMING/PAID/FAILED/CANCELED/REFUNDED
│   ├── FailureReason.java             -- USER_CANCELED/CARD_DECLINED/TIMEOUT 등 7종
│   ├── RefundStatus.java              -- PENDING/COMPLETED/FAILED/REJECTED
│   └── SubscriptionStatus.java       -- ACTIVE/CANCEL_SCHEDULED/EXPIRED/PAYMENT_FAILED/REFUND_PENDING/REFUNDED
├── service/
│   ├── AdminPaymentService.java
│   ├── AdminSubscriptionService.java
│   └── impl/
│       ├── AdminPaymentServiceImpl.java
│       └── AdminSubscriptionServiceImpl.java
├── controller/
│   ├── AdminPaymentController.java
│   └── AdminSubscriptionController.java
├── dto/
│   ├── PaymentDTO.java
│   ├── RefundDTO.java
│   └── SubscriptionDTO.java
├── exception/
│   └── AdminPaymentErrorCode.java
└── docs/
    ├── AdminPaymentControllerDocs.java
    └── AdminSubscriptionControllerDocs.java
```

---

## Phases

- [ ] Phase 1: 엔티티 및 Enum
  - `PaymentStatus`, `FailureReason`, `RefundStatus`, `SubscriptionStatus` Enum 작성
  - `Payment.java` — UUID PK, `cancel()` 도메인 메서드 (PAID 상태 검증 포함)
  - `Refund.java` — `@PrePersist` PENDING 초기화, `complete()` / `reject()` / `fail()` 도메인 메서드

- [ ] Phase 2: 레포지토리
  - `PaymentRepository.java` — `JpaRepository<Payment, UUID>`
  - `RefundRepository.java` — `JpaRepository<Refund, Long>`, `findByPaymentId()` 추가
  - `PaymentQueryRepository.java` — Native Query 목록/요약/상세 조회, refunds LEFT JOIN, ai_usage_logs subquery
  - `SubscriptionQueryRepository.java` — Native Query 구독 목록 조회 (admin 전용)

- [ ] Phase 3: 서비스 레이어
  - `getSummary()` — `@Transactional(readOnly = true)`, PAID 합산 totalRevenue
  - `getPayments()` — `@Transactional(readOnly = true)`, page 1-based → 0-based
  - `getPaymentDetail()` — `@Transactional(readOnly = true)`, PAYMENT_NOT_FOUND(404)
  - `approveRefund()` — `@Transactional`, REFUND_NOT_PENDING(409) / PAYMENT_NOT_REFUNDABLE(409), Toss API 연동, 실패 시 REQUIRES_NEW로 FAILED 저장
  - `rejectRefund()` — `@Transactional`, REJECT_REASON_REQUIRED(400)
  - `getSubscriptions()` — `@Transactional(readOnly = true)`
  - `AdminPaymentErrorCode.java` 작성

- [ ] Phase 4: 컨트롤러
  - `AdminPaymentController.java` — 5개 엔드포인트 (`/api/v1/admin/payments/...`)
  - `AdminSubscriptionController.java` — 1개 엔드포인트 (`/api/v1/admin/subscriptions`)
  - Docs 인터페이스 2개 작성

- [ ] Phase 5: 검증
  - Toss 환불 성공 시 refund_status=COMPLETED, payment_status=CANCELED 동일 트랜잭션 확인
  - Toss 환불 실패 시 FAILED 별도 트랜잭션 저장 + 502 반환 확인
  - PENDING 아닌 환불 재처리 시 409 반환 확인
  - PAID 아닌 결제 환불 시 409 반환 확인
  - 모든 응답 ApiResponse<T> 래퍼 확인