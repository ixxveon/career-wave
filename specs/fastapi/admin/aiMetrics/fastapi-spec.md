# FastAPI Feature Specification: aiMetrics

**Feature Branch**: `docs/admin-ai-metrics-spec`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - AI 운영 집계 처리 (Priority: P1)

> FastAPI는 Spring Boot의 내부 집계 요청을 받아 AI 사용량 요약, 도메인별 사용량, 토큰 추이, 고사용 사용자, AI 사용 로그 검색 결과를 계산해 반환한다.

**Acceptance Scenarios**:
1. **Given** Spring Boot가 `from`, `to`, `featureType` 조건으로 사용량 요약 집계를 요청한 상태에서, **When** FastAPI가 내부 집계 요청을 처리하면, **Then** FastAPI는 `ai_usage_logs`, `ai_ops_settings`, `ai_models`를 기준으로 요청 수, 입력/출력 토큰 수, 비용, 활성 모델 정보를 계산해 반환해야 한다.
2. **Given** Spring Boot가 도메인별 사용량, 토큰 추이, 고사용 사용자 집계 요청을 전달한 상태에서, **When** FastAPI가 기간 조건과 집계 단위를 적용하면, **Then** FastAPI는 요청/토큰/비용 집계를 Spring Boot가 기대하는 내부 응답 계약 형식으로 반환해야 한다.
3. **Given** Spring Boot가 `featureType`, `page`, `size` 기준으로 AI 사용 로그 검색을 요청한 상태에서, **When** FastAPI가 `ai_usage_logs`를 조회하면, **Then** FastAPI는 1-based 페이지 기준 목록과 전체 건수를 포함한 내부 응답을 반환해야 한다.

---

### User Story 2 - 운영 정책 동기화 처리 (Priority: P1)

> FastAPI는 Spring Boot가 저장한 AI 운영 정책을 내부 런타임 실행 기준으로 동기화해 이후 OpenAI 호출과 예산/알림 정책에 반영한다.

**Acceptance Scenarios**:
1. **Given** Spring Boot가 `selectedModelId`, `monthlyBudget`, `alertEnabled`, `alertChannel`, `alertThreshold`, `rateLimitEnabled`를 포함한 설정 동기화 요청을 보낸 상태에서, **When** FastAPI가 이를 수신하면, **Then** FastAPI는 이후 실행 컨텍스트에 사용할 활성 모델과 운영 정책을 갱신해야 한다.
2. **Given** 동기화 요청에 존재하지 않는 모델 ID 또는 잘못된 예산/임계치 값이 포함된 상태에서, **When** FastAPI가 요청을 검증하면, **Then** FastAPI는 내부 오류를 반환하고 Spring Boot가 도메인 ErrorCode로 변환할 수 있어야 한다.

---

### User Story 3 - RAG 문서 인덱싱 처리 (Priority: P1)

> FastAPI는 Spring Boot가 전달한 RAG 문서 메타데이터를 기준으로 비동기 인덱싱을 수행하고 상태를 갱신한다.

**Acceptance Scenarios**:
1. **Given** Spring Boot가 저장 경로와 메타데이터를 포함한 RAG 문서 인덱싱 시작 요청을 보낸 상태에서, **When** FastAPI가 작업을 수락하면, **Then** FastAPI는 `rag_documents.status`를 `INDEXING`으로 변경하고 비동기 워커 작업을 시작해야 한다.
2. **Given** 비동기 워커가 원본 문서를 읽을 수 있는 상태에서, **When** FastAPI가 문서 파싱, chunking, embedding 생성, vector index 생성을 수행하면, **Then** FastAPI는 `chunk_count`, `indexing_progress`, `status`를 진행 상태에 맞게 갱신해야 한다.
3. **Given** 인덱싱 중 파싱, embedding, index 생성 오류가 발생한 상태에서, **When** FastAPI 워커가 실패를 감지하면, **Then** FastAPI는 `rag_documents.status`를 `FAILED`로 갱신하고 Spring Boot가 후속 조회에서 실패 상태를 확인할 수 있게 해야 한다.
4. **Given** Spring Boot가 RAG 문서 삭제에 맞춰 인덱스 제거 요청을 보낸 상태에서, **When** FastAPI가 vector index와 관련 리소스를 정리하면, **Then** FastAPI는 삭제 성공 여부를 반환하거나 Spring Boot가 `RAG_DOCUMENT_DELETE_FAILED`로 변환할 수 있는 내부 오류를 반환해야 한다.

