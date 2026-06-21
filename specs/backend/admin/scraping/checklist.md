# Checklist: scraping

> 구현 완료 후 Phase 단위로 검증 가능한 항목만 작성한다.

## Phase 1 - Entity

- [x] `ScrapingPipelineStatusType`이 `IDLE`, `RUNNING`, `SUCCESS`, `FAILED` 값으로 정의되어 있다.
- [x] `ScrapingStatusType`이 `SUCCESS`, `FAILED` 값으로 정의되어 있다.
- [x] `ScrapingActionType`이 `RUN`, `RETRY`, `TEST` 값으로 정의되어 있다.
- [x] `ScrapingPipeline` 엔티티가 `scraping_pipelines` ERD 컬럼과 일치한다.
- [x] `ScrapingLog` 엔티티가 `scraping_logs` ERD 컬럼과 일치한다.

## Phase 2 - Repository

- [x] `ScrapingPipelineRepository`가 엔티티 매핑과 최소 참조 목적만 담당한다.
- [x] `ScrapingPipelineRepository`에 `sourceName` 기준 단건 참조 메서드가 정의되어 있다.
- [x] `ScrapingLogRepository`가 엔티티 매핑과 최소 참조 목적만 담당한다.
- [x] Repository 계층에 직접 집계/상태 전이 책임이 없도록 구조 또는 주석 경계가 반영되어 있다.
- [x] Spring Repository가 직접 집계 조회 주체가 아니다.
- [x] Spring Boot가 `scraping_pipelines` 상태 전이를 직접 수행하지 않는다.
- [x] Spring Boot가 `scraping_logs` 실행 로그를 직접 생성하지 않는다.

## Phase 3 - Service

- [x] `ScrapingService` 인터페이스와 `ScrapingServiceImpl` 구현체가 분리되어 있다.
- [x] 목록 조회 서비스 메서드가 존재한다.
- [x] 요약 조회 서비스 메서드가 존재한다.
- [x] 상세 조회 서비스 메서드가 존재한다.
- [x] 실행 로그 조회 서비스 메서드가 존재한다.
- [x] 단일 액션 요청 서비스 메서드가 존재한다.
- [x] 배치 액션 요청 서비스 메서드가 존재한다.
- [x] FastAPI 응답을 Spring 서비스 DTO로 변환하는 매퍼가 존재한다.
- [x] 외부 API의 `page` 1-based 검증과 Spring 내부 Pageable 소비용 `page - 1` 변환 helper가 존재한다.
- [x] `ScrapingErrorCode`가 정의되어 있다.
- [x] 서비스 계층에서 scraping 도메인 예외 변환 로직이 존재한다.
- [x] 단일 액션 요청 시 Audit Log 기록 로직이 존재한다.
- [x] 배치 액션 요청 시 Audit Log 기록 로직이 존재한다.
- [x] 비즈니스 로직이 Service 레이어에 위치한다.

## Phase 4 - FastAPI Integration

- [ ] Spring Boot가 FastAPI 내부 API를 실제로 호출하는 `ScrapingFastApiClient`를 사용한다.
- [ ] FastAPI 목록 조회 요청/응답 매핑 DTO가 존재한다.
- [ ] FastAPI 요약 조회 요청/응답 매핑 DTO가 존재한다.
- [ ] FastAPI 상세 조회 요청/응답 매핑 DTO가 존재한다.
- [ ] FastAPI 실행 로그 조회 요청/응답 매핑 DTO가 존재한다.
- [ ] FastAPI 단일 실행 요청/응답 매핑 DTO가 존재한다.
- [ ] FastAPI 재시도 요청/응답 매핑 DTO가 존재한다.
- [ ] FastAPI 테스트 실행 요청/응답 매핑 DTO가 존재한다.
- [ ] FastAPI 배치 액션 요청/응답 매핑 DTO가 존재한다.
- [ ] `SCRAPING_PIPELINE_NOT_FOUND`, `SCRAPING_SOURCE_NOT_FOUND`, `SCRAPING_ALREADY_RUNNING`, `SCRAPING_EXECUTION_FAILED`, `SCRAPING_TEST_FAILED`가 올바르게 사용된다.
- [ ] FastAPI ErrorCode와 Spring ErrorCode 매핑이 문서와 일치한다.
- [ ] `FASTAPI_INTERNAL_ERROR`가 Spring에서 `SCRAPING_EXECUTION_FAILED`로 변환된다.
- [ ] `DISCORD_ALERT_SEND_FAILED`가 선택 기능 정책에 맞게 조건부로만 사용된다.
- [ ] Spring API와 FastAPI 내부 API 매핑이 문서와 구현에서 일치한다.
- [ ] 단일 액션의 `actionType`이 `/run`, `/retry`, `/test` 호출로 올바르게 분기된다.
- [ ] 배치 액션의 `actionType`이 `batch-run` 요청에 누락 없이 전달된다.
- [ ] 미지원 `sourceName`이 `SCRAPING_SOURCE_NOT_FOUND`로 처리된다.

## Phase 5 - API

- [ ] `GET /api/v1/admin/scraping/pipelines`가 구현되어 있다.
- [ ] `GET /api/v1/admin/scraping/pipelines/summary`가 구현되어 있다.
- [ ] `GET /api/v1/admin/scraping/pipelines/{sourceName}`가 구현되어 있다.
- [ ] `GET /api/v1/admin/scraping/logs`가 구현되어 있다.
- [ ] `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions`가 구현되어 있다.
- [ ] `POST /api/v1/admin/scraping/pipelines/batch-actions`가 구현되어 있다.
- [ ] 모든 정상 응답이 `ApiResponse<T>` 규격을 사용하고 성공 응답에 `statusCode`가 없다.
- [ ] 목록 응답이 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 사용한다.
- [ ] 외부 API의 `page`는 1-based로 동작하고 내부 변환에서만 `page - 1`을 적용한다.

## Phase 6 - Security / Docs / Layering

- [ ] `scraping` 도메인 API 권한이 `MASTER`, `BACKEND`로만 제한된다.
- [ ] `ROLE_MASTER`, `ROLE_BACKEND` 매핑이 문서와 일치한다.
- [ ] `CS` 권한이 `scraping` 도메인에 사용되지 않는다.
- [ ] Swagger 어노테이션이 Controller가 아니라 Docs 인터페이스에 분리되어 있다.
- [x] Service 인터페이스와 `impl` 구현체가 분리되어 있다.

## Phase 7 - Audit Log / Test

- [ ] Audit Log 기록 범위가 문서와 일치한다.
- [ ] 목록/요약/상세/로그 조회 응답 매핑 테스트가 존재한다.
- [ ] 단일 실행/재시도/테스트/배치 액션 테스트가 존재한다.
- [ ] `page - 1` 변환 테스트가 존재한다.
- [ ] 중복 실행 차단 테스트가 존재한다.
- [ ] ErrorCode 변환 테스트가 존재한다.
- [ ] Audit Log 기록 테스트가 존재한다.
