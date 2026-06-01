# Plan: 서비스 통계 및 분석 API (Statistics)

**Feature Branch**: `feature/admin-statistics-be-spec`
**담당**: 신보라
**버전**: v1
**상태**: 스펙 완료 / 구현 예정

---

## Summary

기존 `payments`, `subscriptions`, `members`, `refunds` 테이블을 집계·조인하는 READ-ONLY 통계 API.
별도 Entity·Repository 없이 admin 전용 집계 쿼리로 구현한다.

---

## Technical Context

- Spring Boot + JPA 기반 어드민 백엔드
- 패키지: `admin/statistics/`
- API 계약: `specs/backend/admin/007-statistics/api-schema.md`
- 집계 대상: `payments`, `subscriptions`, `members`, `refunds` 테이블
- `user/` 패키지 직접 참조 금지 (CONVENTION.md)

---

## Phases

- [ ] Phase 1: DTO 정의 — `StatisticsDTO.java` inner class 5종
- [ ] Phase 2: Service 구현 — `AdminStatisticsService.java` 집계 메서드 5개
- [ ] Phase 3: Controller & Swagger Docs
- [ ] Phase 4: 검증
