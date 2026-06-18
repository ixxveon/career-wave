# FastAPI Tasks: aiMetrics

> plan.md의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

## Phase 1 - Config / Schema

- [x] `settings.py`에 OpenAI, PostgreSQL, 파일 스토리지, vector store 연동 설정 로더를 정의한다.
- [x] FastAPI 내부 ErrorCode와 예외 식별자 규칙을 정의한다.
- [x] 집계 조회용 Pydantic Request Schema를 작성한다.
- [x] 집계 조회용 Pydantic Response Schema를 작성한다.
- [x] 운영 정책 동기화용 Pydantic Request / Response Schema를 작성한다.
- [x] RAG 인덱싱 시작용 Pydantic Request / Response Schema를 작성한다.
- [x] RAG 인덱스 삭제용 Pydantic Response Schema를 작성한다.
- [x] AI Usage Log 적재용 Pydantic Request / Response Schema를 작성한다.

## Phase 2 - DB Repository

- [x] `ai_model_repository.py` 조회 Repository를 작성한다.
- [x] `ai_ops_setting_repository.py` 조회 Repository를 작성한다.
- [x] `ai_usage_log_repository.py` 로그 적재 Repository를 작성한다.
- [x] `ai_usage_log_repository.py` 사용량 요약 집계 쿼리를 작성한다.
- [x] `ai_usage_log_repository.py` 도메인별 사용량 집계 쿼리를 작성한다.
- [x] `ai_usage_log_repository.py` 토큰 추이 집계 쿼리를 작성한다.
- [x] `ai_usage_log_repository.py` 고사용 사용자 집계 쿼리를 작성한다.
- [x] `ai_usage_log_repository.py` AI 사용 로그 목록 조회 쿼리를 작성한다.
- [x] `rag_document_repository.py` RAG 문서 상태 조회 Repository를 작성한다.
- [x] `rag_document_repository.py` `status`, `indexing_progress`, `chunk_count`, `updated_at` 갱신 메서드를 작성한다.

## Phase 3 - OpenAI Client

- [x] `openai_client.py` 기본 클라이언트 래퍼를 작성한다.
- [x] 모델명과 provider 기준 실행 컨텍스트 구성 로직을 작성한다.
- [x] chat/completion 계열 호출 메서드를 작성한다.
- [x] embedding 생성 호출 메서드를 작성한다.
- [x] OpenAI 오류를 내부 ErrorCode로 변환하는 처리 로직을 작성한다.

## Phase 4 - Token / Cost Calculation

- [x] 입력 토큰 계산 로직을 작성한다.
- [x] 출력 토큰 계산 로직을 작성한다.
- [x] `ai_models.input_token_price`, `output_token_price` 기준 비용 계산 로직을 작성한다.
- [x] 토큰/비용 계산 결과 검증 유틸을 작성한다.

## Phase 5 - AI Usage Log Persistence

- [x] `usage_log_service.py`를 작성한다.
- [x] AI Usage Log 적재 서비스 로직을 작성한다.
- [x] `member_id`, `session_id`, `ai_model_id`, `feature_type` 검증 로직을 작성한다.
- [x] 토큰/비용 계산 결과를 로그 저장 데이터로 매핑하는 로직을 작성한다.
- [x] 로그 적재 후 후속 운영 판단용 메타 처리 포인트를 정리한다.

## Phase 6 - Usage Metrics Domain Service

- [x] `usage_metrics_service.py`를 작성한다.
- [x] AI 사용량 요약 집계 서비스 로직을 작성한다.
- [x] 도메인별 사용량 집계 서비스 로직을 작성한다.
- [x] 토큰 추이 집계 서비스 로직을 작성한다.
- [x] 고사용 사용자 집계 서비스 로직을 작성한다.
- [x] AI 사용 로그 목록 조회 서비스 로직을 작성한다.
- [x] `from`, `to`, `featureType`, `interval`, `limit`, `page`, `size` 검증 로직을 작성한다.

## Phase 7 - Ops Settings Sync Service

- [x] `ops_settings_service.py`를 작성한다.
- [x] 운영 정책 동기화 서비스 로직을 작성한다.
- [x] `selectedModelId` 존재 여부 검증 로직을 작성한다.
- [x] `monthlyBudget`, `alertThreshold` 범위 검증 로직을 작성한다.
- [x] 동기화된 설정을 내부 런타임 캐시 또는 실행 컨텍스트에 반영하는 로직을 작성한다.

## Phase 8 - RAG Document Parser

- [x] `rag_document_parser.py`를 작성한다.
- [x] 파일 스토리지에서 원본 문서를 읽는 로더를 작성한다.
- [x] PDF/문서 텍스트 추출 파싱 로직을 작성한다.
- [x] 파싱 실패를 내부 오류로 변환하는 처리 로직을 작성한다.

## Phase 9 - Chunking

- [x] `chunking_service.py`를 작성한다.
- [x] 파싱된 텍스트를 청크 단위로 분할하는 로직을 작성한다.
- [x] 청크 크기와 분할 기준 설정 로직을 작성한다.
- [x] `chunk_count` 계산 및 검증 로직을 작성한다.

## Phase 10 - Embedding

- [x] `embedding_service.py`를 작성한다.
- [x] 청크별 embedding 생성 로직을 작성한다.
- [x] OpenAI embedding 호출 결과를 내부 벡터 포맷으로 매핑하는 로직을 작성한다.
- [x] embedding 생성 실패를 내부 오류로 변환하는 처리 로직을 작성한다.

## Phase 11 - Vector Store Integration

