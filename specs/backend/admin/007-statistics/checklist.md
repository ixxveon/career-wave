# Checklist: 서비스 통계 및 분석 API (Statistics)

> `spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.

---

## Phase 1 — DTO & 설계

- [ ] `StatisticsDTO.java`에 inner class 5종이 선언되어 있다 (ResponseSummary / MonthlyRevenue / RevenueBreakdownItem / MonthlySubscribers / RecentSubscriber).
- [ ] 별도 Entity·Repository 없이 기존 테이블 집계 쿼리만 사용한다.
- [ ] `admin/statistics/` 패키지가 `user/` 패키지를 직접 참조하지 않는다.

---

## Phase 2 — 집계 로직

- [ ] 매출 집계 대상이 `payment_status = DONE` 건만 포함된다. (PENDING·FAILED·CANCELED 제외)
- [ ] 환불 차감 집계 대상이 `refund_status = COMPLETED` 건만 포함된다.
- [ ] 전월 매출·신규 가입이 0인 경우 증감률이 0.0으로 반환된다. (0 나누기 방지)
- [ ] 월별 추이 응답에 데이터 없는 월이 0으로 채워져 반환된다. (null 없음)
- [ ] 월별 추이 응답이 오래된 순(ASC)으로 정렬된다.
- [ ] 최근 가입 피드가 최대 5건으로 제한된다.
- [ ] `timeAgo` 포맷이 서버에서 계산되어 반환된다. ("N분 전", "N시간 전" 등)
- [ ] `RevenueBreakdownItem` 순서가 PREMIUM → NEW_CONVERSION → RENEWAL → REFUND_DEDUCTION을 보장한다.

---

## Phase 3 — API 응답 형식

- [ ] 모든 API 응답이 `ApiResponse<T>` 래퍼를 사용한다.
- [ ] Entity를 직접 반환하지 않는다.
- [ ] 모든 엔드포인트가 GET 전용이다. (쓰기 엔드포인트 없음)
- [ ] ADMIN 권한 검사가 적용되어 있다.
- [ ] Controller에서 `try-catch`로 비즈니스 예외를 처리하지 않는다.

---

## Phase 4 — 도메인 분리 & 컨벤션

- [ ] `admin/statistics/` 패키지가 `user/` 패키지를 직접 참조하지 않는다.
- [ ] DTO가 inner class 패턴(`StatisticsDTO.ResponseSummary` 등)을 사용한다.
- [ ] Swagger Annotation이 Controller가 아닌 `docs/` 패키지 인터페이스로 분리되어 있다.
