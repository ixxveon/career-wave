# FastAPI Checklist: aiMetrics

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들었는지" 검증한다.
> 구현 완료 후 PR 올리기 전에 작성자 본인이 체크한다.

## Phase 1 — Config / Schema

- [x] OpenAI, PostgreSQL, 파일 스토리지, vector store 설정 로더가 환경별로 정상 주입된다.
- [x] Pydantic Request / Response Schema가 Spring Boot 내부 요청/응답 계약과 일치한다.
- [x] FastAPI 내부 ErrorCode 식별자가 정의되어 있고 Spring Boot 변환 대상과 일치한다.

## Phase 2 — 핵심 내부 API (P1)

> fastapi-plan.md의 Phase에 맞춰 항목을 채운다.

- [ ] `POST /internal/admin/ai-metrics/usage/summary`가 요청 계약에 맞게 동작한다.
- [ ] `POST /internal/admin/ai-metrics/usage/domain-usage`가 요청 계약에 맞게 동작한다.
- [ ] `POST /internal/admin/ai-metrics/usage/token-trend`가 요청 계약에 맞게 동작한다.
- [ ] `POST /internal/admin/ai-metrics/usage/heavy-users`가 요청 계약에 맞게 동작한다.
- [ ] `POST /internal/admin/ai-metrics/usage/logs/search`가 요청 계약에 맞게 동작한다.
- [ ] `POST /internal/admin/ai-metrics/ops/sync-settings`가 요청 계약에 맞게 동작한다.
- [ ] 운영 정책 변경 후 FastAPI 설정 동기화 결과가 후속 조회에 반영된다.
- [ ] `POST /internal/admin/ai-metrics/usage/log`가 요청 계약에 맞게 동작한다.
- [ ] FastAPI ↔ Spring Boot 내부 API 계약 검증 테스트가 요청 필드, 응답 필드, 타입까지 확인한다.
- [ ] 내부 ErrorCode가 Spring Boot에서 `AI_MODEL_NOT_FOUND`, `AI_OPS_SETTING_NOT_FOUND`, `INVALID_MONTHLY_BUDGET`, `INVALID_ALERT_THRESHOLD`, `AI_MODEL_EXECUTION_FAILED`, `AI_USAGE_LOG_CREATE_FAILED` 등으로 변환 가능하게 반환된다.
- [ ] FastAPI 내부 오류 응답이 `success`, `errorCode`, `message`, `detail` 스키마를 만족한다.

## Phase 3 — 비동기 / 파이프라인 (P2)

- [ ] `POST /internal/admin/ai-metrics/rag-documents/index`가 인덱싱 수락 시 `rag_documents.status = INDEXING`으로 갱신한다.
- [ ] `POST /internal/admin/ai-metrics/rag-documents/index` 실패 시 Spring Boot가 `RAG_DOCUMENT_INDEXING_FAILED`로 변환 가능한 내부 오류를 반환한다.
- [ ] `DELETE /internal/admin/ai-metrics/rag-documents/{ragDocumentId}/index`가 삭제 성공/실패 계약에 맞게 동작한다.
- [ ] 비동기 인덱싱 워커가 `UPLOADED -> INDEXING -> COMPLETED` 성공 상태 전이를 반영한다.
- [ ] 비동기 인덱싱 워커가 `INDEXING -> FAILED` 실패 상태 전이를 반영한다.
- [ ] `INDEXING` 상태 문서에 대한 중복 인덱싱 실행이 차단된다.
- [ ] `indexing_progress`가 0~100 범위를 벗어나지 않는다.
- [ ] `COMPLETED` 상태 문서가 항상 `indexing_progress = 100`으로 저장된다.

## Phase N — 문서화 & 테스트

- [ ] `fastapi-schema.md`, `fastapi-spec.md`, `fastapi-constitution.md`, `fastapi-plan.md`, `fastapi-tasks.md`가 동일한 상태 규칙과 ErrorCode 기준으로 정합성을 유지한다.
- [ ] 정상 케이스 테스트가 집계, 설정 동기화, AI Usage Log 적재, RAG 인덱싱, 인덱스 삭제 흐름을 검증한다.
- [ ] 예외/경계 케이스 테스트가 잘못된 기간, 잘못된 enum, 잘못된 예산/임계치, 존재하지 않는 모델/문서, 중복 인덱싱 요청을 검증한다.
- [ ] 외부 시스템 연동 실패 테스트가 OpenAI, 파일 스토리지, vector store 실패 처리 로직을 검증한다.

## 코드 품질

- [ ] Router, Schema, Repository, Service, External Client, Background Task 책임이 계층별로 분리되어 있다.
- [ ] OpenAI 호출이 FastAPI 내부 클라이언트를 통해서만 수행된다.
- [ ] Token 계산 로직이 OpenAI 응답 또는 동등한 실행 결과 기준으로 동작한다.
- [ ] Cost 계산 로직이 `ai_models.input_token_price`, `ai_models.output_token_price` 기준으로 동작한다.
- [ ] AI Usage Log 적재 로직이 `member_id`, `session_id`, `ai_model_id`, `feature_type`, `input_tokens`, `output_tokens`, `cost`를 누락 없이 기록한다.
- [ ] RAG 문서 파서가 원본 문서를 텍스트로 변환할 수 있으며 실패 시 내부 오류를 반환한다.
- [ ] Chunking 로직이 청크 분할 기준과 `chunk_count` 계산을 일관되게 적용한다.
- [ ] Embedding 생성 로직이 청크별 결과를 내부 벡터 포맷으로 변환한다.
- [ ] Vector Index 생성 로직이 성공 시 후속 상태 갱신과 연결된다.
- [ ] Vector Index 삭제 로직이 실패 시 성공 응답으로 숨기지 않는다.
- [ ] Vector Store 클라이언트가 추상 adapter 구조로 분리되어 구현체 교체가 가능하다.
- [ ] MVP에서 Discord 알림만 지원하고 `SLACK`, `EMAIL`은 현재 API에서 변경/발송되지 않는다.

## DB 매핑 검증

- [ ] FastAPI ↔ DB 매핑이 `ai_models`, `ai_usage_logs`, `ai_ops_settings`, `rag_documents` 컬럼 정의와 일치한다.
- [ ] FastAPI는 `rag_documents.status`, `rag_documents.indexing_progress`, `rag_documents.chunk_count`, `rag_documents.updated_at`만 상태 갱신 용도로 수정한다.
- [ ] FastAPI는 Spring Boot 소유 컬럼인 `rag_documents.file_path`, `original_file_name`, `uploaded_by` 등을 임의 수정하지 않는다.
- [ ] FastAPI는 `ai_ops_settings`를 읽기 전용으로 사용하고, Spring Boot가 수정하는 설정 컬럼을 직접 갱신하지 않는다.
- [ ] `ai_usage_logs` 저장 데이터가 실제 집계 조회 결과와 일관된다.

## 머지 전 최종 확인

- [ ] 구현 결과가 `fastapi-constitution.md`의 불변 규칙과 상태 전이 규칙을 위반하지 않는다.
- [ ] FastAPI ↔ Spring 계약 검증 테스트가 모두 통과한다.
- [ ] FastAPI ↔ DB 매핑 검증 항목이 모두 충족된다.
- [ ] 내부 ErrorCode 매핑 검증이 모두 통과한다.
- [ ] 비동기 작업 검증, 중복 실행 방지 검증, 외부 시스템 실패 처리 검증이 모두 통과한다.
- [ ] fastapi-tasks.md의 모든 항목이 완료 상태로 점검되었다.
