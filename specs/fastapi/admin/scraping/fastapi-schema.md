# FastAPI Schema: scraping

> Spring Boot ↔ FastAPI 내부 실행 API 계약 문서다.  
> FastAPI는 프론트엔드에 직접 공개되지 않으며 Spring Boot의 내부 호출만 처리한다.

---

## 1. 공통 원칙

- FastAPI는 실제 스크래핑 실행, 상태 갱신, 실행 로그 기록, 공고 저장을 담당한다.
- 프론트엔드는 FastAPI를 직접 호출하지 않는다.
- Spring Boot는 외부 관리자 API, 인증/인가, DTO, `ApiResponse<T>` 래핑, ErrorCode 변환을 담당한다.
- FastAPI는 외부 `ApiResponse<T>`를 직접 반환하지 않고 내부 JSON 계약만 반환한다.
- GET 내부 API는 Request Body를 사용하지 않고 Query Parameter를 사용한다.

### Spring API ↔ FastAPI 내부 API 매핑

| Spring API | FastAPI Internal API | 설명 |
|---|---|---|
| `GET /api/v1/admin/scraping/pipelines` | `GET /internal/scraping/pipelines` | 파이프라인 목록 조회 |
| `GET /api/v1/admin/scraping/pipelines/summary` | `GET /internal/scraping/pipelines/summary` | 파이프라인 요약 조회 |
| `GET /api/v1/admin/scraping/pipelines/{sourceName}` | `GET /internal/scraping/pipelines/{sourceName}` | 파이프라인 상세 조회 |
| `GET /api/v1/admin/scraping/logs` | `GET /internal/scraping/logs` | 스크래핑 실행 로그 조회 |
| `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions` | `POST /internal/scraping/pipelines/{sourceName}/run` | 단일 실행 |
| `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions` | `POST /internal/scraping/pipelines/{sourceName}/retry` | 단일 재시도 |
| `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions` | `POST /internal/scraping/pipelines/{sourceName}/test` | 단일 테스트 실행 |
| `POST /api/v1/admin/scraping/pipelines/batch-actions` | `POST /internal/scraping/pipelines/batch-run` | 일괄 액션 실행 |

### Source Registry

> MVP 1차는 `wanted`, `saramin`만 지원한다.  
> 그 외 `sourceName`은 `SCRAPING_SOURCE_NOT_FOUND`로 처리한다.

| sourceName | displayName | Adapter |
|---|---|---|
| `wanted` | 원티드 | `wanted_scraper.py` |
| `saramin` | 사람인 | `saramin_scraper.py` |

### TEST 액션 정책

- TEST 액션도 실행 시도이므로 `scraping_logs` 기록 대상이다.
- TEST 액션도 중복 실행 방지 대상이다.
- TEST 액션도 요청 수락 시 `pipeline_status = RUNNING`으로 전이할 수 있다.
- TEST 액션 성공 시 `pipeline_status = SUCCESS`로 전이한다.
- TEST 액션 실패 시 `pipeline_status = FAILED`로 전이한다.
- TEST 액션은 외부 사이트 수집/파싱/정제 가능성만 검증하며 `job_notices` 저장/갱신은 수행하지 않는다.

### 실패 알림 정책

- MVP에서는 스크래핑 실패 알림 전송은 선택 기능이다.
- 알림 전송이 구현되지 않은 경우 `DISCORD_ALERT_SEND_FAILED`는 사용하지 않는다.
- 알림 전송이 구현되더라도 알림 실패가 스크래핑 실행 결과를 실패로 덮어쓰지 않는다.
- 스크래핑 실패와 알림 실패는 별도 오류로 기록한다.

---

## 2. FastAPI 책임

