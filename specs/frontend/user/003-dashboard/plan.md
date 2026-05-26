# Implementation Plan: 마이페이지 대시보드

## Summary

> 사용자의 취업 준비 현황, GitHub 성장 데이터, 최근 활동 및 관심 기업 정보를 한눈에 확인할 수 있는 마이페이지 대시보드를 구현한다.

## Technical Context

> 사용하는 주요 라이브러리, 전략, 전제 조건을 기술한다.

- React 기반 사용자 대시보드 UI 구현
- React Router를 사용한 페이지 이동 처리
- CSS 기반 반응형 레이아웃 적용
- mock 데이터를 활용한 초기 UI 구현
- 공통 컴포넌트 재사용 구조 적용

## Project Structure

```text
src/
├── user/
│   ├── components/
│   │   └── dashboard/
│   │       ├── ProgressCard.jsx
│   │       ├── InterviewStatusCard.jsx
│   │       ├── GithubGrowthCard.jsx
│   │       ├── RecommendedActionCard.jsx
│   │       ├── RecentActivityCard.jsx
│   │       └── FavoriteCompanyCard.jsx
│   │
│   ├── pages/
│   │   └── dashboard/
│   │       ├── UserMyPage.jsx
│   │       └── DashboardPage.css
│   │
│   ├── api/
│   │   └── dashboardApi.js
│   │
│   └── hooks/
│
├── components/
│   ├── common/
│   └── layout/
│
└── styles/