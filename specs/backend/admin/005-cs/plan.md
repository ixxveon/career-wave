# Plan: 고객센터 관리 API (Customer Service)

**Feature Branch**: `feature/admin-cs-api`
**담당**: 신보라
**버전**: v1
**상태**: 스펙 완료

---

## Summary

공지사항·FAQ CRUD와 1:1 문의 답변·완료 처리 어드민 REST API.
KPI 집계 및 AI 초안 생성(FastAPI 연동)을 포함한다.

---

## Technical Context

- Spring Boot 3.3.0 + Java 21, PostgreSQL
- 대상 패키지: `admin/cs/`
- 연관 테이블: `notices`, `faqs`, `inquiries`, `members`(memberName 조회용)
- FE HTTP 계약: `specs/frontend/admin/005-cs/api-schema.md`
- AI 연동: Spring → FastAPI 내부 호출 (RestTemplate 또는 WebClient)

---

## Phases

- [ ] Phase 1: Enum & Entity 정의
- [ ] Phase 2: Repository 구현
- [ ] Phase 3: Service 구현
- [ ] Phase 4: Controller & Swagger Docs
- [ ] Phase 5: ErrorCode 등록 & 검증
