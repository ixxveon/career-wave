# Implementation Plan: 사용자 구독·결제·이용 권한

**Feature Branch**: `feature/user-subscription-billing-spec`  
**레이어**: Backend (Spring Boot)  
**버전**: v0.1 초안  
**관련 문서**: `spec.md` / `tasks.md` / `api-schema.md` / `constitution.md` / `checklist.md`

---

## Summary

상품별 무료 1회 이용권과 PREMIUM 월 구독을 통합 관리하고,
Toss Payments billingKey 기반 최초 결제·자동결제·고정 재시도를 구현한다.

각 Phase는 기술 레이어가 아니라 사용자가 실제로 완료할 수 있는 기능 단위로 구성한다.
Entity만 만들고 Service를 다음 Phase로 넘기거나, Service만 만들고 API·도메인 접속을 뒤로 미루지 않는다.
각 Phase 안에서 해당 기능의 DB·Service·API·도메인 접속·테스트를 함께 완료한다.

현재 Frontend UI와 버튼은 구현 완료된 계약으로 간주한다.
Backend 구현은 현재 route, 버튼 동작, modal, 페이지 상태와 응답 타입에 맞춘다.
Backend 작업 중 UI 또는 버튼 변경 필요성이 발견되면 작업을 중단하고 사용자 승인을 먼저 받는다.

---

## Technical Context

| 분류 | 선택 |
|---|---|
| 결제 방식 | Toss Payments billingKey 월 자동결제 |
| 권한 단위 | 회원 + 상품 |
| 무료 권한 | 상품별 1회, 예약 후 성공 시 확정 |
| 월 사용량 | 구독 기간별 limit/used/reserved |
| 중복 방지 | orderId, idempotencyKey, paymentKey UNIQUE |
| 동시성 | 권한·사용량 비관적 락 + resource UNIQUE |
| 스케줄러 | nextBillingAt 기반 자동결제 |
| 실패 재시도 | 최초 실패 후 1일째·3일째 |
| 시간 기준 | `Asia/Seoul` |
| 민감정보 | billingKey 애플리케이션 암호화 |
| Frontend 기준 | 현재 UI·버튼·route 변경 금지, Backend가 기존 계약에 맞춤 |

---

## Phase Breakdown

### Phase 1 — 도메인 기반 및 DB 스키마

- 상품, 상품별 권한, 구독, 결제, billing profile, 사용 기간, 사용 기록, 약관 동의 Entity를 정의한다.
- 기존 `plans`, `subscriptions`, `payments` 스키마를 본 스펙 기준으로 확장한다.
- FREE/PREMIUM, 구독, 결제, 사용 기록 Enum과 ErrorCode를 정의한다.
- Repository와 DB 제약을 정의한다.
- Entity 상태 전이, Repository, migration 검증 테스트를 Phase 안에서 완료한다.

**Phase 완료 결과**: 이후 기능 Phase가 사용할 도메인 모델과 DB가 실행 가능한 상태이다.

### Phase 2 — 가입 후 상품별 무료 1회 이용 완성

- 회원 가입 완료 시 `document-coaching`, `interview` FREE 권한을 각각 1개 생성한다.
- 기존 회원에게도 동일한 상품별 FREE 권한을 backfill한다.
- 무료 이용권 `reserve`, `consume`, `release`를 구현한다.
- Resume 업로드·자기소개서 제출 시작 시 `document-coaching` 무료 이용권을 예약한다.
- Resume 분석 성공 시 무료 이용을 확정하고 실패 시 예약을 해제한다.
- InterviewSession 시작 시 `interview` 무료 이용권을 예약한다.
- Interview 최종 리포트 저장 성공 시 무료 이용을 확정하고 실패·timeout 시 예약을 해제한다.
- 상품별 권한 조회 API에 무료 잔여 횟수와 사용 가능 여부를 반환한다.
- 가입 → 상품별 첫 사용 성공 → 동일 상품 두 번째 사용 차단 흐름을 통합 테스트한다.

