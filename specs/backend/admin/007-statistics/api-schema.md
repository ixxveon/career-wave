# API Schema: 서비스 통계 및 분석 (Statistics)

> 백엔드 ↔ 프론트엔드 간 데이터 계약.
> HTTP 계약 원본은 `specs/frontend/admin/007-statistics/api-schema.md`를 기준으로 한다.
> 본 문서는 백엔드 구현 관점의 타입·메서드 시그니처를 보완한다.

---

## Controller 메서드 시그니처

### AdminStatisticsController

```java
// KPI 집계
ResponseEntity<ApiResponse<StatisticsDTO.ResponseSummary>> getSummary();

// 월별 매출 추이 (최근 6개월)
ResponseEntity<ApiResponse<List<StatisticsDTO.MonthlyRevenue>>> getMonthlyRevenue();

// 구독 유형별 매출 실적 (당월)
ResponseEntity<ApiResponse<List<StatisticsDTO.RevenueBreakdownItem>>> getRevenueBreakdown();

// 구독자 변동 추이 (최근 6개월)
ResponseEntity<ApiResponse<List<StatisticsDTO.MonthlySubscribers>>> getMonthlySubscribers();

// 최근 가입 피드 (최대 5건)
ResponseEntity<ApiResponse<List<StatisticsDTO.RecentSubscriber>>> getRecentSubscribers();
```

> 모든 메서드 `@PreAuthorize("hasRole('ADMIN')")` 또는 Security Config 적용.
> 페이지네이션 파라미터 없음 — 고정 범위 반환.

---

## 공통 응답 형식

```java
ApiResponse.ok(data);
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
| `UNAUTHORIZED` | 401 | 인증 실패 |
