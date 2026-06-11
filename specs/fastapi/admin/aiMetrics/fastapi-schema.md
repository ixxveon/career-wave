# FastAPI Schema: aiMetrics

> Spring Boot ↔ FastAPI 간 `aiMetrics` 도메인 내부 API 계약 문서.
> 본 문서는 프론트엔드 공개용 API 문서가 아니며, 관리자 프론트엔드는 FastAPI를 직접 호출하지 않는다.
> 관리자 프론트엔드는 Spring Boot만 호출하고, Spring Boot가 필요한 내부 처리만 FastAPI에 위임한다.

---

## 1. 공통 원칙

- FastAPI는 내부 AI 플랫폼 처리 전용 서비스다.
- 관리자 프론트엔드는 FastAPI를 직접 호출하지 않는다.
- 외부 공개 인증/인가, `ApiResponse<T>` 래핑, 관리자 권한 검증은 Spring Boot가 담당한다.
- FastAPI는 Spring Boot의 내부 호출만 신뢰하며, 내부 JSON 계약 기준으로 응답한다.
- FastAPI는 OpenAI 호출, 토큰 계산, 임베딩 생성, 벡터 인덱싱, 비동기 처리 상태 갱신을 담당한다.
- Spring Boot는 관리자 API 계약 유지, 요청 검증, 권한 정책 적용, 응답 DTO 변환, ErrorCode 매핑을 담당한다.
- 외부 관리자 API의 RAG 문서 업로드는 Spring Boot가 `multipart/form-data` 파일을 수신한 뒤 저장 경로와 메타데이터를 FastAPI 내부 계약으로 변환해 전달한다.
- AI 사용량 집계와 AI 사용 로그 검색은 FastAPI가 담당하고, Spring Boot는 내부 집계 응답을 외부 DTO로 변환한다.

### 통신 방식

- 프로토콜: HTTP/JSON
- 호출 주체: Spring Boot
- 수신 주체: FastAPI
- 인증 방식: 내부 서비스 간 인증 헤더 또는 사설 네트워크 신뢰 구간 사용
- 응답 형식: FastAPI 내부 응답 스키마 사용, Spring Boot가 외부 `ApiResponse<T>`로 재가공
- RAG 문서 업로드의 원본 파일 수신은 Spring Boot 외부 API에서 처리하고, Spring Boot -> FastAPI 내부 호출은 저장된 파일 경로와 메타데이터를 담은 JSON 계약을 사용한다.

### 비동기 처리 원칙

- AI 사용 로그 적재는 동기 처리 또는 준동기 처리로 호출 완료 전에 결과를 반환할 수 있다.
- RAG 문서 인덱싱은 비동기 작업으로 처리한다.
- 비동기 작업 상태는 `rag_documents.status`, `rag_documents.indexing_progress`, `rag_documents.chunk_count`, `rag_documents.updated_at`에 반영한다.

### DB 저장 책임

- `ai_models`: Spring Boot와 FastAPI가 공통 참조하는 모델 메타데이터 테이블
- `ai_usage_logs`: FastAPI가 AI 실행 결과 기준으로 기록하거나 Spring Boot 요청에 따라 적재하는 사용 로그 테이블
- `ai_ops_settings`: Spring Boot가 운영 정책을 관리하고 FastAPI가 실행 시 참조하는 설정 테이블
- `rag_documents`: Spring Boot가 업로드 메타데이터를 생성하고, FastAPI가 인덱싱 상태를 갱신하는 테이블

### Vector Store 정책

- MVP에서는 Vector Store 구현체를 인터페이스 기반 추상 클라이언트로 둔다.
- 현재 ERD에 vector index 저장 전용 테이블이 없으므로 FastAPI는 `vector_store_client`를 교체 가능한 adapter로 유지한다.
- 초기 구현에서는 mock adapter 또는 인프라 확정 전 교체 가능한 adapter를 사용할 수 있다.
- 구현체와 무관하게 `rag_documents.status`, `chunk_count`, `indexing_progress` 갱신은 실제로 검증해야 한다.

---

## 2. 처리 책임 분리

### Spring Boot 책임

- 관리자 권한 `MASTER`, `BACKEND` 검증
- 외부 관리자 API endpoint 제공
- Query Parameter 검증 및 DTO 변환
- `ApiResponse<T>` 외부 응답 래핑
- FastAPI 내부 오류를 도메인 ErrorCode로 변환
- `ai_ops_settings` 변경 요청 수신 및 정책 저장
- 관리자 업로드 파일 수신 및 저장 경로 확보
- RAG 문서 메타데이터 생성 및 다운로드 API 제공
- 운영 정책 변경 및 RAG 문서 삭제에 대한 Audit Log 기록

