# Tasks: 서비스 통계 및 분석 API (Statistics)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — DTO 정의

- [ ] `StatisticsDTO.java`
  - [ ] `ResponseSummary` — currentMonthRevenue / currentMonthRevenueGrowth / totalRevenue / totalMembers / currentMonthNewMembers / currentMonthNewMembersGrowth
  - [ ] `MonthlyRevenue` — month(YYYY-MM) / total
  - [ ] `RevenueBreakdownItem` — type / label / amount / growth
  - [ ] `MonthlySubscribers` — month(YYYY-MM) / newSubs / churned
  - [ ] `RecentSubscriber` — memberId / initials / memberName / subStatus / plan / timeAgo

---

## Phase 2 — Service 구현

### AdminStatisticsService

- [ ] `getSummary()`
  - [ ] 당월 `payment_status = DONE` `amount` SUM → `currentMonthRevenue`
  - [ ] 전월 매출 집계 → 증감률 계산 (`currentMonthRevenueGrowth`)
  - [ ] 전체 `payment_status = DONE` `amount` SUM → `totalRevenue`
  - [ ] `members` 전체 COUNT → `totalMembers`
  - [ ] 당월 `members.created_at` COUNT → `currentMonthNewMembers`
  - [ ] 전월 신규 가입 집계 → 증감률 계산 (`currentMonthNewMembersGrowth`)
  - [ ] 전월 매출·신규 가입이 0인 경우 증감률 0.0 반환 (0 나누기 방지)

- [ ] `getMonthlyRevenue()`
  - [ ] 최근 6개월 `payment_status = DONE` 월별 GROUP BY YEAR·MONTH, SUM(amount)
  - [ ] 누락 월 `total: 0` 채움 처리
  - [ ] 오래된 순(ASC) 정렬하여 반환
  - [ ] 반환: `List<StatisticsDTO.MonthlyRevenue>`

- [ ] `getRevenueBreakdown()`
  - [ ] 당월 `MANUAL` `DONE` SUM → `NEW_CONVERSION`
  - [ ] 당월 `AUTO_RENEWAL` `DONE` SUM → `RENEWAL`
  - [ ] 당월 전체 `DONE` SUM → `PREMIUM`
  - [ ] 당월 `refund_status = COMPLETED` SUM (음수) → `REFUND_DEDUCTION`
  - [ ] 각 유형 전월 대비 증감률 계산
  - [ ] PREMIUM → NEW_CONVERSION → RENEWAL → REFUND_DEDUCTION 순서 보장
  - [ ] 반환: `List<StatisticsDTO.RevenueBreakdownItem>`

- [ ] `getMonthlySubscribers()`
  - [ ] 최근 6개월 `subscriptions.start_date` 월별 GROUP BY → `newSubs`
  - [ ] 최근 6개월 `subscriptions.renew_date` 만료 기준 월별 GROUP BY → `churned`
  - [ ] 누락 월 `newSubs: 0, churned: 0` 채움 처리
  - [ ] 오래된 순(ASC) 정렬하여 반환
  - [ ] 반환: `List<StatisticsDTO.MonthlySubscribers>`

- [ ] `getRecentSubscribers()`
  - [ ] `subscriptions.created_at DESC` 상위 5건 조회
  - [ ] `members` 테이블 JOIN → `memberName` 조회 (admin 전용 쿼리, `user/` 패키지 직접 참조 금지)
  - [ ] 이니셜 추출: memberName 앞 2자 대문자
  - [ ] `timeAgo` 포맷: 서버 현재 시각 기준 ("N분 전", "N시간 전", "N일 전")
  - [ ] 반환: `List<StatisticsDTO.RecentSubscriber>`

---

## Phase 3 — Controller & Swagger Docs

- [ ] `AdminStatisticsController.java`
  - [ ] `GET /api/admin/statistics/summary`
  - [ ] `GET /api/admin/statistics/revenue/monthly`
  - [ ] `GET /api/admin/statistics/revenue/breakdown`
  - [ ] `GET /api/admin/statistics/subscribers/monthly`
  - [ ] `GET /api/admin/statistics/subscribers/recent`
  - [ ] `@PreAuthorize("hasRole('ADMIN')")` 또는 Security Config 적용
  - [ ] Controller에서 `try-catch` 사용 금지
- [ ] `AdminStatisticsControllerDocs.java` — Swagger 명세 분리

---

## Phase 4 — 검증

- [ ] Swagger UI에서 전체 API 요청/응답 확인
- [ ] FE `api-schema.md` 계약과 실제 응답 형식 일치 여부 확인
- [ ] 데이터 없는 월이 0으로 채워져 반환되는지 확인
- [ ] 전월 매출·신규 가입이 0인 경우 증감률 0.0 반환 확인 (0 나누기 방지)
- [ ] 최근 가입 피드가 정확히 5건 이하로 반환되는지 확인
- [ ] `user/` 패키지 직접 참조가 없는지 확인
