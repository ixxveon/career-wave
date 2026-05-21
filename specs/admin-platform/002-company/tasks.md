# Tasks: 파트너 기업 (Company)

## Phase 1 - Foundational
- [ ] BaseTimeEntity 작성 (createdAt, updatedAt)
- [ ] Company 엔티티 BaseTimeEntity 상속 적용

## Phase 2 - P1 목록/승인
- [ ] CompanyListResponse DTO 작성
- [ ] CompanyService.getCompanies(status, pageable) 구현
- [ ] CompanyService.approve(id) / reject(id) 구현
- [ ] GET /api/admin/companies
- [ ] PATCH /api/admin/companies/{id}/approve
- [ ] PATCH /api/admin/companies/{id}/reject

## Phase 3 - P2 상세 조회
- [ ] CompanyDetailResponse DTO 작성
- [ ] CompanyService.getCompany(id) 구현
- [ ] GET /api/admin/companies/{id}

## Phase 4 - Polish
- [ ] CompanyDocs 인터페이스 작성 (Swagger)
- [ ] ErrorCode.COMPANY_ALREADY_EXISTS 예외 처리 확인
- [ ] 통합 테스트 작성