**Phase 완료 결과**:

- 신규 회원은 서류 AI와 AI 면접을 각각 한 번 실제로 사용할 수 있다.
- 한 상품의 무료 이용은 다른 상품의 무료 이용권에 영향을 주지 않는다.
- 성공한 상품의 두 번째 사용은 `SUBSCRIPTION_REQUIRED`로 차단된다.
- 실패한 작업은 무료 이용권을 소진하지 않는다.

### Phase 3 — 상품별 구독 현황 및 월 사용량 기능 완성

- 상품 목록, 내 구독, 상품별 권한, 월 사용량 조회 API를 모두 구현한다.
- 상품별 `ACTIVE`, `CANCEL_SCHEDULED`, `PAYMENT_FAILED`, `EXPIRED` 상태를 정확히 반환한다.
- `ACTIVE`, `CANCEL_SCHEDULED` 구독의 월 사용량 `reserve`, `consume`, `release`를 구현한다.
- Resume와 Interview가 PREMIUM 구독 월 사용량을 실제로 사용하도록 연결한다.
- 월 잔여량 계산과 월 한도 차단을 구현한다.
- PREMIUM 사용 중에는 FREE 이용권을 사용하지 않는다.
- 구독 없음·단일 상품 구독·두 상품 구독·월 한도 소진 시나리오를 API·통합 테스트한다.

**Phase 완료 결과**:

- 사용자는 두 상품의 FREE/PREMIUM 상태와 월 사용량을 조회할 수 있다.
- 구독 회원은 해당 상품의 월 제공량 안에서 Resume 또는 Interview를 실제로 사용할 수 있다.
- 월 제공량을 모두 사용하면 `MONTHLY_LIMIT_EXCEEDED`로 차단된다.
- 다른 상품 구독은 현재 상품 권한에 영향을 주지 않는다.

### Phase 4 — Toss 최초 자동결제 구독 전체 흐름 완성

한 Phase 안에서 `결제 전 검증 → 결제 중 검증 → 결제 후 검증`을 모두 구현한다.

#### 결제 전 검증

- 회원 상태, 상품 판매 상태, 중복 구독, 서버 가격, 약관 동의를 검증한다.
- 서버에서 orderId, idempotencyKey, customerKey를 생성한다.
- `READY` 최초 결제 주문을 생성한다.

#### 결제 중 검증

- Toss 자동결제 인증 결과의 주문 소유권, 상태, customerKey를 검증한다.
- billingKey를 서버에서 발급받고 암호화 저장한다.
- billingKey를 사용해 최초 결제를 요청한다.

#### 결제 후 검증

- Toss orderId, amount, currency, 결제 상태를 로컬 주문과 검증한다.
- Payment, Subscription, ProductEntitlement, UsagePeriod를 단일 트랜잭션으로 반영한다.
- 결제 상태 조회 API를 구현한다.
- checkout부터 구독 ACTIVE 및 월 사용량 발급까지 통합 테스트한다.

**Phase 완료 결과**:

- FREE 회원이 상품 하나를 선택해 Toss 자동결제 수단을 등록하고 최초 결제를 완료할 수 있다.
- 결제 완료 즉시 해당 상품만 PREMIUM/ACTIVE가 되고 월 사용량이 발급된다.
- 결제 실패 시 구독과 서비스 권한이 생성되지 않는다.

### Phase 5 — 월 자동결제 및 실패 재시도 전체 흐름 완성

- `nextBillingAt` 도달 구독을 자동결제한다.
- 정상 결제 시 새 월 사용 기간과 제공량을 발급한다.
- 최초 실패 즉시 `PAYMENT_FAILED`로 전환하고 해당 상품 서비스를 차단한다.
- 실패 후 1일째 첫 번째 자동 재시도를 실행한다.
- 실패 후 3일째 두 번째 자동 재시도를 실행한다.
- 재시도 성공 시 성공 시각부터 새 월 기간을 시작하고 서비스를 복구한다.
- 두 번째 실패 시 `EXPIRED`, `autoRenew=false`로 전환한다.
- 정상 갱신·각 재시도 성공·최종 실패를 스케줄러 통합 테스트로 검증한다.

