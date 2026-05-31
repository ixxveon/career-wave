# Constitution: 서비스 통계 및 분석 (Statistics)

**Feature Branch**: `feature/admin-statistics-fe-spec`
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
| 단일 페이지 | 탭 없는 단일 스크롤 구조 | UI 구현 기준, 별도 탭 분리 불필요 |
| 차트 구현 | SVG 직접 구현 | 외부 차트 라이브러리 미사용 (현재 UI 기준 유지) |
| 집계 기준 | 서버 사이드 집계 | 프론트에서 raw 데이터 직접 계산 금지 |
| 월 기준 | 최근 6개월 (당월 포함) | 월별 추이 차트 표시 범위 |
| 더미 데이터 파일 | `statsApi.ts` 없이 컴포넌트 내부 상수 | API 연동 전 UI 구현 방식, 연동 시 분리 |

---

## 3. 불변 규칙

- 통계 데이터를 프론트에서 직접 계산하지 않는다. 서버 집계 결과를 그대로 표시한다.
- 차트 라이브러리를 추가하지 않는다. SVG 직접 구현 방식을 유지한다. (v2 재검토)
- 금액 단위는 원화(KRW) 기준이며, M 단위(₩XXM)로 축약 표시한다.
- 월별 집계 범위는 최근 6개월(당월 포함)을 기준으로 한다.
- 최근 가입 피드는 최대 5건만 표시한다.

---

## 4. 연동 계약

- `admin-backend`는 아래 API를 제공한다:
  - `GET /api/admin/statistics/summary` — KPI 집계
  - `GET /api/admin/statistics/revenue/monthly` — 월별 매출 추이 (최근 6개월)
  - `GET /api/admin/statistics/revenue/breakdown` — 구독 유형별 매출 실적
  - `GET /api/admin/statistics/subscribers/monthly` — 구독자 변동 추이 (최근 6개월)
  - `GET /api/admin/statistics/subscribers/recent` — 최근 가입 피드 (최대 5건)
- 모든 응답은 `ApiResponse<T>` 형식 (`success`, `statusCode`, `message`, `data`)을 사용한다.
- 모든 HTTP 호출은 `frontend/src/admin/api/statsApi.ts`를 통해서만 수행한다.

---

## 5. 금지 패턴

- 프론트에서 `payments`, `subscriptions`, `members` raw 데이터를 직접 집계하는 것을 금지한다.
- 차트 외부 라이브러리(Chart.js, Recharts 등)를 추가하는 것을 금지한다. (v2 재검토)
- 통계 API 이외의 경로로 데이터를 조회하는 것을 금지한다.
