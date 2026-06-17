# Checklist: aiMetrics

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들었는지" 검증한다.
> 구현 완료 후 PR 올리기 전에 작성자 본인이 체크한다.

## Phase 1 — 엔티티 & Enum

- [x] `ai_models`, `ai_ops_settings`, `rag_documents` 엔티티 필드와 제약조건이 ERD와 일치하고, `ai_usage_logs`는 FastAPI 응답 DTO 계약과 일치한다.
- [x] `AiFeatureType`, `AlertChannelType`, `RagDocumentStatusType` enum 값이 DB CHECK 제약조건과 일치한다.

## Phase 2 — 핵심 API (P1)

> tasks.md의 Phase에 맞춰 항목을 채운다.

- [ ] `ai_ops_settings` singleton 구조(`ai_ops_setting_id = 1`)를 전제로 한 조회 방식이 반영되어 있다.
- [ ] `ai_models` 조회, `ai_ops_settings` 조회/수정, `rag_documents` 메타데이터 조회/생성/삭제, Audit Log 기록 연동에 필요한 Repository가 구현되어 있다.
- [ ] Query Parameter와 ERD 컬럼 매핑이 구현과 일치한다.
- [ ] `GET /api/v1/admin/ai-metrics/summary`가 권한 정책(`MASTER`, `BACKEND`)에 맞게 동작한다.
- [ ] `GET /api/v1/admin/ai-metrics/domain-usage`가 권한 정책(`MASTER`, `BACKEND`)에 맞게 동작한다.
- [ ] `GET /api/v1/admin/ai-metrics/token-trend`가 권한 정책(`MASTER`, `BACKEND`)에 맞게 동작한다.
- [ ] `GET /api/v1/admin/ai-metrics/heavy-users`가 권한 정책(`MASTER`, `BACKEND`)에 맞게 동작한다.
- [ ] `GET /api/v1/admin/ai-metrics/logs`가 권한 정책(`MASTER`, `BACKEND`)에 맞게 동작한다.
- [ ] `GET /api/v1/admin/ai-metrics/budget`가 권한 정책(`MASTER`, `BACKEND`)에 맞게 동작한다.
- [ ] `PATCH /api/v1/admin/ai-metrics/budget`가 권한 정책(`MASTER`)에 맞게 동작한다.
- [ ] `PATCH /api/v1/admin/ai-metrics/alerts/discord`가 권한 정책(`MASTER`, `BACKEND`)에 맞게 동작한다.
- [ ] `PATCH /api/v1/admin/ai-metrics/controls/rate-limit`가 권한 정책(`MASTER`)에 맞게 동작한다.
- [ ] `GET /api/v1/admin/ai-metrics/rag-documents`가 권한 정책(`MASTER`, `BACKEND`)에 맞게 동작한다.
- [ ] `POST /api/v1/admin/ai-metrics/rag-documents`가 권한 정책(`MASTER`, `BACKEND`)에 맞게 동작한다.
- [ ] `GET /api/v1/admin/ai-metrics/rag-documents/{documentId}/download`가 권한 정책(`MASTER`, `BACKEND`)에 맞게 동작한다.
- [ ] `DELETE /api/v1/admin/ai-metrics/rag-documents/{documentId}`가 권한 정책(`MASTER`)에 맞게 동작한다.
- [ ] 정상 응답이 모두 `ApiResponse<T>` 규격을 사용하며 성공 응답에 불필요한 `statusCode` 필드가 없다.
- [ ] Spring Boot는 AI 사용량 집계를 직접 수행하지 않고 FastAPI 내부 집계 API를 호출한다.
- [ ] FastAPI 집계 응답이 `AiMetricsDTO`, `AiUsageLogDTO`로 정확히 매핑된다.
- [ ] 페이지네이션 응답이 `content`, `page`, `size`, `totalElements`, `totalPages` 구조를 따르고 `page`는 1-based로 노출된다.
- [ ] `from`, `to`가 ISO 8601 UTC 문자열 기준으로 검증된다.
- [ ] `page`, `size`가 목록 조회 API에만 적용되고 내부 Pageable 변환 시 `page - 1`이 적용된다.
- [ ] `POST /api/v1/admin/ai-metrics/rag-documents`가 `multipart/form-data` 기반 파일 업로드 계약으로 구현되어 있다.
- [ ] `PATCH /api/v1/admin/ai-metrics/alerts/discord`가 Discord 채널 고정 정책으로 동작하며 다른 알림 채널 값을 받지 않는다.
- [ ] 예외 응답이 `AI_MODEL_NOT_FOUND`, `AI_OPS_SETTING_NOT_FOUND`, `INVALID_ALERT_THRESHOLD`, `INVALID_MONTHLY_BUDGET`, `RAG_DOCUMENT_NOT_FOUND`, `RAG_DOCUMENT_ALREADY_INDEXING`, `RAG_DOCUMENT_INDEXING_FAILED`, `RAG_DOCUMENT_DELETE_FAILED`, `AI_MODEL_EXECUTION_FAILED`, `AI_USAGE_LOG_CREATE_FAILED` 등 도메인 ErrorCode와 정확히 매핑된다.

