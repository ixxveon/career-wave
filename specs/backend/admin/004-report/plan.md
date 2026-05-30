# Plan: 신고관리 API (Report Management)

**Feature Branch**: `feature/admin-report-api`
**담당**: 신보라
**버전**: v1
**상태**: 스펙 작성 중

---

## Summary

커뮤니티 게시글·댓글·회원 신고 내역 조회 및 블라인드·기각 처리 어드민 API.
블라인드 처리 시 `target_type`에 따라 boards 또는 comments 테이블의 `is_blind`를 동일 트랜잭션에서 변경한다.

---

## Technical Context

- Spring Boot + Java 21, PostgreSQL
- 대상 패키지: `admin/report/`
- 연관 테이블: `reports_details`, `boards`, `comments`
- API 계약: `specs/frontend/admin/004-report/api-schema.md`

---

## Phases

- [ ] Phase 1: Entity & Enum 정의
- [ ] Phase 2: Repository 구현
- [ ] Phase 3: Service 구현
- [ ] Phase 4: Controller & Swagger Docs
- [ ] Phase 5: 문서화 & 테스트
