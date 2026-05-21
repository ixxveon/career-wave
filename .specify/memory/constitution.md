# Career Wave Admin Constitution

## Core Principles

### I. 레이어 격리 (NON-NEGOTIABLE)
`global/` 레이어는 절대 `domain/`을 참조하지 않는다.
도메인 간 직접 참조 금지 — 공유 로직은 반드시 `global/`로 추출한다.
모든 예외는 `BusinessException` + `ErrorCode`를 통해 처리한다.

### II. 표준 응답 포맷
모든 API 응답은 `ApiResponse<T>` 래퍼를 사용한다.
성공: `ApiResponse.ok(data)` / 실패: `ApiResponse.fail(message)`
예외는 `GlobalExceptionHandler`에서 일괄 처리한다.

### III. 스펙 주도 개발 (Spec-First)
기능 구현 전 반드시 `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` 순서를 따른다.
스펙 없이 PR을 열 수 없다.
스펙 번호는 `001-`, `002-` 순서로 채번한다.

### IV. 도메인 구조 일관성
각 도메인은 `controller / service / repository / entity / dto / type / docs` 7개 패키지를 갖는다.
`docs/` 패키지에는 Swagger 어노테이션 인터페이스만 위치한다.
DTO는 Request / Response를 명확히 분리한다.

### V. 스크래핑 & 백엔드 분리
FastAPI(스크래핑 엔진)는 Spring Boot와 직접 통신하지 않는다.
수집 데이터는 DB를 통해 공유하며, 필요 시 내부 API 호출로만 연동한다.
크롤러는 `scrapers/` 에 사이트별로 분리 작성한다.

## 기술 스택 제약

| 영역 | 스택 | 버전 |
|------|------|------|
| Backend | Spring Boot | 3.3.x |
| Backend | Java | 17 |
| Backend | JPA ddl-auto | `validate` (운영 시 절대 create/update 금지) |
| Frontend | React + Vite | 18.x / 5.x |
| Frontend | 상태관리 | TanStack Query (Redux 사용 금지) |
| FastAPI | Python | 3.11+ |
| DB | MySQL | 8.x |

## 개발 워크플로우

1. 기능 요청 → `/speckit.specify`로 스펙 작성
2. 스펙 확정 → `/speckit.plan`으로 구현 계획 수립
3. 계획 확정 → `/speckit.tasks`로 태스크 분해
4. 구현 → `/speckit.implement` 또는 직접 코딩
5. PR → 스펙 번호를 제목에 포함 (`[001] 기업 관리 API 구현`)

## Governance

이 constitution은 모든 다른 관행보다 우선한다.
수정 시 팀 합의 및 변경 이유를 `## 개정 이력`에 기록한다.

**Version**: 1.0.0 | **Ratified**: 2026-05-21 | **Last Amended**: 2026-05-21