### FastAPI 책임

- 선택된 AI 모델 기준 OpenAI 호출
- 입력/출력 토큰 계산
- 요청별 비용 계산
- `ai_usage_logs` 기반 통계 집계
- 고사용 사용자 집계 및 토큰 추이 계산
- RAG 문서 파싱, 청크 분할, 임베딩 생성, 벡터 인덱싱
- `rag_documents` 상태 전이 및 진행률 갱신
- 인덱싱 실패 시 실패 원인 기록 및 상태 갱신

### 외부 시스템 책임

- OpenAI: 모델 추론, 임베딩 생성
- 벡터 스토어 또는 인덱싱 엔진: RAG 문서 청크 인덱싱 및 검색 인프라 제공
- 파일 스토리지: RAG 원본 문서 저장
- Discord Webhook 등 알림 시스템: 예산 임계치 초과 알림 전송

---

## 3. 내부 Endpoint 계약

## 3.1 POST /internal/admin/ai-metrics/usage/summary

### 호출 목적

- Spring Boot의 `GET /api/v1/admin/ai-metrics/summary` 요청을 처리하기 위한 통계 집계 호출

### Request

```json
{
  "from": "2026-06-01T00:00:00Z",
  "to": "2026-06-10T23:59:59Z",
  "featureType": "DOCUMENT"
}
```

### Response

```json
{
  "totalRequests": 1250,
  "totalInputTokens": 420000,
  "totalOutputTokens": 185000,
  "totalCost": 980000,
  "documentRequests": 820,
  "interviewRequests": 430,
  "activeModelId": 1,
  "activeModelName": "gpt-4o-mini"
}
```

### 처리 책임

- `ai_usage_logs.created_at`, `ai_usage_logs.feature_type` 기준 집계
- `ai_ops_settings.selected_model_id`, `ai_models.model_name` 기준 활성 모델 조회
- 비용 합계 계산

### DB 저장/조회 테이블

- 조회: `ai_usage_logs`, `ai_ops_settings`, `ai_models`
- 저장: 없음

### 비동기 여부

- 동기

---

## 3.2 POST /internal/admin/ai-metrics/usage/domain-usage

### 호출 목적

- Spring Boot의 `GET /api/v1/admin/ai-metrics/domain-usage` 요청을 처리하기 위한 도메인별 집계 호출

### Request

```json
{
  "from": "2026-06-01T00:00:00Z",
  "to": "2026-06-10T23:59:59Z"
}
```

### Response

```json
{
  "document": {
    "requestCount": 820,
    "inputTokens": 250000,
    "outputTokens": 110000,
    "cost": 560000
  },
  "interview": {
    "requestCount": 430,
    "inputTokens": 170000,
    "outputTokens": 75000,
    "cost": 420000
  }
}
```

### 처리 책임

- `feature_type = DOCUMENT`, `INTERVIEW` 기준 집계
- 토큰/비용 합계 계산

### DB 저장/조회 테이블

- 조회: `ai_usage_logs`
- 저장: 없음

### 비동기 여부

- 동기

---

## 3.3 POST /internal/admin/ai-metrics/usage/token-trend

### 호출 목적

- Spring Boot의 `GET /api/v1/admin/ai-metrics/token-trend` 요청을 처리하기 위한 구간별 추이 집계 호출

### Request

```json
{
  "from": "2026-06-01T00:00:00Z",
  "to": "2026-06-10T23:59:59Z",
  "featureType": "DOCUMENT",
  "interval": "DAILY"
}
```

### Response

```json
{
  "interval": "DAILY",
  "points": [
    {
      "bucket": "2026-06-01T00:00:00Z",
      "inputTokens": 12000,
      "outputTokens": 5400,
      "cost": 28000
    }
  ]
}
```

### 처리 책임

- `created_at` 기준 시간 버킷 생성
- 입력/출력 토큰 및 비용 추이 집계

### DB 저장/조회 테이블

- 조회: `ai_usage_logs`
- 저장: 없음

### 비동기 여부

- 동기

---

## 3.4 POST /internal/admin/ai-metrics/usage/heavy-users

### 호출 목적

- Spring Boot의 `GET /api/v1/admin/ai-metrics/heavy-users` 요청을 처리하기 위한 상위 사용자 집계 호출

### Request

```json
{
  "from": "2026-06-01T00:00:00Z",
  "to": "2026-06-10T23:59:59Z",
  "featureType": "INTERVIEW",
  "limit": 10
}
```

