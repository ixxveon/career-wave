# Implementation Plan: Community

## Summary

> 사용자가 취업 준비 과정에서 질문, 면접 후기, 이력서 팁, 합격 후기 등을 공유하고 검색할 수 있는 Community 기능을 구현한다.

## Technical Context

> 사용하는 주요 라이브러리, 전략, 전제 조건을 기술한다.

* 적용 모듈은 `user-backend`, `user-frontend`이다.
* 프론트엔드는 React 기반 사용자 페이지에서 Community 화면을 구현한다.
* 백엔드는 Spring Boot 기반으로 게시글, 카테고리, 조회수, 좋아요, 댓글 데이터를 저장하고 조회한다.
* 데이터는 RDB 엔티티 구조로 설계하여 MySQL에 저장하는 것을 전제로 한다.
* 백엔드 API 연동 전까지 프론트엔드는 mock data를 사용하여 화면을 먼저 구현할 수 있다.
* 커뮤니티는 게시글 목록 조회, 게시글 상세 조회, 게시글 검색, 카테고리 필터링 기능을 제공한다.
* 비로그인 사용자는 게시글 조회만 가능하며, 게시글 작성은 로그인 사용자만 가능하다.
* 인기 게시글은 좋아요 수, 조회수 등의 기준으로 정렬하여 제공한다.
* 커뮤니티 화면은 빈 데이터 및 일부 데이터 누락 상황에서도 정상 렌더링되어야 한다.

## Project Structure

```txt
user-backend/
└── domain/community/
    ├── controller/
    │   └── CommunityController.java
    ├── service/
    │   ├── CommunityService.java
    │   └── CommunityServiceImpl.java
    ├── repository/
    │   ├── CommunityPostRepository.java
    │   ├── CommunityCommentRepository.java
    │   └── CommunityLikeRepository.java
    ├── entity/
    │   ├── CommunityPost.java
    │   ├── CommunityComment.java
    │   └── CommunityLike.java
    ├── dto/
    │   ├── CommunityPostCreateRequestDto.java
    │   ├── CommunityPostResponseDto.java
    │   ├── CommunityPostDetailResponseDto.java
    │   ├── CommunityCommentResponseDto.java
    │   └── CommunityPopularPostResponseDto.java
    ├── type/
    │   ├── CommunityCategory.java
    │   └── CommunityPostStatus.java
    └── docs/
        └── CommunityDocs.java

user-frontend/
└── src/user/pages/community/
    ├── CommunityPage.tsx
    ├── PostDetailPage.tsx
    ├── PostCreatePage.tsx
    └── CommunityPage.css

user-frontend/
└── src/user/api/
    └── communityApi.ts

global/
└── common response, exception handling, auth context, route guard
```

## Phases

* [ ] Phase 1: 도메인 구조 설계 — 게시글, 카테고리, 인기글, 검색, 북마크, 사용자 인터랙션 구조를 정의한다.
* [ ] Phase 2: 백엔드 엔티티 및 DTO 설계 — 게시글, 댓글, 좋아요 저장을 위한 Entity, Repository, DTO, Enum 타입을 작성한다.
* [ ] Phase 3: API 구현 — 게시글 목록 조회, 상세 조회, 카테고리 필터, 검색, 인기글 조회 API를 구현한다.
* [ ] Phase 4: 프론트엔드 화면 구현 — 커뮤니티 목록, 게시글 상세, 검색, 카테고리 필터, 인기글, 북마크, 글쓰기 버튼 UI를 구현한다.
* [ ] Phase 5: 문서화 & 테스트 — Swagger 문서화, mock data 테스트, API 연동 테스트, 접근성 테스트, 브라우저 렌더링 테스트를 진행한다.
