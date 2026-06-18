# Plan: 서비스 통계 및 분석 API (Statistics)

**Feature Branch**: `feature/admin-statistics-be-spec`
**담당**: 신보라
**버전**: v1
**상태**: 스펙 완료 / 구현 예정

---

## Summary

기존 payments, subscriptions, members, refunds 테이블을 집계·조인하는 READ-ONLY 통계 API.
별도 Entity·Repository 없이 admin 전용 집계 쿼리로 구현한다.

---

## Technical Context

- Spring Boot + JPA 기반 어드민 백엔드
- 패키지: admin/statistics/
- API 계약: specs/backend/admin/statistics/api-schema.md
- 집계 대상: payments, subscriptions, members, refunds 테이블
- user/ 패키지 직접 참조 금지 (CONVENTION.md)
- 별도 QueryRepository 없음 — Service에서 EntityManager 직접 사용 또는 기존 admin 전용 Repository 활용

---

## Project Structure

```text
admin/statistics/
├── controller/
│   └── AdminStatisticsController.java
├── docs/
│   └── AdminStatisticsControllerDocs.java
├── dto/
│   └── StatisticsDTO.java
│       ├── ResponseSummary
│       ├── MonthlyRevenue
│       ├── RevenueBreakdownItem
│       ├── MonthlySubscribers
│       └── RecentSubscriber
└── service/
    ├── AdminStatisticsService.java
    └── impl/
        └── AdminStatisticsServiceImpl.java
            ├── getSummary()
            ├── getMonthlyRevenue()
            ├── getRevenueBreakdown()
            ├── getMonthlySubscribers()
            └── getRecentSubscribers()
```

---

## Phases

- [ ] Phase 1: DTO 정의
  - StatisticsDTO.java inner record 5종 작성
  - ResponseSummary, MonthlyRevenue, RevenueBreakdownItem, MonthlySubscribers, RecentSubscriber

- [ ] Phase 2: Service 구현
  - AdminStatisticsService.java 인터페이스 정의
  - AdminStatisticsServiceImpl.java 집계 메서드 5개 구현
  - 누락 월 0 채움 로직 구현
  - 증감률 계산 시 0 나누기 방지 처리
  - timeAgo 서버 포맷 구현 (Asia/Seoul 기준)

- [ ] Phase 3: Controller & Swagger Docs
  - AdminStatisticsController.java — 엔드포인트 5개
  - AdminStatisticsControllerDocs.java — Swagger 어노테이션 분리

- [ ] Phase 4: 검증
  - 각 엔드포인트 정상 응답 확인
  - 누락 월 0 채움 동작 확인
  - 전월 0일 때 증감률 0.0 반환 확인
  - 환불 amount 음수 반환 확인
