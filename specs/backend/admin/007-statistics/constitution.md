# Constitution: 서비스 통계 및 분석 API (Statistics)

**Feature Branch**: `feature/admin-statistics-be-spec`
**Scope**: KPI 집계 / 월별 매출 추이 / 구독 유형별 매출 / 구독자 변동 추이 / 최근 가입 피드
**버전**: v1
**담당**: 신보라

---

## 1. 도메인 가치

관리자는 서비스 매출 현황과 가입자 증가 추이를 실시간으로 파악하여
운영 의사결정에 활용할 수 있어야 한다.

---

## 2. 아키텍처 결정

| 결정 | 내용 | 근거 |
|---|---|---|
| READ-ONLY | 모든 엔드포인트 GET 전용 | 통계는 조회만, 쓰기 없음 |
| Entity 없음 | 기존 테이블 집계 전용 | 별도 통계 테이블 없음, payments·subscriptions·members 활용 |
| admin 전용 Repository | user/ 패키지 직접 참조 금지 | CONVENTION.md — admin과 user는 서로 직접 참조 금지 |
| 누락 월 0 채움 | 데이터 없는 월도 0으로 반환 | FE 차트 X축 연속성 보장 |
| 경과 시간 서버 포맷 | timeAgo를 서버에서 계산 | 클라이언트 타임존 의존 제거 |
| 증감률 서버 계산 | 전월 대비 증감률 서버에서 반환 | 프론트에서 raw 데이터 직접 계산 금지 |
| page 없음 | 페이지네이션 미적용 | 고정 범위(최근 6개월, 최대 5건) |

---

## 3. 불변 규칙

- 모든 엔드포인트는 GET 전용이다. POST/PUT/DELETE 엔드포인트를 추가하는 것을 금지한다.
- `user/` 패키지 클래스를 `admin/statistics/`에서 직접 import하는 것을 금지한다.
- 월별 집계 범위는 최근 6개월(당월 포함)을 기준으로 한다.
- 데이터 없는 월은 0으로 채워 반환한다. (null 반환 금지)
- 최근 가입 피드는 최대 5건으로 고정한다.
- 매출 집계는 `payment_status = DONE` 건만 대상으로 한다. PENDING·FAILED·CANCELED 제외.
- 환불 차감은 `refund_status = COMPLETED` 건만 집계한다.
- Controller에서 `try-catch`로 비즈니스 예외를 처리하는 것을 금지한다.

---

## 4. 연동 계약

- 프론트엔드 HTTP 계약 원본: `specs/frontend/admin/007-statistics/api-schema.md`
- 제공 엔드포인트:
  - `GET /api/admin/statistics/summary`
  - `GET /api/admin/statistics/revenue/monthly`
  - `GET /api/admin/statistics/revenue/breakdown`
  - `GET /api/admin/statistics/subscribers/monthly`
  - `GET /api/admin/statistics/subscribers/recent`
- 모든 응답은 `ApiResponse<T>` 래퍼를 사용한다.
- `MonthlyRevenue`, `MonthlySubscribers` 응답은 오래된 순(ASC) 정렬을 보장한다.
- `RecentSubscriber` 응답은 최신 순(DESC) 정렬, 최대 5건을 보장한다.

---

## 5. 금지 패턴

- 통계 집계를 프론트엔드에서 raw 데이터로 직접 계산하도록 API를 설계하는 것을 금지한다.
- `user/` 패키지 Repository를 직접 import하는 것을 금지한다. admin 전용 집계 쿼리 사용.
- Entity를 직접 반환하는 것을 금지한다. `ApiResponse<DTO>`를 사용한다.
- 누락 월을 null로 반환하는 것을 금지한다. 0으로 채워 반환한다.
- 통계 엔드포인트에 쓰기(POST/PUT/DELETE) 기능을 추가하는 것을 금지한다.