- 파이프라인 목록 조회
- 파이프라인 요약 조회
- 단일 파이프라인 상세 조회
- 스크래핑 실행 로그 조회
- 단일 파이프라인 실행
- 단일 파이프라인 재시도
- 단일 파이프라인 테스트 실행
- 파이프라인 일괄 실행
- 채용 공고 원본 수집
- 채용 공고 정제
- 채용 공고 중복 제거
- `job_notices` 저장
- `scraping_pipelines` 상태 갱신
- `scraping_logs` 실행 로그 기록
- 실패 시 오류 메시지 저장

---

## 3. 내부 Endpoint 계약

### 3.1 GET /internal/scraping/pipelines

#### Query Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `keyword` | `string` | N | 검색어 |
| `status` | `IDLE \| RUNNING \| SUCCESS \| FAILED` | N | 파이프라인 상태 |
| `page` | `number` | N | 페이지 번호, 1-based |
| `size` | `number` | N | 페이지 크기 |

#### Request Body

없음

#### Response

```json
{
  "content": [
    {
      "scrapingPipelineId": 1,
      "sourceName": "wanted",
      "displayName": "원티드",
      "pipelineStatus": "SUCCESS",
      "isEnabled": true,
      "lastStartedAt": "2026-06-11T00:00:00Z",
      "lastSuccessAt": "2026-06-11T00:01:10Z",
      "lastFailedAt": null,
      "lastDurationMs": 70000,
      "lastTotalCount": 132,
      "lastErrorMessage": null,
      "createdAt": "2026-06-01T00:00:00Z",
      "updatedAt": "2026-06-11T00:01:10Z"
    }
  ],
  "page": 1,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

#### 처리 책임

- `scraping_pipelines` 기준 목록 조회
- `keyword`, `status` 필터 처리
- 1-based page를 내부 offset 계산에 사용

#### DB 저장 테이블

- 조회: `scraping_pipelines`
- 수정: 없음

#### 비동기 작업 여부

- 동기

---

### 3.2 GET /internal/scraping/pipelines/summary

#### Query Parameter

없음

#### Request Body

없음

#### Response

```json
{
  "totalCount": 4,
  "idleCount": 1,
  "runningCount": 1,
  "successCount": 1,
  "failedCount": 1,
  "enabledCount": 4,
  "disabledCount": 0
}
```

#### 처리 책임

- 파이프라인 상태별 집계
- 활성/비활성 집계

#### DB 저장 테이블

- 조회: `scraping_pipelines`
- 수정: 없음

#### 비동기 작업 여부

- 동기

---

### 3.3 GET /internal/scraping/pipelines/{sourceName}

#### Path Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceName` | `string` | Y | 파이프라인 소스명 |

#### Query Parameter

없음

#### Request Body

없음

#### Response

```json
{
  "scrapingPipelineId": 1,
  "sourceName": "wanted",
  "displayName": "원티드",
  "pipelineStatus": "FAILED",
  "isEnabled": true,
  "lastStartedAt": "2026-06-11T00:00:00Z",
  "lastSuccessAt": "2026-06-10T00:01:05Z",
  "lastFailedAt": "2026-06-11T00:00:55Z",
  "lastDurationMs": 55000,
  "lastTotalCount": 0,
  "lastErrorMessage": "Timeout while fetching source page.",
  "createdAt": "2026-06-01T00:00:00Z",
  "updatedAt": "2026-06-11T00:00:55Z"
}
```

#### 처리 책임

- `sourceName` 기준 상세 조회
- 미지원 sourceName 또는 미존재 파이프라인 검증

#### DB 저장 테이블

- 조회: `scraping_pipelines`
- 수정: 없음

#### 비동기 작업 여부

- 동기

---

### 3.4 GET /internal/scraping/logs

