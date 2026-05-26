# Implementation Plan: 플랫폼 관리자 (Manager)

## Summary
JWT 기반 관리자 인증 및 역할 제어 구현.

## Technical Context
- Spring Security + JJWT 0.12.x
- `ManagerRole`: SUPER_ADMIN / ADMIN
- Stateless 세션, AccessToken 1h / RefreshToken 7d

## Project Structure

```
domain/manager/
├── controller/   ManagerAuthController.java
├── service/      ManagerAuthService.java
├── repository/   ManagerRepository.java
├── entity/       Manager.java
├── dto/          LoginRequest.java, LoginResponse.java, TokenResponse.java
├── type/         ManagerRole.java
└── docs/         ManagerAuthDocs.java

global/
├── config/       SecurityConfig.java (JWT 필터 등록)
└── util/         JwtTokenProvider.java
```

## Phases
- [ ] Phase 1: JwtTokenProvider 구현
- [ ] Phase 2: SecurityConfig JWT 필터 연결
- [ ] Phase 3: ManagerAuthController (로그인, 토큰갱신)
- [ ] Phase 4: SUPER_ADMIN 권한 체크 AOP 또는 어노테이션
- [ ] Phase 5: Swagger 문서화
