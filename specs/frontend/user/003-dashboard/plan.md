# Implementation Plan: Dashboard

## Summary

> 구현 완료된 Dashboard UI를 기준으로 사용자 정보, GitHub 연동 상태, 스크랩 공고 데이터를 연결하고 백엔드 API와 연동한다.

## Technical Context

- React + Vite 기반 사용자 화면 구현
- 기존 JSX 파일은 기능 구현 과정에서 TSX로 전환한다.
- 화면 이동은 React Router 기반 라우터 방식을 사용한다.
- Spring Boot 기반 REST API 사용
- Dashboard 도메인은 내 정보 관리 및 스크랩 공고 기능을 담당한다.
- 회원 정보는 Member 도메인 데이터를 활용한다.
- GitHub 정보는 Personal Profile 데이터를 활용한다.
- 스크랩 공고는 Bookmarks 및 Job Notices 데이터를 활용한다.
- API Schema 문서를 기준으로 프론트엔드와 백엔드 간 데이터 계약을 정의한다.
- GitHub OAuth 연동 기능은 v2 범위로 분리한다.
- 채용공고 상세 조회 기능은 JobNotice 도메인에서 제공한다.

## Project Structure

```text
frontend/src/user/
├── api/
├── components/
├── hooks/
└── pages/
    ├── dashboard/
    └── mypage/
        ├── UserMyPage.tsx
        └── ScrappedJobPage.tsx

domain/dashboard/
├── controller/   DashboardController.java
├── service/      DashboardService.java
├── repository/   DashboardRepository.java
├── dto/          DashboardDTO.java
├── type/         [Dashboard 관련 Enum]
└── docs/         DashboardDocs.java

global/
└── ApiResponse.java

> 세부 패키지 구조는 담당자별 구현 방식에 따라 조정될 수 있으며, 공통 구조와 팀 컨벤션을 우선 적용한다.

## Phases

* [ ] Phase 1: 프론트 데이터 연결 준비 — API Schema 기준으로 화면에서 사용할 데이터 타입과 Mock 데이터를 정리한다.
* [ ] Phase 2: 내 정보 관리 데이터 연동 — 사용자 정보, GitHub 연동 상태, 회원 정보 수정 흐름을 화면과 연결한다.
* [ ] Phase 3: 스크랩 공고 데이터 연동 — 스크랩 공고 목록, 검색, 정렬 데이터를 화면과 연결한다.
* [ ] Phase 4: 백엔드 API 구현 및 연동 — Dashboard API를 구현하고 프론트 화면과 연동한다.
* [ ] Phase 5: 문서화 & 테스트

