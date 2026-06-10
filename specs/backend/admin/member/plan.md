# Implementation Plan: 회원관리 API (Member Management)

**버전**: v1
**Status**: Draft

---

## Summary

> 관리자 어드민의 개인 회원 조회·제재 및 기업 회원 심사 REST API 구현.

---

## Technical Context

- Spring Boot 3.x / Java 21
- Spring Data JPA + QueryDSL (동적 필터링)
- Spring Security (JWT 인증, ROLE_ADMIN 권한)
- PostgreSQL
- `ApiResponse<T>` 공통 응답 래퍼
- `CustomException` / `ErrorCode` 기반 예외 처리

---

## Project Structure

```text
admin/member/
├── controller/   AdminMemberController.java
├── service/      AdminMemberService.java
├── repository/   MemberRepository.java
│                 HrManagerRepository.java
│                 SuspendHistoryRepository.java
├── entity/       Member.java
│                 HrManager.java
│                 SuspendHistory.java
├── dto/          MemberDTO.java
│                 HrManagerDTO.java
├── type/         MemberStatus.java
│                 RoleType.java
│                 SubscriptionStatus.java
│                 SanctionType.java
│                 SuspendDuration.java
│                 HrStatus.java
│                 PermissionLevel.java
└── docs/         AdminMemberControllerDocs.java

global/
├── exception/    CustomException.java
│                 ErrorCode.java (MEMBER_NOT_FOUND 등 추가)
│                 GlobalExceptionHandler.java
└── response/     ApiResponse.java
```

---

## Phases

- [ ] Phase 1: Entity & Enum 정의
- [ ] Phase 2: Repository 구현 (동적 필터링 쿼리 포함)
- [ ] Phase 3: Service 구현 (제재 처리 / 승인·반려 트랜잭션)
- [ ] Phase 4: Controller & Swagger Docs 구현
- [ ] Phase 5: 문서화 & 테스트