#### Query Parameter

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceName` | `string` | N | 파이프라인 소스명 |
| `status` | `SUCCESS \| FAILED` | N | 실행 결과 상태 |
| `page` | `number` | N | 페이지 번호, 1-based |
| `size` | `number` | N | 페이지 크기 |

#### Request Body

없음

#### Response

```json
{
  "content": [
    {
      "scrapingLogId": 101,
      "scrapingPipelineId": 1,
      "sourceName": "wanted",
      "targetSite": "wanted",
      "scrapingStatus": "SUCCESS",
      "totalCount": 132,
      "errorMessage": null,
      "executedAt": "2026-06-11T00:01:10Z"
    }
  ],
  "page": 1,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

#### 처리 책임

- `scraping_logs` 기준 실행 로그 조회
- 필요 시 `scraping_pipelines`와 조인해 `sourceName` 필터 처리
- 1-based page를 내부 offset 계산에 사용

#### DB 저장 테이블

- 조회: `scraping_logs`, `scraping_pipelines`
- 수정: 없음

#### 비동기 작업 여부

- 동기

---

### 3.5 POST /internal/scraping/pipelines/{sourceName}/run

#### Request Body

```json
{
  "requestedBy": "admin-service"
}
```

#### Response

```json
{
  "sourceName": "wanted",
  "accepted": true,
  "pipelineStatus": "RUNNING",
  "requestedAt": "2026-06-11T00:00:00Z"
}
```

#### 처리 책임

- 중복 실행 방지
- Source Registry 검증
- 실행 작업 수락 및 비동기 위임
- `pipeline_status = RUNNING` 반영

#### DB 저장 테이블

- 조회: `scraping_pipelines`
- 수정: `scraping_pipelines`

#### 비동기 작업 여부

- 비동기

---

### 3.6 POST /internal/scraping/pipelines/{sourceName}/retry

#### Request Body

```json
{
  "requestedBy": "admin-service"
}
```

#### Response

```json
{
  "sourceName": "wanted",
  "accepted": true,
  "pipelineStatus": "RUNNING",
  "requestedAt": "2026-06-11T00:05:00Z"
}
```

#### 처리 책임

- 재시도 가능 여부 검증
- 중복 실행 방지
- 비동기 재시도 위임

#### DB 저장 테이블

- 조회: `scraping_pipelines`
- 수정: `scraping_pipelines`

#### 비동기 작업 여부

- 비동기

---

### 3.7 POST /internal/scraping/pipelines/{sourceName}/test

#### Request Body

```json
{
  "requestedBy": "admin-service"
}
```

#### Response

```json
{
  "sourceName": "wanted",
  "accepted": true,
  "pipelineStatus": "RUNNING",
  "requestedAt": "2026-06-11T00:10:00Z"
}
```

#### 처리 책임

- 테스트 실행 가능 여부 검증
- 중복 실행 방지
- TEST 액션 수락 및 비동기 위임
- TEST 액션 성공/실패에 따른 상태 전이와 실행 로그 기록
- TEST 액션은 `job_notices` 저장/갱신 제외

#### DB 저장 테이블

- 조회: `scraping_pipelines`
- 수정: `scraping_pipelines`, `scraping_logs`

#### 비동기 작업 여부

- 비동기

---

### 3.8 POST /internal/scraping/pipelines/batch-run

#### Request Body

```json
{
  "actionType": "RETRY",
  "sourceNames": [
    "wanted",
    "saramin"
  ],
  "requestedBy": "admin-service"
}
```

#### Response

```json
{
  "actionType": "RETRY",
  "requestedCount": 2,
  "acceptedCount": 2,
  "results": [
    {
      "sourceName": "wanted",
      "accepted": true,
      "pipelineStatus": "RUNNING"
    },
    {
      "sourceName": "saramin",
      "accepted": true,
      "pipelineStatus": "RUNNING"
    }
  ],
  "requestedAt": "2026-06-11T00:15:00Z"
}
```

#### 처리 책임

- `actionType` 기준 일괄 실행/재시도/테스트 요청 처리
- Source Registry 검증
- 대상별 실행 가능 여부 판정
- 접수/거절 결과 집계

#### DB 저장 테이블

- 조회: `scraping_pipelines`
- 수정: `scraping_pipelines`

#### 비동기 작업 여부

- 비동기

---

## 4. 내부 오류 응답 계약

### 공통 오류 응답 예시

```json
{
  "success": false,
  "errorCode": "SCRAPING_EXECUTION_FAILED",
  "message": "스크래핑 실행에 실패했습니다.",
  "detail": {
    "sourceName": "wanted",
    "reason": "TARGET_SITE_TIMEOUT"
  }
}
```

- `success`: FastAPI 내부 응답 성공 여부
- `errorCode`: Spring Boot가 변환 가능한 내부 오류 식별자
- `message`: 내부 오류 설명
- `detail`: 선택 필드
- Spring Boot는 이 응답을 외부 `ApiResponse` 실패 응답으로 변환한다.
- FastAPI는 외부 `ApiResponse<T>`를 직접 만들지 않는다.

### FastAPI ErrorCode → Spring ErrorCode 매핑

| FastAPI ErrorCode | Spring ErrorCode | 설명 |
|---|---|---|
| `SCRAPING_PIPELINE_NOT_FOUND` | `SCRAPING_PIPELINE_NOT_FOUND` | 파이프라인 없음 |
| `SCRAPING_SOURCE_NOT_FOUND` | `SCRAPING_SOURCE_NOT_FOUND` | 미지원 sourceName |
| `SCRAPING_ALREADY_RUNNING` | `SCRAPING_ALREADY_RUNNING` | 이미 실행 중 |
| `SCRAPING_EXECUTION_FAILED` | `SCRAPING_EXECUTION_FAILED` | 실행 실패 |
| `SCRAPING_TEST_FAILED` | `SCRAPING_TEST_FAILED` | 테스트 실행 실패 |
| `FASTAPI_INTERNAL_ERROR` | `SCRAPING_EXECUTION_FAILED` | FastAPI 내부 처리 실패 |
| `DISCORD_ALERT_SEND_FAILED` | `SCRAPING_EXECUTION_FAILED` | 선택 기능인 실패 알림 전송 실패 |

---

## 5. DB 읽기/쓰기 범위

### FastAPI DB 쓰기 범위

| Table | Writable Columns |
|---|---|
| `scraping_pipelines` | `pipeline_status`, `last_started_at`, `last_success_at`, `last_failed_at`, `last_duration_ms`, `last_total_count`, `last_error_message`, `updated_at` |
| `scraping_logs` | `scraping_pipeline_id`, `target_site`, `scraping_status`, `total_count`, `error_message`, `executed_at` |
| `job_notices` | `source`, `original_url`, 정제된 채용 공고 저장에 필요한 표준화 컬럼, `updated_at` |

### FastAPI DB 읽기 범위

| Table | Readonly Columns |
|---|---|
| `scraping_pipelines` | `scraping_pipeline_id`, `source_name`, `display_name`, `is_enabled`, `created_at` |
| `job_notices` | 중복 확인에 필요한 `source`, `original_url` 및 비교 대상 컬럼 |

---

## 6. 상태 및 실행 규칙

| 현재 상태 | 다음 상태 | 처리 주체 | 설명 |
|---|---|---|---|
| `IDLE` | `RUNNING` | FastAPI | 실행 또는 테스트 요청 수락 |
| `SUCCESS` | `RUNNING` | FastAPI | 재실행 또는 재시도 요청 수락 |
| `FAILED` | `RUNNING` | FastAPI | 재시도 요청 수락 |
| `RUNNING` | `SUCCESS` | FastAPI | 실행 성공 종료 |
| `RUNNING` | `FAILED` | FastAPI | 실행 실패 종료 |

- 동일 `sourceName` 파이프라인이 `RUNNING` 상태일 때 중복 실행, 재시도, 테스트는 금지한다.
- 모든 실행 시도는 `scraping_logs`에 기록한다.
- TEST 액션도 `scraping_logs` 기록 대상이다.
- TEST 액션은 `job_notices` 저장/갱신을 수행하지 않는다.