### Response

```json
{
  "users": [
    {
      "memberId": "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
      "requestCount": 95,
      "inputTokens": 52000,
      "outputTokens": 21000,
      "cost": 118000
    }
  ]
}
```

### 처리 책임

- `member_id` 기준 사용량 집계
- 비용 상위 사용자 정렬
- `limit` 기준 상위 N명 반환

### DB 저장/조회 테이블

- 조회: `ai_usage_logs`
- 저장: 없음

### 비동기 여부

- 동기

---

## 3.5 POST /internal/admin/ai-metrics/usage/logs/search

### 호출 목적

- Spring Boot의 `GET /api/v1/admin/ai-metrics/logs` 요청을 처리하기 위한 페이지네이션 로그 조회 호출

### Request

```json
{
  "featureType": "DOCUMENT",
  "page": 1,
  "size": 20
}
```

### Response

```json
{
  "content": [
    {
      "aiUsageLogId": 101,
      "memberId": "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
      "sessionId": null,
      "aiModelId": 1,
      "featureType": "DOCUMENT",
      "inputTokens": 1200,
      "outputTokens": 450,
      "cost": 2800,
      "createdAt": "2026-06-10T02:00:00Z"
    }
  ],
  "page": 1,
  "size": 20,
  "totalElements": 1250,
  "totalPages": 63
}
```

### 처리 책임

- `feature_type` 조건 필터링
- 1-based page를 내부 offset 계산에 사용할 수 있도록 처리
- AI 사용 로그 목록 및 전체 건수 반환
- `audit_logs` 기반 AI 운영 이벤트 로그 조회는 `auditLog` 도메인 책임이며 본 endpoint 범위에 포함하지 않는다.

### DB 저장/조회 테이블

- 조회: `ai_usage_logs`
- 저장: 없음

### 비동기 여부

- 동기

---

## 3.6 POST /internal/admin/ai-metrics/ops/sync-settings

### 호출 목적

- Spring Boot가 `ai_ops_settings` 변경 직후 FastAPI 런타임 설정을 동기화하기 위한 호출

### Request

```json
{
  "aiOpsSettingId": 1,
  "selectedModelId": 1,
  "modelName": "gpt-4o-mini",
  "monthlyBudget": 3500000,
  "alertEnabled": true,
  "alertChannel": "DISCORD",
  "alertThreshold": 90,
  "rateLimitEnabled": true
}
```

### Response

```json
{
  "synced": true,
  "syncedAt": "2026-06-11T00:10:00Z"
}
```

### 처리 책임

- FastAPI 메모리 캐시 또는 내부 설정 갱신
- 이후 OpenAI 호출 시 사용할 활성 모델/예산/알림/rate limit 기준 반영

### DB 저장/조회 테이블

- 조회: 없음 또는 `ai_ops_settings`, `ai_models` 재조회 가능
- 저장: 없음

### 비동기 여부

- 동기

---

## 3.7 POST /internal/admin/ai-metrics/rag-documents/index

### 호출 목적

- Spring Boot의 `POST /api/v1/admin/ai-metrics/rag-documents` 후 인덱싱 작업을 시작하기 위한 호출

### Request

```json
{
  "ragDocumentId": 10,
  "fileUuid": "1fb3e31e-fd5a-420d-8135-ec682ac53956",
  "originalFileName": "faq.pdf",
  "filePath": "/rag/2026/06/faq.pdf",
  "mimeType": "application/pdf",
  "fileSize": 182030
}
```

### Response

```json
{
  "accepted": true,
  "ragDocumentId": 10,
  "status": "INDEXING"
}
```

### 처리 책임

- 인덱싱 작업 큐 등록
- 문서 파싱 시작 전 상태를 `INDEXING`으로 변경
- `indexing_progress` 초기화
- 큐 등록 또는 인덱싱 시작 요청 단계에서 실패하면 Spring Boot가 `RAG_DOCUMENT_INDEXING_FAILED`로 변환할 수 있는 내부 오류를 반환

### DB 저장/조회 테이블

- 조회: `rag_documents`
- 저장: `rag_documents.status`, `rag_documents.indexing_progress`, `rag_documents.updated_at`

### 비동기 여부

- 비동기

---

## 3.8 POST /internal/admin/ai-metrics/rag-documents/index/worker

### 호출 목적

- FastAPI 내부 워커가 실제 인덱싱 작업을 수행하기 위한 내부 실행 경로

### Request

```json
{
  "ragDocumentId": 10
}
```

