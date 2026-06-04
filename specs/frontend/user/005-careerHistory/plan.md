# Implementation Plan: Career History

## Summary

> 사용자가 플랫폼에서 수행한 취업 준비 기록, 면접 연습 히스토리, 누적 역량 평가, 맞춤형 로드맵을 확인할 수 있는 Career History 기능을 구현한다.

## Technical Context

> 사용하는 주요 라이브러리, 전략, 전제 조건을 기술한다.

- 적용 모듈은 `user-backend`, `user-frontend`이다.
- 프론트엔드는 React 기반 사용자 페이지에서 Career History 화면을 구현한다.
- 백엔드는 Spring Boot 기반으로 취업 준비 기록, 면접 연습 기록, 누적 역량 평가 데이터를 저장하고 조회한다.
- 데이터는 RDB 엔티티 구조로 설계하여 MySQL에 저장하는 것을 전제로 한다.
- 백엔드 API 연동 전까지 프론트엔드는 mock data를 사용하여 화면을 먼저 구현할 수 있다.
- 면접 연습 기록에는 텍스트/비디오 모의면접 스크립트, 질문-답변 매칭 데이터, AI 피드백 데이터가 포함된다.
- 누적 데이터 기반 AI 역량 평가는 서류 점수, 면접 점수, 종합 점수, 약점 분석, 우선 학습 타겟을 포함한다.
- 맞춤형 로드맵은 누적 히스토리와 약점 분석 결과를 기반으로 단계별 취업 준비 액션 플랜을 제공한다.

## Project Structure

```txt
user-backend/
└── domain/careerHistory/
    ├── controller/
    │   └── CareerHistoryController.java
    ├── service/
    │   ├── CareerHistoryService.java
    │   └── CareerHistoryServiceImpl.java
    ├── repository/
    │   ├── CareerHistoryRepository.java
    │   ├── InterviewPracticeHistoryRepository.java
    │   └── CareerCompetencyReportRepository.java
    ├── entity/
    │   ├── CareerHistory.java
    │   ├── InterviewPracticeHistory.java
    │   ├── CareerCompetencyReport.java
    │   └── CareerRoadmap.java
    ├── dto/
    │   ├── CareerHistoryCreateRequestDto.java
    │   ├── CareerHistoryResponseDto.java
    │   ├── CareerHistoryDetailResponseDto.java
    │   ├── InterviewPracticeHistoryResponseDto.java
    │   ├── CareerCompetencyReportResponseDto.java
    │   └── CareerRoadmapResponseDto.java
    ├── type/
    │   ├── ActivityType.java
    │   ├── InterviewType.java
    │   └── CareerHistoryStatus.java
    └── docs/
        └── CareerHistoryDocs.java

user-frontend/
└── src/user/pages/careerHistory/
    ├── CareerHistoryPage.jsx
    ├── CareerHistoryDetailPage.jsx
    ├── CareerCompetencyReportPage.jsx
    ├── CareerRoadmapPage.jsx
    └── CareerHistory.css

user-frontend/
└── src/user/api/
    └── careerHistoryApi.js

global/
└── common response, exception handling, auth context, route guard
```

## Phases

- [ ] Phase 1: 도메인 구조 설계 — Career History에서 저장하고 조회할 기록, 면접 연습, 역량 평가, 로드맵 데이터 구조를 정의한다.
- [ ] Phase 2: 백엔드 엔티티 및 DTO 설계 — RDB 저장을 위한 Entity, Repository, Request/Response DTO, Enum 타입을 작성한다.
- [ ] Phase 3: API 구현 — 취업 준비 기록 목록 조회, 상세 조회, 면접 연습 기록 조회, 역량 평가 조회, 로드맵 조회 API를 구현한다.
- [ ] Phase 4: 프론트엔드 화면 구현 — 사용자 페이지에서 취업 준비 기록, 상세 기록, 누적 역량 평가, 맞춤형 로드맵 화면을 구현한다.
- [ ] Phase 5: 문서화 & 테스트 — Swagger 문서화, mock data 테스트, API 연동 테스트, 브라우저 렌더링 테스트를 진행한다.