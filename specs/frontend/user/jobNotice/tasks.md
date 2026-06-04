# Tasks: 사용자 채용 공고

> plan.md의 Phase와 1:1로 대응한다. 각 항목은 구현 커밋 또는 PR 리뷰 단위로 추적할 수 있어야 한다.
> 현재 스펙 브랜치는 `feature/jobnotice-domain-spec`이며, 실제 구현은 Phase 단위로 `feature/user-jobNotice-{세부기능명}` 브랜치를 나누어 진행한다.

## Phase 1 - 계약 및 타입 정리

**Implementation Branch**: `feature/user-jobNotice-contract-types`

- [x] `api-schema.md`의 `JobNoticeSummary`, `JobNoticeDetail`, `JobNoticeBookmarkResponse` 필드를 프론트엔드 타입과 비교한다.
- [x] API 성공/실패 응답이 `ApiResponse<T>`의 `success`, `statusCode`, `message`, `data` 필드를 기준으로 문서화되어 있는지 확인한다.
- [x] `JobNoticeTypes.ts`의 `exp`, `employment` 화면 필드와 API의 `experience`, `employmentType` 필드 매핑 규칙을 정한다.
- [x] 상세 필드 `industry`, `responsibilities`, `requirements`, `preferredQualifications`, `process`, `workConditions`, `companyDescription` 타입을 추가하거나 변환 계층에서 보강한다.
- [x] 필터 enum(`직무`, `경력`, `채용 유형`, `지역`, `기업 규모`)과 정렬 enum(`추천순`, `최신순`, `조회순`)을 상수로 고정한다.
- [x] 목록과 상세가 같은 공고 `id`와 `bookmarked` 값을 참조하도록 상태 소유 지점을 정한다.

## Phase 2 - 목록 데이터 흐름

**Implementation Branch**: `feature/user-jobNotice-list-flow`

- [x] 목록 조회 상태를 `idle`, `loading`, `success`, `empty`, `error`로 구분한다.
- [x] 목록 조회 호출은 `frontend/src/user/api` 하위 API 모듈에 둔다.
- [x] API 모듈은 프로젝트 공통 클라이언트(`utils/apiClient.js` 또는 채택된 공통 클라이언트)를 사용하고 페이지에서 직접 HTTP 호출을 작성하지 않는다.
- [x] API 연동 시 TanStack Query로 목록 조회 상태를 관리하는 방식을 우선 검토한다.
- [x] mock 데이터 사용 시에도 API 응답과 같은 `items`, `stats`, `filterOptions`, `page`, `size`, `totalItems`, `totalPages` 형태로 변환한다.
- [x] 목록 조회 실패 시 빈 결과 메시지가 아니라 오류 메시지와 재시도 액션을 표시한다.
- [x] 목록 헤더의 공고 수는 실제 필터링된 `items.length` 또는 API의 `totalItems`와 일치시킨다.
- [x] 검색, 필터, 기간, 정렬 조건을 API 쿼리 파라미터로 변환하는 유틸을 작성한다.
- [x] 검색어 입력은 Enter 키와 검색 버튼 모두에서 동일한 submit 함수를 사용한다.
- [x] 인기 검색어 버튼 클릭 시 입력값과 실제 검색 조건이 함께 갱신되도록 처리한다.
- [x] 필터 선택 후 드롭다운을 닫고 활성 필터 칩을 갱신한다.
- [x] 활성 필터 칩 클릭 시 해당 필터만 `전체`로 초기화한다.
- [x] 기간 필터는 `오늘`, `7일`, `30일`, `기간 전체`를 지원한다.
- [x] 정렬 메뉴는 선택 후 닫히며 현재 정렬값을 버튼에 표시한다.

## Phase 3 - 상세 데이터 흐름

**Implementation Branch**: `feature/user-jobNotice-detail-flow`

