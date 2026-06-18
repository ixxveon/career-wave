# FastAPI Checklist: aiMetrics

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들었는지" 검증한다.
> 구현 완료 후 PR 올리기 전에 작성자 본인이 체크한다.

## Phase 1 — Config / Schema

- [x] OpenAI, PostgreSQL, 파일 스토리지, vector store 설정 로더가 환경별로 정상 주입된다.
- [x] Pydantic Request / Response Schema가 Spring Boot 내부 요청/응답 계약과 일치한다.
- [x] FastAPI 내부 ErrorCode 식별자가 정의되어 있고 Spring Boot 변환 대상과 일치한다.

## Phase 2 — DB Repository

- [x] `ai_models` 조회 Repository가 모델 실행 컨텍스트와 비용 계산에 필요한 컬럼을 제공한다.
- [x] `ai_ops_settings` Repository가 운영 설정을 읽기 전용으로 조회한다.
- [x] `ai_usage_logs` Repository가 로그 적재와 요약/도메인별/토큰 추이/고사용 사용자/목록 조회 쿼리를 제공한다.
- [x] `ai_usage_logs` 목록 조회가 1-based page를 내부 offset으로 변환한다.
- [x] `rag_documents` Repository가 문서 상태 조회와 `status`, `indexing_progress`, `chunk_count`, `updated_at` 갱신 메서드를 제공한다.
- [x] `rag_documents` Repository가 Spring Boot 소유 컬럼인 `file_path`, `original_file_name`, `uploaded_by` 등을 갱신하지 않는다.

## Phase 3 — OpenAI Client

- [x] OpenAI 호출이 FastAPI 내부 클라이언트를 통해 수행된다.
- [x] 모델명과 provider 기준 실행 컨텍스트가 구성된다.
- [x] chat/completion 계열 호출과 embedding 호출이 클라이언트 래퍼로 분리된다.
- [x] OpenAI 오류가 내부 ErrorCode로 변환된다.

## Phase 4 — Token / Cost Calculation

- [x] 입력/출력 토큰 계산 로직이 OpenAI 응답 또는 동등한 실행 결과 기준으로 동작한다.
- [x] Cost 계산 로직이 `ai_models.input_token_price`, `ai_models.output_token_price` 기준으로 동작한다.
- [x] 토큰/비용 계산 결과가 음수 또는 누락 값으로 저장되지 않도록 검증된다.

## Phase 5 — AI Usage Log Persistence

- [x] AI Usage Log 적재 서비스가 Repository 저장 로직을 호출한다.
- [x] AI Usage Log 적재 로직이 `member_id`, `session_id`, `ai_model_id`, `feature_type`, `input_tokens`, `output_tokens`, `cost`를 누락 없이 기록한다.
- [x] `member_id`, `session_id`, `ai_model_id`, `feature_type` 검증 실패가 내부 ErrorCode로 변환된다.

## Phase 6 — Usage Metrics Domain Service

- [x] 요약/도메인별/토큰 추이/고사용 사용자/로그 목록 조회 서비스가 Repository 집계를 응답 schema로 매핑한다.
- [x] `from`, `to`, `featureType`, `interval`, `limit`, `page`, `size` 검증이 수행된다.

## Phase 7 — Ops Settings Sync Service

- [x] 운영 정책 변경 후 FastAPI 설정 동기화 결과가 후속 조회에 반영된다.
- [x] `selectedModelId` 존재 여부가 검증된다.
- [x] `monthlyBudget`, `alertThreshold` 범위 검증 실패가 내부 ErrorCode로 변환된다.

## Phase 8 — RAG Document Parser

- [x] RAG 문서 파서가 원본 문서를 텍스트로 변환할 수 있으며 실패 시 내부 오류를 반환한다.
- [x] 파일 스토리지에서 원본 문서를 읽는 로더가 분리되어 있다.
- [x] PDF/문서 텍스트 추출 실패가 내부 ErrorCode로 변환된다.

## Phase 9 — Chunking

- [x] Chunking 로직이 청크 분할 기준과 `chunk_count` 계산을 일관되게 적용한다.
- [x] 청크 크기와 분할 기준 설정이 누락되거나 잘못된 경우 내부 오류를 반환한다.

## Phase 10 — Embedding

- [x] Embedding 생성 로직이 청크별 결과를 내부 벡터 포맷으로 변환한다.
- [x] Embedding 생성 실패가 내부 ErrorCode로 변환된다.

## Phase 11 — Vector Store Integration

- [x] Vector Store 클라이언트가 추상 adapter 구조로 분리되어 구현체 교체가 가능하다.
- [x] Vector Index 생성 로직이 성공 시 후속 상태 갱신과 연결된다.
- [x] Vector Index 삭제 로직이 실패 시 성공 응답으로 숨기지 않는다.
- [x] Vector Store 연동 실패가 내부 ErrorCode로 변환된다.

## Phase 12 — Domain Router

