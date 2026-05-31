# Plan: 고객센터 관리 (Customer Service)

**Feature Branch**: `feature/admin-cs-ui`
**담당**: 신보라
**버전**: v1
**상태**: UI 개발 예정 / API 연동 예정

---

## Summary

공지사항·FAQ 콘텐츠 관리와 회원 1:1 문의 처리를 담당하는 어드민 페이지.
3-탭 구조(공지사항 / FAQ / 1:1 문의)로 구성하며, 탭별 CRUD와 문의 답변 처리를 지원한다.
AI 초안 생성은 v2(FastAPI LLM 연동 예정)로, v1은 mock UI만 구성한다.

---

## Technical Context

- React + TypeScript 기반 어드민 프론트엔드
- 대상 컴포넌트: `frontend/src/admin/pages/CustomerService/CustomerServicePage.tsx`
- 스타일: `frontend/src/admin/styles/CustomerService.css`
- API 모듈: `frontend/src/admin/api/csApi.ts`
- 백엔드 도메인: `admin/cs` (notices / faqs / inquiries)
- API 계약: `specs/frontend/admin/005-cs/api-schema.md`

---

## Component Structure

```text
CustomerServicePage
├── KpiCard × 4  (공지 수 / FAQ 수 / 미답변 수 / 답변 중 수)
├── Tab (공지사항 | FAQ | 1:1 문의)
│
├── [공지사항 탭] NoticeTab
│   ├── 필터 드롭다운 (카테고리 / 노출 여부)
│   ├── "+ 공지 등록" 버튼
│   ├── 공지 목록 테이블
│   │   └── 행: 번호·카테고리·제목·등록일·노출 여부·관리(수정/삭제)
│   ├── NoticeFormModal (등록 / 수정 겸용)
│   │   ├── 카테고리 셀렉트
│   │   ├── 제목 입력
│   │   ├── 내용 텍스트에어리어
│   │   ├── 노출 여부 토글
│   │   ├── "AI 초안 생성" 버튼 (v2, 공지 내용 초안)
│   │   └── 저장 / 닫기 버튼
│   └── 삭제 확인 모달
│
├── [FAQ 탭] FaqTab
│   ├── 카테고리 필터 드롭다운
│   ├── "+ FAQ 등록" 버튼
│   ├── FAQ 목록 테이블
│   │   └── 행: 번호·카테고리·질문·등록일·관리(수정/삭제)
│   └── FaqFormModal (등록 / 수정 겸용)
│       ├── 카테고리 셀렉트
│       ├── 질문 입력
│       ├── 답변 텍스트에어리어
│       ├── "AI 초안 생성" 버튼 (v2, FAQ 답변 초안)
│       └── 저장 / 닫기 버튼
│
└── [1:1 문의 탭] InquiryTab
    ├── 필터 드롭다운 (카테고리 / 상태)
    ├── 문의 목록 테이블
    │   └── 행: 문의ID·회원명·카테고리·제목·접수일·상태·관리(상세보기)
    └── InquiryDetailModal
        ├── 문의 정보 영역 (카테고리·상태·제목·내용·접수일)
        ├── 답변 입력창 (COMPLETED 시 읽기 전용)
        ├── "AI 초안 생성" 버튼 (v2, 문의 답변 초안, COMPLETED 시 미노출)
        ├── "답변 저장" 버튼 (COMPLETED 시 미노출)
        └── "처리 완료" 버튼 (IN_PROGRESS 시만 노출)
```

---

## Phases

- [ ] Phase 1: 공통 구조 — 탭 레이아웃, KPI 카드 4종, 더미 데이터 작성
- [ ] Phase 2: 공지사항 탭 — 목록 테이블, 등록/수정 모달, 삭제 확인 모달
- [ ] Phase 3: FAQ 탭 — 목록 테이블, 등록/수정 모달
- [ ] Phase 4: 1:1 문의 탭 — 목록 테이블, 상세·답변 모달, 상태 배지
- [ ] Phase 5: API 연동 — `frontend/src/admin/api/csApi.ts` 작성 및 더미 데이터 제거
- [ ] Phase 6: AI 초안 (v2) — 공지·FAQ·문의 초안 생성 버튼 및 FastAPI 연동
