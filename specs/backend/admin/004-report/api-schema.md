# API Schema: 신고관리 (Report Management)

> 백엔드 ↔ 프론트엔드 간 데이터 계약.
> HTTP 계약 원본은 `specs/frontend/admin/004-report/api-schema.md`를 기준으로 한다.
> 본 문서는 백엔드 구현 관점의 타입·메서드 시그니처를 보완한다.

---

## Controller 메서드 시그니처

```java
// KPI 집계 조회
ResponseEntity<ApiResponse<ReportDetailDTO.ResponseSummary>> getSummary();

// 신고 목록 조회
ResponseEntity<ApiResponse<Map<String, Object>>> getReports(
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String targetType,
    @RequestParam(required = false) String reason,
    @RequestParam(required = false) String keyword,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size
);

// 신고 상세 조회
ResponseEntity<ApiResponse<ReportDetailDTO.ResponseDetail>> getReportDetail(
    @PathVariable Long reportId
);

// 블라인드 처리
ResponseEntity<ApiResponse<ReportDetailDTO.ResponseProcess>> blindReport(
    @PathVariable Long reportId,
    @AuthenticationPrincipal AdminPrincipal admin
);

// 기각 처리
ResponseEntity<ApiResponse<ReportDetailDTO.ResponseProcess>> dismissReport(
    @PathVariable Long reportId,
    @AuthenticationPrincipal AdminPrincipal admin
);
```

---

## 공통 응답 형식

```java
ApiResponse.ok(data);                    // 성공
ApiResponse.ok(message, data);           // 성공 + 메시지
ApiResponse.fail(statusCode, message);   // 실패
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

## ErrorCode → HTTP 매핑

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `REPORT_NOT_FOUND` | 404 | 신고 조회 실패 |
| `ALREADY_PROCESSED` | 409 | PENDING 아닌 신고 처리 시도 |
| `INVALID_REPORT_FILTER` | 400 | 잘못된 필터 Enum 값 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
