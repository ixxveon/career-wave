# Implementation Plan: Dashboard

## Summary

> 사용자 정보, GitHub 연동 상태, 스크랩 공고 데이터를 화면에 연결하여 Dashboard 기능을 구현한다.

## Technical Context

> 사용하는 주요 라이브러리, 전략, 전제 조건을 기술한다.

* React + Vite 기반 사용자 화면 구현
* 기존 JSX 파일을 TSX로 전환하여 개발
* React Router 기반 화면 이동 처리
* API Schema 기준 데이터 구조 정의
* Mock 데이터를 활용한 화면 기능 검증
* 로딩, 빈 상태, 오류 상태 UI 고려

## Project Structure

```text
frontend/src/user/
├── api/
├── components/
├── hooks/
└── pages/
    ├── dashboard/
    └── mypage/

global/
└── 공통 UI 컴포넌트
```

## Phases

* [ ] Phase 1: 프론트 데이터 연결 준비 — API Schema 기반 데이터 타입 및 Mock 데이터 구성
* [ ] Phase 2: 내 정보 관리 데이터 연동 — 사용자 정보 및 GitHub 연동 상태 화면 연결
* [ ] Phase 3: 스크랩 공고 데이터 연동 — 스크랩 공고 목록, 검색, 정렬 기능 연결
* [ ] Phase 4: 라우팅 및 사용자 액션 연결 — 상세 페이지 이동 및 스크랩 취소 기능 연결
* [ ] Phase 5: 문서화 & 테스트