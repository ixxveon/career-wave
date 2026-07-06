# Constitution: 정산 관리 (Settlement)

**Feature Branch**: `feat/267-settlement-reports`
**Scope**: 정산 리포트 목록 조회 / 상세 조회 / 수동 생성 / 정산 확정
**버전**: v2 (payment v1에서 분리)
**담당**: 신보라

---

## 1. 도메인 가치

MASTER 관리자가 월별 정산 리포트를 조회하고, 수동 생성 및 확정 처리를 수행한다.
정산 데이터의 정확성을 검증할 수 있도록 포함 결제 내역을 상세 조회할 수 있다.

---

## 2. 상태 머신

### settlement_reports.settlement_status

| 값 | 표시 | 설명 |
|---|---|---|
| `PENDING` | 대기 | 집계 완료, 관리자 확인 전 |
| `CONFIRMED` | 확정 | 관리자 확인 완료 |

| 전이 | UI 동작 |
|---|---|
| PENDING → CONFIRMED | "정산 확정" 버튼 클릭 → 서버 응답 기준 상태 갱신 |
| CONFIRMED → 기타 | 확정 버튼 비노출 |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|---|---|---|
| 별도 페이지 | `Settlement/SettlementListPage.tsx` | payment 탭에서 분리, 독립 라우트 |
| API 모듈 | `settlementApi.ts` | `paymentApi.ts`와 분리 |
| 상태 배지 | PENDING(노란색) / CONFIRMED(초록색) | 2가지 상태만 존재 |
| 권한 | MASTER 전용 | 사이드바에서 MASTER 외 역할에게 메뉴 비노출 |
| 필터 | 상태 필터 (전체/PENDING/CONFIRMED) | 기간 필터는 v2 범위 외 |

---

## 4. 불변 규칙

- CONFIRMED 상태의 정산 리포트에는 확정 버튼을 노출하지 않는다.
- 정산 상태를 프론트에서 직접 변경하지 않는다. 서버 응답 기준으로 갱신한다.
- `SettlementStatus` 값은 `PENDING`, `CONFIRMED`만 사용한다.
- 모든 HTTP 호출은 `settlementApi.ts`를 통해서만 수행한다.
- 낙관적 업데이트(Optimistic Update)를 사용하지 않는다.

---

## 5. 연동 계약

- `admin-backend`는 아래 API를 제공한다:
  - `GET /api/v1/admin/settlements` — 목록 (status, page, size)
  - `GET /api/v1/admin/settlements/{settlementId}` — 상세 + 결제 내역
  - `POST /api/v1/admin/settlements/generate` — 수동 생성
  - `PATCH /api/v1/admin/settlements/{settlementId}/confirm` — 정산 확정
- 모든 응답은 `ApiResponse<T>` 형식을 사용한다.
- 페이지네이션 필드: `items`, `page`, `size`, `totalItems`, `totalPages`

---

## 6. 금지 패턴

- `paymentApi.ts`에서 정산 API를 호출하는 것을 금지한다.
- CONFIRMED 정산 리포트에 확정 버튼을 노출하는 것을 금지한다.
- 정산 처리 결과를 서버 응답 없이 프론트에서 직접 상태 변경하는 것을 금지한다.
- `axios`, `fetch`를 컴포넌트에서 직접 호출하는 것을 금지한다.
