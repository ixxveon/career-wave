# Feature Specification: aiMetrics

**Feature Branch**: `docs/admin-ai-metrics-spec`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - AI 운영 현황 조회 (Priority: P1)

> `MASTER` 또는 `BACKEND` 관리자는 AI 운영 비용과 사용량을 빠르게 파악하기 위해 요약, 도메인별 사용량, 토큰 추이, 고사용 사용자, AI 사용 로그를 조회한다.

**Acceptance Scenarios**:
1. **Given** `MASTER` 또는 `BACKEND` 관리자가 AI 메트릭스 대시보드에 접근한 상태에서, **When** 요약 조회를 요청하면, **Then** 시스템은 전체 요청 수, 입력/출력 토큰 수, 총 비용, 기능 유형별 집계, 현재 운영 모델 정보를 반환해야 한다.
2. **Given** 관리자가 `from`, `to`, `featureType`, `interval`, `limit` 조건을 입력한 상태에서, **When** 도메인별 사용량, 토큰 추이, 고사용 사용자 목록을 조회하면, **Then** 시스템은 기간 조건과 기능 유형 조건에 맞는 집계 결과를 반환해야 한다.
3. **Given** 관리자가 AI 사용 로그 목록 조회를 요청한 상태에서, **When** `featureType`, `page`, `size`를 포함한 요청을 보내면, **Then** 시스템은 Spring Boot가 FastAPI 내부 집계 endpoint를 호출해 받은 결과를 `ApiResponse<T>`와 1-based 페이지네이션 구조로 반환해야 한다.

---

### User Story 2 - AI 운영 정책 관리 (Priority: P1)

> `MASTER` 또는 `BACKEND` 관리자는 예산, 알림, rate limit 운영 정책을 관리하여 AI 비용과 시스템 안정성을 통제한다.

**Acceptance Scenarios**:
1. **Given** `MASTER` 또는 `BACKEND` 관리자가 예산 설정 화면에 접근한 상태에서, **When** 예산 및 알림 설정 조회를 요청하면, **Then** 시스템은 현재 운영 모델, 월 예산, 알림 채널, 알림 임계치, rate limit 설정을 반환해야 한다.
2. **Given** `MASTER` 관리자가 월 예산, 운영 모델, 알림 임계치를 수정하는 상태에서, **When** 예산 수정 요청을 보내면, **Then** 시스템은 변경된 운영 정책을 저장하고 FastAPI 실행 설정과 동기화해야 한다.
3. **Given** `MASTER` 또는 `BACKEND` 관리자가 Discord 알림 설정을 변경하는 상태에서, **When** 알림 설정 변경 요청을 보내면, **Then** 시스템은 변경된 알림 활성 여부와 채널 정보를 저장해야 한다.
4. **Given** `MASTER` 관리자가 rate limit 활성 여부를 변경하는 상태에서, **When** rate limit 설정 변경 요청을 보내면, **Then** 시스템은 변경된 설정을 저장하고 내부 AI 실행 정책에 반영해야 한다.

---

### User Story 3 - RAG 문서 운영 (Priority: P1)

> `MASTER` 또는 `BACKEND` 관리자는 RAG 지식 베이스 품질을 유지하기 위해 문서 목록을 조회하고 업로드하며, `MASTER` 관리자는 문서를 삭제한다.

**Acceptance Scenarios**:
1. **Given** `MASTER` 또는 `BACKEND` 관리자가 RAG 문서 목록 화면에 접근한 상태에서, **When** 목록 조회를 요청하면, **Then** 시스템은 문서 메타데이터, 인덱싱 상태, 진행률을 페이지네이션 구조로 반환해야 한다.
2. **Given** `MASTER` 또는 `BACKEND` 관리자가 새로운 RAG 문서를 업로드한 상태에서, **When** 업로드 요청을 보내면, **Then** 시스템은 문서 메타데이터를 저장하고 FastAPI 비동기 인덱싱 작업을 시작해야 한다.
3. **Given** `MASTER` 또는 `BACKEND` 관리자가 특정 RAG 문서 다운로드를 요청한 상태에서, **When** 다운로드 정보를 조회하면, **Then** 시스템은 해당 문서의 다운로드 가능 정보 또는 다운로드 경로를 반환해야 한다.
4. **Given** `MASTER` 관리자가 특정 RAG 문서를 삭제하는 상태에서, **When** 삭제 요청을 보내면, **Then** 시스템은 문서 메타데이터와 연결된 인덱스 제거 작업을 수행하고 삭제 결과를 반환해야 한다.

