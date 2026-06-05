# Tasks: 관리자 스크래핑 관리

## Phase 1 - API 계약 및 타입 정리

**Branch**: `feature/admin-scraping-api`
**Base**: `feature/admin-scraping-spec`

- [x] `frontend/src/admin/api/scrapingApi.ts` 생성
- [x] ERD 기준 `ScrapingStatus`(`SUCCESS`, `FAILED`)와 `ScrapingActionType` 타입 정의
- [x] `ScrapingSource`, `ScrapingSourceSummary`, `ScrapingActionRequest`, `ScrapingActionResult`, `ScrapingLog` 응답 타입 정의
- [x] `ApiResponse<T>` 응답 구조에 맞춘 API 함수 작성
- [x] 페이지에서 직접 API 호출하지 않도록 API 계층 경계 정의

## Phase 2 - source 목록, 검색, 필터

**Branch**: `feature/admin-scraping-list`
**Base**: `feature/admin-scraping-api`

- [x] source 목록을 API 데이터로 렌더링
- [x] source명 또는 최근 오류 검색 조건 연결
- [x] 실행 결과 필터 `SUCCESS`, `FAILED` 연결
- [x] 페이지네이션 조건과 응답 메타데이터 연결
- [x] 로딩, 빈 데이터, API 실패 상태 처리

## Phase 3 - source 실행 액션

**Branch**: `feature/admin-scraping-actions`
**Base**: `develop`

- [x] 실행 액션 API 연결
- [x] 재시도 액션 API 연결
- [x] 테스트 액션 API 연결
- [x] 액션 요청 중 중복 클릭 방지
- [x] 액션 성공 후 목록 데이터 갱신
- [x] 액션 실패 안내 표시

## Phase 4 - 운영 로그와 장애 원인 확인

**Branch**: `feature/admin-scraping-logs`
**Base**: `feature/admin-scraping-actions`

- [x] 운영 로그 콘솔을 API 데이터로 전환
- [x] 로그 상태 `SUCCESS`, `FAILED` 표시
- [x] source 또는 로그 상태 필터 연결
- [x] 로그 페이지네이션 연결
- [x] 실패 source의 최근 오류와 로그 상세 연결
- [x] 로그 상세에 토큰, 쿠키, 프록시 주소, 외부 응답 전문이 표시되지 않도록 확인

## Phase 5 - 검증 및 마감

**Branch**: `feature/admin-scraping-verify`
**Base**: `feature/admin-scraping-logs`

- [ ] 관리자 권한이 없는 사용자의 접근 제한 확인
- [ ] API 실패, 빈 목록, 검색 결과 없음 상태 확인
- [ ] 액션 실패와 액션 중복 클릭 방지 확인
- [ ] `FAILED` 여부와 요청 중 상태별 버튼 활성화 정책 확인
- [ ] 모바일과 데스크톱에서 테이블, 필터, 로그 콘솔 레이아웃 확인
- [ ] `npm run build` 또는 프로젝트에서 가능한 검증 명령 실행

## PR 운영 규칙

- [ ] 각 Phase는 별도 PR로 올린다.
- [ ] 후속 Phase 브랜치는 직전 Phase 최신 커밋에서 생성한다.
- [ ] 이전 Phase PR 병합 후 후속 브랜치 base를 최신 상태로 정리한다.
- [ ] PR 본문에는 Phase 범위와 검증 결과를 명시한다.
