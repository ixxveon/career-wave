# Tasks: 정산 리포트 관리 API (Settlement Report)

> `plan.md`의 Phase와 1:1 대응한다.

---

## Phase 1 — Enum & Entity 정의

### Enum (type/)

- [ ] `SettlementStatus.java` — `PENDING / CONFIRMED`
- [ ] `SettlementItemType.java` — `PAYMENT / REFUND`

### Entity (entity/)

- [ ] `SettlementReport.java`
  - [ ] `@GeneratedValue(strategy = GenerationType.IDENTITY)` — BIGSERIAL PK
  - [ ] `@Enumerated(EnumType.STRING) SettlementStatus settlementStatus`
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
  - [ ] public setter 없음
  - [ ] `confirm(Long adminId)` 비즈니스 메서드 — `PENDING → CONFIRMED` 전이, `settledAt`, `settledBy` 기록
  - [ ] `static create(...)` 팩토리 메서드 — 집계 결과를 받아 PENDING 상태로 생성

- [ ] `SettlementItem.java`
  - [ ] `@GeneratedValue(strategy = GenerationType.IDENTITY)` — BIGSERIAL PK
  - [ ] `@Enumerated(EnumType.STRING) SettlementItemType itemType`
  - [ ] `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
  - [ ] public setter 없음
  - [ ] `static create(Long settlementId, UUID paymentId, int amount, SettlementItemType itemType)` 팩토리 메서드

---

## Phase 2 — Repository 구현

- [ ] `SettlementReportRepository.java`
  - [ ] `JpaRepository<SettlementReport, Long>`
  - [ ] `existsBySettlementPeriodStartAndSettlementPeriodEnd(LocalDate, LocalDate)` — 중복 기간 체크

- [ ] `SettlementReportQueryRepository.java`
  - [ ] 동적 필터 쿼리 (`status`)
  - [ ] 기본 정렬: `settlement_period_start DESC`
  - [ ] 상세 조회: `settlement_items` JOIN `payments` → 항목 상세 포함
  - [ ] 상세 조회: `admin_id` JOIN `admins` → 확정 관리자 이름 포함

- [ ] `SettlementItemRepository.java`
  - [ ] `JpaRepository<SettlementItem, Long>`

---

## Phase 3 — Service 구현

### AdminSettlementService

- [ ] `getSettlements(status, page, size)` — 목록 조회
  - [ ] 동적 필터 (status null → 전체)
  - [ ] page 1-based → 0-based 변환
  - [ ] 반환: `PaginationResponse<SettlementDTO.ResponseList>`

- [ ] `getSettlementDetail(Long settlementId)` — 상세 조회
  - [ ] `SETTLEMENT_NOT_FOUND(404)` 예외 처리
  - [ ] settlement_items + payments JOIN
  - [ ] 반환: `SettlementDTO.ResponseDetail`

- [ ] `generateSettlement(RequestGenerate dto, Long adminId, String ipAddress)` — 리포트 생성
  - [ ] `periodStart >= periodEnd` → `INVALID_PERIOD(400)` 예외
  - [ ] 동일 기간 존재 시 → `DUPLICATE_PERIOD(409)` 예외
  - [ ] payments 집계: `payment_status = 'PAID'` AND `approved_at` 기간 조건
  - [ ] refunds 집계: `refund_status = 'COMPLETED'` AND `refunded_at` 기간 조건
  - [ ] `net_sales_amount = total_sales_amount - total_refund_amount`
  - [ ] `supply_amount = net_sales_amount * 10 / 11` (원 단위 절사)
  - [ ] `vat_amount = net_sales_amount - supply_amount`
  - [ ] settlement_items 생성: 각 결제/환불 건을 PAYMENT/REFUND item_type으로 매핑
  - [ ] 감사 로그: `GENERATE_SETTLEMENT` 기록
  - [ ] 반환: `SettlementDTO.ResponseGenerate`

- [ ] `confirmSettlement(Long settlementId, RequestConfirm dto, Long adminId, String ipAddress)` — 정산 확정
  - [ ] `SETTLEMENT_NOT_FOUND(404)` 예외 처리
  - [ ] `settlement_status != PENDING` → `ALREADY_CONFIRMED(409)` 예외
  - [ ] `report.confirm(adminId)` + note 저장
  - [ ] 감사 로그: `CONFIRM_SETTLEMENT` 기록
  - [ ] 반환: `SettlementDTO.ResponseConfirm`

### ErrorCode 추가

- [ ] `AdminSettlementErrorCode.java`
  - [ ] `SETTLEMENT_NOT_FOUND` (404)
  - [ ] `DUPLICATE_PERIOD` (409)
  - [ ] `INVALID_PERIOD` (400)
  - [ ] `ALREADY_CONFIRMED` (409)

---

## Phase 4 — Controller & Swagger Docs

- [ ] `AdminSettlementController.java`
  - [ ] `GET /api/v1/admin/settlements`
  - [ ] `GET /api/v1/admin/settlements/{settlementId}`
  - [ ] `POST /api/v1/admin/settlements/generate`
  - [ ] `PATCH /api/v1/admin/settlements/{settlementId}/confirm`
  - [ ] `@AuthenticationPrincipal AuthPrincipal` — adminId 추출
  - [ ] `@PreAuthorize("hasRole('ADMIN') and (hasRole('MASTER') or hasRole('CS'))")` 적용
  - [ ] Controller에서 `try-catch` 사용 금지
- [ ] Swagger Docs 분리
  - [ ] `AdminSettlementControllerDocs.java`

---

## Phase 5 — 검증

- [ ] Swagger UI에서 전체 API 요청/응답 확인
- [ ] `page=1` 요청 시 첫 번째 페이지 반환 확인
- [ ] 동일 기간 중복 생성 시 409 DUPLICATE_PERIOD 확인
- [ ] periodStart >= periodEnd 시 400 INVALID_PERIOD 확인
- [ ] CONFIRMED 리포트 재확정 시 409 ALREADY_CONFIRMED 확인
- [ ] 정산 생성 시 settlement_items 합산과 reports 금액 일치 확인
- [ ] VAT 계산 정확성 확인 (`net * 10 / 11` 원 단위 절사)
- [ ] 감사 로그 기록 확인 (GENERATE_SETTLEMENT, CONFIRM_SETTLEMENT)
- [ ] 모든 응답 ApiResponse<T> 래퍼 확인
