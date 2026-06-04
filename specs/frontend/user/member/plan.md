# Implementation Plan: Member Auth

> 작성자: 마은재 | 작성일: 2026-05-31  
> 최근 정리일: 2026-06-03  
> 관련 문서: `constitution.md` / `tasks.md` / `spec.md` / `api-schema.md` / `checklist.md` / `review-guidelines.md`  
> 레이어: **Frontend Only / Backend Ready**

---

## Summary

사용자 인증 도메인은 로그인, 개인/기업 회원가입, 소셜 추가정보 입력, 아이디 찾기, 비밀번호 재설정, 인증번호 검증, 세션 복원 전략을 하나의 인증 경험으로 제공한다.  
현재 Phase 1~4 범위의 프론트 구현은 대부분 진행되었고, 이후 정리는 "현재 구현 구조를 유지하면서 contract / QA / 누락 상태를 문서와 다시 맞추는 것"을 목표로 한다.

## 구현 상태 표기

- `[x]` 구현 완료
- `[-]` 부분 구현 또는 추가 검증 필요
- `[ ]` 미구현

## Project Phase Alignment

팀에서 확정한 사용자 프론트 개발 순서를 기준으로 Member/Auth 도메인은 아래처럼 매핑한다.

| Project Phase | Branch | Member/Auth Scope |
|---------------|--------|-------------------|
| Phase 1 | `feature/user-auth-base` | 인증 공통 타입, API 인터페이스, 에러 매핑, query key, 세션 유틸, 공통 구조 정리 |
| Phase 2 | `feature/user-auth-login` | 개인/기업 로그인, 세션 처리, 상태별 차단 안내 |
| Phase 3 | `feature/user-auth-signup` | 개인/기업 회원가입, 중복 확인, 인증번호, 약관, PDF 검증 |
| Phase 4 | `feature/user-auth-find-account` | 아이디 찾기, 비밀번호 찾기, reset token 발급/재설정 |
| Phase 8 | `feature/user-frontend-qa` | social verify 보완, approval 상태 보완, 접근성/반응형/최종 QA |

> 참고:
> - social 추가정보 입력, 기업 승인 상태의 완전한 연동, 최종 접근성/반응형 검증은 현재 구현상 남아 있으므로 별도 "미완료 항목"으로 관리한다.
> - 이 문서는 더 이상 Login/Signup 순서를 뒤바꾸지 않는다. Phase 2는 Login, Phase 3은 Signup이다.

## Current Implementation Snapshot

### 완료된 범위

- [x] `api/member/`, `hooks/member/`, `utils/member/`, `types/member.ts` 기반 구조 분리
- [x] 개인/기업 로그인 UI, validation, submit orchestration, 세션 처리
- [x] 개인/기업 회원가입 UI, 중복 확인, 이메일/휴대폰 인증, 약관 검증, PDF 검증
- [x] 아이디 찾기 / 비밀번호 찾기 / 새 비밀번호 설정 플로우
- [x] verification timer, resend cooldown, remaining attempts 표시
- [x] stale response guard, recovery state reset, request snapshot 비교 로직
- [x] `review-guidelines.md` 기반 구조 분리 규칙 정리

### 부분 완료 범위

- [-] 로그인 성공 후 `memberStatus`, `companyApprovalStatus` 기반 보호 라우팅 완전 폐루프
- [-] social 가입 추가정보 입력 (`/auth/register/verify`)의 실제 API/인증 연동
- [-] 기업 승인 상태 재조회 및 새로고침 복원
- [-] 접근성 전체 점검 (tab semantics, modal focus, mobile QA, Lighthouse)

### 미완료 범위

- [ ] social provider 충돌 처리
- [ ] 기업 승인 대기/반려/보완 필요 상태의 별도 화면/플로우 완성
- [ ] Auth 이후 subscription/billing route 진입 제어와의 최종 통합 검증

---

## Technical Context

| 분류 | 선택 | 근거 |
|------|------|------|
| 라우팅 | `/auth/*` | 로그인, 회원가입, 계정 복구 흐름을 인증 도메인으로 집중 |
| 서버 상태 | 인증 전용 훅 + 필요 시 TanStack Query | 로그인/가입/복구는 mutation 중심이며, 상태 재조회는 hook 단에서 캡슐화 |
| 입력 폼 상태 | React local state + form orchestration hook | 로그인/가입/복구 입력은 페이지 전역 공유보다 화면 단 orchestration이 적합 |
| 세션 유지 | access token memory 우선 + refresh token/session 복원 전략 | `localStorage` 금지, 탭 단위 세션 복원 필요 |
| 인증번호 상태 | 서버 발급 `verificationToken`, `expiresAt`, `resendAvailableAt` 기반 | 프론트 boolean만으로 인증 완료 상태를 신뢰하지 않음 |
| 파일 검증 | 클라이언트 1차 검증 + 서버 2차 검증 | 재직증명서 PDF 업로드 보호 |
| 스타일링 | 기존 Career Wave UI/CSS 컨벤션 | 인증 화면 UI를 유지하면서 기능만 보강 |

### 전제 조건

- 로그인, 회원가입, 인증번호, 계정 복구 API는 `api-schema.md` 계약을 따른다.
- access token은 메모리 우선, refresh token은 HttpOnly cookie 우선이며, 백엔드 제약 시 `sessionStorage` 기반 탭 세션 복원을 허용한다.
- verification 완료 여부는 `verificationToken`으로 판단한다.
- recovery/verification 플로우는 요청 순서가 뒤집혀도 최신 사용자 입력 상태를 보호해야 한다.

---

## Project Structure