---

### User Story 4 - 비동기 인덱싱 상태 반영 (Priority: P2)

> 운영자는 RAG 인덱싱 진행 상황과 실패 여부를 확인해 후속 운영 조치를 빠르게 판단한다.

**Acceptance Scenarios**:
1. **Given** RAG 문서 업로드 후 인덱싱이 진행 중인 상태에서, **When** 문서 목록을 재조회하면, **Then** 시스템은 `UPLOADED`, `INDEXING`, `COMPLETED`, `FAILED` 상태와 진행률을 최신 값으로 보여줘야 한다.
2. **Given** 인덱싱 중 오류가 발생한 상태에서, **When** FastAPI가 실패 상태를 보고하면, **Then** 시스템은 해당 문서 상태를 `FAILED`로 반영하고 이후 조회에서 실패 상태를 확인할 수 있어야 한다.

---

### Edge Cases

- `from`이 `to`보다 이후 시점이면 어떻게 처리하는가?
- 허용되지 않은 `featureType`, `interval` 값이 전달되면 어떻게 처리하는가?
- `monthlyBudget`가 0 이하이거나 `alertThreshold`가 1~100 범위를 벗어나면 어떻게 처리하는가?
- 이미 `INDEXING` 상태인 RAG 문서에 대해 중복 인덱싱 요청이 발생하면 어떻게 처리하는가?
- 존재하지 않는 `ai_ops_settings`, `ai_models`, `rag_documents`를 참조하면 어떻게 처리하는가?
- RAG 문서 삭제 시 벡터 인덱스 제거는 성공했지만 메타데이터 정리가 실패하면 어떻게 처리하는가?

## Requirements

### Functional Requirements