- [x] `vector_store_client.py` 생성/저장 클라이언트를 작성한다.
- [x] `vector_store_client.py`를 추상 adapter 구조로 작성한다.
- [x] vector index 저장 로직을 작성한다.
- [x] vector index 삭제 로직을 작성한다.
- [x] vector store 연동 실패를 내부 오류로 변환하는 처리 로직을 작성한다.
  
## Phase 12 - Domain Router

- [x] `ai_metrics_router.py`를 작성한다.
- [x] `POST /internal/admin/ai-metrics/usage/summary` Router를 작성한다.
- [x] `POST /internal/admin/ai-metrics/usage/domain-usage` Router를 작성한다.
- [x] `POST /internal/admin/ai-metrics/usage/token-trend` Router를 작성한다.
- [x] `POST /internal/admin/ai-metrics/usage/heavy-users` Router를 작성한다.
- [x] `POST /internal/admin/ai-metrics/usage/logs/search` Router를 작성한다.
- [x] `POST /internal/admin/ai-metrics/ops/sync-settings` Router를 작성한다.
- [x] `POST /internal/admin/ai-metrics/rag-documents/index` Router를 작성한다.
- [x] `DELETE /internal/admin/ai-metrics/rag-documents/{ragDocumentId}/index` Router를 작성한다.  
- [x] `POST /internal/admin/ai-metrics/usage/log` Router를 작성한다.

## Phase 13 - RAG Indexing Background Task

- [x] `rag_indexing_task.py` background task 또는 워커 엔트리포인트를 작성한다.
- [x] 인덱싱 수락 시 `rag_documents.status = INDEXING` 갱신 로직을 작성한다.
- [x] 인덱싱 시작 시 `indexing_progress = 0` 초기화 로직을 작성한다.
- [x] 문서 파싱 -> chunking -> embedding -> vector index 생성 파이프라인을 연결한다.
- [x] 진행 단계별 `indexing_progress` 갱신 로직을 작성한다.
- [x] 인덱싱 완료 시 `status = COMPLETED`, `indexing_progress = 100`, `chunk_count` 반영 로직을 작성한다.
- [x] 인덱싱 실패 시 `status = FAILED` 반영 로직을 작성한다.
- [x] `INDEXING` 상태 문서 중복 실행 방지 로직을 작성한다.

## Phase 14 - RAG Index Delete Phase

- [ ] `rag_index_delete_task.py` 삭제 처리 흐름을 작성한다.
- [ ] RAG 문서 기준 vector index 조회 로직을 작성한다.
- [ ] vector index 삭제 후 결과 반환 로직을 작성한다.
- [ ] 삭제 실패 시 `RAG_DOCUMENT_DELETE_FAILED` 내부 오류 처리 로직을 작성한다.
- [ ] 후속 리소스 정리 훅을 작성한다.

## Phase 15 - Spring ↔ FastAPI 계약 검증

- [ ] Spring Boot가 기대하는 집계 요청 JSON 필드 계약 검증 테스트를 작성한다.
- [ ] Spring Boot가 기대하는 집계 응답 JSON 필드 계약 검증 테스트를 작성한다.
- [ ] 운영 정책 동기화 Request / Response 계약 검증 테스트를 작성한다.
- [ ] RAG 인덱싱 시작 Request / Response 계약 검증 테스트를 작성한다.
- [ ] RAG 인덱스 삭제 Response 계약 검증 테스트를 작성한다.
- [ ] AI Usage Log 적재 Request / Response 계약 검증 테스트를 작성한다.
- [ ] 내부 ErrorCode가 Spring Boot 도메인 ErrorCode로 변환 가능한지 검증하는 테스트를 작성한다.
- [ ] 내부 오류 응답 스키마가 `success`, `errorCode`, `message`, `detail` 구조를 만족하는지 검증하는 테스트를 작성한다.

## Phase 16 - Test

- [ ] 사용량 요약 집계 서비스 테스트를 작성한다.
- [ ] 도메인별 사용량 집계 서비스 테스트를 작성한다.
- [ ] 토큰 추이 집계 서비스 테스트를 작성한다.
- [ ] 고사용 사용자 집계 서비스 테스트를 작성한다.
- [ ] AI 사용 로그 목록 조회 테스트를 작성한다.
- [ ] 운영 정책 동기화 테스트를 작성한다.
- [ ] OpenAI Client 추상화 테스트를 작성한다.
- [ ] Token 계산 로직 테스트를 작성한다.
- [ ] Cost 계산 로직 테스트를 작성한다.
- [ ] AI Usage Log 적재 테스트를 작성한다.
- [ ] RAG 문서 파서 테스트를 작성한다.
- [ ] Chunking 로직 테스트를 작성한다.
- [ ] Embedding 생성 로직 테스트를 작성한다.
- [ ] Vector Store 저장/삭제 테스트를 작성한다.
- [ ] mock adapter 기반 Vector Store 교체 가능성 테스트를 작성한다.
- [ ] RAG 인덱싱 background task 상태 전이 테스트를 작성한다.
- [ ] `UPLOADED -> INDEXING -> COMPLETED` 성공 플로우 테스트를 작성한다.
- [ ] `INDEXING -> FAILED` 실패 플로우 테스트를 작성한다.
- [ ] `COMPLETED` 상태에서 `indexing_progress = 100` 검증 테스트를 작성한다.
- [ ] `INDEXING` 상태 문서 중복 실행 방지 테스트를 작성한다.
- [ ] 외부 시스템 오류 처리 테스트를 작성한다.
