# FastAPI Constitution: scraping

**Feature Branch**: `docs/admin-scraping-spec`

## 1. 도메인 원칙

> FastAPI는 Spring Boot의 내부 실행 API만 처리한다.  
> 실제 실행, 상태 전이, 실행 로그 기록, 공고 저장은 FastAPI가 담당한다.  
> FastAPI는 외부 `ApiResponse<T>`를 직접 생성하지 않는다.

## 2. 상태 머신

```text
IDLE
  ↓
RUNNING
  ↓
SUCCESS

RUNNING
  ↓
FAILED

SUCCESS
  ↓
RUNNING

FAILED
  ↓
RUNNING
```

| 전이 | 허용 여부 | 사유 |
|---|---|---|
| `IDLE → RUNNING` | 허용 | 최초 실행 또는 TEST 액션 수락 |
| `RUNNING → SUCCESS` | 허용 | 실행 성공 종료 |
| `RUNNING → FAILED` | 허용 | 실행 실패 종료 |
| `SUCCESS → RUNNING` | 허용 | 재실행 또는 테스트 재검증 |
| `FAILED → RUNNING` | 허용 | 재시도 |
| `RUNNING → RUNNING` | 금지 | 동일 `sourceName` 중복 실행 금지 |

## 3. 아키텍처 결정

| 결정 | 내용 | 이유 |
|---|---|---|
| GET 내부 API Query Parameter 사용 | 내부 GET API는 Request Body가 아니라 Query Parameter를 사용한다. | HTTP/프록시/문서화 도구 호환성을 확보하기 위함이다. |
| Source Registry 고정 | MVP 1차는 `wanted`, `saramin`만 지원한다. | 실제 구현 파일 계획이 두 어댑터 기준이므로 문서와 구현 범위를 일치시키기 위함이다. |
| TEST 액션 저장 제외 | TEST 액션은 상태 전이와 실행 로그는 기록하지만 `job_notices` 저장은 하지 않는다. | 테스트 요청이 운영 저장 데이터를 오염시키지 않도록 하기 위함이다. |
| 실행 책임 집중 | 실제 실행, 수집, 정제, 중복 제거, 저장, 상태 갱신, 실행 로그 적재는 FastAPI가 담당한다. | 실행 결과와 DB 상태 반영의 일관성을 유지하기 위함이다. |
| 알림 실패 분리 | 실패 알림은 선택 기능이며, 알림 실패가 실행 실패를 덮어쓰지 않는다. | 실행 결과와 운영 부가 기능 실패를 분리하기 위함이다. |

## 4. 불변 규칙 (Invariants)

- 동일 `sourceName` 파이프라인이 `RUNNING` 상태일 때 추가 실행, 재시도, 테스트는 수락하지 않는다.
- 모든 실행 시도는 `scraping_logs`에 기록해야 한다.
- TEST 액션도 실행 시도이므로 `scraping_logs` 기록 대상이다.
- TEST 액션은 `job_notices` 저장/갱신을 수행하지 않는다.
- `job_notices` 저장 시 중복 기준은 반드시 `source + original_url`이어야 한다.
- FastAPI는 외부 `ApiResponse<T>`를 직접 생성하지 않는다.
- FastAPI 내부 오류 응답에는 Spring Boot가 변환 가능한 `errorCode`가 포함되어야 한다.

## 5. 연동 계약

- **호출 방향**: `Spring Boot -> FastAPI` 단방향 호출만 허용한다.
- **역호출 금지**: FastAPI는 Spring Boot 외부 관리자 API를 역호출하지 않는다.
- **Spring Boot 책임**: 외부 관리자 API 제공, 인증/인가, Query Parameter 검증, DTO 변환, 외부 `ApiResponse<T>` 래핑, Spring ErrorCode 변환.
- **FastAPI 책임**: 목록/요약/상세/실행 로그 조회, 실행/재시도/테스트/일괄 액션, 원본 공고 수집, 정제, 중복 제거, `job_notices` 저장, 상태 갱신, 실행 로그 적재.
- **외부 시스템 책임**: 채용 사이트는 원본 데이터 제공 주체이며, 선택 기능인 실패 알림 채널은 부가 운영 기능이다.

### FastAPI DB 직접 수정 가능 범위

- `scraping_pipelines.pipeline_status`
- `scraping_pipelines.last_started_at`
- `scraping_pipelines.last_success_at`
- `scraping_pipelines.last_failed_at`
- `scraping_pipelines.last_duration_ms`
- `scraping_pipelines.last_total_count`
- `scraping_pipelines.last_error_message`
- `scraping_pipelines.updated_at`
- `scraping_logs.scraping_pipeline_id`
- `scraping_logs.target_site`
- `scraping_logs.scraping_status`
- `scraping_logs.total_count`
- `scraping_logs.error_message`
- `scraping_logs.executed_at`
- `job_notices` 저장/갱신 컬럼 전반 (`source + original_url` 중복 기준)

## 6. 금지 패턴

- GET 내부 API에 Request Body를 사용하는 패턴 금지
- Source Registry에 없는 `sourceName`을 정상 흐름으로 처리하는 패턴 금지
- `RUNNING` 상태 확인 없이 동일 `sourceName` 실행을 중복 수락하는 패턴 금지
- TEST 액션 결과를 `job_notices`에 저장하는 패턴 금지
- 실행 로그 없이 상태만 갱신하는 패턴 금지
- 알림 실패가 실행 결과 상태를 덮어쓰는 패턴 금지
- FastAPI가 외부 `ApiResponse<T>` 규격을 직접 생성하는 패턴 금지
