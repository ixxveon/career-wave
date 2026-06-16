# Plan: 결제·정산 관리 API (Payment & Settlement)

**Feature Branch**: `feature/admin-payment-api`
**담당**: 신보라
**버전**: v1
**Status**: 구현 예정

---

## 프로젝트 구조

```text
backend/src/main/java/kr/co/carrer/admin/payment/
├── entity/
│   ├── Payment.java                        # payments 테이블 엔티티
│   └── Refund.java                         # refunds 테이블 엔티티
├── repository/
│   ├── PaymentRepository.java              # JpaRepository<Payment, UUID>
│   ├── PaymentQueryRepository.java         # Native Query 목록/요약 조회
│   ├── RefundRepository.java               # JpaRepository<Refund, Long>
│   └── SubscriptionQueryRepository.java    # Native Query 구독 목록 조회 (admin 전용)
├── type/
│   ├── PaymentStatus.java                  # PENDING, DONE, CANCELED, FAILED
│   ├── PaymentType.java                    # MANUAL, AUTO_RENEWAL
│   ├── RefundStatus.java                   # PENDING, COMPLETED, FAILED, REJECTED
│   └── SubStatus.java                      # ACTIVE, RENEWAL_SCHEDULED, CANCEL_SCHEDULED, AT_RISK
├── service/
│   ├── AdminPaymentService.java            # 결제·환불 인터페이스
│   ├── AdminSubscriptionService.java       # 구독 현황 인터페이스
│   └── impl/
│       ├── AdminPaymentServiceImpl.java
│       └── AdminSubscriptionServiceImpl.java
├── controller/
│   ├── AdminPaymentController.java
│   └── AdminSubscriptionController.java
├── dto/
│   ├── PaymentDTO.java                     # ResponseList, ResponseDetail, ResponseSummary
│   └── RefundDTO.java                      # ResponseApprove, ResponseReject
│   └── SubscriptionDTO.java               # ResponseList, ResponseSummary
├── exception/
│   └── AdminPaymentErrorCode.java         # PAYMENT_NOT_FOUND, REFUND_NOT_PENDING 등
└── docs/
    ├── AdminPaymentControllerDocs.java
    └── AdminSubscriptionControllerDocs.java
```

---


## 구현 진행 체크리스트

- [ ] Phase 1: 엔티티 및 Enum
- [ ] Phase 2: 레포지토리
- [ ] Phase 3: 서비스 레이어
- [ ] Phase 4: 컨트롤러
- [ ] Phase 5: 에러코드 등록 및 검증
## Phase 1 — 엔티티 및 Enum

### 작업 목록

1. `PaymentStatus.java` 작성 — PENDING, DONE, CANCELED, FAILED
2. `PaymentType.java` 작성 — MANUAL, AUTO_RENEWAL
3. `RefundStatus.java` 작성 — PENDING, COMPLETED, FAILED, REJECTED
4. `SubStatus.java` 작성 — ACTIVE, RENEWAL_SCHEDULED, CANCEL_SCHEDULED, AT_RISK

5. `Payment.java` 엔티티 작성
   - `@Entity @Table(name = "payments")`
   - `paymentId`: UUID, `@Id @GeneratedValue(generator = "UUID")`
   - `paymentKey`: NULL UNIQUE (FAILED 결제 시 NULL)
   - `payment_status`, `payment_type`: `@Enumerated(EnumType.STRING)`
   - `cancel()` 도메인 메서드: DONE 아니면 IllegalStateException

6. `Refund.java` 엔티티 작성
   - `@Entity @Table(name = "refunds")`
   - `refundId`: BIGSERIAL, `@GeneratedValue(IDENTITY)`
   - `refundStatus`: `@Enumerated(EnumType.STRING)`, `@PrePersist`에서 PENDING으로 초기화
   - `complete(adminId)` 도메인 메서드
   - `reject(adminId, rejectReason)` 도메인 메서드
   - `fail()` 도메인 메서드

---

## Phase 2 — 레포지토리

### 작업 목록

1. `PaymentRepository.java` 작성 — `JpaRepository<Payment, UUID>`

2. `RefundRepository.java` 작성 — `JpaRepository<Refund, Long>`
   - `findByPaymentId(UUID paymentId)` 메서드 추가

3. `PaymentQueryRepository.java` 작성 (Native Query 패턴)
   - `EntityManager` 주입
   - `getPaymentSummary()` → DONE 건 SUM/COUNT, PENDING 환불 COUNT, FAILED 건 COUNT
   - `getPaymentList(keyword, status, page, size)` → refunds LEFT JOIN 포함
   - `countPayments(keyword, status)` → 페이징 total
   - `getPaymentDetail(UUID paymentId)` → AI 이용 현황 포함 (resume_analysis_logs, interview_logs subquery)