---

### User Story 4 - AI 사용 로그 적재 및 비용 산정 (Priority: P2)

> FastAPI는 AI 실행 결과를 기준으로 토큰과 비용을 계산하고 사용 로그를 적재해 이후 운영 집계의 기준 데이터를 유지한다.

**Acceptance Scenarios**:
1. **Given** AI 기능 실행 결과로 모델 ID, 기능 유형, 입력/출력 토큰 수가 결정된 상태에서, **When** FastAPI가 사용 로그 기록 요청을 처리하면, **Then** FastAPI는 비용을 계산하거나 검증한 뒤 `ai_usage_logs`에 기록해야 한다.
2. **Given** 예산 초과 또는 임계치 도달 판단이 필요한 상태에서, **When** FastAPI가 로그 적재 또는 운영 정책 동기화 결과를 참조하면, **Then** FastAPI는 후속 알림 또는 운영 제한 판단에 사용할 수 있는 내부 기준을 유지해야 한다.

---

### Edge Cases

- `from`이 `to`보다 이후 시점이면 내부 집계 요청을 어떻게 거부하는가?
- 허용되지 않은 `featureType`, `interval` 값이 전달되면 어떤 내부 오류를 반환하는가?
- `selectedModelId`가 존재하지 않거나 `monthlyBudget`, `alertThreshold`가 허용 범위를 벗어나면 어떻게 처리하는가?
- 이미 `INDEXING` 상태인 문서에 대해 중복 인덱싱 시작 요청이 들어오면 어떻게 처리하는가?
- 원본 문서 경로는 유효하지만 파일 스토리지에서 파일을 읽을 수 없으면 어떤 상태 전이를 수행하는가?
- vector index 삭제는 성공했지만 후속 정리 과정이 실패하면 어떤 내부 오류를 반환하는가?

## Requirements

### Functional Requirements

