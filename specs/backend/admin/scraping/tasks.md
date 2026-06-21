# Tasks: scraping

> `plan.md`의 Phase와 1:1로 매핑한다.  
> 각 작업은 하나의 책임만 가지도록 1~3시간 단위 체크리스트로 분해한다.

## Phase 1 - Entity

- [x] `ScrapingPipelineStatusType.java` Enum을 ERD CHECK 제약조건 기준으로 작성한다.
- [x] `ScrapingStatusType.java` Enum을 ERD CHECK 제약조건 기준으로 작성한다.
- [x] `ScrapingActionType.java` Enum을 요청 계약 기준으로 작성한다.
- [x] `ScrapingPipeline.java` 엔티티를 `scraping_pipelines` ERD 컬럼 기준으로 작성한다.
- [x] `ScrapingLog.java` 엔티티를 `scraping_logs` ERD 컬럼 기준으로 작성한다.

## Phase 2 - Repository

- [x] `ScrapingPipelineRepository.java`를 엔티티 매핑 및 최소 로컬 검증 목적 기준으로 작성한다.
- [x] `sourceName` 기준 단일 파이프라인 참조 메서드를 정의한다.
- [x] `ScrapingLogRepository.java`를 Audit Log 연동 보조 및 최소 참조 목적 기준으로 작성한다.
- [x] Spring Repository가 직접 집계/상태 전이 주체가 아님을 코드 구조와 주석 규칙에 반영한다.

## Phase 3 - Service

- [x] `ScrapingService.java` 인터페이스를 작성한다.
- [x] FastAPI 목록 응답을 Spring DTO로 변환하는 서비스 로직을 구현한다.
- [x] FastAPI 요약 응답을 Spring DTO로 변환하는 서비스 로직을 구현한다.
- [x] FastAPI 상세 응답을 Spring DTO로 변환하는 서비스 로직을 구현한다.
- [x] FastAPI 실행 로그 응답을 Spring DTO로 변환하는 서비스 로직을 구현한다.
- [x] 단일 액션 요청 서비스 로직을 구현한다.
- [x] 배치 액션 요청 서비스 로직을 구현한다.
- [x] 외부 1-based `page`를 검증하고 Spring 내부 Pageable 소비 지점용 `page - 1` 변환 로직을 구현한다.
- [x] `SCRAPING_PIPELINE_NOT_FOUND`, `SCRAPING_SOURCE_NOT_FOUND`, `SCRAPING_ALREADY_RUNNING`, `SCRAPING_EXECUTION_FAILED`, `SCRAPING_TEST_FAILED` 예외 변환 로직을 구현한다.
- [x] 관리자 실행 제어 요청에 대한 Audit Log 기록 연동 로직을 구현한다.
- [x] `ScrapingErrorCode.java` 도메인 에러 코드를 작성한다.

## Phase 4 - FastAPI Integration

- [x] `ScrapingFastApiClient.java`를 작성한다.
- [x] FastAPI 목록 조회 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI 요약 조회 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI 상세 조회 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI 단일 실행 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI 재시도 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI 테스트 실행 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI 배치 액션 요청/응답 매핑 DTO를 작성한다.
- [x] FastAPI 실행 로그 조회 요청/응답 매핑 DTO를 작성한다.
- [x] 배치 액션 `actionType`을 FastAPI 내부 계약으로 전달하는 매핑을 구현한다.
- [x] FastAPI 내부 ErrorCode를 Spring ErrorCode로 변환하는 매퍼를 구현한다.

## Phase 5 - API

- [ ] `ScrapingPipelineDTO.java`를 작성한다.
- [ ] `ScrapingLogDTO.java`를 작성한다.
- [ ] `GET /api/v1/admin/scraping/pipelines` Controller endpoint를 작성한다.
- [ ] `GET /api/v1/admin/scraping/pipelines/summary` Controller endpoint를 작성한다.
- [ ] `GET /api/v1/admin/scraping/pipelines/{sourceName}` Controller endpoint를 작성한다.
- [ ] `POST /api/v1/admin/scraping/pipelines/{sourceName}/actions` Controller endpoint를 작성한다.
- [ ] `POST /api/v1/admin/scraping/pipelines/batch-actions` Controller endpoint를 작성한다.
- [ ] `GET /api/v1/admin/scraping/logs` Controller endpoint를 작성한다.
- [ ] `MASTER`, `BACKEND` 권한 정책과 JWT 인증 진입 조건을 반영한다.

## Phase 6 - Documentation

- [ ] `ScrapingDocs.java` Swagger 인터페이스를 작성한다.
- [ ] 관리자 목록/요약/상세/로그 조회 API 문서를 정리한다.
- [ ] 단일 액션 및 배치 액션 API 문서를 정리한다.
- [ ] FastAPI 내부 API 매핑과 ErrorCode 매핑이 백엔드 문서와 일치하도록 정리한다.
- [ ] Audit Log 기록 범위를 문서와 구현 계획에 맞춘다.

## Phase 7 - Test

- [ ] FastAPI 목록/요약/상세/로그 응답 매핑 테스트를 작성한다.
- [ ] 단일 실행/재시도/테스트 액션 요청 테스트를 작성한다.
- [ ] 배치 액션 요청 테스트를 작성한다.
- [ ] `page - 1` 변환 테스트를 작성한다.
- [ ] ErrorCode 변환 테스트를 작성한다.
- [ ] 중복 실행 차단 테스트를 작성한다.
- [ ] Audit Log 기록 테스트를 작성한다.
