# Plan: 정산 리포트 관리 API (Settlement Report)

**Feature Branch**: `feat/settlement-report`
**담당**: 신보라
**버전**: v1
**Status**: 구현 예정

---

## Summary

월별 정산 리포트 생성(집계), 목록·상세 조회, 정산 확정 어드민 REST API.
payments/refunds 데이터를 기간별로 집계하여 settlement_reports에 스냅샷 저장.

---

## Technical Context

- Spring Boot + JPA 기반 어드민 백엔드
- 패키지: `admin/settlement/`
- Native Query 패턴 (EntityManager 직접 사용)
- 집계 대상: `payments` (PAID) + `refunds` (COMPLETED)
- VAT 계산: `supply_amount = net_sales_amount * 10 / 11` (원 단위 절사)
- 감사 로그: `AuditLog.create()` 기존 패턴 사용

---

## Project Structure

```text
admin/settlement/
├── entity/
│   ├── SettlementReport.java
│   └── SettlementItem.java
├── repository/
│   ├── SettlementReportRepository.java
│   ├── SettlementReportQueryRepository.java
│   └── SettlementItemRepository.java
├── type/
│   ├── SettlementStatus.java          -- PENDING / CONFIRMED
│   └── SettlementItemType.java        -- PAYMENT / REFUND
├── service/
│   ├── AdminSettlementService.java
│   └── impl/
│       └── AdminSettlementServiceImpl.java
├── controller/
│   └── AdminSettlementController.java
├── dto/
│   └── SettlementDTO.java
├── exception/
│   └── AdminSettlementErrorCode.java
└── docs/
    └── AdminSettlementControllerDocs.java
```

---

## Phases

- [ ] Phase 1: Enum & Entity 정의 — SettlementStatus, SettlementItemType, SettlementReport, SettlementItem 엔티티
- [ ] Phase 2: Repository 구현 — JPA Repository + Native Query (목록/상세/집계)
- [ ] Phase 3: Service 구현 — 목록·상세 조회, 리포트 생성(집계), 정산 확정, 감사 로그
- [ ] Phase 4: Controller & Swagger Docs — 4개 엔드포인트 + Docs 인터페이스
- [ ] Phase 5: 검증 — ErrorCode 등록, 상태 전이 검증, API 응답 형식 확인