- **FR-001**: FastAPI는 Spring Boot의 내부 호출만 처리해야 하며, 프론트엔드의 직접 호출을 처리 대상으로 간주하지 않아야 한다.
- **FR-002**: FastAPI는 `POST /internal/admin/ai-metrics/usage/summary` 요청을 받아 AI 사용량 요약 집계를 반환해야 한다.
- **FR-003**: FastAPI는 사용량 요약 집계 시 `ai_usage_logs`, `ai_ops_settings`, `ai_models`를 조회해 요청 수, 입력/출력 토큰 수, 비용, 활성 모델 정보를 계산해야 한다.
- **FR-004**: FastAPI는 `POST /internal/admin/ai-metrics/usage/domain-usage`, `POST /internal/admin/ai-metrics/usage/token-trend`, `POST /internal/admin/ai-metrics/usage/heavy-users` 요청을 받아 기간 기반 집계를 반환해야 한다.
- **FR-005**: FastAPI는 토큰 추이 집계 시 `interval` 기준 시간 버킷을 생성해야 하며, 고사용 사용자 집계 시 `limit` 기준 상위 사용자만 반환해야 한다.
- **FR-006**: FastAPI는 `POST /internal/admin/ai-metrics/usage/logs/search` 요청을 받아 `featureType` 필터와 1-based 페이지 기준 AI 사용 로그 목록 및 전체 건수를 반환해야 한다.
- **FR-007**: FastAPI는 Spring Boot가 전달한 1-based `page` 값을 내부 offset 계산에 적용할 수 있도록 해석해야 한다.
- **FR-008**: FastAPI는 `POST /internal/admin/ai-metrics/ops/sync-settings` 요청을 받아 활성 모델, 예산, 알림, rate limit 기준을 내부 실행 설정에 동기화해야 한다.
- **FR-009**: FastAPI는 존재하지 않는 모델 ID에 대해 내부 `AI_MODEL_NOT_FOUND` 오류를 반환할 수 있어야 하며, Spring Boot가 이를 동일한 도메인 ErrorCode로 변환할 수 있어야 한다.
- **FR-010**: FastAPI는 유효하지 않은 `monthlyBudget`, `alertThreshold` 값에 대해 각각 `INVALID_MONTHLY_BUDGET`, `INVALID_ALERT_THRESHOLD`에 대응 가능한 내부 오류를 반환해야 한다.
- **FR-011**: FastAPI는 OpenAI 호출 책임을 가져야 하며, Spring Boot가 OpenAI를 직접 호출하지 않도록 내부 AI 실행 계층 역할을 수행해야 한다.
- **FR-012**: FastAPI는 입력 토큰과 출력 토큰 계산 책임을 가져야 하며, 필요 시 OpenAI 응답 기준으로 보정해야 한다.
- **FR-013**: FastAPI는 모델별 토큰 가격 정보를 기준으로 요청 비용을 계산해야 한다.
- **FR-014**: FastAPI는 `POST /internal/admin/ai-metrics/usage/log` 요청을 받아 AI 사용 로그를 `ai_usage_logs`에 적재해야 한다.
- **FR-015**: FastAPI는 사용 로그 적재 시 `member_id`, `session_id`, `ai_model_id`, `feature_type`, `input_tokens`, `output_tokens`, `cost`를 저장해야 한다.
- **FR-016**: FastAPI는 `POST /internal/admin/ai-metrics/rag-documents/index` 요청을 받아 RAG 문서 인덱싱 작업을 큐에 등록하고 `rag_documents.status`를 `INDEXING`으로 갱신해야 한다.
- **FR-017**: FastAPI는 큐 등록 또는 인덱싱 시작 요청 단계에서 실패하면 `RAG_DOCUMENT_INDEXING_FAILED`로 변환 가능한 내부 오류를 반환해야 한다.
- **FR-018**: FastAPI는 이미 `INDEXING` 상태인 문서에 대한 중복 인덱싱 요청을 거부하고 `RAG_DOCUMENT_ALREADY_INDEXING`로 변환 가능한 내부 오류를 반환해야 한다.
- **FR-019**: FastAPI는 비동기 워커에서 원본 문서를 읽고 파싱 가능한 텍스트로 변환해야 한다.
- **FR-020**: FastAPI는 파싱된 문서를 chunking하고 `rag_documents.chunk_count`를 갱신해야 한다.
- **FR-021**: FastAPI는 chunk 단위 embedding을 생성해야 한다.
- **FR-022**: FastAPI는 vector store 또는 vector index를 생성하고 저장해야 한다.
- **FR-023**: FastAPI는 인덱싱 진행 중 `rag_documents.indexing_progress`를 0~100 범위로 갱신해야 한다.
- **FR-024**: FastAPI는 인덱싱 성공 시 `rag_documents.status = COMPLETED`, `rag_documents.indexing_progress = 100`으로 갱신해야 한다.
- **FR-025**: FastAPI는 인덱싱 실패 시 `rag_documents.status = FAILED`로 갱신해야 하며, 실패 상태는 Spring Boot의 후속 조회로 확인 가능해야 한다.
- **FR-026**: FastAPI는 `DELETE /internal/admin/ai-metrics/rag-documents/{ragDocumentId}/index` 요청을 받아 vector store 또는 vector index 삭제를 수행해야 한다.
- **FR-027**: FastAPI는 인덱스 삭제 실패 시 `RAG_DOCUMENT_DELETE_FAILED`로 변환 가능한 내부 오류를 반환해야 한다.
- **FR-028**: FastAPI는 `rag_documents.status`, `rag_documents.indexing_progress`, `rag_documents.chunk_count`, `rag_documents.updated_at` 갱신 책임을 가져야 한다.
- **FR-029**: FastAPI는 외부 `ApiResponse<T>`를 직접 생성하지 않고 내부 JSON 성공/실패 계약만 반환해야 한다.
- **FR-030**: FastAPI는 내부 오류를 Spring Boot가 `AI_MODEL_NOT_FOUND`, `AI_OPS_SETTING_NOT_FOUND`, `INVALID_MONTHLY_BUDGET`, `INVALID_ALERT_THRESHOLD`, `RAG_DOCUMENT_NOT_FOUND`, `RAG_DOCUMENT_ALREADY_INDEXING`, `RAG_DOCUMENT_INDEXING_FAILED`, `RAG_DOCUMENT_DELETE_FAILED`, `AI_MODEL_EXECUTION_FAILED`, `AI_USAGE_LOG_CREATE_FAILED`로 매핑할 수 있도록 일관된 오류 식별자를 유지해야 한다.
- **FR-031**: FastAPI는 MVP에서 Discord 알림만 지원하며 `SLACK`, `EMAIL`은 현재 API에서 변경 또는 발송을 지원하지 않아야 한다.
- **FR-032**: FastAPI는 Vector Store 구현체를 추상 클라이언트 기반으로 유지하고 실제 구현체 교체 가능 구조를 보장해야 한다.
- **FR-033**: FastAPI는 예산/알림 기준을 바탕으로 후속 알림 또는 실행 제한 판단에 필요한 내부 상태를 유지해야 한다.

