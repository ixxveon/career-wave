# FastAPI Implementation Plan: aiMetrics

## Summary

> Spring Boot의 내부 호출을 처리하는 `aiMetrics` FastAPI 서비스에서 AI 사용량 집계, 운영 정책 동기화, AI 사용 로그 적재, RAG 인덱싱 파이프라인을 구현한다.

## Technical Context

- FastAPI + Pydantic 기반 내부 API 계약과 요청/응답 스키마
- PostgreSQL 직접 조회/수정, `ai_models`, `ai_usage_logs`, `ai_ops_settings`, `rag_documents` 테이블 활용
- OpenAI Client를 통한 모델 호출, 토큰 계산, 비용 계산
- 파일 스토리지 기반 원본 문서 로딩, chunking, embedding, 추상 `vector_store_client` 연동
- 비동기 인덱싱 워커 또는 background task 기반 상태 전이 처리
- Spring Boot -> FastAPI 내부 JSON 계약, FastAPI -> Spring Boot 역호출 금지
- 내부 오류 식별자를 Spring Boot 도메인 ErrorCode로 변환 가능한 형태로 유지
- MVP에서는 Discord 알림만 지원하고 vector store 구현체는 교체 가능 adapter 구조로 유지

## Project Structure

```text
fastapi/admin/ai_metrics/
├── config/        settings.py
├── schema/        request.py
├── schema/        response.py
├── repository/    ai_model_repository.py
├── repository/    ai_usage_log_repository.py
├── repository/    ai_ops_setting_repository.py
├── repository/    rag_document_repository.py
├── client/        openai_client.py
├── client/        vector_store_client.py
├── service/       usage_metrics_service.py
├── service/       ops_settings_service.py
├── service/       usage_log_service.py
├── service/       rag_index_service.py
├── parser/        rag_document_parser.py
├── processor/     chunking_service.py
├── processor/     embedding_service.py
├── router/        ai_metrics_router.py
├── task/          rag_indexing_task.py
├── task/          rag_index_delete_task.py
├── integration/   spring_contract_validator.py
└── test/          [unit/integration 테스트]
```

> 위 구조는 스펙 문서 경로가 아니라 실제 FastAPI 구현 소스 기준 예시다.

## Phases

- [ ] Phase 1: Config / Schema — 내부 endpoint, Pydantic 요청/응답 스키마, 설정 로더, 내부 오류 식별자 규칙을 먼저 고정한다.
- [ ] Phase 2: DB Repository — `ai_models`, `ai_usage_logs`, `ai_ops_settings`, `rag_documents` 조회/수정 책임과 컬럼 접근 범위를 Repository 계층으로 분리한다.
- [ ] Phase 3: OpenAI Client — OpenAI 호출 전용 클라이언트와 모델 실행 컨텍스트 구성을 구현한다.
- [ ] Phase 4: Token / Cost Calculation — 입력 토큰, 출력 토큰, 모델 가격 기준 비용 계산 로직을 독립 서비스로 구현한다.
- [ ] Phase 5: AI Usage Log Persistence — AI 사용 로그 적재와 운영 집계용 원천 데이터 저장 책임을 구현한다.
- [ ] Phase 6: Usage Metrics Domain Service — 요약, 도메인별 사용량, 토큰 추이, 고사용 사용자, AI 사용 로그 조회 집계 서비스를 구현한다.
- [ ] Phase 7: Ops Settings Sync Service — 운영 모델, 예산, 알림, rate limit 설정을 동기화하고 내부 실행 기준에 반영하는 서비스를 구현한다.
- [ ] Phase 8: RAG Document Parser — 파일 스토리지의 원본 문서를 읽고 파싱 가능한 텍스트로 변환하는 파서를 구현한다.
- [ ] Phase 9: Chunking — 파싱된 문서를 청크 단위로 분할하고 `chunk_count` 계산 책임을 구현한다.
- [ ] Phase 10: Embedding — 청크별 embedding 생성 로직과 OpenAI embedding 연동을 구현한다.
- [ ] Phase 11: Vector Store Integration — vector store 또는 vector index 생성/삭제 클라이언트와 저장 책임을 구현한다.
- [ ] Phase 12: Domain Router — Spring Boot가 호출하는 내부 endpoint와 요청 검증, 응답 스키마 매핑을 라우터 계층에 구현한다.
- [ ] Phase 13: RAG Indexing Background Task — `UPLOADED -> INDEXING -> COMPLETED/FAILED` 상태 전이를 반영하는 비동기 인덱싱 워커를 구현한다.
- [ ] Phase 14: RAG Index Delete Phase — RAG 문서 삭제 요청에 맞춘 vector index 제거와 후속 정리 흐름을 구현한다.
- [ ] Phase 15: Spring ↔ FastAPI 계약 검증 — Spring Boot가 기대하는 내부 Request/Response 계약과 ErrorCode 변환 가능성을 검증한다.
- [ ] Phase 16: Test — 집계, 설정 동기화, 로그 적재, OpenAI 호출 추상화, RAG 파이프라인, 상태 전이, 외부 연동 오류 처리를 테스트한다.
