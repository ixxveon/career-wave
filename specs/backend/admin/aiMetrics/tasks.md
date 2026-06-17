# Tasks: aiMetrics

> `plan.md`의 Phase와 1:1 대응한다.
> 각 항목은 1~3시간 내 완료 가능한 단일 책임 작업으로 분해한다.

## Phase 1 - Entity

- [x] `AiFeatureType.java` Enum을 ERD CHECK 제약조건 기준으로 작성한다.
- [x] `AlertChannelType.java` Enum을 ERD CHECK 제약조건 기준으로 작성한다.
- [x] `RagDocumentStatusType.java` Enum을 ERD CHECK 제약조건 기준으로 작성한다.
- [x] `AiModel.java` 엔티티를 `ai_models` ERD 컬럼 기준으로 작성한다.
- [x] `AiOpsSetting.java` 엔티티를 `ai_ops_settings` ERD 컬럼 기준으로 작성한다.
- [x] `RagDocument.java` 엔티티를 `rag_documents` ERD 컬럼 기준으로 작성한다.

## Phase 2 - Repository

- [x] `AiModelRepository.java` 기본 조회 인터페이스를 작성한다.
- [x] 활성 운영 모델 조회 메서드를 추가한다.
- [x] `AiOpsSettingRepository.java` singleton 운영 설정 조회 인터페이스를 작성한다.
- [x] `RagDocumentRepository.java` 기본 조회 인터페이스를 작성한다.
- [x] RAG 문서 목록 페이지네이션 조회 조건을 정리한다.
- [x] RAG 문서 상태별 조회 메서드를 추가한다.
- [x] Audit Log 기록 연동에 필요한 저장 인터페이스를 정리한다.

## Phase 3 - Service

- [x] `AiMetricsService.java` 인터페이스를 작성한다.
- [x] AI 사용량 요약 조회 서비스에서 FastAPI 응답을 Spring DTO로 변환하는 로직을 구현한다.
- [x] 도메인별 사용량 조회 서비스에서 FastAPI 응답을 Spring DTO로 변환하는 로직을 구현한다.
- [x] 토큰 추이 조회 서비스에서 FastAPI 응답을 Spring DTO로 변환하는 로직을 구현한다.
- [x] 고사용 사용자 조회 서비스에서 FastAPI 응답을 Spring DTO로 변환하는 로직을 구현한다.
- [x] AI 사용 로그 목록 조회 서비스에서 FastAPI 응답을 Spring DTO로 변환하는 로직을 구현한다.
- [x] AI 운영 설정 조회 서비스 로직을 구현한다.
- [x] 예산 및 임계치 수정 서비스 로직을 구현한다.
- [x] Discord 알림 설정 변경 서비스 로직을 구현한다.
- [x] rate limit 설정 변경 서비스 로직을 구현한다.
- [x] RAG 문서 목록 조회 서비스 로직을 구현한다.
- [x] RAG 문서 업로드 서비스 로직을 구현한다.
- [x] RAG 문서 다운로드 정보 조회 서비스 로직을 구현한다.
- [x] RAG 문서 삭제 서비스 로직을 구현한다.
- [x] 운영 정책 변경 시 Audit Log 기록 서비스 로직을 구현한다.
- [x] RAG 문서 삭제 시 Audit Log 기록 서비스 로직을 구현한다.
- [x] `from`, `to`, `interval`, `limit`, `page`, `size` 공통 요청 검증 로직을 구현한다.
- [x] `monthlyBudget`, `alertThreshold` 값 검증과 ErrorCode 매핑을 구현한다.
- [x] `AI_MODEL_NOT_FOUND`, `AI_OPS_SETTING_NOT_FOUND`, `RAG_DOCUMENT_NOT_FOUND` 예외 처리를 구현한다.
- [x] `RAG_DOCUMENT_ALREADY_INDEXING`, `RAG_DOCUMENT_INDEXING_FAILED`, `RAG_DOCUMENT_DELETE_FAILED`, `AI_MODEL_EXECUTION_FAILED`, `AI_USAGE_LOG_CREATE_FAILED` 예외 처리를 구현한다.
- [x] `AiMetricsErrorCode.java` 도메인 오류 코드를 작성한다.

## Phase 4 - FastAPI Integration

- [x] `AiMetricsFastApiClient.java` 내부 호출 클라이언트를 작성한다.
- [x] FastAPI summary 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI domain-usage 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI token-trend 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI heavy-users 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI usage-logs/search 요청/응답 매핑 DTO를 작성한다.
- [x] 운영 정책 동기화 FastAPI 요청/응답 매핑 DTO를 작성한다.
- [x] RAG 인덱싱 시작 FastAPI 요청/응답 매핑 DTO를 작성한다.
- [x] RAG 인덱스 삭제 FastAPI 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI 내부 오류를 Spring 도메인 ErrorCode로 변환하는 매퍼를 구현한다.
- [x] 운영 정책 변경 후 FastAPI 설정 동기화 호출을 연동한다.
- [x] RAG 문서 업로드 후 인덱싱 시작 호출을 연동한다.
- [x] RAG 문서 삭제 시 인덱스 제거 호출을 연동한다.

## Phase 5 - API

