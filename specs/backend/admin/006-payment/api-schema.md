# API Schema: 결제·정산 관리 (Payment & Settlement)

> 백엔드 ↔ 프론트엔드 간 데이터 계약.
> HTTP 계약 원본은 `specs/frontend/admin/006-payment/api-schema.md`를 기준으로 한다.
> 본 문서는 백엔드 구현 관점의 타입·메서드 시그니처를 보완한다.

---

## Controller 메서드 시그니처

### AdminPaymentController

```java
// KPI 집계
ResponseEntity<ApiResponse<PaymentDTO.ResponseSummary>> getSummary();

// 결제 목록 조회
ResponseEntity<ApiResponse<PaginationResponse<PaymentDTO.ResponseList>>> getPayments(
    @RequestParam(required = false) String keyword,
    @RequestParam(required = false) String status,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size
);

// 결제 상세 조회
ResponseEntity<ApiResponse<PaymentDTO.ResponseDetail>> getPaymentDetail(
    @PathVariable String paymentId
);

// 환불 처리 확정
ResponseEntity<ApiResponse<RefundDTO.ResponseApprove>> approveRefund(
    @PathVariable String paymentId,
    @AuthenticationPrincipal AdminPrincipal admin
);

// 환불 불가 처리
ResponseEntity<ApiResponse<RefundDTO.ResponseReject>> rejectRefund(
    @PathVariable String paymentId,
    @RequestBody @Valid RefundDTO.RequestReject request,
    @AuthenticationPrincipal AdminPrincipal admin
);
```

### AdminSubscriptionController

```java
// 구독 현황 목록 조회
ResponseEntity<ApiResponse<PaginationResponse<SubscriptionDTO.ResponseList>>> getSubscriptions(
    @RequestParam(required = false) String status,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size
);
```

---

## 공통 응답 형식

```java
ApiResponse.ok(data);
ApiResponse.ok(message, data);
ApiResponse.fail(statusCode, message);
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

---

## 페이지네이션 응답 형식

```java
PaginationResponse<T> result = new PaginationResponse<>(
    page.getContent().stream().map(...).toList(),
    pageNum,              // 1-based (요청값 그대로 반환)
    page.getSize(),
    page.getTotalElements(),
    page.getTotalPages()
);
return ApiResponse.ok(result);
```

> `PaginationResponse<T>`는 `common/dto/` 패키지에 공통 선언.
> 반환 필드: `items`, `page`, `size`, `totalItems`, `totalPages`

---

## ErrorCode → HTTP 매핑

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `PAYMENT_NOT_FOUND` | 404 | 결제 건 조회 실패 |
| `REFUND_NOT_PENDING` | 409 | 이미 처리된 환불 건 재처리 시도 |
| `REJECT_REASON_REQUIRED` | 400 | 환불 불가 처리 시 사유 미입력 |
| `TOSS_REFUND_FAILED` | 502 | Toss 환불 API 호출 실패 |
| `SUBSCRIPTION_NOT_FOUND` | 404 | 구독 건 조회 실패 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
