# FastAPI Checklist: scraping

> 구현 완료 후 검증 가능한 항목만 작성한다.

## Internal API Contract

- [ ] `GET /internal/scraping/pipelines`가 Query Parameter를 사용한다.
- [ ] `GET /internal/scraping/pipelines/summary`가 Request Body를 사용하지 않는다.
- [ ] `GET /internal/scraping/pipelines/{sourceName}`가 Request Body를 사용하지 않는다.
- [ ] `GET /internal/scraping/logs`가 Query Parameter를 사용한다.
- [ ] 실행/재시도/테스트/일괄 액션 POST API만 Request Body를 사용한다.

## Spring ↔ FastAPI Contract

- [ ] Spring API ↔ FastAPI 내부 API 매핑이 문서와 구현에서 일치한다.
- [ ] FastAPI 내부 오류 응답이 Spring Boot에서 변환 가능한 `errorCode`를 포함한다.
- [ ] FastAPI ErrorCode → Spring ErrorCode 매핑이 문서와 테스트에서 검증된다.

## Source Registry

- [ ] MVP 1차 Source Registry가 `wanted`, `saramin`으로만 구성된다.
- [ ] 미지원 `sourceName`이 `SCRAPING_SOURCE_NOT_FOUND`로 처리된다.

## Execution Policy

- [ ] 실행/재시도/TEST 액션이 모두 중복 실행 방지 대상이다.
- [ ] TEST 액션도 `scraping_logs` 기록 대상이다.
- [ ] TEST 액션도 상태 전이를 수행한다.
- [ ] TEST 액션이 `job_notices` 저장/갱신을 수행하지 않는다.
- [ ] 실제 실행/재시도 액션은 `job_notices` 저장/갱신을 수행한다.

## DB Mapping

- [ ] `scraping_pipelines` 상태 갱신 컬럼이 문서와 일치한다.
- [ ] `scraping_logs` 기록 컬럼이 문서와 일치한다.
- [ ] `job_notices` 저장 책임이 문서와 일치한다.
- [ ] `source + original_url` 중복 기준이 실제 구현과 일치한다.

## Error Handling

- [ ] FastAPI는 외부 `ApiResponse<T>`를 직접 생성하지 않는다.
- [ ] 내부 오류 응답이 `success`, `errorCode`, `message`, `detail` 구조를 사용한다.
- [ ] `FASTAPI_INTERNAL_ERROR`가 문서화된 변환 규칙에 따라 처리된다.
- [ ] `DISCORD_ALERT_SEND_FAILED`가 선택 기능 정책에 맞게 조건부로만 사용된다.
- [ ] 알림 실패가 스크래핑 실행 결과 상태를 덮어쓰지 않는다.

## Async / Pipeline

- [ ] 실행/재시도/TEST/일괄 액션이 비동기 처리 흐름을 따른다.
- [ ] 실행 성공 시 `RUNNING -> SUCCESS` 전이가 반영된다.
- [ ] 실행 실패 시 `RUNNING -> FAILED` 전이가 반영된다.
- [ ] 동일 `sourceName`에 대해 `RUNNING -> RUNNING` 중복 전이가 발생하지 않는다.

## Test

- [ ] GET 내부 API Query Parameter 테스트가 존재한다.
- [ ] Source Registry 테스트가 존재한다.
- [ ] 실행/재시도/TEST/일괄 액션 테스트가 존재한다.
- [ ] TEST 저장 제외 테스트가 존재한다.
- [ ] 중복 실행 차단 테스트가 존재한다.
- [ ] 중복 제거 및 저장 테스트가 존재한다.
- [ ] 상태 전이 테스트가 존재한다.
- [ ] 실행 로그 기록 테스트가 존재한다.
