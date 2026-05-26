# Tasks: 플랫폼 관리자 (Manager)

## Phase 1 - Setup
- [ ] JwtTokenProvider 구현 (토큰 생성/검증/파싱)
- [ ] JwtAuthenticationFilter 구현
- [ ] SecurityConfig에 필터 체인 등록

## Phase 2 - Foundational
- [ ] Manager 엔티티 완성 (password 암호화 전략 결정)
- [ ] ManagerRepository 기본 쿼리 확인

## Phase 3 - P1 로그인
- [ ] LoginRequest / LoginResponse DTO 작성
- [ ] ManagerAuthService.login() 구현
- [ ] ManagerAuthController POST /api/admin/auth/login
- [ ] 인증 실패 예외 → ErrorCode.UNAUTHORIZED

## Phase 4 - P2 권한 제어
- [ ] @RequiresSuperAdmin 커스텀 어노테이션 또는 SecurityConfig 경로 제어
- [ ] POST /api/admin/managers (SUPER_ADMIN 전용)
- [ ] DELETE /api/admin/managers/{id}

## Phase 5 - Polish
- [ ] ManagerAuthDocs 인터페이스 작성 (Swagger)
- [ ] 통합 테스트 작성