- [x] `AiMetricsDTO.java`를 작성한다.
- [x] `AiUsageLogDTO.java`를 작성한다.
- [x] `AiOpsSettingDTO.java`를 작성한다.
- [x] `RagDocumentDTO.java`를 작성한다.
- [x] `GET /api/v1/admin/ai-metrics/summary` Controller endpoint를 작성한다.
- [x] `GET /api/v1/admin/ai-metrics/domain-usage` Controller endpoint를 작성한다.
- [x] `GET /api/v1/admin/ai-metrics/token-trend` Controller endpoint를 작성한다.
- [x] `GET /api/v1/admin/ai-metrics/heavy-users` Controller endpoint를 작성한다.
- [x] `GET /api/v1/admin/ai-metrics/logs` Controller endpoint를 작성한다.
- [x] `GET /api/v1/admin/ai-metrics/budget` Controller endpoint를 작성한다.
- [x] `PATCH /api/v1/admin/ai-metrics/budget` Controller endpoint를 작성한다.
- [x] `PATCH /api/v1/admin/ai-metrics/alerts/discord` Controller endpoint를 작성한다.
- [x] `PATCH /api/v1/admin/ai-metrics/controls/rate-limit` Controller endpoint를 작성한다.
- [x] `GET /api/v1/admin/ai-metrics/rag-documents` Controller endpoint를 작성한다.
- [x] `POST /api/v1/admin/ai-metrics/rag-documents` Controller endpoint를 작성한다.
- [x] `GET /api/v1/admin/ai-metrics/rag-documents/{documentId}/download` Controller endpoint를 작성한다.
- [x] `DELETE /api/v1/admin/ai-metrics/rag-documents/{documentId}` Controller endpoint를 작성한다.
- [x] `MASTER`, `BACKEND` 역할 정책과 JWT 인증 진입 조건을 API 계층에 반영한다.

## Phase 6 - Documentation

- [x] `AiMetricsDocs.java` Swagger 인터페이스를 작성한다.
- [x] AI 사용량 조회 API의 요청/응답 문서를 정리한다.
- [x] AI 운영 정책 API의 요청/응답 문서를 정리한다.
- [x] RAG 문서 운영 API의 요청/응답 문서를 정리한다.
- [x] MVP에서는 Discord 알림만 지원하고 `PATCH /alerts/discord`는 `alert_enabled`만 변경한다는 정책을 문서화한다.
- [x] FastAPI 내부 연동 계약과 backend API 계약의 대응 관계를 문서화한다.
- [x] RAG 문서 업로드의 `multipart/form-data` 계약과 내부 파일 전달 흐름을 문서화한다.
- [x] AI 사용량 집계는 FastAPI가 담당하고 Spring은 집계 결과를 DTO로 변환한다는 책임 분리를 문서화한다.
- [x] `api-schema.md`와 구현 대상 API 계약의 정합성을 점검한다.
- [x] `fastapi-schema.md`와 FastAPI 연동 범위 정합성을 점검한다.
- [x] `spec.md`, `constitution.md`, `plan.md`와 구현 범위 정합성을 점검한다.

## Phase 7 - Test

- [x] AI 사용량 요약 조회 테스트를 작성한다.
- [x] 도메인별 사용량 조회 테스트를 작성한다.
- [x] 토큰 추이 조회 테스트를 작성한다.
- [x] 고사용 사용자 조회 테스트를 작성한다.
- [x] AI 사용 로그 목록 조회 테스트를 작성한다.
- [x] AI 운영 설정 조회 테스트를 작성한다.
- [x] 예산 및 임계치 수정 테스트를 작성한다.
- [x] Discord 알림 설정 변경 테스트를 작성한다.
- [x] rate limit 설정 변경 테스트를 작성한다.
- [x] RAG 문서 목록 조회 테스트를 작성한다.
- [x] RAG 문서 업로드 테스트를 작성한다.
- [x] RAG 문서 다운로드 정보 조회 테스트를 작성한다.
- [x] RAG 문서 삭제 테스트를 작성한다.
- [x] `from`, `to`, `interval`, `limit`, `page`, `size` 검증 테스트를 작성한다.
- [x] `INVALID_MONTHLY_BUDGET`, `INVALID_ALERT_THRESHOLD` 예외 테스트를 작성한다.
- [x] `AI_MODEL_NOT_FOUND`, `AI_OPS_SETTING_NOT_FOUND`, `RAG_DOCUMENT_NOT_FOUND` 예외 테스트를 작성한다.
- [x] `RAG_DOCUMENT_ALREADY_INDEXING`, `RAG_DOCUMENT_INDEXING_FAILED`, `RAG_DOCUMENT_DELETE_FAILED`, `AI_MODEL_EXECUTION_FAILED`, `AI_USAGE_LOG_CREATE_FAILED` 예외 테스트를 작성한다.
- [x] FastAPI 집계 연동 매핑 테스트를 작성한다.
- [x] Spring이 AI 사용량 집계를 직접 수행하지 않고 FastAPI 내부 집계 API를 호출하는지 검증하는 테스트를 작성한다.
- [x] 운영 정책 변경 후 FastAPI 설정 동기화 테스트를 작성한다.
- [x] RAG 업로드 후 비동기 인덱싱 시작 호출 테스트를 작성한다.
- [x] RAG 상태 전이(`UPLOADED -> INDEXING -> COMPLETED/FAILED`) 검증 테스트를 작성한다.
- [x] 운영 정책 변경 Audit Log 기록 테스트를 작성한다.
- [x] RAG 문서 삭제 Audit Log 기록 테스트를 작성한다.
- [x] 역할별 접근 제어 테스트를 작성한다.
- [x] `ApiResponse<T>`와 1-based 페이지네이션 응답 형식 테스트를 작성한다.