```txt
frontend/src/user/
├── pages/auth/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── RegisterVerifyPage.tsx
│   ├── FindAccountPage.tsx
│   ├── FindIdPage.tsx
│   ├── FindPasswordPage.tsx
│   └── ProfilePage.tsx
├── components/member/
│   ├── LoginForm.tsx
│   ├── LoginTypeTabs.tsx
│   ├── PersonalRegisterForm.tsx
│   ├── CompanyRegisterForm.tsx
│   ├── RegisterFormPrimitives.tsx
│   ├── Recovery*.tsx
│   └── SocialLoginButtons.tsx
├── api/member/
│   ├── authApi.ts
│   ├── registerApi.ts
│   ├── verificationApi.ts
│   ├── recoveryApi.ts
│   └── memberApiClient.ts
├── hooks/member/
│   ├── useLoginForm.ts
│   ├── useLogin.ts
│   ├── usePersonalRegisterForm.ts
│   ├── useCompanyRegisterForm.ts
│   ├── useFindIdRecovery.ts
│   ├── useFindPasswordRecovery.ts
│   ├── useVerificationCode.ts
│   ├── useMemberStatus.ts
│   └── queryKeys.ts
├── utils/member/
│   ├── authSession.ts
│   ├── errorMapping.ts
│   ├── loginSchema.ts
│   ├── registerSchema.ts
│   ├── recoverySchema.ts
│   ├── registerTerms.ts
│   ├── recoveryView.ts
│   ├── fileValidation.ts
│   ├── passwordPolicy.ts
│   └── validation.ts
└── types/
    └── member.ts
```

---

## Data Flow

1. 사용자가 `/auth/login`, `/auth/register`, `/auth/find-account` 계열 페이지에 진입한다.
2. page는 route entry와 화면 조합만 담당하고, 실제 submit/verification/session orchestration은 `hooks/member/`가 담당한다.
3. hook은 `api/member/` 호출과 `utils/member/` validation/schema를 이용해 요청을 구성한다.
4. verification/recovery 요청은 `verificationToken`, `expiresAt`, `resendAvailableAt`, `remainingAttempts`를 상태로 저장한다.
5. 인증 방식 전환 또는 member type 전환 시 이전 verification 상태와 in-flight request를 무효화한다.
6. 로그인/복구 성공 후 후속 라우팅 또는 success panel 렌더링은 최신 snapshot 검증을 통과한 경우에만 반영한다.

## State Ownership

- page 상태: 현재 탭, route 기반 member type, page-level 조합
- form 상태: `useLoginForm`, `usePersonalRegisterForm`, `useCompanyRegisterForm`, recovery hooks
- verification/recovery 상태: 각 recovery/register hook 내부
- session 상태: `authSession.ts` 및 로그인 관련 hook
- API contract / request mapping: `api/member/`, `types/member.ts`, `*Schema.ts`

## Risks

- 로그인 상태/승인 상태 route guard가 backend 응답과 완전히 닫히지 않으면 실제 보호 흐름과 차이가 날 수 있다.
- social verify 페이지는 현재 실제 API 연동이 약하므로 문서에 "부분 완료"로 남겨야 한다.
- recovery 플로우는 인증 방식 전환, 재전송, stale response 처리 누락 시 회귀 위험이 높다.
- approval 상태와 subscription/billing 진입 차단은 다른 도메인과 맞물려 있으므로 Member 문서만으로 완료 처리하면 안 된다.

---

## Phase Breakdown

### Phase 1 — Auth Base
- [x] `member.ts` — API DTO, 회원 유형, 계정 상태, 기업 승인 상태, 인증 상태 타입 정의
- [x] `api/member/` — 로그인/가입/인증/복구 API 함수 인터페이스 작성
- [x] query key / 공통 에러 매핑 / 세션 유틸 정리
- [-] mock 응답과 실제 API 응답 adapter 분리

### Phase 2 — Login
- [x] 개인/기업 로그인 탭 UI 및 폼 검증 구현
- [x] 로그인 요청 중복 제출 방지 및 실패 메시지 일반화
- [-] 로그인 성공 후 회원 상태 기반 protected route 진입 제어 완결
- [x] 계정 정지/잠금/블랙리스트/기업 승인 대기 안내 UI 구현
- [x] 토큰 만료 및 401 응답 공통 처리

### Phase 3 — Signup
- [x] 개인회원 가입 폼 구현: 아이디, 이메일, 휴대폰, 비밀번호, 약관
- [x] 기업회원 가입 폼 구현: 기업정보, 담당자 정보, 재직증명서 PDF
- [x] 아이디 중복 확인, 인증번호 발송/확인/재전송 쿨다운 구현
- [x] 비밀번호 정책 및 필수 약관 검증 구현
- [x] PDF 확장자/MIME/size 검증 및 서버 검증 실패 UI 반영
- [-] social 추가정보 입력의 실제 API/인증 연동

### Phase 4 — Find Account
- [x] `/auth/find-account` 개인/기업 선택 카드 구현
- [x] 개인/기업 아이디 찾기 인증 플로우 구현
- [x] 개인/기업 비밀번호 재설정 인증 플로우 구현
- [x] 마스킹된 아이디 결과와 보안 문구 정책 적용
- [x] reset token 만료/재시도 상태 처리
- [x] stale response guard 및 recovery state reset 처리

### Phase 8 — Frontend QA
- [-] `checklist.md` 전 항목 셀프 체크
- [-] a11y — 폼 label, 오류 메시지 연결, 모달 포커스, 키보드 조작 검증
- [-] 보안 검증 — 계정 존재 여부 노출, 민감정보 저장, XSS 렌더링, rate limit UI 확인
- [ ] 반응형 검증 — 모바일 375px, iOS Safari input/file 동작 확인
- [-] 최종 확인 — mock/MSW 경계, console 제거, build 통과
