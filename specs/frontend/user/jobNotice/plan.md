# Implementation Plan: 사용자 채용 공고

## Summary

채용 공고 도메인은 목록 탐색, 검색/필터/정렬, 스크랩 토글, 상세 드로어, 원본 공고 이동을 하나의 사용자 흐름으로 제공한다. 기존 `JobNoticeListPage.tsx`와 `JobNoticeDetail.tsx`의 화면 구조를 유지하면서 mock 데이터 의존성을 API 계약 기반 데이터 흐름으로 교체할 수 있도록 타입, API 계층, 목록 상태, 상세 상태, 스크랩 상태의 소유 지점을 분리한다.

## Technical Context

- React + TypeScript 기반 사용자 프론트엔드 페이지
- 목록 컴포넌트: `frontend/src/user/pages/jobNotice/JobNoticeListPage.tsx`
- 상세 드로어 컴포넌트: `frontend/src/user/pages/jobNotice/JobNoticeDetail.tsx`
- 공유 타입: `frontend/src/user/pages/jobNotice/JobNoticeTypes.ts`
- 스타일: `frontend/src/user/pages/jobNotice/styles/JobNoticeListPage.css`, `frontend/src/user/pages/jobNotice/styles/JobNoticeDetail.css`
- API 계층: `frontend/src/user/api` 하위 도메인 API 모듈
- 공통 API 클라이언트: `frontend/src/utils/apiClient.js` 또는 프로젝트가 채택한 공통 클라이언트
- 아이콘: `lucide-react`
- API 계약: `specs/frontend/user/jobNotice/api-schema.md`
- 도메인 규칙: `specs/frontend/user/jobNotice/constitution.md`
- 목록/상세 조회는 공개 API를 지원하고, 스크랩 토글은 인증 상태가 필요하다.
- API 연동 후 서버 상태는 TanStack Query 사용을 우선하고, 페이지 입력 상태와 드로어 UI 상태는 React local state로 관리한다.
- 페이지와 컴포넌트에서는 `axios` 또는 `fetch`를 직접 호출하지 않는다.

## Project Structure

```text
frontend/src/user/pages/jobNotice/
├── JobNoticeListPage.tsx        # 목록 페이지, 검색/필터/정렬/카드 선택
├── JobNoticeDetail.tsx          # 상세 드로어, 탭, 원본 이동, 상세 스크랩 액션
├── JobNoticeTypes.ts            # JobNotice 공통 타입
└── styles/
    ├── JobNoticeListPage.css
    └── JobNoticeDetail.css

frontend/src/user/api/
└── jobApi.ts  # 현행 주변 패턴을 따르는 채용 공고 목록/상세/스크랩 API 호출 계층

specs/frontend/user/jobNotice/
├── api-schema.md                # 목록/상세/스크랩 API 계약
├── constitution.md              # 도메인 공통 규칙
├── spec.md                      # 도메인 기능 스펙
├── plan.md                      # 도메인 구현 계획
├── tasks.md                     # 도메인 구현 태스크
└── checklist.md                 # 도메인 검증 체크리스트
```

## Phases

- [ ] Phase 1: 계약 및 타입 정리 - 공통 API 명세와 `JobNoticeSummary`, `JobNoticeDetail`, `BookmarkState`, `ApiResponse<T>` 응답 래퍼를 프론트엔드 타입과 맞춘다.
- [ ] Phase 2: 목록 데이터 흐름 - 목록 API 계층, mock 응답, 로딩/빈 결과/오류 상태, 검색/필터/정렬 쿼리 변환을 정리한다.
- [ ] Phase 3: 상세 데이터 흐름 - 상세 드로어 열림 상태, 상세 조회 API, 상세 로딩/오류/빈 상태, 탭 콘텐츠, 원본 이동 fallback을 정리한다.
- [ ] Phase 4: 스크랩 상태 동기화 - 목록 카드, 상세 드로어, API mutation, 인증 필요 흐름이 같은 `id` 기준으로 동작하게 한다.
- [ ] Phase 5: 접근성, 반응형, 검증 - 모바일 레이아웃, 키보드 조작, 드로어 포커스/스크롤 처리, 오류/빈 상태, 빌드 검증을 완료한다.

## Branch Strategy

현재 `feature/jobnotice-domain-spec` 브랜치는 스펙 작성 전용 브랜치다. 실제 구현은 아래처럼 Phase 하나를 하나의 PR 단위로 보고 브랜치를 분리한다.

| Phase | 구현 브랜치 예시 | PR 목적 |
|------|------------------|---------|
| Phase 1 | `feature/user-jobNotice-contract-types` | API 계약, 타입, 변환 규칙 정리 |
| Phase 2 | `feature/user-jobNotice-list-flow` | 목록 조회, 검색, 필터, 정렬 데이터 흐름 |
| Phase 3 | `feature/user-jobNotice-detail-flow` | 상세 드로어, 상세 조회, 탭, 원본 이동 |
| Phase 4 | `feature/user-jobNotice-bookmark-sync` | 목록/상세 스크랩 상태 동기화 |
| Phase 5 | `feature/user-jobNotice-accessibility-qa` | 접근성, 반응형, 검증 보강 |

## Data Flow

1. 사용자가 `/jobs`에 진입하면 목록 조건 기본값으로 `getJobNoticeList`를 호출하거나 같은 구조의 mock 응답을 생성한다.
2. 검색, 필터, 기간, 정렬, 페이지 변경은 `JobNoticeFilter` 상태를 갱신하고 API 쿼리 파라미터로 변환한다.
3. 사용자가 공고 카드를 선택하면 목록 요약 데이터를 즉시 상세 드로어에 전달하고, API 연동 시 `getJobNoticeDetail(jobNoticeId)`로 상세 필드를 보강한다.
4. 상세 조회 성공 시 현재 선택된 공고 `id`와 응답 `id`가 일치할 때만 상세 상태를 갱신한다.
5. 목록 또는 상세에서 스크랩을 변경하면 낙관적으로 같은 `id`의 `bookmarked` 값을 갱신하고, 실패 시 이전 값으로 롤백한다.
6. 상세 드로어의 원본 공고 버튼은 `originalUrl`을 우선 사용하고, 없으면 제목 기반 검색 URL을 사용한다.

## State Ownership

- 목록 조건 상태: `JobNoticeListPage.tsx`
- 목록 서버 상태: API 연동 후 TanStack Query 또는 도메인 hook
- 선택 공고 ID와 상세 드로어 열림 상태: `JobNoticeListPage.tsx`
- 상세 탭, 드로어 내부 로딩 표시, 닫기 이벤트: `JobNoticeDetail.tsx`
- 상세 서버 상태: API 연동 후 TanStack Query 또는 도메인 hook
- 스크랩 상태: 공고 `id` 기준으로 목록 데이터와 상세 데이터에 동시 반영

## Risks

- 목록 타입의 `exp`, `employment` 같은 화면 필드와 API의 `experience`, `employmentType` 필드가 다르므로 매핑 규칙이 필요하다.
- 상세 mock 섹션을 오래 유지하면 실제 API 필드와 어긋날 수 있으므로 `JobNoticeDetail` 타입 전환 시점을 명확히 해야 한다.
- 상세 드로어가 열린 상태에서 배경 스크롤, 포커스 이동, Escape 닫기 처리가 깨지면 모바일과 키보드 사용성이 나빠진다.
- 스크랩 낙관 업데이트 실패 시 목록과 상세 중 한쪽만 롤백되는 상태를 방지해야 한다.