### Response

```json
{
  "ragDocumentId": 10,
  "status": "COMPLETED",
  "chunkCount": 24,
  "indexingProgress": 100
}
```

### 처리 책임

- 파일 스토리지에서 원본 문서 로딩
- 문서 파싱 및 청크 분할
- OpenAI 임베딩 호출
- 벡터 스토어 인덱싱
- 성공 시 `COMPLETED`, 실패 시 `FAILED`
- 비동기 워커 실행 중 실패는 Spring Boot 동기 응답이 아니라 이후 상태 조회 결과로 관찰된다

### DB 저장/조회 테이블

- 조회: `rag_documents`
- 저장: `rag_documents.chunk_count`, `rag_documents.indexing_progress`, `rag_documents.status`, `rag_documents.updated_at`

### 비동기 여부

- 비동기

---

## 3.9 DELETE /internal/admin/ai-metrics/rag-documents/{ragDocumentId}/index

### 호출 목적

- Spring Boot의 `DELETE /api/v1/admin/ai-metrics/rag-documents/{documentId}` 처리 시 벡터 인덱스와 내부 리소스를 제거하기 위한 호출

### Request

- Path Parameter: `ragDocumentId`

### Response

```json
{
  "ragDocumentId": 10,
  "deleted": true
}
```

### 처리 책임

- 벡터 스토어 인덱스 삭제
- 파일 스토리지 정리 필요 시 삭제 수행
- 삭제 실패 시 Spring Boot가 `RAG_DOCUMENT_DELETE_FAILED`로 매핑할 수 있는 내부 오류 반환

### DB 저장/조회 테이블

- 조회: `rag_documents`
- 저장: 없음 또는 후처리 로그

### 비동기 여부

- 동기 또는 짧은 비동기 후 완료 응답

---

## 3.10 POST /internal/admin/ai-metrics/usage/log

### 호출 목적

- AI 기능 실행 시 사용 로그를 적재하기 위한 내부 기록 호출

### Request

```json
{
  "memberId": "7d8b4d74-0a38-4e4a-8c5d-a8d4b25d2f3a",
  "sessionId": null,
  "aiModelId": 1,
  "featureType": "DOCUMENT",
  "inputTokens": 1200,
  "outputTokens": 450,
  "cost": 2800
}
```

### Response

```json
{
  "aiUsageLogId": 101,
  "recorded": true,
  "createdAt": "2026-06-10T02:00:00Z"
}
```

### 처리 책임

- 토큰 수 및 비용 기준 최종 로그 적재
- 예산 초과 여부 판단용 후속 모니터링 트리거 가능

### DB 저장/조회 테이블

- 저장: `ai_usage_logs`
- 조회: `ai_ops_settings`, `ai_models` 참조 가능

### 비동기 여부

- 동기

---

## 4. 내부 오류 계약

### 공통 내부 오류 응답 예시

```json
{
  "success": false,
  "errorCode": "RAG_DOCUMENT_INDEXING_FAILED",
  "message": "RAG 문서 인덱싱 시작에 실패했습니다.",
  "detail": {
    "ragDocumentId": 10,
    "reason": "FILE_NOT_FOUND"
  }
}
```

- `success`: FastAPI 내부 응답 성공 여부
- `errorCode`: Spring Boot가 변환 가능한 내부 오류 식별자
- `message`: 내부 오류 설명
- `detail`: 선택 필드
- FastAPI는 외부 `ApiResponse<T>`를 직접 반환하지 않으며 Spring Boot가 이를 외부 실패 응답으로 변환한다.

