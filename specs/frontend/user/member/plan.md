# Implementation Plan: Member Auth

> 작성자: 마은재 | 작성일: 2026-05-31  
> 관련 문서: `constitution.md` / `tasks.md` / `spec.md` / `api-schema.md` / `checklist.md`  
> 레이어: **Frontend Only / Backend Ready**

---

## Summary

사용자 로그인, 개인/기업회원 가입, 소셜 가입 추가정보, 계정 찾기, 비밀번호 재설정, 인증번호 검증, 기업회원 승인 상태 대응을 구현하고 백엔드 인증/회원 API와 연결 가능한 계약을 정의한다.

## 구현 상태 표기

- `[x]` 구현 완료
- `[-]` 부분 구현 또는 추가 검증 필요
- `[ ]` 미구현

## PR Phase Mapping

팀 작업 지시에 따라 PR은 아래 Phase 기준으로 분리한다. 기존 문서의 세부 Phase는 기능 묶음 기준이며, 실제 구현 PR은 이 표를 우선한다.

| PR Phase | Branch | Scope |
|----------|--------|-------|
| Phase 1 | `feature/user-auth-base` | 회원 인증 공통 타입, API 인터페이스, form schema, 공통 인증 컴포넌트/유틸 정리 |
| Phase 2 | `feature/user-auth-signup` | 일반/기업 회원가입 기능 구현 및 인증 흐름 연동 |
| Phase 3 | `feature/user-auth-login` | 일반/기업 로그인 기능 구현 및 토큰 처리 |
| Phase 4 | `feature/user-auth-find-account` | 아이디 찾기, 비밀번호 찾기, 새 비밀번호 설정 기능 구현 |

---

## Technical Context

| 분류 | 선택 | 근거 |
|------|------|------|
| 라우팅 | `/auth/*` | 로그인, 회원가입, 계정 복구 흐름을 인증 도메인으로 집중 |
| 서버 상태 | `TanStack Query` 또는 인증 전용 훅 | 내 회원 상태, 기업 승인 상태, 인증 세션 재조회 및 에러 처리 |
| 입력 폼 상태 | React local state / 폼 훅 | 로그인·가입·찾기 입력은 단기 상태이며 전역 공유 불필요 |
| 파일 검증 | 클라이언트 1차 검증 + 서버 2차 검증 | 재직증명서 PDF 위장 파일, 용량 초과, 악성 파일 업로드 방어 |
| 세션 유지 | JWT Bearer access token + refresh HttpOnly cookie 옵션 | access token은 메모리 보관, refresh token은 쿠키 사용. `localStorage` 저장 금지 |
| 인증번호 | 서버 발급 `verificationToken` | 프론트 boolean 조작으로 인증 완료 우회 방지 |
| 스타일링 | 기존 Career Wave UI/CSS 컨벤션 | 신규 디자인 시스템 도입 없이 기존 톤 유지 |

### 전제 조건

- 백엔드가 로그인 성공 시 `memberType`, `memberStatus`, `companyApprovalStatus`를 반환한다.
- 비로그인 API를 제외한 사용자 회원 API는 `Authorization: Bearer {accessToken}` 헤더를 사용한다.
- 이메일/SMS 인증번호 발송은 백엔드 또는 외부 발송 서비스가 담당하며, 프론트는 발송 상태와 재전송 쿨다운만 표시한다.
- 기업회원 재직증명서 파일은 공개 URL이 아닌 서버 관리 file id 또는 비공개 object key로 추적한다.
- 블랙리스트, 계정 잠금, 제재 상태는 관리자/보안 도메인에서 결정되며 사용자 프론트는 결과 상태만 표시한다.
- ERD 초안의 `Members`, `CompanyProfiles`, `PersonalProfiles`, `HrManagers`, `SuspendHistories`는 참고만 한다. enum, PK 타입, 구독 필드 위치, 제재 관계는 backend spec에서 재정의가 필요하다.

---

## Project Structure

```txt
src/user/
├── pages/auth/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── RegisterVerifyPage.jsx
│   ├── FindAccountPage.jsx
│   ├── FindIdPage.jsx
│   └── FindPasswordPage.jsx
├── api/member/
│   ├── authApi.ts
│   ├── registerApi.ts
│   ├── verificationApi.ts
│   └── recoveryApi.ts
├── hooks/member/
│   ├── useLogin.ts
│   ├── useRegisterForm.ts
│   ├── useVerificationCode.ts
│   ├── useFindId.ts
│   └── useResetPassword.ts
├── types/
│   └── member.ts
└── utils/member/
    ├── validation.ts
    ├── passwordPolicy.ts
    └── fileValidation.ts
```

---

## Phases

### Phase 1: 인프라 세팅 & 타입 정의
- [x] `member.ts` — API DTO, 회원 유형, 계정 상태, 기업 승인 상태, 인증 상태 타입 정의
- [x] `api/member/` — 로그인/가입/인증/복구 API 함수 인터페이스 작성
- [x] TanStack Query 또는 인증 훅 queryKey 컨벤션 정의 (`me`, `memberStatus`, `companyApprovalStatus`)
- [x] 공통 에러 매핑 작성 (`401`, `403`, `409`, `423`, `429`)
- [ ] mock 응답과 실제 API 응답을 분리하는 adapter 설계

### Phase 2: 로그인 및 세션 진입
- [x] 개인/기업 로그인 탭 UI 및 폼 검증 구현
- [x] 로그인 요청 중복 제출 방지 및 실패 메시지 일반화
- [-] 로그인 성공 후 회원 상태 조회 및 protected route 진입 제어
- [x] 계정 정지/잠금/블랙리스트/기업 승인 대기 안내 UI 구현
- [x] 토큰 만료 및 401 응답 공통 처리

### Phase 3: 회원가입 및 인증
- [x] 개인회원 가입 폼 구현: 아이디, 이메일, 휴대폰, 비밀번호, 약관
- [x] 기업회원 가입 폼 구현: 기업정보, 담당자 정보, 재직증명서 PDF
- [x] 아이디 중복 확인, 인증번호 발송/확인/재전송 쿨다운 구현
- [x] 비밀번호 정책 및 필수 약관 검증 구현
- [x] PDF 확장자/MIME/size 검증 및 서버 검증 실패 UI 반영

### Phase 4: 계정 복구 플로우
- [x] `/auth/find-account` 개인/기업 선택 카드 구현
- [x] 개인/기업 아이디 찾기 인증 플로우 구현
- [x] 개인/기업 비밀번호 재설정 인증 플로우 구현
- [x] 마스킹된 아이디 결과와 보안 문구 정책 적용
- [x] reset token 만료/재시도 상태 처리

### Phase 5: 도메인 통합 및 승인 상태
- [ ] 소셜 가입 추가정보 입력 및 provider 충돌 처리
- [ ] 기업회원 승인 대기/승인/반려/보완 필요 상태 조회
- [ ] 승인 대기 기업회원의 서비스 접근 제한 처리
- [ ] Member 도메인과 Subscription 도메인 진입 경계 정리

### Phase 6: Polish & QA
- [-] `checklist.md` 전 항목 셀프 체크
- [-] a11y — 폼 label, 오류 메시지 연결, 모달 포커스, 키보드 조작 검증
- [-] 보안 검증 — 계정 존재 여부 노출, 민감정보 저장, XSS 렌더링, rate limit UI 확인
- [ ] 반응형 검증 — 모바일 375px, iOS Safari input/file 동작 확인
- [-] 최종 확인 — mock 데이터 제거, console 제거, build 통과