- [x] 공고 카드는 클릭과 Enter/Space 키로 상세 드로어를 열 수 있게 한다.
- [x] 공고 카드 선택 시 `JobNoticeDetail`에 선택 공고 요약 데이터와 현재 스크랩 상태를 전달한다.
- [x] 상세 조회 호출은 `frontend/src/user/api` 하위 API 모듈에 둔다.
- [x] API 연동 시 `getJobNoticeDetail(jobNoticeId)`를 TanStack Query 또는 도메인 hook으로 관리하는 방식을 우선 검토한다.
- [x] 상세 드로어는 목록 요약 데이터로 즉시 열고, 상세 응답 도착 후 상세 필드를 보강한다.
- [x] 상세 조회 상태를 `loading`, `success`, `empty`, `error`로 구분한다.
- [x] 상세 조회 실패 시 목록을 비우지 않고 드로어 내부에 오류 메시지와 닫기 또는 재시도 액션을 표시한다.
- [x] 상세 조회 결과가 현재 선택 공고 `id`와 다르면 화면에 반영하지 않는다.
- [x] 상세 드로어는 핵심 정보 카드, 기술 스택, `공고 상세` 탭, `기업 정보` 탭을 표시한다.
- [x] `공고 상세` 탭은 담당 업무, 자격 요건, 우대 사항, 전형 절차, 근무 조건, 마감 정보를 표시한다.
- [x] `기업 정보` 탭은 회사명, 업종, 기업 규모, 기업 소개를 표시한다.
- [x] 상세 필드가 비어 있으면 빈 리스트 대신 fallback 안내 또는 해당 섹션 숨김을 적용한다.
- [x] 원본 공고 이동은 `originalUrl`을 우선 사용하고, 없으면 제목 기반 검색 URL을 fallback으로 사용한다.
- [x] 원본 이동 URL을 구성할 수 없으면 원본 이동 버튼을 비활성화하고 안내 문구를 표시한다.
- [x] 목록 필터 값을 API query params에 반영할 때 필터 전용 키 타입으로 제한해 타입 오류를 제거한다.
- [x] 상세 드로어가 닫힐 때 선택 공고 상태를 `null`로 초기화한다.

## Phase 4 - 스크랩 상태 동기화

**Implementation Branch**: `feature/user-jobNotice-bookmark-sync`

- [x] 북마크 버튼 클릭 시 이벤트 전파를 중단하여 상세 드로어가 열리지 않게 한다.
- [x] 스크랩 토글 호출은 `frontend/src/user/api` 하위 API 모듈에 둔다.
- [x] 목록 카드와 상세 드로어의 스크랩 버튼은 같은 `id` 기준으로 현재 상태를 표시한다.
- [x] 스크랩 저장/해제 API 성공 시 목록 카드와 상세 드로어의 상태를 동시에 갱신한다.
- [x] 스크랩 API 실패 시 버튼 상태를 이전 값으로 되돌리고 사용자에게 실패 안내를 제공한다.
- [x] 비로그인 사용자가 스크랩을 시도하면 로그인 필요 안내 또는 `/auth/login` 이동을 제공한다.
- [x] 스크랩 API 응답의 `scrapCount`가 필요한 화면이 있으면 같은 공고 상태에 반영한다.

## Phase 5 - 접근성, 반응형, 검증

**Implementation Branch**: `feature/user-jobNotice-accessibility-qa`

- [ ] 검색 입력, 필터, 정렬, 스크랩 버튼, 원본 공고 버튼, 상세 닫기 버튼, 상단 이동 버튼에 접근 가능한 이름을 제공한다.
- [ ] 상세 드로어는 `role="dialog"`와 `aria-modal="true"`를 제공한다.
- [ ] 상세 드로어가 열린 동안 배경 스크롤을 막고 Escape 키로 닫을 수 있게 한다.
- [ ] 상세 드로어 닫기 버튼, 오버레이 클릭, Escape 키 닫기가 모두 동작한다.
- [ ] 상세 탭은 키보드로 이동하고 선택할 수 있어야 한다.
- [ ] 1320px, 1080px, 720px 이하 레이아웃에서 카드 그리드와 필터 패널이 깨지지 않는지 확인한다.
- [ ] 360px 모바일 화면에서 목록 카드, 필터, 상세 드로어, 하단 액션 버튼 텍스트가 겹치지 않는지 확인한다.
- [ ] 빈 결과 상태에서 필터를 줄이거나 검색어를 변경할 수 있는 흐름을 유지한다.
- [ ] 주요 상호작용을 수동 검증한다: 검색, 인기 검색어, 필터 선택/해제, 기간 선택, 정렬, 목록 스크랩, 상세 열기/닫기, 상세 탭 전환, 상세 스크랩, 원본 이동, 상단 이동.
- [ ] `npm run build` 또는 프로젝트 표준 검증 명령으로 타입/빌드 오류를 확인한다.
- [ ] 문서만 수정한 PR이라면 빌드 생략 사유를 PR 본문에 남긴다.
