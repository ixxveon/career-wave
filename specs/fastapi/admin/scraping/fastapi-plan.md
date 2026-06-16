# FastAPI Implementation Plan: scraping

## Summary

> FastAPI는 내부 실행 API, Source Registry, 실제 실행/재시도/테스트/일괄 액션, 공고 정제/중복 제거/저장, 상태 갱신, 실행 로그 기록을 구현한다.

## Technical Context

- FastAPI + Pydantic
- PostgreSQL 직접 조회/수정
- `scraping_pipelines`, `scraping_logs`, `job_notices` 사용
- MVP 1차 Source Registry: `wanted`, `saramin`
- GET 내부 API는 Query Parameter 사용
- TEST 액션은 상태 전이/로그 기록은 수행하지만 저장은 제외
- Spring Boot → FastAPI 내부 계약 및 ErrorCode 변환 검증

## Project Structure

```text
fastapi/admin/scraping/
├── config/        settings.py
├── schema/        request.py
├── schema/        response.py
├── repository/    scraping_pipeline_repository.py
├── repository/    scraping_log_repository.py
├── repository/    job_notice_repository.py
├── adapter/       scraper_adapter.py
├── adapter/       wanted_scraper.py
├── adapter/       saramin_scraper.py
├── service/       pipeline_query_service.py
├── service/       action_service.py
├── service/       pipeline_runner_service.py
├── service/       job_notice_normalizer.py
├── service/       job_notice_dedup_service.py
├── service/       pipeline_status_service.py
├── service/       scraping_log_service.py
├── router/        scraping_router.py
├── task/          scraping_task.py
└── integration/   spring_contract_validator.py
```

## Phases

- [ ] Phase 1: Config / Schema — GET Query Parameter 계약, POST 요청 Schema, 내부 ErrorCode 계약을 먼저 고정한다.
- [ ] Phase 2: DB Repository — `scraping_pipelines`, `scraping_logs`, `job_notices` 조회/저장 책임과 중복 확인 쿼리를 분리한다.
- [ ] Phase 3: Source Registry / Scraper Adapter — `wanted`, `saramin` Source Registry와 어댑터 구현을 고정한다.
- [ ] Phase 4: Query Service — 목록/요약/상세/실행 로그 조회를 Query Parameter 기준으로 처리한다.
- [ ] Phase 5: 단일 액션 처리 — 실행, 재시도, 테스트 요청의 검증과 접수 흐름을 구현한다.
- [ ] Phase 6: Batch Action 처리 — `actionType`, `sourceNames` 기준 일괄 액션 처리 흐름을 구현한다.
- [ ] Phase 7: Pipeline Runner — 실제 실행 Orchestration을 구현한다.
- [ ] Phase 8: JobNotice 정제 — 원본 공고를 표준 구조로 정제한다.
- [ ] Phase 9: JobNotice 중복 제거 및 저장 — 실제 실행/재시도 액션에 한해 `source + original_url` 기준 저장 정책을 구현한다.
- [ ] Phase 10: Pipeline 상태 갱신 — 실행 시작/성공/실패에 따른 상태 전이를 구현한다.
- [ ] Phase 11: 실행 로그 기록 — 모든 실행 시도와 실패 메시지를 `scraping_logs`에 기록한다.
- [ ] Phase 12: Router — 내부 GET/POST API를 문서 계약과 일치하게 노출한다.
- [ ] Phase 13: Background Task / Pipeline — 비동기 실행과 종료 처리를 구현한다.
- [ ] Phase 14: Spring ↔ FastAPI 계약 검증 — Spring Boot가 기대하는 응답 구조와 ErrorCode 변환 가능성을 검증한다.
- [ ] Phase 15: Test — 조회, 액션, Source Registry, TEST 정책, 중복 실행 방지, 저장 정책, 상태 전이를 검증한다.