## Phase 3 — 부가 API (P2)

- [ ] RAG 문서 업로드 이후 비동기 인덱싱 상태가 `UPLOADED -> INDEXING -> COMPLETED/FAILED` 규칙으로 반영된다.
- [ ] `rag_documents.indexing_progress`가 0~100 범위를 유지하고 `COMPLETED` 상태에서 100으로 조회된다.
- [ ] 인덱싱 시작 요청 실패는 `RAG_DOCUMENT_INDEXING_FAILED`로 반환되고, 비동기 실행 중 실패는 `rag_documents.status = FAILED`로 반영된다.
- [ ] FastAPI 연동 실패 시 Spring Boot에서 도메인 ErrorCode로 변환해 일관된 오류 응답을 반환한다.
- [ ] 운영 정책 변경 후 FastAPI 설정 동기화 결과가 후속 조회에 반영된다.

## Phase N — 문서화 & 테스트

- [ ] `AiMetricsDocs` 인터페이스가 작성되어 있고 Swagger 어노테이션이 Controller가 아니라 Docs 인터페이스에 분리되어 있다.
- [ ] Controller에 Swagger 어노테이션이 직접 선언되어 있지 않다.
- [ ] `api-schema.md`, `fastapi-schema.md`, `spec.md`, `constitution.md`, `plan.md`, `tasks.md`가 동일한 권한 정책, ErrorCode, 상태 규칙을 기준으로 정합성을 유지한다.
- [ ] 정상 케이스 통합 테스트가 AI 사용량 조회, AI 사용 로그 조회, 운영 정책 조회/수정, RAG 문서 조회/업로드/다운로드/삭제를 검증한다.
- [ ] 예외/경계 케이스 단위 테스트가 잘못된 기간, 잘못된 enum, 예산/임계치 검증, 미존재 리소스, 중복 인덱싱 요청을 검증한다.
- [ ] FastAPI 연동 테스트가 집계 조회 매핑, 설정 동기화, RAG 인덱싱 시작/삭제 호출을 검증한다.
- [ ] Audit Log 기록 테스트가 운영 정책 변경과 RAG 문서 삭제 같은 관리자 변경 행위에 대해 남는지 검증한다.

## 코드 품질

- [ ] `ApiResponse<T>` 래퍼 누락 엔드포인트가 없다.
- [ ] 예외 처리가 `BusinessException(ErrorCode.XXX)` 패턴을 따르며 컨트롤러에서 직접 예외 응답을 조립하지 않는다.
- [ ] 비즈니스 로직과 권한 분기, 검증 로직이 서비스 레이어에만 존재한다.
- [ ] Service 인터페이스와 `impl` 구현체가 분리되어 있다.
- [ ] Spring Boot가 OpenAI 호출, 토큰 계산, RAG 인덱싱 로직을 직접 수행하지 않고 FastAPI 연동 책임만 가진다.
- [ ] `global/`이 도메인 구현 세부사항에 역참조되지 않는다.

## 머지 전 최종 확인

- [ ] 구현 결과가 `constitution.md`의 불변 규칙과 상태 전이 규칙을 위반하지 않는다.
- [ ] Query Parameter와 ERD 컬럼 매핑이 실제 쿼리 구현과 일치한다.
- [ ] Enum 값과 DB CHECK 제약조건이 실제 코드와 문서 모두에서 일치한다.
- [ ] 권한(Role) 정책이 문서 명칭(`MASTER`, `BACKEND`)과 Spring Security 매핑(`ROLE_MASTER`, `ROLE_BACKEND`) 모두에서 일치한다.
- [ ] Audit Log 대상 변경 작업이 누락 없이 기록된다.
- [ ] tasks.md의 모든 항목이 완료 상태로 점검되었다.
