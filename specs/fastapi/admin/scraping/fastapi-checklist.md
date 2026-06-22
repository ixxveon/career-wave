# FastAPI Checklist: scraping

> 구현 완료 후 Phase 순서로 검증 가능한 항목만 작성한다.

## Phase 1 - Config / Schema

- [x] GET 내부 API Query Parameter schema가 존재한다.
- [x] POST 내부 API Request / Response Pydantic schema가 존재한다.
- [x] FastAPI 공통 에러 응답 schema가 `success`, `errorCode`, `message`, `detail` 구조를 사용한다.
- [x] FastAPI 내부 ErrorCode enum과 예외 객체가 정의되어 있다.
- [x] FastAPI가 `ApiResponse<T>`를 직접 생성하지 않는다.

## Phase 2 - DB Repository

- [x] `scraping_pipelines` 테이블 매핑이 문서와 일치한다.
- [x] `scraping_logs` 테이블 매핑이 문서와 일치한다.
- [x] `job_notices` 테이블 매핑 및 저장 책임이 문서와 일치한다.
- [x] `source + original_url` 기준 중복 확인 쿼리가 구현되어 있다.
- [x] Repository 계층은 DB 접근 책임만 담당하고 비즈니스 정책을 직접 수행하지 않는다.

## Phase 3 - Source Registry / Scraper Adapter

- [x] MVP Source Registry가 `wanted`, `saramin`만 지원한다.
- [x] 미지원 `sourceName`은 `SCRAPING_SOURCE_NOT_FOUND`로 처리된다.
- [x] Scraper adapter 인터페이스와 사이트별 구현체가 분리되어 있다.

## Phase 4 - Query Service

- [x] `GET /internal/scraping/pipelines` 계약에 맞는 목록 조회 로직이 존재한다.
- [x] `GET /internal/scraping/pipelines/summary` 계약에 맞는 요약 조회 로직이 존재한다.
- [x] `GET /internal/scraping/pipelines/{sourceName}` 계약에 맞는 상세 조회 로직이 존재한다.
- [x] `GET /internal/scraping/logs` 계약에 맞는 로그 조회 로직이 존재한다.
- [x] 내부 조회 API의 page 계약은 1-based로 유지된다.

## Phase 5 - 단일 액션 처리

- [x] 실행/재시도/TEST 액션 검증 로직이 존재한다.
- [x] 실행/재시도/TEST 액션 모두 중복 실행 차단 정책이 적용된다.
- [x] `SCRAPING_ALREADY_RUNNING`이 중복 실행 정책에 맞게 사용된다.

## Phase 6 - Batch Action 처리

- [x] 배치 액션의 `actionType` 검증 로직이 존재한다.
- [x] 배치 액션의 `sourceNames` 검증 로직이 존재한다.
- [x] 배치 액션 응답에 요청 수, 접수 수, 대상별 결과를 포함한다.

## Phase 7 - Pipeline Runner

- [x] 실행/재시도/TEST 액션 orchestration 로직이 존재한다.
- [x] `PipelineRunnerService`가 액션 타입별 실행 경로를 분기한다.
- [x] 실행/재시도는 scraper 실행 경로로 연결된다.
- [x] TEST 액션은 scraper 테스트 경로로 연결된다.

## Phase 8 - JobNotice 정제

- [x] 원본 공고를 표준 JobNotice 구조로 변환하는 정제 로직이 존재한다.
- [x] 사이트별 필드 매핑 로직이 존재한다.

## Phase 9 - JobNotice 중복 제거 및 저장

- [ ] 실제 실행/재시도 액션은 `job_notices` 갱신을 수행한다.
- [ ] TEST 액션은 `job_notices` 갱신을 수행하지 않는다.
- [x] `source + original_url` 중복 제거 기준이 저장 로직에도 동일하게 적용된다.

## Phase 10 - Pipeline 상태 갱신

- [x] `scraping_pipelines` 상태 갱신 컬럼이 문서와 일치한다.
- [x] 실행 시작 시 `pipeline_status = RUNNING`과 시작 시각이 반영된다.
- [x] 실행 성공 시 성공 시각, 소요 시간, 수집 건수, 수정 시각이 반영된다.
- [x] 실행 실패 시 실패 시각, 에러 메시지, 수정 시각이 반영된다.
- [x] 동일 `sourceName`에 대해 `RUNNING -> RUNNING` 중복 전이가 발생하지 않는다.
- [ ] `RUNNING -> SUCCESS` 상태 전이 흐름이 반영된다.
- [ ] `RUNNING -> FAILED` 상태 전이 흐름이 반영된다.

## Phase 11 - 실행 로그 기록

- [ ] 모든 실행 시도가 `scraping_logs`에 기록된다.
- [ ] TEST 액션도 `scraping_logs` 기록 대상이다.
- [ ] 성공/실패 로그 기록 컬럼이 문서와 일치한다.
- [x] 실패 메시지 저장 로직이 존재한다.

## Phase 12 - Router

- [x] `GET /internal/scraping/pipelines`가 Query Parameter를 사용한다.
- [x] `GET /internal/scraping/pipelines/summary`가 Request Body를 사용하지 않는다.
- [x] `GET /internal/scraping/pipelines/{sourceName}`가 Request Body를 사용하지 않는다.
- [x] `GET /internal/scraping/logs`가 Query Parameter를 사용한다.
- [x] 단일 액션 POST API만 Request Body를 사용한다.
- [x] 배치 액션 POST API가 Request Body를 사용한다.
- [x] 실행/재시도/TEST/배치 액션 POST API만 Request Body를 사용한다.
- [x] Spring API ↔ FastAPI 내부 API 매핑이 문서와 구현에서 일치한다.
- [x] GET 내부 API는 Request Body 없이 Query Parameter만 사용한다.

## Phase 13 - Background Task / Pipeline

- [ ] 비동기 실행 시작 로직이 존재한다.
- [ ] 실행/재시도/TEST/배치 액션이 비동기 실행 흐름으로 연결된다.
- [ ] 실행 종료 후 상태/로그 후처리 로직이 존재한다.
- [ ] 실행 실패 복구 및 종료 처리 로직이 존재한다.

## Phase 14 - Spring ↔ FastAPI 계약 검증

- [ ] FastAPI 내부 에러 응답은 Spring Boot에서 변환 가능한 `errorCode`를 포함한다.
- [ ] FastAPI ErrorCode 와 Spring ErrorCode 매핑이 문서와 검증 코드에서 일치한다.
- [ ] `FASTAPI_INTERNAL_ERROR`가 문서의 변환 규칙대로 처리된다.
- [ ] `DISCORD_ALERT_SEND_FAILED`가 선택 기능 정책에 맞게 조건부로만 사용된다.
- [ ] 알림 실패가 스크래핑 실행 결과 상태를 덮어쓰지 않는다.

## Phase 15 - Test

- [ ] GET 내부 API Query Parameter 테스트가 존재한다.
- [ ] Source Registry 테스트가 존재한다.
- [ ] 실행/재시도/TEST/배치 액션 테스트가 존재한다.
- [ ] TEST 저장 제외 테스트가 존재한다.
- [ ] 중복 실행 차단 테스트가 존재한다.
- [ ] 중복 제거 및 저장 테스트가 존재한다.
- [ ] 상태 전이 테스트가 존재한다.
- [ ] 실행 로그 기록 테스트가 존재한다.
