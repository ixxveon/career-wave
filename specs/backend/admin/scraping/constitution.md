# Constitution: scraping

**Feature Branch**: `docs/admin-scraping-spec`

## 1. 도메인 원칙

> Spring Boot는 외부 관리자 API, 인증/인가, 권한, DTO, `ApiResponse<T>` 계약을 담당한다.  
> FastAPI는 내부 실행 API, 실제 스크래핑 실행, 상태 전이, 실행 로그 기록, 공고 저장을 담당한다.  
> 프론트엔드는 FastAPI를 직접 호출하지 않는다.

## 2. 상태 머신

```text
IDLE
  ↓
RUNNING
  ↓
SUCCESS

RUNNING
  ↓
FAILED

SUCCESS
  ↓
RUNNING

FAILED
  ↓
RUNNING
```

| 전이 | 허용 여부 | 사유 |
|---|---|---|
| `IDLE → RUNNING` | 허용 | 최초 실행 또는 테스트 요청 수락 |
| `RUNNING → SUCCESS` | 허용 | 실행 성공 종료 |
| `RUNNING → FAILED` | 허용 | 실행 실패 종료 |
| `SUCCESS → RUNNING` | 허용 | 재실행 또는 테스트 요청 |
| `FAILED → RUNNING` | 허용 | 재시도 요청 |
| `RUNNING → RUNNING` | 금지 | 중복 실행 금지 |

## 3. 아키텍처 결정

| 결정 | 내용 | 이유 |
|---|---|---|
| 외부 API와 내부 실행 API 분리 | Spring Boot는 외부 관리자 API만 제공하고 FastAPI는 내부 실행 API만 처리한다. | 인증/인가와 실행 로직의 책임 경계를 명확히 하기 위함이다. |
| Spring Repository 책임 최소화 | Spring Repository는 엔티티 매핑, 최소 로컬 검증, Audit Log 연동 보조 용도로만 사용한다. | 파이프라인 조회/상태 계산 책임이 Spring으로 되돌아오는 것을 방지하기 위함이다. |
| FastAPI 실행 책임 집중 | 실제 실행, 재시도, 테스트, 일괄 실행, 상태 갱신, 실행 로그 기록, 공고 저장은 FastAPI가 담당한다. | 실행 결과와 상태 기록을 같은 실행 주체가 관리해야 일관성이 유지된다. |
| 1-based 외부 페이지 계약 유지 | 외부 목록 API는 1-based를 유지하고 내부 변환에서만 `page - 1`을 적용한다. | 프론트엔드 계약과 Spring 내부 구현 세부사항을 분리하기 위함이다. |
| TEST 액션 저장 제외 | TEST 액션은 실행 로그와 상태 전이는 수행하지만 `job_notices` 저장/갱신은 하지 않는다. | 운영 데이터 오염 없이 수집/파싱 가능성만 검증하기 위함이다. |

## 4. 불변 규칙 (Invariants)

- Spring Boot는 `scraping_pipelines`, `scraping_logs`를 직접 집계하거나 상태 전이를 수행하지 않는다.
- `RUNNING` 상태의 파이프라인에는 실행, 재시도, 테스트 중복 요청을 허용하지 않는다.
- TEST 액션도 실행 시도이므로 `scraping_logs` 기록 대상이다.
- TEST 액션은 `job_notices` 저장/갱신을 수행하지 않는다.
- 외부 관리자 API의 정상 응답은 항상 `ApiResponse<T>`를 유지해야 한다.
- 관리자 실행 제어 요청은 Audit Log 기록 대상이어야 한다.

## 5. 연동 계약

- **호출 방향**: `Spring Boot -> FastAPI` 단방향 호출만 허용한다.
- **역호출 금지**: FastAPI는 Spring Boot 외부 관리자 API를 역호출하지 않는다.
- **Spring Boot 책임**: 외부 API 제공, 인증/인가, 권한 검증, Query Parameter 검증, DTO 변환, `ApiResponse<T>` 래핑, FastAPI 오류의 Spring ErrorCode 변환, Audit Log 기록.
- **FastAPI 책임**: 목록/요약/상세/로그 조회, 실행/재시도/테스트/일괄 실행, 원본 공고 수집, 정제, 중복 제거, `job_notices` 저장, 파이프라인 상태 갱신, 실행 로그 기록.
- **Spring Repository 책임**: 엔티티 매핑, 최소 로컬 검증, Audit Log 연동 보조.
- **Spring 비책임 범위**: 파이프라인 목록 직접 집계, 요약 직접 집계, 상세 상태 직접 계산, 로그 목록 직접 조회, 상태 전이 수행, 실행 로그 직접 생성.
- **외부 시스템**: 채용 사이트, 비동기 작업 실행기, 선택 기능인 실패 알림 채널.

## 6. 금지 패턴

- Spring Boot가 FastAPI를 우회해 `scraping_pipelines.pipeline_status`를 직접 갱신하는 패턴 금지
- Spring Boot가 `scraping_logs` 실행 로그를 직접 생성하는 패턴 금지
- `RUNNING` 상태 확인 없이 실행/재시도/테스트를 중복 수락하는 패턴 금지
- TEST 액션 결과를 `job_notices`에 저장하는 패턴 금지
- Swagger 어노테이션을 Controller에 직접 작성하는 패턴 금지
- 외부 API에 0-based 페이지를 노출하는 패턴 금지