**Phase 완료 결과**:

- 월 자동결제가 성공하면 구독이 끊기지 않는다.
- 결제 실패 즉시 서비스가 중단된다.
- 지정된 두 번의 재시도만 실행된다.
- 최종 실패 후 추가 결제가 실행되지 않는다.

### Phase 6 — 구독 해지 및 결제 내역 전체 흐름 완성

- ACTIVE 구독 해지 예약 API를 구현한다.
- 해지 후 현재 기간 종료까지 해당 상품을 사용할 수 있게 한다.
- 현재 기간 종료 시 `EXPIRED`로 전환하고 서비스를 차단한다.
- 결제 내역 기간 필터와 페이지네이션을 구현한다.
- 해지가 환불을 자동 생성하지 않도록 한다.
- 해지 신청 → 기간 내 사용 → 기간 종료 차단 흐름과 결제 내역 조회를 통합 테스트한다.

**Phase 완료 결과**:

- 사용자는 상품별 구독을 독립적으로 해지할 수 있다.
- 해지한 구독은 현재 결제 기간까지 사용할 수 있다.
- 결제 내역에서 최초 결제·자동결제·재시도 결과를 확인할 수 있다.

### Phase 7 — 결제 상태 대사 및 운영 안전성 완성

- Toss timeout과 로컬 DB 반영 실패를 `RECONCILING`으로 기록한다.
- Toss 조회 API 기반 자동 대사 작업을 구현한다.
- 성공 결제 누락 시 구독·권한·사용량을 멱등 복구한다.
- 실패 결제를 성공으로 오인하지 않도록 한다.
- billingKey 암호화, 로그 마스킹, 외부 호출 timeout, 자동결제 중복 실행 방지를 적용한다.
- FE 계약과 admin/payment 조회 계약 회귀 테스트를 수행한다.
- 대사 성공·실패·중복 실행·민감정보 노출 방지 테스트를 Phase 안에서 완료한다.

**Phase 완료 결과**:

- Toss와 로컬 DB 상태가 일시적으로 달라도 자동 복구된다.
- 동일 결제가 구독이나 월 사용량을 두 번 생성하지 않는다.
- 운영 로그와 API 응답에 결제 민감정보가 노출되지 않는다.

---

## 권장 브랜치 순서

| 순서 | 브랜치 | Phase |
|---:|---|---|
| 1 | `feature/user-subscription-domain` | 1 |
| 2 | `feature/user-free-entitlement` | 2 |
| 3 | `feature/user-subscription-usage` | 3 |
| 4 | `feature/user-billing-initial-payment` | 4 |
| 5 | `feature/user-billing-renewal` | 5 |
| 6 | `feature/user-subscription-management` | 6 |
| 7 | `feature/user-billing-reconciliation` | 7 |

---

## 의존 관계

```text
Phase 1
  └─ Phase 2
       └─ Phase 3
            └─ Phase 4
                 └─ Phase 5
                      └─ Phase 6
                           └─ Phase 7
```

---

## 구현 전 결정 게이트

Phase 1 구현 시작 전에 다음 값을 확정한다.

1. 상품별 월 가격
2. 상품별 월 제공 횟수
3. 다음 달에 동일 일자가 없을 때 결제일 계산 규칙
4. 환불 신청 정책
5. 현재 checkout 버튼의 내부 `requestPayment()` 호출을 billing authorization 호출로 변경하는 것에 대한 사용자 승인

5번은 UI·버튼 문구·위치·route를 변경하지 않는다.
버튼 클릭 시 실행되는 Toss SDK 내부 연동만 자동결제 방식으로 교체하는 승인이다.