- [x] `POST /internal/admin/ai-metrics/usage/summary`가 요청 계약에 맞게 동작한다.
- [x] `POST /internal/admin/ai-metrics/usage/domain-usage`가 요청 계약에 맞게 동작한다.
- [x] `POST /internal/admin/ai-metrics/usage/token-trend`가 요청 계약에 맞게 동작한다.
- [x] `POST /internal/admin/ai-metrics/usage/heavy-users`가 요청 계약에 맞게 동작한다.
- [x] `POST /internal/admin/ai-metrics/usage/logs/search`가 요청 계약에 맞게 동작한다.
- [x] `POST /internal/admin/ai-metrics/ops/sync-settings`가 요청 계약에 맞게 동작한다.
- [x] `POST /internal/admin/ai-metrics/rag-documents/index`가 요청 계약에 맞게 동작한다.
- [x] `DELETE /internal/admin/ai-metrics/rag-documents/{ragDocumentId}/index`가 요청 계약에 맞게 동작한다.
- [x] `POST /internal/admin/ai-metrics/usage/log`가 요청 계약에 맞게 동작한다.

## Phase 13 — RAG Indexing Background Task

- [ ] Router, Schema, Repository, Service, External Client, Background Task 책임이 계층별로 분리되어 있다.
- [ ] `POST /internal/admin/ai-metrics/rag-documents/index`가 인덱싱 수락 시 `rag_documents.status = INDEXING`으로 갱신한다.
- [ ] 비동기 인덱싱 워커가 `UPLOADED -> INDEXING -> COMPLETED` 성공 상태 전이를 반영한다.
- [ ] 비동기 인덱싱 워커가 `INDEXING -> FAILED` 실패 상태 전이를 반영한다.
- [ ] `INDEXING` 상태 문서에 대한 중복 인덱싱 실행이 차단된다.
- [ ] `indexing_progress`가 0~100 범위를 벗어나지 않는다.
- [ ] `COMPLETED` 상태 문서가 항상 `indexing_progress = 100`으로 저장된다.
- [ ] `POST /internal/admin/ai-metrics/rag-documents/index` 실패 시 Spring Boot가 `RAG_DOCUMENT_INDEXING_FAILED`로 변환 가능한 내부 오류를 반환한다.

## Phase 14 — RAG Index Delete Phase

- [ ] RAG 문서 기준 vector index 조회와 삭제 흐름이 분리되어 있다.
- [ ] `DELETE /internal/admin/ai-metrics/rag-documents/{ragDocumentId}/index`가 삭제 성공/실패 계약에 맞게 동작한다.
- [ ] 삭제 실패 시 `RAG_DOCUMENT_DELETE_FAILED` 내부 오류를 반환한다.
- [ ] 후속 리소스 정리 훅이 삭제 흐름과 연결되어 있다.

## Phase 15 — Spring ↔ FastAPI 계약 검증

- [ ] FastAPI ↔ Spring Boot 내부 API 계약 검증 테스트가 요청 필드, 응답 필드, 타입까지 확인한다.
- [ ] 내부 ErrorCode가 Spring Boot에서 `AI_MODEL_NOT_FOUND`, `AI_OPS_SETTING_NOT_FOUND`, `INVALID_MONTHLY_BUDGET`, `INVALID_ALERT_THRESHOLD`, `AI_MODEL_EXECUTION_FAILED`, `AI_USAGE_LOG_CREATE_FAILED` 등으로 변환 가능하게 반환된다.
- [ ] FastAPI 내부 오류 응답이 `success`, `errorCode`, `message`, `detail` 스키마를 만족한다.

## Phase 16 — Test

- [ ] 정상 케이스 테스트가 집계, 설정 동기화, AI Usage Log 적재, RAG 인덱싱, 인덱스 삭제 흐름을 검증한다.
- [ ] 예외/경계 케이스 테스트가 잘못된 기간, 잘못된 enum, 잘못된 예산/임계치, 존재하지 않는 모델/문서, 중복 인덱싱 요청을 검증한다.
- [ ] 외부 시스템 연동 실패 테스트가 OpenAI, 파일 스토리지, vector store 실패 처리 로직을 검증한다.
- [ ] FastAPI ↔ Spring 계약 검증 테스트가 모두 통과한다.
- [ ] 내부 ErrorCode 매핑 검증이 모두 통과한다.
- [ ] 사용량 집계 결과가 `ai_usage_logs` 저장 데이터와 일관되는지 테스트로 검증한다.

## DB 매핑 검증

- [x] FastAPI ↔ DB 매핑이 `ai_models`, `ai_usage_logs`, `ai_ops_settings`, `rag_documents` 컬럼 정의와 일치한다.
- [x] FastAPI는 `rag_documents.status`, `rag_documents.indexing_progress`, `rag_documents.chunk_count`, `rag_documents.updated_at`만 상태 갱신 용도로 수정한다.
- [x] FastAPI는 Spring Boot 소유 컬럼인 `rag_documents.file_path`, `original_file_name`, `uploaded_by` 등을 임의 수정하지 않는다.
- [x] FastAPI는 `ai_ops_settings`를 읽기 전용으로 사용하고, Spring Boot가 수정하는 설정 컬럼을 직접 갱신하지 않는다.
- [ ] `ai_usage_logs` 저장 데이터가 실제 집계 조회 결과와 일관된다.

## 머지 전 최종 확인

- [ ] 구현 결과가 `fastapi-constitution.md`의 불변 규칙과 상태 전이 규칙을 위반하지 않는다.
- [ ] FastAPI ↔ DB 매핑 검증 항목이 모두 충족된다.
- [ ] 비동기 작업 검증, 중복 실행 방지 검증, 외부 시스템 실패 처리 검증이 모두 통과한다.
- [ ] fastapi-tasks.md의 모든 항목이 완료 상태로 점검되었다.
