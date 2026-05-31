# Constitution: 결제·정산 관리 (Payment & Settlement)

**Feature Branch**: `feature/admin-payment-fe-spec`
**Scope**: 결제 내역 탭 / 구독 현황 탭 / 정산 리포트 탭(v2 블라인드)
**버전**: v1
**담당**: 신보라

---

## 1. 도메인 가치

CS 관리자는 회원의 프리미엄 구독 결제 현황을 조회하고,
환불 요청 건에 대해 조건을 검증한 뒤 확정 또는 불가 처리를 수행해야 한다.

결제 실패(AT_RISK) 구독자를 조기에 파악하여 CS 대응을 지원한다.

---

## 2. 상태 머신

### payments.payment_status 전이

```text
PENDING ──► DONE ──► CANCELED  (환불 완료 후)
        └──► FAILED
```

| 전이 | 허용 여부 | 트리거 |
|---|---|---|
| PENDING → DONE | 허용 | Toss 승인 완료 (백엔드) |
| PENDING → FAILED | 허용 | Toss 승인 실패 (백엔드) |
| DONE → CANCELED | 허용 | 환불 처리 확정 시 |
| DONE → 기타 | 금지 | — |
| FAILED → 기타 | 금지 | UI 처리 버튼 비노출 |

### refunds.refund_status 전이

```text
PENDING ──► COMPLETED  (환불 처리 확정)
        └──► REJECTED   (환불 불가 처리)
        └──► FAILED     (Toss API 실패)
```

| 전이 | 허용 여부 | 트리거 |
|---|---|---|
| PENDING → COMPLETED | 허용 | "환불 처리 확정" 버튼 클릭 |
| PENDING → REJECTED | 허용 | "환불 불가 처리" 버튼 클릭 |
| COMPLETED → 기타 | 금지 | UI 처리 버튼 비노출 |
| REJECTED → 기타 | 금지 | UI 처리 버튼 비노출 |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|---|---|---|
| 3탭 구조 | 결제 내역 / 구독 현황 / 정산 리포트 | 도메인 성격 분리 |
| 정산 리포트 | v2 블라인드 처리 | v1 범위 외, 탭은 표시하되 "준비 중" 안내 |
| 상태 배지 우선순위 | refundStatus 존재 시 결제 상태 대신 환불 상태 표시 | 환불 진행 상황이 더 중요한 정보 |
| 환불 조건 검증 | 프론트에서 자동 계산 후 표시 | 관리자가 직접 조건 확인 가능하도록 |
| AI 이용 이력 | payments 조회 시 aiUsage 포함 응답 | 환불 가능 여부 판단에 필요 |
| 멘토 정산 | 미구현 | CareerWave는 멘토 서비스 미제공 |

---

## 4. 불변 규칙

- `payment_status = PENDING` 또는 `FAILED` 건에는 환불 처리 버튼을 노출하지 않는다.
- `refund_status = COMPLETED` 또는 `REJECTED` 건에는 처리 버튼을 노출하지 않는다.
- 환불 가능 여부(7일 + AI 미이용)는 프론트에서 자동 계산하여 표시한다.
- 환불 조건: 결제일 포함 7일 이내 AND 유료 AI 기능(이력서 분석/AI 면접) 이용 0회
- 결제·환불 상태를 프론트에서 직접 변경하지 않는다. 서버 응답 기준으로 갱신한다. (API 연동 후)
- `PayStatus`, `RefundStatus`, `SubStatus` enum 값은 ERD 기준 값만 사용한다.
- 정산 리포트 탭 클릭 시 "다음 버전에 구현 될 예정입니다." 안내를 표시한다.
- 멘토 정산 관련 코드·상태·UI를 추가하는 것을 금지한다.

---

## 5. 연동 계약

- `admin-backend`는 아래 API를 제공한다:
  - `GET /api/admin/payments/summary` — KPI 집계
  - `GET /api/admin/payments` — 결제 목록 (keyword, status, page, size)
  - `GET /api/admin/payments/{paymentId}` — 결제 상세 (aiUsage 포함)
  - `POST /api/admin/payments/{paymentId}/refund` — 환불 처리 확정
  - `POST /api/admin/payments/{paymentId}/refund-reject` — 환불 불가 처리
  - `GET /api/admin/subscriptions` — 구독 현황 목록 (status, page, size)
- 모든 응답은 `ApiResponse<T>` 형식 (`success`, `statusCode`, `message`, `data`)을 사용한다.
- 모든 HTTP 호출은 `frontend/src/admin/api/paymentApi.ts`를 통해서만 수행한다.

---

## 6. 금지 패턴

- `PENDING` / `FAILED` 결제 건에 환불 처리 버튼을 노출하는 것을 금지한다.
- 이미 처리된(`COMPLETED` / `REJECTED`) 환불 건에 처리 버튼을 노출하는 것을 금지한다.
- 멘토 정산 관련 상태값(`SettlementStatus` 등)을 코드에서 가정하는 것을 금지한다.
- 환불 처리 결과를 서버 응답 없이 프론트에서 직접 상태 변경하는 것을 금지한다. (API 연동 후)
- 정산 리포트 탭에 실제 기능을 구현하는 것을 금지한다. (v2 예정)
