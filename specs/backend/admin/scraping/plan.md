# Implementation Plan: scraping

## Summary

> Spring Boot는 외부 관리자 API, 권한, DTO, `ApiResponse<T>`, Audit Log를 담당하고, FastAPI 내부 API를 호출해 조회/실행 결과를 전달한다.

## Technical Context

- Spring Boot + Spring Data JPA + PostgreSQL
- Spring Security + JWT 기반 관리자 인증/인가
- `ApiResponse` 공통 응답 래퍼와 `GlobalExceptionHandler`
- Service 인터페이스 분리 및 `impl` 구현체 사용
- 외부 목록 API는 1-based 페이지 계약 사용
- FastAPI 내부 API 응답을 Spring DTO로 매핑
- 관리자 실행 제어 요청에 대한 Audit Log 기록

## Project Structure

```text
admin/scraping/
├── controller/   ScrapingController.java
├── service/      ScrapingService.java
├── service/impl/ ScrapingServiceImpl.java
├── repository/   ScrapingPipelineRepository.java
├── repository/   ScrapingLogRepository.java
├── dto/          ScrapingPipelineDTO.java
├── dto/          ScrapingLogDTO.java
├── entity/       ScrapingPipeline.java
├── entity/       ScrapingLog.java
├── type/         ScrapingPipelineStatusType.java
├── type/         ScrapingStatusType.java
├── type/         ScrapingActionType.java
├── exception/    ScrapingErrorCode.java
├── docs/         ScrapingDocs.java
└── infrastructure/fastapi/
    ├── ScrapingFastApiClient.java
    ├── ScrapingFastApiRequest.java
    ├── ScrapingFastApiResponse.java
    └── ScrapingFastApiMapper.java
```

## Phases

- [ ] Phase 1: Entity — `scraping_pipelines`, `scraping_logs` ERD와 Enum 제약조건에 맞는 엔티티를 정의한다.
- [ ] Phase 2: Repository — Spring Repository를 엔티티 매핑, 최소 로컬 검증, Audit Log 보조 범위로 제한한다.
- [ ] Phase 3: Service — 권한 분기, 1-based 페이지 변환, FastAPI 요청 위임, ErrorCode 매핑, Audit Log 연동 규칙을 서비스 계층에 반영한다.
- [ ] Phase 4: FastAPI Integration — Spring Boot가 FastAPI 내부 조회/실행 API를 호출하고 응답 및 내부 오류를 Spring DTO와 Spring ErrorCode로 변환하는 연동 계층을 구현한다.
- [ ] Phase 5: API — 파이프라인 조회, 실행 액션, 일괄 액션, 실행 로그 조회 외부 API를 `ApiResponse<T>` 규격으로 제공한다.
- [ ] Phase 6: Documentation — Swagger docs와 `api-schema.md`, `spec.md`, `constitution.md`를 실제 외부 계약 기준으로 정렬한다.
- [ ] Phase 7: Test — FastAPI 연동, 중복 실행 차단, ErrorCode 변환, Audit Log 기록, 페이지 변환, 응답 매핑을 검증한다.
