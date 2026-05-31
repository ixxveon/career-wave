# Plan: 사용자 고객센터 (User Support)

**Feature Branch**: `feature/user-support-fe-spec`
**담당**: 신보라
**버전**: v1
**상태**: UI 구현 완료 / API 연동 예정

---

## Summary

회원이 공지사항·FAQ를 조회하고 1:1 문의를 접수·확인하는 사용자 고객센터 페이지.
`/support` 경로 하위 3탭 구조, 전체 더미 데이터로 UI 구현 완료 상태.

---

## Technical Context

- React + TypeScript 기반 사용자 프론트엔드
- 대상 컴포넌트:
  - `frontend/src/user/pages/support/SupportPage.tsx` — 레이아웃 (3탭)
  - `frontend/src/user/pages/support/NoticePage.tsx` — 공지사항 목록
  - `frontend/src/user/pages/support/NoticeDetailPage.tsx` — 공지사항 상세
  - `frontend/src/user/pages/support/FaqPage.tsx` — FAQ 아코디언
  - `frontend/src/user/pages/support/InquiryListPage.tsx` — 나의 문의 목록
  - `frontend/src/user/pages/support/InquiryCreatePage.tsx` — 문의 접수
- API 모듈: `frontend/src/user/api/supportApi.ts` (연동 시 생성)
- API 계약: `specs/frontend/user/006-support/api-schema.md`

---

## Component Structure

```text
SupportPage (/support)
├── 탭 네비게이션 (공지사항 | FAQ | 1:1 문의)
│
├── [공지사항 탭] NoticePage
│   ├── 카테고리 필터 (전체 / 공지 / 업데이트 / 이벤트 / 점검)
│   ├── 키워드 검색
│   └── 공지 목록
│       ├── 핀 공지 (is_pinned=true, 상단 고정 배지)
│       └── 일반 공지 (제목 / 카테고리 / 조회수 / 등록일)
│
├── [공지사항 상세] NoticeDetailPage (/support/notices/:id)
│   ├── 공지 내용 (제목 / 카테고리 / 등록일 / 조회수 / 본문)
│   └── 이전·다음 공지 네비게이션
│
├── [FAQ 탭] FaqPage
│   ├── 카테고리 필터 (전체 / 계정 / 구독결제 / AI 서비스 / 기타)
│   ├── 키워드 검색
│   └── FAQ 아코디언 목록 (단일 열림)
│
├── [1:1 문의 탭] InquiryListPage
│   ├── 카테고리 필터 (전체 / 환불 / 구독결제 / AI 서비스 / 계정 / 기타)
│   ├── 문의하기 버튼 → InquiryCreatePage
│   └── 나의 문의 목록 (카테고리 / 제목 / 미리보기 / 상태 / 날짜)
│       └── InquiryDetailModal (문의 내용 + 답변 or 대기 중 안내)
│
└── [문의 접수] InquiryCreatePage (/support/inquiry/create)
    ├── 문의 유형 선택 (환불 / 구독결제 / AI 서비스 / 계정 / 기타)
    ├── 제목 입력
    ├── 내용 입력 (최소 10자)
    └── 접수 완료 화면
```

---

## Phases

- [x] Phase 1: SupportPage 레이아웃 (3탭 네비게이션)
- [x] Phase 2: 공지사항 목록 (카테고리 필터, 검색, 핀 공지)
- [x] Phase 3: 공지사항 상세 (조회수, 이전/다음 네비)
- [x] Phase 4: FAQ 아코디언 (카테고리 필터, 검색, 단일 열림)
- [x] Phase 5: 나의 문의 목록 + 상세 모달
- [x] Phase 6: 문의 접수 폼 + 완료 화면
- [ ] Phase 7: API 연동 — `supportApi.ts` 작성 및 더미 데이터 제거
  - [ ] 카테고리 매핑 상수 적용 (ERD 영문 ↔ UI 한글)
  - [ ] `inquiry_status` 매핑 상수 적용
  - [ ] `InquiryCreatePage` 카테고리에 `환불(REFUND)` 추가
  - [ ] `NoticePage` 카테고리에 `이벤트(EVENT)` 추가
