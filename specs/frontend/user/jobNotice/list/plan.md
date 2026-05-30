# Implementation Plan: 채용 공고 리스트

## Summary

채용 공고 목록 페이지에서 공고 검색, 필터링, 기간 선택, 정렬, 스크랩 토글, 상세 드로어 진입을 제공한다. 기존 `JobNoticeListPage.tsx`의 화면 구조를 유지하면서 mock 데이터 의존성을 API 계약 기반 데이터 흐름으로 교체할 수 있도록 타입과 상태 경계를 분리한다.

## Technical Context

- React + TypeScript 기반 사용자 프론트엔드 페이지
- 대상 컴포넌트: `frontend/src/user/pages/jobNotice/JobNoticeListPage.tsx`
- 상세 공통 컴포넌트: `frontend/src/user/pages/jobNotice/JobNoticeDetail.tsx`
- 공유 타입: `frontend/src/user/pages/jobNotice/JobNoticeTypes.ts`
- 스타일: `frontend/src/user/pages/jobNotice/styles/JobNoticeListPage.css`
- API 계층: `frontend/src/user/api` 하위 도메인 API 모듈
- 공통 API 클라이언트: `frontend/src/utils/apiClient.js` 또는 프로젝트가 채택한 공통 클라이언트
- 아이콘: `lucide-react`
- API 계약: `specs/frontend/user/jobNotice/api-schema.md`
- 목록은 공개 조회를 지원하고, 스크랩 토글은 인증 상태가 필요하다.
- API 연동 후 서버 상태는 TanStack Query 사용을 우선하고, 페이지 입력 상태는 React local state로 관리한다.
- 페이지와 컴포넌트에서는 `axios` 또는 `fetch`를 직접 호출하지 않는다.

## Project Structure

```text
frontend/src/user/pages/jobNotice/
├── JobNoticeListPage.tsx        # 목록 페이지, 검색/필터/정렬/카드 선택
├── JobNoticeDetail.tsx          # 목록과 상세가 공유하는 상세 드로어
├── JobNoticeTypes.ts            # JobNotice 공통 타입
└── styles/
    ├── JobNoticeListPage.css
    └── JobNoticeDetail.css

frontend/src/user/api/
└── jobApi.js 또는 jobNoticeApi.ts  # 채용 공고 목록/상세/스크랩 API 호출 계층

specs/frontend/user/jobNotice/
├── api-schema.md                # 목록/상세 공통 API 계약
├── constitution.md              # 목록/상세 공통 규칙
└── list/
    ├── spec.md
    ├── plan.md
    ├── tasks.md
    └── checklist.md
```

## Phases

- [ ] Phase 1: 계약 및 타입 정리 - 공통 API 명세와 `JobNotice` 타입, `ApiResponse<T>` 응답 래퍼를 목록/상세 공통 기준으로 맞춘다.
- [ ] Phase 2: 목록 데이터 흐름 - API 계층, mock 데이터, API 응답, 로딩/빈 결과/오류 상태를 같은 UI 흐름으로 처리한다.
- [ ] Phase 3: 검색/필터/기간/정렬 - 사용자의 탐색 조건을 단일 상태 모델로 관리하고 결과 수를 동기화한다.
- [ ] Phase 4: 카드 액션과 상세 연결 - 카드 선택, 키보드 진입, 스크랩 토글, 상세 드로어 열기/닫기를 안정화한다.
- [ ] Phase 5: 접근성, 반응형, 검증 - 모바일 레이아웃, 키보드 조작, 오류/빈 상태, 빌드 검증을 완료한다.
