# Checklist: dashboard

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.
> 구현 완료 후 PR을 올리기 전에 작성자가 직접 체크한다.

## Phase 1 - Query

- [x] `DashboardRangeType`, `DashboardKpiKeyType`, `DashboardSeverityType`, `DashboardAlertLevelType`, `DashboardDomainType`, `DashboardSystemStatusType`, `DashboardPaymentMethod` Enum이 정의되어 있다.
- [x] `DashboardSummaryQueryRepository` Repository 클래스가 작성되어 있다.
- [x] `range` 값이 `TODAY`, `7D`, `30D` 기준 시간 윈도우로 변환된다.
- [x] Query Parameter `range`와 ERD 기준 시각 컬럼(`admins.created_at`, `admins.last_login_at`, `audit_logs.created_at`, `ai_usage_logs.created_at`, `rag_documents.created_at`, `rag_documents.updated_at`, `scraping_logs.executed_at`, `scraping_pipelines.last_started_at`, `scraping_pipelines.last_success_at`, `scraping_pipelines.last_failed_at`) 매핑이 Query 계층 입력 규약과 일치한다.
- [x] Dashboard Enum 값이 문서 계약과 일치하며, 이 도메인에는 직접 매핑되는 DB CHECK 제약 기반 Enum이 없다는 점이 구현과 문서에서 일치한다.

## Phase 2 - Service

- [x] `DashboardService` 인터페이스와 `DashboardServiceImpl` 구현체가 분리되어 있다.
- [x] 비즈니스 로직이 Controller가 아니라 Service Layer에만 존재한다.
- [x] `range` 미지정 시 기본값 `TODAY`가 적용된다.
- [x] `DashboardDTO.ResponseSummary` 조합 로직이 서비스 계층에 존재한다.
- [x] `kpis`, `alerts`, `weeklySignups`, `paymentRatio`, `serviceCards`, `systemStatus`, `recentActivities`가 `null`이 아닌 구조로 보정된다.
- [x] `paymentRatio` 응답이 비율 합계 일관성 규칙을 만족한다.

## Phase 3 - API

- [x] `GET /api/v1/admin/dashboard/summary` endpoint가 구현되어 있다.
- [x] 정상 응답이 `ApiResponse<DashboardDTO.ResponseSummary>` 규격을 사용하고, 성공 응답에는 `status` 필드가 포함되지 않는다.
- [x] 예외 응답이 공통 ErrorCode 정책(`UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`)과 일치한다.
- [x] 권한(Role) 정책이 `MASTER`, `BACKEND`, `CS`와 일치한다.
- [x] 인증 없음 요청은 `UNAUTHORIZED`, 비허용 권한 요청은 `FORBIDDEN`으로 처리된다.
- [x] 대시보드 조회 API가 생성/수정/삭제 동작을 수행하지 않는다.

## Phase 4 - Documentation

- [x] `DashboardDocs` 인터페이스가 작성되어 있다.
- [x] Controller에 Swagger 어노테이션이 직접 작성되어 있지 않다.
- [x] `api-schema.md`, `spec.md`, `constitution.md`와 실제 구현의 요청/응답 계약이 일치한다.
- [x] Query Parameter, 권한 정책, 공통 오류 응답 설명이 문서와 구현에서 동일하다.

## Phase 5 - Test

- [x] `GET /api/v1/admin/dashboard/summary` 정상 조회 테스트가 존재한다.
- [x] `range=TODAY`, `7D`, `30D` 허용값 테스트가 존재한다.
- [x] 잘못된 `range` 값에 대한 `BAD_REQUEST` 테스트가 존재한다.
- [x] 인증 없음 `UNAUTHORIZED`, 권한 없음 `FORBIDDEN` 테스트가 존재한다.
- [x] 빈 섹션이 `null`이 아닌 구조로 반환되는 테스트가 존재한다.
- [x] KPI 4개 식별자가 모두 포함되는 응답 구조 테스트가 존재한다.

## 코드 안전성

- [x] `ApiResponse<T>` 래퍼 누락 endpoint가 없다.
- [x] `BusinessException(ErrorCode.XXX)` 또는 팀 공통 예외 처리 패턴을 준수한다.
- [x] 비즈니스 로직이 Service Layer에만 존재한다.
- [x] `global/`에서 `domain/`으로의 역참조가 없다.
- [x] 조회 전용 도메인 규칙에 따라 dashboard 구현이 대상 테이블 상태를 변경하지 않는다.
- [x] FastAPI 연동 문서가 없는 현재 범위에서 Spring Boot 단독 집계 응답 조합 책임이 구현과 일치한다.

## 연동 및 운영 검증

- [x] FastAPI 연동 검증 여부: 현재 도메인은 FastAPI 미연동 범위이며, 구현에도 Spring ↔ FastAPI 직접 호출 코드가 없다.
- [x] Audit Log 기록 여부: dashboard 조회는 조회 전용 범위이므로 별도 Audit Log 기록 대상이 아님이 구현과 문서에서 일치한다.

## 머지 전 최종 확인

- [x] constitution.md의 불변 규칙과 실제 구현이 일치한다.
- [x] tasks.md 모든 항목이 완료 체크되어 있다.
- [x] PR 제목과 본문이 팀 컨벤션 형식을 따른다.
