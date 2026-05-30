# Implementation Plan: 멘토 정산 (Settlement)

## Summary
멘토 활동 정산 확정 및 지급 처리 API 구현.

## Technical Context
- SettlementStatus: PENDING → CONFIRMED → PAID (순서 강제)
- settlementMonth: "YYYY-MM" 문자열 형식

## Project Structure

```
domain/settlement/
├── controller/   SettlementController.java
├── service/      SettlementService.java
├── repository/   SettlementRepository.java
├── entity/       Settlement.java
├── dto/          SettlementListResponse.java, SettlementDetailResponse.java
├── type/         SettlementStatus.java
└── docs/         SettlementDocs.java
```

## Phases
- [ ] Phase 1: Settlement 엔티티 완성 (상태 전이 검증 로직 포함)
- [ ] Phase 2: 조회/확정/지급 서비스 구현
- [ ] Phase 3: REST API 컨트롤러 구성
- [ ] Phase 4: Swagger 문서화