- **FR-001**: 시스템은 `GET /api/v1/admin/ai-metrics/summary`를 통해 `MASTER`, `BACKEND` 관리자에게 AI 사용량 요약 조회 기능을 제공해야 한다.
- **FR-002**: 시스템은 AI 사용량 요약 조회 시 `from`, `to`, `featureType` Query Parameter 계약을 지원해야 한다.
- **FR-003**: 시스템은 요약 응답에 전체 요청 수, 입력 토큰 수, 출력 토큰 수, 총 비용, 기능 유형별 요청 수, 활성 모델 정보를 포함해야 한다.
- **FR-004**: 시스템은 `GET /api/v1/admin/ai-metrics/domain-usage`, `GET /api/v1/admin/ai-metrics/token-trend`, `GET /api/v1/admin/ai-metrics/heavy-users`를 통해 기간 기반 집계 조회 기능을 제공해야 한다.
- **FR-005**: 시스템은 토큰 추이 조회 시 `interval` 기준 시간 버킷 집계를 지원해야 하며, 고사용 사용자 조회 시 `limit` 기준 상위 사용자 결과를 제공해야 한다.
- **FR-006**: 시스템은 `GET /api/v1/admin/ai-metrics/logs`를 통해 AI 사용 로그 목록 조회 기능을 제공해야 한다.
- **FR-007**: 시스템은 AI 사용 로그 목록 응답을 `ApiResponse<T>` 래퍼와 `content`, `page`, `size`, `totalElements`, `totalPages` 페이지네이션 구조로 반환해야 한다.
- **FR-008**: 시스템은 외부 API 기준 `page`를 1-based로 처리하고, 백엔드 내부 Pageable 변환 시 `page - 1`을 적용해야 한다.
- **FR-009**: 시스템은 `GET /api/v1/admin/ai-metrics/budget`를 통해 현재 AI 운영 설정 조회 기능을 제공해야 한다.
- **FR-010**: 시스템은 `PATCH /api/v1/admin/ai-metrics/budget`, `PATCH /api/v1/admin/ai-metrics/alerts/discord`, `PATCH /api/v1/admin/ai-metrics/controls/rate-limit`를 통해 AI 운영 정책 변경 기능을 제공해야 한다.
- **FR-011**: 시스템은 운영 정책 변경 시 Spring Boot에 저장된 `ai_ops_settings`와 FastAPI 런타임 설정을 동기화해야 한다.
- **FR-012**: 시스템은 `GET /api/v1/admin/ai-metrics/rag-documents`, `POST /api/v1/admin/ai-metrics/rag-documents`, `GET /api/v1/admin/ai-metrics/rag-documents/{documentId}/download`, `DELETE /api/v1/admin/ai-metrics/rag-documents/{documentId}`를 통해 RAG 문서 운영 기능을 제공해야 한다.
- **FR-013**: 시스템은 RAG 문서 업로드 시 `multipart/form-data` 기반 원본 파일을 수신하고 문서 메타데이터를 저장한 뒤 FastAPI 비동기 인덱싱 작업을 시작해야 한다.
- **FR-014**: 시스템은 FastAPI 인덱싱 작업 상태를 `rag_documents.status`, `rag_documents.indexing_progress`, `rag_documents.chunk_count`, `rag_documents.updated_at`에 반영해야 한다.
- **FR-015**: 시스템은 RAG 문서 상태를 `UPLOADED`, `INDEXING`, `COMPLETED`, `FAILED` 범위로 해석해야 한다.
- **FR-016**: 시스템은 허용되지 않은 `alertThreshold`, `monthlyBudget` 값에 대해 각각 `INVALID_ALERT_THRESHOLD`, `INVALID_MONTHLY_BUDGET`을 반환해야 한다.
- **FR-017**: 시스템은 존재하지 않는 운영 모델, AI 운영 설정, RAG 문서에 대해 각각 `AI_MODEL_NOT_FOUND`, `AI_OPS_SETTING_NOT_FOUND`, `RAG_DOCUMENT_NOT_FOUND`를 반환해야 한다.
- **FR-018**: 시스템은 이미 인덱싱 중인 RAG 문서에 대한 중복 인덱싱 요청에 대해 `RAG_DOCUMENT_ALREADY_INDEXING`을 반환해야 한다.
- **FR-019**: 시스템은 FastAPI 인덱싱 시작 요청 자체가 실패하면 `RAG_DOCUMENT_INDEXING_FAILED`를 반환하고, 비동기 인덱싱 실행 중 실패는 `rag_documents.status = FAILED`로 반영해야 한다.
- **FR-020**: 시스템은 모든 AI Metrics API에 JWT 기반 인증과 역할 기반 인가를 적용해야 한다.
- **FR-021**: 시스템은 문서상 권한 표기 `MASTER`, `BACKEND`를 Spring Security의 `ROLE_MASTER`, `ROLE_BACKEND`와 일치하도록 해석해야 한다.
- **FR-022**: 시스템은 `ai_usage_logs.feature_type` 값을 `DOCUMENT`, `INTERVIEW` 범위로 해석해야 한다.
- **FR-023**: 시스템은 `ai_ops_settings.alert_channel` 값을 `DISCORD`, `SLACK`, `EMAIL` 범위로 해석해야 한다.
- **FR-024**: 시스템은 관리자 프론트엔드가 FastAPI를 직접 호출하지 않도록 하고, Spring Boot가 내부 연동 진입점 역할을 수행해야 한다.
- **FR-025**: 시스템은 FastAPI가 OpenAI 호출, 토큰 계산, 비용 계산, 문서 파싱, 임베딩 생성, 벡터 인덱싱을 담당하도록 책임을 분리해야 한다.
- **FR-026**: 시스템은 AI 사용량 집계와 AI 사용 로그 검색 계산을 FastAPI가 담당하도록 하고, Spring Boot는 FastAPI 내부 집계 응답을 외부 DTO와 `ApiResponse<T>`로 변환해야 한다.
- **FR-027**: 시스템은 운영 정책 변경과 RAG 문서 삭제 같은 관리자 변경 행위에 대해 Audit Log 기록을 남겨야 한다.
- **FR-028**: 시스템은 `PATCH /api/v1/admin/ai-metrics/alerts/discord` 요청을 Discord 채널 고정 정책으로 처리해야 하며, 본 endpoint에서 다른 알림 채널로 전환하지 않아야 한다.
- **FR-029**: 시스템은 MVP에서 Discord 알림만 지원해야 하며, `SLACK`, `EMAIL`은 ERD 확장 가능성을 위한 값으로만 유지해야 한다.
- **FR-030**: 시스템은 FastAPI 내부 오류를 Spring 도메인 ErrorCode로 변환할 때 `AI_MODEL_EXECUTION_FAILED`, `AI_USAGE_LOG_CREATE_FAILED`를 포함한 연동 오류 코드를 지원해야 한다.
- **FR-031**: 시스템은 `aiMetrics` 도메인을 관리자 패키지 범위에서 유지해야 하며 사용자 기능 요구사항을 포함하지 않아야 한다.

