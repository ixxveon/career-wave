# Checklist: scraping

> 구현 완료 후 검증 가능한 항목만 작성한다.

## API Contract

- [ ] `GET /api/v1/admin/scraping/pipelines`가 구현되어 있다.
- [ ] `GET /api/v1/admin/scraping/pipelines/summary`가 구현되어 있다.
- [ ] `GET /api/v1/admin/scraping/pipelines/{sourceName}`가 구현되어 있다.
- [ ] `GET /api/v1/admin/scraping/logs`가 구현되어 있다.
- [ ] `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions`가 구현되어 있다.
- [ ] `POST /api/v1/admin/scraping/pipelines/batch-actions`가 구현되어 있다.
- [ ] 모든 정상 응답이 `ApiResponse<T>` 규격을 사용하고 성공 응답에 `statusCode`가 없다.
- [ ] 목록 응답이 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 사용한다.
- [ ] 외부 API의 `page`가 1-based로 동작하고 내부 변환에서만 `page - 1`을 적용한다.

## Role & Security

- [ ] `scraping` 도메인 외부 API 권한이 `MASTER`, `BACKEND`로만 제한된다.
- [ ] `ROLE_MASTER`, `ROLE_BACKEND` 매핑이 문서와 일치한다.
- [ ] `CS` 권한이 `scraping` 도메인에서 사용되지 않는다.

## Spring Responsibility

- [ ] Spring Boot가 외부 관리자 API 제공, 인증/인가, Query Parameter 검증, DTO 변환, `ApiResponse<T>` 래핑을 담당한다.
- [ ] Spring Boot가 FastAPI 내부 API를 호출해 응답을 DTO로 변환한다.
- [ ] Spring Boot가 FastAPI 내부 오류를 Spring 도메인 ErrorCode로 변환한다.
- [ ] Spring Repository가 직접 집계 조회 주체가 아니다.
- [ ] Spring Boot가 `scraping_pipelines` 상태 전이를 직접 수행하지 않는다.
- [ ] Spring Boot가 `scraping_logs` 실행 로그를 직접 생성하지 않는다.

## ErrorCode

- [ ] `SCRAPING_PIPELINE_NOT_FOUND`, `SCRAPING_SOURCE_NOT_FOUND`, `SCRAPING_ALREADY_RUNNING`, `SCRAPING_EXECUTION_FAILED`, `SCRAPING_TEST_FAILED`가 올바르게 사용된다.
- [ ] FastAPI ErrorCode → Spring ErrorCode 매핑이 문서와 일치한다.
- [ ] `FASTAPI_INTERNAL_ERROR`가 Spring에서 `SCRAPING_EXECUTION_FAILED`로 변환된다.
- [ ] `DISCORD_ALERT_SEND_FAILED`가 선택 기능 정책에 맞게 조건부로만 사용된다.

## FastAPI Integration

- [ ] Spring API ↔ FastAPI 내부 API 매핑이 문서와 구현에서 일치한다.
- [ ] 단일 액션의 `actionType`이 내부 `/run`, `/retry`, `/test` 호출로 올바르게 분기된다.
- [ ] 일괄 액션의 `actionType`이 내부 `batch-run` 요청에 누락 없이 전달된다.
- [ ] 미지원 `sourceName`이 `SCRAPING_SOURCE_NOT_FOUND`로 처리된다.

## Audit Log

- [ ] 실행/재시도/테스트/일괄 실행 요청이 Audit Log 기록 대상이다.
- [ ] Audit Log 기록 범위가 문서와 일치한다.

## Documentation & Layering

- [ ] Swagger 어노테이션이 Controller가 아니라 Docs 인터페이스에 분리되어 있다.
- [ ] Service 인터페이스와 `impl` 구현체가 분리되어 있다.
- [ ] 비즈니스 로직이 Service 레이어에 위치한다.

## Test

- [ ] 목록/요약/상세/로그 조회 응답 매핑 테스트가 존재한다.
- [ ] 단일 실행/재시도/테스트/일괄 액션 테스트가 존재한다.
- [ ] `page - 1` 변환 테스트가 존재한다.
- [ ] 중복 실행 차단 테스트가 존재한다.
- [ ] ErrorCode 변환 테스트가 존재한다.
- [ ] Audit Log 기록 테스트가 존재한다.
