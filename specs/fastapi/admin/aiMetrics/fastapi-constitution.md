# FastAPI Constitution: aiMetrics

**Feature Branch**: `docs/admin-ai-metrics-spec`

## 1. 도메인 원칙

> FastAPI는 `aiMetrics` 도메인에서 내부 AI 처리, 사용량 집계, RAG 인덱싱만 담당한다.
> OpenAI 호출, 토큰 계산, 비용 계산, vector index 생성/삭제는 FastAPI만 수행한다.
> FastAPI는 Spring Boot의 내부 호출만 처리하며, Spring Boot 외부 관리자 API를 역호출하지 않는다.

- FastAPI는 외부 공개 관리자 API를 제공하지 않는다.
- FastAPI는 Spring Boot가 전달한 내부 계약을 기준으로만 동작한다.
- AI 사용량 집계와 AI 사용 로그 검색은 FastAPI가 수행하고 Spring Boot는 결과를 외부 DTO로 변환한다.

## 2. 상태 머신

```
UPLOADED
  ↓ (인덱싱 작업 수락)
INDEXING
  ↓ (인덱싱 완료)
COMPLETED

INDEXING
  ↓ (파싱/임베딩/인덱싱 실패)
FAILED
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| `UPLOADED -> INDEXING` | 허용 | Spring Boot가 저장한 문서 메타데이터를 기준으로 FastAPI가 인덱싱 작업을 수락한다. |
| `INDEXING -> COMPLETED` | 허용 | 문서 파싱, chunking, embedding 생성, vector index 생성이 정상 완료되면 완료 상태로 전이한다. |
| `INDEXING -> FAILED` | 허용 | 파일 로딩, 문서 파싱, embedding, index 생성 중 오류가 발생하면 실패 상태로 전이한다. |
| `UPLOADED -> COMPLETED` | **금지** | 인덱싱 과정을 생략한 완료 처리는 상태 정합성을 깨뜨린다. |
| `COMPLETED -> INDEXING` | **금지** | 재인덱싱 정책이 별도로 정의되지 않은 이상 완료 상태를 되돌리지 않는다. |
| `FAILED -> INDEXING` | **금지** | 재시도는 별도 운영 정책으로 다뤄야 하며 임의 재전이를 허용하지 않는다. |

## 3. 아키텍처 결정

> 왜 이렇게 설계했는지 이유까지 적는다. 이유 없는 결정은 나중에 깨진다.

| 결정 | 내용 | 근거 |
|------|------|------|
| 내부 호출 전용 구조 | FastAPI는 Spring Boot의 내부 호출만 처리하고 프론트엔드 또는 외부 관리자가 직접 호출하지 않는다. | 인증/인가, 외부 응답 형식, ErrorCode 정책을 Spring Boot에 일원화해야 경계가 깨지지 않기 때문이다. |
| OpenAI 호출 전담 | OpenAI 호출은 FastAPI만 수행한다. | 모델 실행 로직과 관리자 API 로직을 분리해야 모델 교체, 워커 확장, 장애 대응이 쉬워지기 때문이다. |
| 토큰/비용 계산 내부화 | 입력 토큰, 출력 토큰, 비용 계산은 FastAPI가 수행한다. | 비용 집계 기준을 한 계층에 모아야 로그 적재와 통계 집계 결과가 일관되기 때문이다. |
| 비동기 인덱싱 워커 분리 | RAG 문서 인덱싱은 수락 요청과 실제 워커 실행을 분리한다. | 파일 파싱, embedding, vector index 생성은 장시간 작업이므로 동기 API 응답과 분리해야 안정적이기 때문이다. |
| 컬럼 쓰기 책임 분리 | Spring Boot와 FastAPI가 같은 테이블을 보더라도 수정 가능한 컬럼은 명확히 분리한다. | DB 무결성을 유지하고 상태 전이 충돌을 방지해야 하기 때문이다. |
| 내부 오류 식별자 유지 | FastAPI는 Spring Boot가 도메인 ErrorCode로 매핑할 수 있는 내부 오류 식별자를 유지한다. | 내부 처리 계층과 외부 API 계층이 분리되어도 오류 의미가 바뀌지 않아야 하기 때문이다. |

## 4. 불변 규칙 (Invariants)

> "항상 참이어야 하는 조건"을 나열한다. 코드 어디서든 이 규칙이 깨지면 버그다.

- OpenAI 호출은 FastAPI만 수행한다. Spring Boot가 직접 호출해서는 안 된다.
- 입력 토큰과 출력 토큰 계산 기준은 OpenAI 응답 또는 그와 동등한 실행 결과 데이터여야 한다.
- 비용 계산은 `ai_models.input_token_price`, `ai_models.output_token_price`와 계산된 토큰 수를 기준으로 수행해야 한다.
- `rag_documents.status`는 `UPLOADED`, `INDEXING`, `COMPLETED`, `FAILED` 이외의 값으로 저장되면 안 된다.
- `INDEXING` 상태 문서에 대한 중복 인덱싱 시작 요청은 허용하지 않는다.
- `COMPLETED` 상태 문서는 반드시 `indexing_progress = 100`이어야 한다.
- `indexing_progress`는 항상 `0 ~ 100` 범위를 유지해야 한다.
- 인덱싱 성공 전에는 `chunk_count`가 실제 생성된 chunk 수보다 크게 기록되면 안 된다.
- FastAPI는 Spring Boot 외부 관리자 API를 역호출하지 않는다.
- FastAPI는 내부 호출 결과를 외부 `ApiResponse<T>` 형태로 직접 래핑하지 않는다.
- FastAPI 내부 오류 응답에는 Spring Boot가 변환 가능한 `errorCode`가 포함되어야 한다.
- MVP에서는 Discord 알림만 지원하며 `SLACK`, `EMAIL`은 현재 변경 또는 발송하지 않는다.

## 5. 연동 계약

> 다른 도메인 또는 외부 시스템(FastAPI 등)과의 경계를 명시한다.

- **호출 방향**: `Spring Boot -> FastAPI` 단방향 호출만 허용한다.
- **역호출 금지**: FastAPI는 Spring Boot 외부 관리자 API를 역호출하지 않는다.
- **Spring Boot 책임**: 외부 관리자 API 제공, 인증/인가, 업로드 파일 수신, `ai_ops_settings` 저장, RAG 메타데이터 생성, 외부 ErrorCode 변환.
- **FastAPI 책임**: 내부 집계, OpenAI 호출, 토큰/비용 계산, AI 사용 로그 적재, 문서 파싱, chunking, embedding, vector index 생성/삭제, 상태 갱신.
- **비동기 작업 책임**: `POST /internal/admin/ai-metrics/rag-documents/index`는 작업 수락과 상태 전이를 시작하고, 실제 인덱싱은 워커가 비동기로 수행한다.
- **외부 시스템 연동 책임**: OpenAI 호출, 파일 스토리지 원본 문서 읽기, vector store 또는 vector index 생성/삭제, 후속 알림 판단은 FastAPI가 담당한다.
- **Vector Store 정책**: FastAPI는 `vector_store_client`를 추상 클라이언트로 유지하고 구현체는 mock adapter 또는 교체 가능한 adapter로 둘 수 있다.

### DB 직접 수정 가능 범위

- **FastAPI가 직접 수정 가능한 테이블/컬럼**
  - `ai_usage_logs`
    - `member_id`
    - `session_id`
    - `ai_model_id`
    - `feature_type`
    - `input_tokens`
    - `output_tokens`
    - `cost`
    - `created_at`
  - `rag_documents`
    - `status`
    - `indexing_progress`
    - `chunk_count`
    - `updated_at`

- **FastAPI가 읽기 전용으로 참조하는 테이블/컬럼**
  - `ai_models`
    - `ai_model_id`
    - `model_name`
    - `provider`
    - `input_token_price`
    - `output_token_price`
    - `is_enabled`
    - `updated_at`
  - `ai_ops_settings`
    - `ai_ops_setting_id`
    - `selected_model_id`
    - `monthly_budget`
    - `alert_enabled`
    - `alert_channel`
    - `alert_threshold`
    - `rate_limit_enabled`
    - `updated_at`
  - `rag_documents`
    - `rag_document_id`
    - `file_uuid`
    - `file_path`
    - `mime_type`
    - `file_size`
    - `created_at`

- **Spring Boot가 수정하는 컬럼**
  - `ai_ops_settings.selected_model_id`
  - `ai_ops_settings.monthly_budget`
  - `ai_ops_settings.alert_enabled`
  - `ai_ops_settings.alert_channel`
  - `ai_ops_settings.alert_threshold`
  - `ai_ops_settings.rate_limit_enabled`
  - `ai_ops_settings.updated_at`
  - `rag_documents.uploaded_by`
  - `rag_documents.file_uuid`
  - `rag_documents.original_file_name`
  - `rag_documents.file_path`
  - `rag_documents.mime_type`
  - `rag_documents.file_size`
  - `rag_documents.created_at`
  - `rag_documents.updated_at` (메타데이터 생성 또는 삭제로 row 자체를 변경하는 시점)

- **FastAPI가 수정하는 컬럼**
  - `rag_documents.status`
  - `rag_documents.indexing_progress`
  - `rag_documents.chunk_count`
  - `rag_documents.updated_at` (인덱싱 상태 또는 진행률 변경 시점)
  - `ai_usage_logs.member_id`
  - `ai_usage_logs.session_id`
  - `ai_usage_logs.ai_model_id`
  - `ai_usage_logs.feature_type`
  - `ai_usage_logs.input_tokens`
  - `ai_usage_logs.output_tokens`
  - `ai_usage_logs.cost`
  - `ai_usage_logs.created_at`

> `rag_documents.updated_at`는 공동 갱신 컬럼이다. 다만 Spring Boot는 메타데이터 생성/삭제 시점에만, FastAPI는 인덱싱 상태 변경 시점에만 갱신한다.

## 6. 금지 패턴

> 실수하기 쉬운 안티패턴을 명시한다.

- `INDEXING` 상태 문서에 대해 중복 인덱싱 작업을 큐에 다시 넣는 패턴 금지.
- `UPLOADED -> COMPLETED`처럼 중간 상태를 생략하는 패턴 금지.
- 인덱싱 완료 후 `indexing_progress < 100`인 상태로 `COMPLETED`를 저장하는 패턴 금지.
- Spring Boot가 관리하는 `ai_ops_settings` 컬럼을 FastAPI가 직접 수정하는 패턴 금지.
- FastAPI가 `rag_documents.file_path`, `original_file_name` 같은 Spring Boot 메타데이터 소유 컬럼을 임의로 덮어쓰는 패턴 금지.
- 토큰 계산 없이 고정 비용을 저장하거나, 모델 가격 테이블과 무관하게 비용을 기록하는 패턴 금지.
- OpenAI 호출 실패를 무시하고 성공 로그를 적재하는 패턴 금지.
- vector index 생성은 성공했지만 DB 상태를 갱신하지 않거나, 반대로 DB만 갱신하고 실제 index 생성을 생략하는 패턴 금지.
- vector index 삭제 실패를 무시한 채 성공 응답으로 처리하는 패턴 금지.
- 외부 시스템 오류를 재시도 전략 없이 무한 대기시키거나 워커를 중복 실행하는 패턴 금지.
