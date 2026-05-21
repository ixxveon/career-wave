# Tasks: 멘토 정산 (Settlement)

## Phase 1 - Foundational
- [ ] Settlement 엔티티 BaseTimeEntity 상속 적용
- [ ] 상태 전이 검증 메서드 (PENDING→CONFIRMED→PAID만 허용)

## Phase 2 - P1 목록/확정
- [ ] SettlementListResponse DTO 작성
- [ ] SettlementService.getSettlements(status, month, pageable) 구현
- [ ] SettlementService.confirm(id) 구현
- [ ] GET /api/admin/settlements
- [ ] PATCH /api/admin/settlements/{id}/confirm

## Phase 3 - P2 지급 완료
- [ ] SettlementService.markAsPaid(id) 구현
- [ ] PATCH /api/admin/settlements/{id}/paid

## Phase 4 - 멘토별 이력
- [ ] GET /api/admin/settlements/mentor/{mentorId}

## Phase 5 - Polish
- [ ] SettlementDocs 인터페이스 작성 (Swagger)
- [ ] 상태 전이 위반 ErrorCode 추가
- [ ] 통합 테스트 작성