### Key Entities

- **AiModel**: FastAPI가 `ai_model_id`, `model_name`, `provider`, `input_token_price`, `output_token_price`, `is_enabled`, `updated_at`를 읽어 OpenAI 실행 컨텍스트와 비용 계산 기준으로 사용하는 모델 메타데이터 테이블
- **AiUsageLog**: FastAPI가 `ai_usage_log_id`, `member_id`, `session_id`, `ai_model_id`, `feature_type`, `input_tokens`, `output_tokens`, `cost`, `created_at`를 읽고 쓰며 집계와 로그 적재의 기준으로 사용하는 테이블
- **AiOpsSetting**: FastAPI가 `ai_ops_setting_id`, `selected_model_id`, `monthly_budget`, `alert_enabled`, `alert_channel`, `alert_threshold`, `rate_limit_enabled`, `updated_at`를 읽어 운영 정책과 예산/알림 기준으로 사용하는 설정 테이블
- **RagDocument**: FastAPI가 `rag_document_id`, `file_uuid`, `file_path`, `mime_type`, `file_size`, `chunk_count`, `indexing_progress`, `status`, `updated_at`를 읽고 쓰며 인덱싱 상태 관리 대상으로 사용하는 문서 테이블

## Success Criteria

- **SC-001**: FastAPI는 Spring Boot의 내부 집계 요청에 대해 100% 내부 계약 형식의 응답 필드를 반환한다.
- **SC-002**: FastAPI는 설정 동기화 요청 중 잘못된 모델/예산/임계치 입력을 100% 내부 오류로 식별하고 Spring Boot가 도메인 ErrorCode로 변환할 수 있게 한다.
- **SC-003**: RAG 문서 인덱싱 수락 요청은 100% `INDEXING` 상태 전이 또는 명시적 내부 오류 중 하나로 종료된다.
- **SC-004**: 인덱싱 완료 문서는 100% `COMPLETED` 상태와 `indexing_progress = 100`으로 갱신된다.
- **SC-005**: 인덱싱 실패 문서는 100% `FAILED` 상태로 조회 가능하다.
- **SC-006**: AI 실행 로그 적재 시 입력 토큰, 출력 토큰, 비용 값이 100% `ai_usage_logs`에 저장된다.
- **SC-007**: FastAPI가 직접 처리하는 OpenAI 호출, 토큰 계산, 비용 계산, 파싱, chunking, embedding, vector index 생성/삭제 책임이 Spring Boot 책임과 분리되어 유지된다.

## Assumptions

- 프론트엔드는 FastAPI를 직접 호출하지 않는다.
- FastAPI는 Spring Boot의 내부 호출만 처리한다.
- Spring Boot는 외부 관리자 API 계약, 인증/인가, `ApiResponse<T>` 래핑, ErrorCode 변환을 담당하고 FastAPI는 내부 처리만 담당한다.
- RAG 원본 파일은 Spring Boot가 외부 업로드를 수신해 저장 경로와 메타데이터를 확보한 뒤 FastAPI에 전달한다.
- FastAPI는 OpenAI, 파일 스토리지, vector store 또는 vector index 시스템에 접근할 수 있다.
- MVP에서는 Discord 알림만 지원하며 `SLACK`, `EMAIL`은 확장 가능성을 위한 ERD 값으로만 유지한다.
- Vector Store는 추상 클라이언트 기반으로 두고 구현체는 교체 가능 adapter 구조를 전제한다.
- `audit_logs` 기반 AI 운영 이벤트 로그 조회는 `auditLog` 도메인 범위이며 aiMetrics FastAPI 기능 범위에 포함하지 않는다.
- 관리자 UI 제공, JWT 인증 처리, 외부 공개 응답 포맷 정의는 FastAPI 스펙 범위 외다.