| FastAPI ErrorCode | Spring ErrorCode | 설명 |
|---|---|---|
| `AI_MODEL_NOT_FOUND` | `AI_MODEL_NOT_FOUND` | 선택된 모델이 존재하지 않음 |
| `AI_OPS_SETTING_NOT_FOUND` | `AI_OPS_SETTING_NOT_FOUND` | 운영 설정이 존재하지 않음 |
| `INVALID_MONTHLY_BUDGET` | `INVALID_MONTHLY_BUDGET` | 월 예산 값이 유효하지 않음 |
| `INVALID_ALERT_THRESHOLD` | `INVALID_ALERT_THRESHOLD` | 임계치 값이 유효하지 않음 |
| `RAG_DOCUMENT_NOT_FOUND` | `RAG_DOCUMENT_NOT_FOUND` | 문서 메타데이터가 존재하지 않음 |
| `RAG_DOCUMENT_ALREADY_INDEXING` | `RAG_DOCUMENT_ALREADY_INDEXING` | 현재 문서가 인덱싱 중임 |
| `RAG_DOCUMENT_INDEXING_FAILED` | `RAG_DOCUMENT_INDEXING_FAILED` | 큐 등록, 인덱싱 시작 요청 또는 실행 단계 실패 |
| `RAG_DOCUMENT_DELETE_FAILED` | `RAG_DOCUMENT_DELETE_FAILED` | 인덱스 삭제 실패 |
| `OPENAI_API_ERROR` | `AI_MODEL_EXECUTION_FAILED` | OpenAI 호출 실패 |
| `TOKEN_CALCULATION_FAILED` | `AI_USAGE_LOG_CREATE_FAILED` | 토큰 계산 또는 로그 생성 실패 |
| `VECTOR_INDEX_FAILED` | `RAG_DOCUMENT_INDEXING_FAILED` | 벡터 인덱스 생성 실패 |
| `VECTOR_INDEX_DELETE_FAILED` | `RAG_DOCUMENT_DELETE_FAILED` | 벡터 인덱스 삭제 실패 |

### FastAPI DB 쓰기 범위

| Table | Writable Columns |
|---|---|
| `ai_usage_logs` | `member_id`, `session_id`, `ai_model_id`, `feature_type`, `input_tokens`, `output_tokens`, `cost`, `created_at` |
| `rag_documents` | `status`, `indexing_progress`, `chunk_count`, `updated_at` |

### FastAPI DB 읽기 전용 범위

| Table | Readonly Columns |
|---|---|
| `ai_models` | `ai_model_id`, `model_name`, `provider`, `input_token_price`, `output_token_price`, `is_enabled`, `updated_at` |
| `ai_ops_settings` | `ai_ops_setting_id`, `selected_model_id`, `monthly_budget`, `alert_enabled`, `alert_channel`, `alert_threshold`, `rate_limit_enabled`, `updated_at` |

### Spring Boot DB 쓰기 범위

| Table | Writable Columns |
|---|---|
| `ai_ops_settings` | `selected_model_id`, `monthly_budget`, `alert_enabled`, `alert_channel`, `alert_threshold`, `rate_limit_enabled`, `updated_at` |
| `rag_documents` | `uploaded_by`, `file_uuid`, `original_file_name`, `file_path`, `mime_type`, `file_size`, `created_at`, `updated_at` |

> 단, `rag_documents.status`, `rag_documents.indexing_progress`, `rag_documents.chunk_count`, `rag_documents.updated_at`는 인덱싱 진행 상태 기준으로 FastAPI가 갱신한다.

---

## 5. 상태 전이 계약

### rag_documents.status

| 현재 상태 | 다음 상태 | 전이 주체 | 설명 |
|---|---|---|---|
| `UPLOADED` | `INDEXING` | FastAPI | 인덱싱 작업 수락 |
| `INDEXING` | `COMPLETED` | FastAPI | 청크 생성 및 인덱싱 완료 |
| `INDEXING` | `FAILED` | FastAPI | 인덱싱 실패 |

### indexing_progress

- 작업 시작 직후 `0`
- 청크 분할 및 임베딩 진행에 따라 `1 ~ 99`
- 완료 시 `100`

---

## 6. OpenAI 및 인덱싱 책임

### OpenAI 호출 책임

- FastAPI는 `ai_models.model_name`, `provider`, 토큰 가격 정보를 참조해 모델 실행 컨텍스트를 구성한다.
- FastAPI는 OpenAI 응답 기준으로 입력/출력 토큰 수를 계산하거나 보정한다.
- FastAPI는 토큰 가격과 토큰 수를 기반으로 `cost`를 계산한다.

### 인덱싱 책임

- FastAPI는 업로드된 문서를 파싱 가능한 텍스트로 변환한다.
- FastAPI는 텍스트를 청크 단위로 분리하고 `chunk_count`를 계산한다.
- FastAPI는 청크별 임베딩을 생성하고 벡터 스토어에 저장한다.
- FastAPI는 작업 성공/실패를 `rag_documents.status`와 `indexing_progress`에 반영한다.

### 예산/알림 책임

- Spring Boot는 `ai_ops_settings` 수정 API를 제공한다.
- FastAPI는 동기화된 설정을 바탕으로 내부 실행 제한과 알림 판단 기준을 적용한다.
- MVP에서 실제 알림 발송은 Discord만 대상이며 FastAPI 또는 별도 워커가 담당할 수 있다. `SLACK`, `EMAIL`은 현재 API에서 변경 또는 발송하지 않는다.
