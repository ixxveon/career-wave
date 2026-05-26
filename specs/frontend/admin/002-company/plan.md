# Implementation Plan: 파트너 기업 (Company)

## Summary
기업 정보 관리 및 승인/반려 처리 API 구현.

## Technical Context
- Spring Data JPA + Pageable 페이징
- CompanyStatus Enum 상태 전이 관리

## Project Structure

```
domain/company/
├── controller/   CompanyController.java
├── service/      CompanyService.java
├── repository/   CompanyRepository.java
├── entity/       Company.java
├── dto/          CompanyListResponse.java, CompanyDetailResponse.java, CompanyStatusRequest.java
├── type/         CompanyStatus.java
└── docs/         CompanyDocs.java
```

## Phases
- [ ] Phase 1: Company 엔티티 완성 (BaseTimeEntity 상속)
- [ ] Phase 2: CompanyService 조회/승인/반려 메서드 구현
- [ ] Phase 3: CompanyController REST API 구성
- [ ] Phase 4: DTO 및 응답 포맷 정리
- [ ] Phase 5: Swagger 문서화