### Key Entities

- **AiModel**: `ai_model_id`, `model_name`, `display_type`, `provider`, `input_token_price`, `output_token_price`, `is_enabled`, `created_at`, `updated_at` 컬럼을 가지는 AI 모델 메타데이터 엔티티
- **AiUsageLog**: `ai_usage_log_id`, `member_id`, `session_id`, `ai_model_id`, `feature_type`, `input_tokens`, `output_tokens`, `cost`, `created_at` 컬럼을 가지는 AI 사용 로그 엔티티
- **AiOpsSetting**: `ai_ops_setting_id`, `selected_model_id`, `monthly_budget`, `alert_enabled`, `alert_channel`, `alert_threshold`, `rate_limit_enabled`, `updated_at` 컬럼을 가지는 AI 운영 설정 엔티티
- **RagDocument**: `rag_document_id`, `uploaded_by`, `file_uuid`, `original_file_name`, `file_path`, `mime_type`, `file_size`, `chunk_count`, `indexing_progress`, `status`, `created_at`, `updated_at` 컬럼을 가지는 RAG 문서 엔티티

## Success Criteria

- **SC-001**: `MASTER` 또는 `BACKEND` 권한 사용자는 AI 메트릭스 조회 API를 100% 정상 호출할 수 있다.
- **SC-002**: `MASTER`만 허용된 운영 정책 수정 및 RAG 문서 삭제 API는 권한이 없는 요청을 100% 차단한다.
- **SC-003**: AI 사용 로그 목록과 RAG 문서 목록 응답은 100% `ApiResponse<T>`와 1-based `page` 기준의 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 만족한다.
- **SC-004**: 운영 정책 변경 요청 중 유효하지 않은 예산/임계치 값은 100% `INVALID_MONTHLY_BUDGET`, `INVALID_ALERT_THRESHOLD`로 처리된다.
- **SC-005**: 존재하지 않는 모델, 운영 설정, RAG 문서 요청은 100% 해당 도메인 ErrorCode로 처리된다.
- **SC-006**: RAG 문서 업로드 요청은 100% 문서 메타데이터 저장 후 인덱싱 시작 상태를 반환한다.
- **SC-007**: 인덱싱 완료 문서는 100% `COMPLETED` 상태와 `indexing_progress = 100`으로 조회된다.
- **SC-008**: FastAPI 연동이 필요한 집계, 인덱싱, 토큰 계산, 비용 계산은 100% Spring Boot가 아닌 FastAPI 책임으로 분리된다.

## Assumptions

- `fastapi-schema.md`가 존재하므로 본 스펙은 Spring Boot 외부 관리자 API와 FastAPI 내부 처리 책임을 함께 전제한다.
- Spring Boot는 관리자 API 계약 유지, JWT 인증/인가, 요청 검증, `ApiResponse<T>` 래핑, ErrorCode 변환, 운영 설정 저장 책임을 가진다.
- FastAPI는 OpenAI 호출, 토큰/비용 계산, 사용량 집계, RAG 문서 인덱싱, 인덱싱 상태 갱신 책임을 가진다.
- 관리자 프론트엔드는 FastAPI를 직접 호출하지 않으며, 모든 외부 진입은 Spring Boot를 통해 이뤄진다.
- 외부 연동 시스템은 OpenAI, 벡터 스토어 또는 인덱싱 엔진, 파일 스토리지, Discord 알림 채널이며 `SLACK`, `EMAIL`은 확장 예정 값으로만 유지한다.
- 실제 관리자 회원/사용자 상세 정보 조회, 결제 도메인 연계 분석, 모델 등록/수정/삭제 기능, 벡터 스토어 제품 선택 세부 설계는 v1 범위 외다.
