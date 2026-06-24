# Tasks: dashboard

> plan.md의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

## Phase 1 - Query

- [x] `DashboardRangeType`, `DashboardKpiKeyType`, `DashboardSeverityType`, `DashboardAlertLevelType`, `DashboardDomainType`, `DashboardSystemStatusType`, `DashboardPaymentMethod` Enum 계약을 정의한다.
- [x] `DashboardDTO` 조회 응답 구조 초안을 작성한다.
- [x] `DashboardSummaryQueryRepository` 인터페이스를 작성한다.
- [x] 관리자 계정, 감사 로그, AI 사용량, RAG 문서, 스크래핑 상태 집계용 Query 메서드 시그니처를 분리한다.
- [x] `range=TODAY|7D|30D` 기준 시간 윈도우 변환 규칙을 Query 계층 입력 규약으로 정리한다.

## Phase 2 - Service

- [x] `DashboardService` 인터페이스를 작성한다.
- [x] `DashboardServiceImpl` 구현체를 작성한다.
- [x] `range` 기본값을 `TODAY`로 처리하는 서비스 로직을 작성한다.
- [x] Query 결과를 `DashboardDTO.ResponseSummary`로 조합하는 로직을 작성한다.
- [x] 빈 섹션을 `null`이 아닌 빈 배열 또는 0 값 구조로 보정하는 로직을 작성한다.
- [x] `paymentRatio` 비율 합계 일관성 규칙을 서비스 계층에서 검증한다.

## Phase 3 - API

- [x] `DashboardController`를 작성한다.
- [x] `GET /api/v1/admin/dashboard/summary` endpoint를 작성한다.
- [x] `MASTER`, `BACKEND`, `CS` 권한 정책이 반영된 접근 제어 구성을 작성한다.
- [x] `range` Query Parameter 검증과 공통 예외 변환 규칙을 API 계층에 연결한다.
- [x] 정상 응답을 `ApiResponse<DashboardDTO.ResponseSummary>`로 래핑하는 처리를 작성한다.

## Phase 4 - Documentation

- [x] `DashboardDocs` 인터페이스를 작성한다.
- [x] Swagger 어노테이션을 `DashboardDocs`에 분리한다.
- [x] `api-schema.md`, `spec.md`, `constitution.md`와 실제 요청/응답 계약이 일치하는지 정리한다.
- [x] Query Parameter, 권한 정책, 공통 오류 응답 설명을 문서와 동일하게 맞춘다.

## Phase 5 - Test

- [ ] `GET /api/v1/admin/dashboard/summary` 정상 조회 테스트를 작성한다.
- [ ] `range=TODAY`, `7D`, `30D` 허용값 테스트를 작성한다.
- [ ] 잘못된 `range` 값에 대한 `BAD_REQUEST` 테스트를 작성한다.
- [ ] 인증 없음 `UNAUTHORIZED`, 권한 없음 `FORBIDDEN` 테스트를 작성한다.
- [ ] 빈 섹션이 `null`이 아닌 구조로 반환되는 테스트를 작성한다.
- [ ] KPI 4개 식별자가 모두 포함되는 응답 구조 테스트를 작성한다.
