# Implementation Plan: aiMetrics

## Summary

> AI 사용량 조회, 운영 정책 관리, RAG 문서 운영 API를 Spring Boot 관리자 백엔드에 구현하고, 집계·토큰 계산·인덱싱은 FastAPI 내부 연동으로 분리한다.

## Technical Context

- Spring Boot + Spring Data JPA + PostgreSQL
- Spring Security + JWT 기반 관리자 인증/인가
- `ApiResponse` 공통 응답 래퍼와 `GlobalExceptionHandler` 기반 예외 처리
- Service 인터페이스 분리 및 `impl` 구현체에서 운영 정책 검증과 ErrorCode 매핑 수행
- 외부 API는 1-based 페이지 계약을 사용하고 내부 Pageable 변환 시 `page - 1` 적용
- FastAPI는 OpenAI 호출, 토큰/비용 계산, 통계 집계, RAG 문서 인덱싱을 담당
- RAG 문서 인덱싱은 비동기 상태 전이(`UPLOADED -> INDEXING -> COMPLETED/FAILED`)를 따른다.

## Project Structure

```text
admin/aiMetrics/
├── controller/   AiMetricsController.java
├── service/      AiMetricsService.java
├── service/impl/ AiMetricsServiceImpl.java
├── repository/   AiModelRepository.java
├── repository/   AiOpsSettingRepository.java
├── repository/   RagDocumentRepository.java
├── entity/       AiModel.java
├── entity/       AiOpsSetting.java
├── entity/       RagDocument.java
├── dto/          AiMetricsDTO.java
├── dto/          AiUsageLogDTO.java
├── dto/          AiOpsSettingDTO.java
├── dto/          RagDocumentDTO.java
├── type/         AiFeatureType.java
├── type/         AlertChannelType.java
├── type/         RagDocumentStatusType.java
├── exception/    AiMetricsErrorCode.java
├── docs/         AiMetricsDocs.java
└── infrastructure/fastapi/
    ├── AiMetricsFastApiClient.java
    ├── AiMetricsFastApiRequest.java
    ├── AiMetricsFastApiResponse.java
    └── AiMetricsFastApiMapper.java

global/
├── exception/    CustomException.java
├── exception/    ErrorCode.java
├── exception/    GlobalExceptionHandler.java
└── response/     ApiResponse.java
```

## Phases

- [ ] Phase 1: Entity — `ai_models`, `ai_ops_settings`, `rag_documents` ERD와 Enum 제약조건 기준으로 엔티티와 타입 구조를 먼저 고정하고, `ai_usage_logs`는 FastAPI 응답 DTO 계약 기준으로만 반영한다.
- [ ] Phase 2: Repository — `ai_models` 조회, `ai_ops_settings` 조회/수정, `rag_documents` 메타데이터 조회/생성/삭제, Audit Log 기록 연동에 필요한 Repository 계약을 정의한다.
- [ ] Phase 3: Service — 권한 분기, 예산/임계치 검증, 1-based 페이지 변환, FastAPI 응답 DTO 매핑, ErrorCode 변환, Audit Log 기록, RAG 상태 규칙을 Service 인터페이스와 구현체에 반영한다.
- [ ] Phase 4: FastAPI Integration — Spring Boot가 FastAPI 내부 집계/인덱싱 endpoint를 안정적으로 호출하고 응답을 Spring DTO로 변환하며 내부 오류를 Spring 도메인 ErrorCode로 변환하는 연동 계층을 구현한다.
- [ ] Phase 5: API — AI 메트릭스 조회, 운영 정책 변경, RAG 문서 운영 endpoint를 `ApiResponse` 계약과 역할 정책에 맞춰 노출한다.
- [ ] Phase 6: Documentation — Swagger docs 인터페이스, backend `api-schema.md`, fastapi `fastapi-schema.md`, feature spec 문서를 실제 계약 기준으로 정렬한다.
- [ ] Phase 7: Test — 권한 분기, 운영 정책 검증, 1-based 페이지네이션, FastAPI 연동, Audit Log 기록, RAG 비동기 상태 전이, ErrorCode 매핑을 검증한다.
