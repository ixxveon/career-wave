# Checklist: 관리자 스크래핑 관리

## Spec Consistency

- [ ] `spec.md`, `plan.md`, `tasks.md`, `api-schema.md`, `constitution.md`의 상태 정의가 일치한다.
- [ ] 스크래핑 상태는 ERD `scraping_logs.scraping_status` 기준 `SUCCESS`, `FAILED`로 통일되어 있다.
- [ ] 현재 ERD에 없는 `pipelineId`, `ACTIVE`, `WARNING`, `RECOVERING`, `PAUSED` 값을 API 계약에서 가정하지 않는다.
- [ ] 실제 스크래핑 로직은 프론트엔드 범위가 아니라고 명시되어 있다.
- [ ] Phase별 스택 브랜치 작업 규칙이 문서에 반영되어 있다.

## Phase 1 - API 계약 및 타입 정리

- [ ] `frontend/src/admin/api/scrapingApi.ts`에서 관리자 스크래핑 API를 관리한다.
- [ ] 페이지 또는 컴포넌트에서 `axios`를 직접 호출하지 않는다.
- [ ] `ScrapingStatus`, `ScrapingActionType` 타입이 정의되어 있다.
- [ ] `ScrapingSource`, `ScrapingSourceSummary`, `ScrapingActionRequest`, `ScrapingActionResult`, `ScrapingLog` 응답 타입이 정의되어 있다.
- [ ] `ApiResponse<T>` 응답 구조를 기준으로 처리한다.
- [ ] TypeScript interface는 PascalCase를 사용하고 `I` prefix를 사용하지 않는다.

## Phase 2 - source 목록, 검색, 필터

- [ ] source 목록이 API 데이터로 렌더링된다.
- [ ] source명 또는 최근 오류 검색 조건이 API 조회 조건과 동기화된다.
- [ ] 실행 결과 필터(`SUCCESS`, `FAILED`)가 API 조회 조건과 동기화된다.
- [ ] 페이지네이션 UI와 API 응답 메타데이터가 일치한다.
- [ ] 로딩, 빈 데이터, API 실패 상태가 화면에 표시된다.

## Phase 3 - source 실행 액션

- [ ] 실행 액션이 API와 연결되어 있다.
- [ ] 재시도 액션이 API와 연결되어 있다.
- [ ] 테스트 액션이 API와 연결되어 있다.
- [ ] 액션 요청 중 중복 클릭이 방지된다.
- [ ] 액션 성공 후 목록 데이터가 갱신된다.
- [ ] 액션 실패 시 오류 안내가 표시된다.

## Phase 4 - 운영 로그와 장애 원인 확인

- [ ] 운영 로그 콘솔이 API 데이터로 표시된다.
- [ ] 로그 상태 `SUCCESS`, `FAILED`가 구분되어 표시된다.
- [ ] source 또는 로그 상태 필터가 API 조회 조건과 동기화된다.
- [ ] 로그 페이지네이션이 API 응답 메타데이터와 일치한다.
- [ ] 실패 source의 최근 오류와 로그 상세가 연결되어 보인다.
- [ ] 로그 상세에 토큰, 쿠키, 프록시 주소, 외부 응답 전문이 노출되지 않는다.

## Phase 5 - 검증 및 마감

- [ ] 관리자 JWT와 `ROLE_ADMIN` 권한 기준 접근 제어가 확인된다.
- [ ] `SecurityConfig` 또는 동등한 보안 설정에서 `/api/admin/scraping/**`가 `hasRole("ADMIN")`, `hasAuthority("ROLE_ADMIN")` 또는 프로젝트 표준 방식으로 보호된다.
- [ ] API 실패, 빈 목록, 검색 결과 없음 상태가 구분되어 표시된다.
- [ ] 액션 실패와 액션 중복 클릭 방지 동작이 확인된다.
- [ ] `FAILED` 여부와 요청 중 상태별 버튼 활성화 정책이 확인된다.
- [ ] 모바일과 데스크톱에서 테이블, 필터, 로그 콘솔 레이아웃이 깨지지 않는다.
- [ ] 가능한 프론트엔드 빌드 또는 검증 명령이 수행된다.

## Team Convention

- [ ] 최신 `develop` 기준 브랜치 생성 원칙을 확인했다.
- [ ] 스택 브랜치가 필요한 Phase 의존성을 문서에 명시했다.
- [ ] PR은 하나의 Phase 목적만 포함한다.
- [ ] PR 본문에는 Phase 범위와 검증 결과를 명시한다.
- [ ] 새 라이브러리는 팀 합의 없이 추가하지 않는다.
- [ ] 관련 없는 파일 변경은 포함하지 않는다.