4. `SubscriptionQueryRepository.java` 작성 (Native Query 패턴, admin 전용)
   - `getSubscriptionList(status, page, size)`
   - AT_RISK 필터: 서브쿼리로 최근 AUTO_RENEWAL FAILED member_id 추출
   - `countSubscriptions(status)`

---

## Phase 3 — 서비스 레이어

### 작업 목록

1. `AdminPaymentService.java` 인터페이스 작성
   - `PaymentDTO.ResponseSummary getSummary()`
   - `PageResponse<PaymentDTO.ResponseList> getPayments(keyword, status, page, size)`
   - `PaymentDTO.ResponseDetail getPaymentDetail(UUID paymentId)`
   - `RefundDTO.ResponseApprove approveRefund(UUID paymentId, Long adminId)`
   - `RefundDTO.ResponseReject rejectRefund(UUID paymentId, String rejectReason, Long adminId)`

2. `AdminPaymentServiceImpl.java` 구현
   - `getSummary()`: `@Transactional(readOnly = true)`
   - `getPayments()`: `@Transactional(readOnly = true)`, page 1-based → 0-based 변환
   - `getPaymentDetail()`: `@Transactional(readOnly = true)`, PAYMENT_NOT_FOUND 예외
   - `approveRefund()`:
     - `@Transactional`
     - PAYMENT_NOT_FOUND(404), REFUND_NOT_PENDING(409) 검증
     - paymentKey null → 환불 API 호출 불가 → 별도 처리 필요
     - Toss 환불 API 호출
     - 성공: `refund.complete(adminId)` + `payment.cancel()` — 동일 트랜잭션
     - 실패: `fail()` 별도 트랜잭션으로 저장 후 TOSS_REFUND_FAILED(502) throw
   - `rejectRefund()`:
     - `@Transactional`
     - PAYMENT_NOT_FOUND(404), REFUND_NOT_PENDING(409) 검증
     - rejectReason blank → REJECT_REASON_REQUIRED(400)
     - `refund.reject(adminId, rejectReason)` 호출

3. `AdminSubscriptionService.java` 인터페이스 작성
   - `PageResponse<SubscriptionDTO.ResponseList> getSubscriptions(status, page, size)`

4. `AdminSubscriptionServiceImpl.java` 구현
   - `getSubscriptions()`: `@Transactional(readOnly = true)`, page 1-based → 0-based 변환

---

## Phase 4 — 컨트롤러

### 작업 목록

1. `AdminPaymentController.java` 작성
   - `GET  /api/admin/payments/summary`
   - `GET  /api/admin/payments?keyword=&status=&page=1&size=20`
   - `GET  /api/admin/payments/{paymentId}`
   - `POST /api/admin/payments/{paymentId}/refund`
   - `POST /api/admin/payments/{paymentId}/refund-reject`

2. `AdminSubscriptionController.java` 작성
   - `GET /api/admin/subscriptions?status=&page=1&size=20`

3. `AdminPaymentControllerDocs.java`, `AdminSubscriptionControllerDocs.java` Swagger 인터페이스 작성

---

## Phase 5 — 에러코드 등록 및 검증

### ErrorCode 목록

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| PAYMENT_NOT_FOUND | 404 | 결제 건 조회 실패 |
| REFUND_NOT_PENDING | 409 | 이미 처리된 환불 건 재처리 시도 |
| REJECT_REASON_REQUIRED | 400 | 환불 불가 처리 시 사유 미입력 |
| TOSS_REFUND_FAILED | 502 | Toss 환불 API 호출 실패 |
| SUBSCRIPTION_NOT_FOUND | 404 | 구독 건 조회 실패 |

### 검증 체크리스트

- [ ] Toss 환불 성공 시 refund_status = COMPLETED, payment_status = CANCELED 동일 트랜잭션 확인
- [ ] Toss 환불 실패 시 refund_status = FAILED 별도 트랜잭션 저장 + 502 반환 확인
- [ ] PENDING 아닌 환불 재처리 시 409 반환 확인
- [ ] rejectReason blank 시 400 반환 확인
- [ ] AT_RISK 필터가 최근 AUTO_RENEWAL FAILED 구독만 반환하는지 확인
- [ ] 결제 상세에 AI 이용 현황(resumePaidCount, interviewPaidCount) 포함 확인
- [ ] 모든 응답 ApiResponse<T> 래퍼 확인
