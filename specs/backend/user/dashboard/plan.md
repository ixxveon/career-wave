# Implementation Plan: 사용자 대시보드

## Summary

> 로그인 사용자의 내 정보, GitHub 연동 상태, 스크랩 공고 데이터를 제공하기 위한 사용자 대시보드 백엔드 API를 구현한다.

## Technical Context

> 사용하는 주요 기술, 전략, 전제 조건을 기술한다.

- Spring Boot 기반 사용자 Dashboard REST API 구현
- 최신 Convention 기준 사용자 API 경로 `/api/v1/user/dashboard` 사용
- JWT 인증 기반 로그인 사용자 정보 조회
- `ROLE_USER` 권한을 기준으로 사용자 API 접근 제어
- `members`, `personal_profiles`, `bookmarks`, `job_notices` 테이블 기반 데이터 조회
- `ApiResponse<T>` 기반 성공/실패 응답 형식 통일
- `CustomException` + `ErrorCode` 기반 예외 처리
- Controller Swagger Annotation은 `docs/DashboardControllerDocs.java`로 분리
- DTO는 `DashboardDTO.java` 단일 파일 내 Request/Response Inner Class 구조 우선 사용
- Entity를 API 응답으로 직접 반환하지 않음

## Project Structure

```text
backend/src/main/java/kr/co/carrer/user/dashboard/
├── controller/
├── service/
├── dto/
└── docs/

backend/src/test/java/kr/co/carrer/user/dashboard/
```

> Repository, type 패키지는 실제 구현 시 기존 도메인 구조와 ERD 매핑을 확인한 뒤 필요한 경우에만 추가한다.
> 존재하지 않는 클래스나 패키지는 추측해서 생성하지 않는다.

## Phases

- [ ] Phase 1: API 계약 정리 — `spec.md`와 `api-schema.md` 기준으로 Dashboard 백엔드 API 범위 확정
- [ ] Phase 2: DTO 및 응답 구조 설계 — `DashboardDTO` Request/Response 구조와 `ApiResponse<T>` 응답 형식 정의
- [ ] Phase 3: 내 정보 및 GitHub 정보 조회 API 설계 — 로그인 사용자 기준 프로필 정보와 GitHub URL 기반 연동 상태 조회
- [ ] Phase 4: 회원 정보 수정 API 설계 — 이름, 휴대폰 번호, GitHub URL 수정 요청 및 검증 규칙 정의
- [ ] Phase 5: 스크랩 공고 API 설계 — 스크랩 목록 조회, 검색, 최신순 정렬, JobNotice 상태 정책 연동, 스크랩 취소 흐름 정의
- [ ] Phase 6: 예외 처리 및 Swagger 문서화 — `ErrorCode`, `CustomException`, `DashboardControllerDocs` 기준 문서화
- [ ] Phase 7: 테스트 및 검증 — 서비스 단위 테스트, 권한/본인 데이터 접근 검증, 빌드 검증
