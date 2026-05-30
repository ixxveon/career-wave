# Plan: 신고관리 (Report Management)

**Feature Branch**: `feature/admin-report-ui`
**담당**: 신보라
**버전**: v1
**상태**: 스펙 작성 중

---

## Summary

커뮤니티 게시글·댓글·회원에 대한 신고 내역을 관리자가 조회·처리하는 어드민 페이지.
신고 대상 콘텐츠 블라인드 처리 및 신고 기각(DISMISSED) 처리를 포함한다.

---

## Technical Context

- React + TypeScript 기반 어드민 프론트엔드
- 대상 컴포넌트: `frontend/src/admin/pages/Report/`
- 스타일: `frontend/src/admin/styles/Report.css`
- 백엔드 도메인: `admin/report`
- API 계약: `specs/frontend/admin/004-report/api-schema.md`

---

## Phases

- [ ] Phase 1: UI 구현 — 신고 목록 테이블, 상세 모달, 처리 모달
- [ ] Phase 2: API 연동 — `GET /api/admin/reports/summary`, `GET /api/admin/reports`, `GET /api/admin/reports/{reportId}`, `PATCH /api/admin/reports/{reportId}/blind`, `PATCH /api/admin/reports/{reportId}/dismiss`
- [ ] Phase 3: 추가 기능 (v2) — AI 검토 의견 표시, 일괄 처리
