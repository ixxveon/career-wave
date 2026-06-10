# Constitution: 관리자 스크래핑 관리

## 목적

관리자 스크래핑 관리는 채용 공고 수집 source의 최근 실행 결과, 성공률, 처리 시간, 수집량, 최근 오류, 운영 로그를 한 화면에서 확인하고 필요한 운영 액션을 수행하기 위한 관리자 화면이다.

MVP의 중심은 스크래핑 로직 자체 구현이 아니라, FastAPI 또는 백엔드에서 실행되는 스크래핑 source별 실행 결과를 관리자 프론트에서 안전하게 조회하고 제어 요청하는 것이다.

## 도메인 범위

- 채용 공고 수집 source 목록 조회
- source별 최근 실행 결과, 성공률, 평균 처리 시간, 수집 건수, 최근 오류 모니터링
- source 검색, 최근 실행 결과 필터, 페이지네이션
- 단일 source 실행, 재시도, 테스트
- 운영 로그 조회
- 실패 상태의 원인 확인

## 불변 규칙

- 관리자 화면은 스크래핑 작업의 최근 실행 결과와 제어 요청만 다룬다.
- 실제 크롤링, 파싱, 외부 사이트 접근 로직은 프론트엔드에 두지 않는다.
- 외부 채용 플랫폼별 세부 인증 정보, 프록시 정보, 토큰, 쿠키 값은 화면과 API 응답에 노출하지 않는다.
- 실행, 재시도, 테스트 액션은 명시적인 관리자 조작으로만 수행한다.
- 실패 로그는 원인 파악에 필요한 요약만 표시하고 민감한 원본 응답 전문은 노출하지 않는다.
- API 실패 시 mock 데이터로 조용히 대체하지 않고 로딩, 실패, 빈 상태를 구분해 표시한다.

## 상태 규칙

| Status | Label | Description |
|--------|-------|-------------|
| `SUCCESS` | 성공 | 최근 스크래핑 실행이 정상 완료됨 |
| `FAILED` | 실패 | 최근 스크래핑 실행이 실패함 |

상태 전이 원칙:

- 파이프라인 상태 값은 ERD `scraping_pipelines.pipeline_status` CHECK 제약 기준 `IDLE`, `RUNNING`, `SUCCESS`, `FAILED`를 사용한다.
- 로그 상태 값은 ERD `scraping_logs.scraping_status` CHECK 제약 기준 `SUCCESS`, `FAILED`를 사용한다.
- `ACTIVE`, `WARNING`, `RECOVERING`, `PAUSED` 같은 파이프라인 수명주기 상태는 현재 ERD에 없으므로 프론트 계약에서 가정하지 않는다.
- 재시도 또는 테스트 요청 중 상태 표시는 별도 DDL/API 계약이 확정되기 전까지 버튼 loading 상태와 요청 결과 메시지로 표현한다.

## 보안 원칙

- 모든 관리자 스크래핑 API는 JWT 인증과 `MASTER`, `BACKEND` 권한을 요구한다.
- 백엔드는 `SecurityConfig` 또는 동등한 보안 설정에서 `/api/v1/admin/scraping/**`에 `ROLE_MASTER` 또는 `ROLE_BACKEND` 역할 검증을 명시적으로 적용해야 한다.
- 단순 인증 통과만으로 관리자 권한이 보장된다고 가정하지 않는다.
- 인증 사용자 정보는 Controller에서 임의 파싱하지 않고 Security Context 또는 공통 인증 유틸리티로 조회한다.
- 관리자 API는 `ApiResponse<T>` 형식을 따른다.
- 실행성 액션은 감사 로그 또는 운영 로그로 추적 가능해야 한다.

## 프론트엔드 원칙

- 페이지 또는 컴포넌트에서 `axios`를 직접 호출하지 않는다.
- 도메인별 API 호출은 `frontend/src/admin/api/scrapingApi.ts`에 둔다.
- 서버 상태는 TanStack Query 사용을 우선한다.
- TypeScript interface는 PascalCase를 사용하고 `I` prefix를 붙이지 않는다.
- 기존 관리자 레이아웃, 카드, 테이블, `MiniPagination` 패턴을 우선 재사용한다.

## Phase 브랜치 원칙

팀 기본 규칙은 최신 `develop`에서 기능 브랜치를 생성하는 것이다. 다만 스크래핑 구현은 API 계약, 목록 조회, 파이프라인 제어, 로그/검증 순서로 의존성이 있으므로 팀 합의가 있는 경우 Phase별 스택 브랜치로 진행한다.

- Phase 1은 `develop` 또는 스펙 브랜치 최신 커밋에서 생성한다.
- Phase 2는 Phase 1 최신 커밋에서 생성한다.
- Phase 3은 Phase 2 최신 커밋에서 생성한다.
- Phase 4는 Phase 3 최신 커밋에서 생성한다.
- 이전 Phase PR이 병합되면 후속 브랜치는 최신 base로 rebase 또는 base 변경한다.
- 각 PR은 하나의 Phase 목적만 포함한다.
