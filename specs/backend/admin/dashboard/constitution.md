# Constitution: dashboard

**Feature Branch**: `docs/admin-dashboard-spec`

## 1. 도메인 원칙

> 어드민 대시보드는 운영 판단에 필요한 집계 결과만 조회한다.
> 이 도메인은 외부 관리자 API를 제공하지만 생성/수정/삭제 책임은 가지지 않는다.
> 현재 범위에서는 Spring Boot가 집계 응답 조합을 담당하고, FastAPI 내부 연동은 포함하지 않는다.

- 조회 전용 관리자 도메인으로 유지한다.
- 화면이 기대하는 응답 구조를 안정적으로 제공하는 데 집중한다.

## 2. 아키텍처 결정

> 왜 이렇게 설계했는지 이유까지 적는다. 이유 없는 결정은 나중에 깨진다.

| 결정 | 내용 | 근거 |
|------|------|------|
| 외부 API 단일화 | 관리자 대시보드 조회는 `GET /api/v1/admin/dashboard/summary` 단일 endpoint로 제공한다. | 관리자 첫 화면의 초기 로딩 계약을 단순하게 유지하고 프론트엔드 연동 복잡도를 줄이기 위함이다. |
| 조회 전용 도메인 유지 | dashboard 도메인에서는 생성/수정/삭제 API를 두지 않는다. | 대시보드는 다른 관리자 도메인의 운영 데이터를 집계해 보여주는 read model 성격이기 때문이다. |
| Spring Boot 응답 조합 책임 | 현재 범위에서는 Spring Boot가 관리자 인증/인가, Query Parameter 검증, 집계 응답 조합, `ApiResponse<T>` 래핑을 담당한다. | `fastapi-schema.md`가 없는 상태에서는 책임 경계를 명확히 고정해야 추후 문서 확장 시 충돌을 줄일 수 있다. |
| 다중 도메인 집계 허용 | `admins`, `audit_logs`, `ai_usage_logs`, `rag_documents`, `scraping_pipelines`, `scraping_logs` 등 여러 관리자 도메인 테이블을 기준으로 요약 응답을 구성한다. | 종합 대시보드는 단일 엔티티 조회가 아니라 관리자 운영 현황을 한 화면에 요약하는 목적을 가지기 때문이다. |
| 빈 값 구조 고정 | 데이터가 없는 섹션도 `null`이 아닌 빈 배열 또는 0 값 구조로 반환한다. | 프론트엔드가 섹션별 null 분기 없이 일관된 렌더링을 할 수 있어야 하기 때문이다. |
| 애플리케이션 Enum 검증 | dashboard Enum은 애플리케이션 계층 계약으로 관리하고, 직접 매핑되는 DB CHECK 제약 Enum을 두지 않는다. | 대시보드는 다중 도메인 집계 응답 계약이 중심이므로 DB 스키마보다 응답 모델 기준으로 Enum을 유지하는 편이 책임 경계를 명확히 한다. |
| docs 인터페이스 기반 Swagger | Swagger 어노테이션은 Controller가 아니라 `docs` 인터페이스에 작성한다. | 팀 컨벤션을 유지하고 Controller를 요청 위임 책임에만 집중시키기 위함이다. |

## 3. 불변 규칙 (Invariants)

> "항상 참이어야 하는 조건"을 나열한다. 코드 어디서든 이 규칙이 깨지면 버그다.

- 대시보드 조회의 정상 응답은 항상 `ApiResponse<T>` 공통 규격을 따라야 한다.
- `range`는 항상 `TODAY`, `7D`, `30D` 중 하나여야 하며, 미지정 시 기본값은 `TODAY`여야 한다.
- 대시보드 하위 컬렉션 섹션(`kpis`, `alerts`, `weeklySignups`, `paymentRatio`, `serviceCards`, `systemStatus`, `recentActivities`)은 항상 `null`이 아닌 구조로 반환되어야 한다.
- KPI 섹션은 v1 기준 `TODAY_NEW_MEMBERS`, `REALTIME_ACTIVE_USERS`, `AI_INTERVIEW_SESSIONS`, `TODAY_REVENUE` 4개 식별자를 유지해야 한다.
- 응답의 시간 값은 항상 ISO 8601 형식을 유지해야 한다.
- `paymentRatio`는 화면 표시 기준으로 일관된 비율 값 집합이어야 하며, 합계가 100이 되도록 유지해야 한다.
- 대시보드 조회는 데이터 조회만 수행해야 하며, 어떤 관리자 테이블 상태도 변경해서는 안 된다.

## 4. 연동 계약

> 다른 도메인 또는 외부 시스템(FastAPI 등)과의 경계를 명시한다.

- **Spring Boot 책임**: 외부 관리자 API 제공, 관리자 인증/인가, `MASTER`/`BACKEND`/`CS` 권한 검증, `range` Query Parameter 검증, 공통 오류 응답 변환, 대시보드 집계 응답 조합, `ApiResponse<T>` 래핑.
- **DB 책임 경계**: Spring Boot는 관리자 대시보드 집계를 위해 `admins`, `audit_logs`, `ai_usage_logs`, `ai_ops_settings`, `rag_documents`, `scraping_pipelines`, `scraping_logs`를 조회할 수 있다.
- **DB 변경 금지**: dashboard 도메인은 조회 전용이므로 위 테이블들에 대한 생성/수정/삭제 책임을 가지지 않는다.
- **FastAPI 연동 범위**: 현재 입력 범위에는 `fastapi-schema.md`가 없으므로 dashboard 도메인의 Spring ↔ FastAPI 호출 계약은 정의하지 않는다.
- **향후 확장 원칙**: 추후 FastAPI 내부 집계 API가 도입되면 Spring Boot는 외부 관리자 API와 DTO 변환을 담당하고, FastAPI는 내부 집계 계산 책임을 담당하도록 별도 연동 문서에서 분리한다.
- **프론트엔드 연동 책임**: React 관리자 프론트엔드는 본 도메인의 응답 계약을 기준으로 `/admin/dashboard` 화면을 렌더링한다.
- **외부 시스템 범위 외**: 결제, 알림, 신고, 회원 관리 등 각 세부 도메인의 실제 운영 로직은 dashboard 도메인 책임 범위 밖이며, 본 도메인은 그 결과를 조회용으로만 사용한다.

## 5. 금지 패턴

> 실수하기 쉬운 안티패턴을 명시한다.

- Swagger 어노테이션을 Controller에 직접 작성 금지 → `docs/XxxDocs.java` 인터페이스로 분리.
- `range` 검증 없이 임의 문자열을 서비스나 repository 계층으로 전달하는 패턴 금지.
- 대시보드 응답에서 빈 섹션을 `null`로 반환하는 패턴 금지.
- dashboard 조회 과정에서 집계 대상 테이블 상태를 변경하는 패턴 금지.
- 화면 편의를 이유로 Controller에서 직접 집계 로직을 수행하는 패턴 금지.
- 대시보드 응답 구조를 프론트 계약과 다르게 임의 축약하거나 필드를 누락하는 패턴 금지.
