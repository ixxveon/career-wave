# Implementation Plan: jobNotice

## Summary

> 공개 채용 공고 조회와 사용자 북마크 등록/해제 기능을 Spring Boot 사용자 백엔드 기준으로 구현한다.

## Technical Context

- Spring Boot 3.x / Java 21 / Spring Data JPA / Spring Security with JWT
- PostgreSQL, QueryDSL, `ApiResponse<T>`, 1-based page 계약, 내부 Pageable `page - 1` 변환
- FastAPI 연동 없음, Swagger 어노테이션은 `docs` 인터페이스에 분리

## Project Structure

```text
user/jobnotice/
├── controller/   UserJobNoticeController.java
├── service/      UserJobNoticeService.java
├── service/impl/ UserJobNoticeServiceImpl.java
├── repository/   JobNoticeRepository.java
├── repository/   JobNoticeQueryRepository.java
├── repository/   BookmarkRepository.java
├── entity/       JobNotice.java
├── entity/       Bookmark.java
├── dto/          JobNoticeDTO.java
├── type/         JobNoticeStatus.java / JobType.java / CompanySize.java / CareerLevel.java
└── docs/         UserJobNoticeControllerDocs.java

global/
├── exception/    ErrorCode.java / CustomException.java / GlobalExceptionHandler.java
└── response/     ApiResponse.java
```

## Phases

- [x] Phase 1: Entity — `job_notices`, `bookmarks` ERD 기준 엔티티와 Enum 매핑을 먼저 고정한다.
- [x] Phase 2: Repository & QueryDSL — 공개 공고 조회, 동적 검색 조건, 북마크 존재 확인에 필요한 저장소 계약과 QueryDSL 쿼리를 정의한다.
- [x] Phase 3: Service — 공개 상태 필터링, Optional 인증 응답 계산, 북마크 비즈니스 규칙을 서비스 계층에 구현한다.
- [x] Phase 4: API — 사용자 JobNotice 조회/북마크 엔드포인트와 `ROLE_USER` 권한 정책을 API 계층에 반영한다.
- [x] Phase 5: Documentation — Swagger docs 인터페이스와 스펙 문서를 최종 API 계약 기준으로 정렬한다.
- [x] Phase 6: Test — 공개 노출 규칙, 북마크 예외 처리, `ApiResponse<T>`, 1-based 페이지네이션 계약을 검증한다.
