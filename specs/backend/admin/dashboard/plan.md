# Implementation Plan: dashboard

## Summary

> 관리자 종합 대시보드 요약 조회 API를 조회 전용 도메인 구조로 구현하고, 권한·입력값 검증·집계 응답 구조를 안정적으로 제공한다.

## Technical Context

> 사용하는 주요 라이브러리, 전략, 전제 조건을 기술한다.

- Spring Boot + Spring Data JPA + PostgreSQL
- Spring Security + JWT 기반 관리자 인증/인가
- `ApiResponse<T>` 공통 응답 래퍼와 `GlobalExceptionHandler`
- Service 인터페이스 분리 및 `impl` 구현체 사용
- 조회 전용 집계 도메인으로서 Query 중심 구조 사용
- Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성
- 현재 범위에는 `fastapi-schema.md`가 없으므로 Spring Boot 단독 집계 응답 조합 기준으로 구현

## Project Structure

```text
admin/dashboard/
├── controller/   DashboardController.java
├── service/      DashboardService.java
├── service/impl/ DashboardServiceImpl.java
├── repository/   DashboardSummaryQueryRepository.java
├── dto/          DashboardDTO.java
├── type/         DashboardRangeType.java
├── type/         DashboardKpiKeyType.java
├── type/         DashboardSeverityType.java
├── type/         DashboardAlertLevelType.java
├── type/         DashboardDomainType.java
├── type/         DashboardSystemStatusType.java
└── docs/         DashboardDocs.java

global/
└── exception/    GlobalExceptionHandler.java
```

## Phases

- [ ] Phase 1: Query — 관리자 도메인 다중 테이블 집계 규칙과 `range` 기준 조회 쿼리를 설계한다.
- [ ] Phase 2: Service — 권한 전제, 기본 `range` 처리, 빈 값 구조 보정, 응답 조합 규칙을 서비스 계층에 반영한다.
- [ ] Phase 3: API — `GET /api/v1/admin/dashboard/summary` 외부 관리자 API와 `ApiResponse<T>` 응답 계약을 구현한다.
- [ ] Phase 4: Documentation — Swagger docs와 `api-schema.md`, `spec.md`, `constitution.md` 기준으로 요청/응답 계약을 정렬한다.
- [ ] Phase 5: Test — 권한 검증, `range` 검증, 빈 배열/0 값 정책, 응답 구조 일관성을 검증한다.
