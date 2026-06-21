# FastAPI Tasks: scraping

> `fastapi-plan.md`의 Phase를 1:1로 매핑한다.
> 각 작업은 하나의 책임만 가지도록 1~3시간 단위 체크리스트로 분해한다.

## Phase 1 - Config / Schema

- [x] GET 내부 API Query Parameter Schema를 작성한다.
- [x] POST 내부 API Request / Response Pydantic Schema를 작성한다.
- [x] FastAPI 공통 에러 응답 Schema를 작성한다.
- [x] FastAPI 내부 ErrorCode 상수를 정의한다.

## Phase 2 - DB Repository

- [x] `scraping_pipeline_repository.py`를 작성한다.
- [x] `scraping_log_repository.py`를 작성한다.
- [x] `job_notice_repository.py`를 작성한다.
- [x] `source + original_url` 기준 중복 확인 쿼리를 구현한다.

## Phase 3 - Source Registry / Scraper Adapter

- [x] Source Registry를 `wanted`, `saramin` 기준으로 구현한다.
- [x] `scraper_adapter.py` 인터페이스를 작성한다.
- [x] `wanted_scraper.py` 구현체를 작성한다.    
- [x] `saramin_scraper.py` 구현체를 작성한다.
- [x] 미지원 `sourceName`을 `SCRAPING_SOURCE_NOT_FOUND`로 처리하는 로직을 작성한다.

## Phase 4 - Query Service

- [x] `pipeline_query_service.py`를 작성한다.
- [x] 목록 조회 Query Parameter 처리 로직을 작성한다.
- [x] 요약 조회 로직을 작성한다.
- [x] 상세 조회 로직을 작성한다.
- [x] 실행 로그 조회 로직을 작성한다.

## Phase 5 - 단일 액션 처리

- [x] `action_service.py`를 작성한다.
- [x] 실행 요청 검증 로직을 작성한다.
- [x] 재시도 요청 검증 로직을 작성한다.
- [x] TEST 액션 검증 로직을 작성한다.
- [x] 중복 실행 차단 로직을 작성한다.

## Phase 6 - Batch Action 처리

- [x] 배치 액션 `actionType` 검증 로직을 작성한다.
- [x] `sourceNames` 목록 검증 로직을 작성한다.
- [x] 대상별 접수/거절 결과 집계 로직을 작성한다.
- [x] 배치 액션 응답 매핑 로직을 작성한다.

## Phase 7 - Pipeline Runner

- [x] `pipeline_runner_service.py`를 작성한다.
- [x] 실행 orchestration 로직을 작성한다.
- [x] 재시도 orchestration 로직을 작성한다.
- [x] TEST 액션 orchestration 로직을 작성한다.

## Phase 8 - JobNotice 정제
    
- [x] `job_notice_normalizer.py`를 작성한다.
- [x] 원본 공고를 표준 JobNotice 구조로 변환하는 로직을 작성한다.
- [x] 사이트별 필드 매핑 로직을 작성한다.

## Phase 9 - JobNotice 중복 제거 및 저장    

- [x] `job_notice_dedup_service.py`를 작성한다.
- [x] 실제 실행/재시도 액션 대상 저장 로직을 작성한다.
- [x] TEST 액션 대상 제외 로직을 작성한다.
- [x] `source + original_url` 기준 중복 제거 로직을 작성한다.

## Phase 10 - Pipeline 상태 갱신

- [x] `pipeline_status_service.py`를 작성한다.
- [x] `RUNNING` 상태 전이 로직을 작성한다.
- [x] `SUCCESS` 상태 전이 로직을 작성한다.
- [x] `FAILED` 상태 전이 로직을 작성한다.

## Phase 11 - 실행 로그 기록

- [x] `scraping_log_service.py`를 작성한다.
- [x] 성공 실행 로그 기록 로직을 작성한다.
- [x] 실패 실행 로그 기록 로직을 작성한다.
- [x] TEST 액션 로그 기록 로직을 작성한다.
- [x] 실패 메시지 저장 로직을 작성한다.

## Phase 12 - Router

- [x] `scraping_router.py`를 작성한다.
- [x] `GET /internal/scraping/pipelines` Router를 작성한다.
- [x] `GET /internal/scraping/pipelines/summary` Router를 작성한다.
- [x] `GET /internal/scraping/pipelines/{sourceName}` Router를 작성한다.
- [x] `GET /internal/scraping/logs` Router를 작성한다.
- [x] `POST /internal/scraping/pipelines/{sourceName}/run` Router를 작성한다.
- [x] `POST /internal/scraping/pipelines/{sourceName}/retry` Router를 작성한다.
- [x] `POST /internal/scraping/pipelines/{sourceName}/test` Router를 작성한다.
- [x] `POST /internal/scraping/pipelines/batch-run` Router를 작성한다.

## Phase 13 - Background Task / Pipeline

- [x] `scraping_task.py`를 작성한다.
- [x] 비동기 실행 시작 로직을 작성한다.
- [x] 실행 종료 시 상태/로그 후처리 로직을 작성한다.
- [x] 실행 실패 복구 및 종료 처리 로직을 작성한다.

## Phase 14 - Spring ↔ FastAPI 계약 검증

- [x] `spring_contract_validator.py`를 작성한다.
- [x] 목록/요약/상세/로그 응답 계약 검증 테스트를 작성한다.
- [x] 단일 액션 및 배치 액션 응답 계약 검증 테스트를 작성한다.
- [x] ErrorCode 변환 가능성 검증 테스트를 작성한다.

## Phase 15 - Test

- [ ] GET 내부 API Query Parameter 테스트를 작성한다.
- [ ] Source Registry 테스트를 작성한다.
- [ ] 실행/재시도/TEST/배치 액션 테스트를 작성한다.
- [ ] TEST 대상 제외 테스트를 작성한다.
- [ ] 중복 실행 차단 테스트를 작성한다.
- [ ] 중복 제거 및 저장 테스트를 작성한다.
- [ ] 상태 전이 테스트를 작성한다.
- [ ] 실행 로그 기록 테스트를 작성한다.
