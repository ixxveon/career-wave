# Tasks: Member Auth

> `plan.md`의 Project Phase Alignment를 따른다.  
> 각 항목은 하나의 커밋 또는 하나의 PR 리뷰 단위로 쪼갤 수 있어야 한다.

> 프로젝트 순서:
> `feature/user-auth-base` → `feature/user-auth-login` → `feature/user-auth-signup` → `feature/user-auth-find-account` → `feature/user-frontend-qa`

---

## Phase 1 — Auth Base

- [x] `member.ts` 타입 정의: `MemberType`, `MemberStatus`, `CompanyApprovalStatus`, `VerificationChannel`, `VerificationStatus`
- [x] `api/member/` 인터페이스 설계: auth, register, verification, recovery 모듈 분리
- [x] 공통 에러 매핑 정의: 400/401/403/409/423/429/500
- [x] 보안 민감 메시지 카피 정의: 계정 존재 여부 미노출, 블랙리스트/제재 사유 일반화
- [x] `queryKeys`, `authSession`, `passwordPolicy`, `fileValidation` 등 공통 유틸 정리
- [ ] mock state와 실제 API 응답 필드의 adapter 작성

## Phase 2 — Login

- [x] `/auth/login` 개인/기업 로그인 탭 UI 상태 구현
- [x] 아이디/비밀번호 입력 검증 및 submit 중복 클릭 방지
- [x] 로그인 submit orchestration hook 구현
- [-] 로그인 성공 후 `memberStatus`, `memberType`, `companyApprovalStatus` 기반 라우팅 완결
- [x] 승인 대기 기업회원, 정지 회원, 영구정지/블랙리스트 회원 안내 UI 구현
- [x] 소셜 로그인 버튼 UI 유지
- [x] 토큰 만료/401 발생 시 세션 정리 및 로그인 페이지 복귀 처리

## Phase 3 — Signup

- [x] `/auth/register` 개인/기업 탭 전환 구현
- [x] 필수 약관 동의 상태와 제출 버튼 활성화 조건 구현
- [x] 개인회원 가입 폼: 아이디, 이메일, 휴대폰, 비밀번호, 비밀번호 확인
- [x] 아이디 중복 확인 API 상태: unchecked/checking/available/duplicated/error
- [x] 이메일/휴대폰 인증번호 발송, 확인, 재전송 쿨다운, 만료 상태 구현
- [x] 비밀번호 정책 검증: 길이, 복잡도, 재입력 일치, loginId 포함 금지
- [x] 기업회원 가입 폼: 기업명, 사업자등록번호, 대표자명, 주소, 담당자 정보
- [x] 재직증명서 PDF 업로드 1차 검증: 확장자, MIME, size, 파일명 표시
- [x] 기업회원 가입 신청 완료 모달 및 승인 대기 안내 구현
- [x] 네트워크 실패 또는 파일 업로드 실패 시 재시도 UI 구현
- [-] `/auth/register/verify` social 추가정보 입력 실제 연동

## Phase 4 — Find Account

- [x] `/auth/find-account` 개인/기업 선택 카드 및 이동 경로 구현
- [x] `/auth/find-id/user` 이메일/휴대폰 인증 방식 선택 구현
- [x] `/auth/find-id/company` 담당자명, 사업자등록번호, 담당자 이메일 인증 구현
- [x] 아이디 찾기 결과 마스킹 표시 정책 적용
- [x] `/auth/find-password/user` 아이디 입력 + 인증 완료 후 새 비밀번호 입력 구현
- [x] `/auth/find-password/company` 기업 담당자 인증 + 새 비밀번호 입력 구현
- [x] 비밀번호 재설정 완료 후 로그인 페이지 CTA 구현
- [x] 인증 실패/만료/시도 횟수 초과 상태별 UI 구현
- [x] 인증 방식 전환 시 recovery verification 상태 초기화
- [x] stale request / stale response가 최신 success state를 덮지 않도록 보호

## Phase 8 — Frontend QA / Outstanding

- [ ] social provider 정보 충돌 처리
- [ ] 기업 승인 상태 조회/복원/별도 화면 정리
- [ ] 승인 대기/제재 회원의 subscription/billing 진입 차단 최종 검증
- [-] 접근성 점검: tab semantics, label, error linkage, modal focus, aria-live
- [ ] 모바일 375px 기준 로그인/가입/복구 화면 검증
- [-] mock/MSW 분리 및 개발 환경 경계 점검
- [-] `checklist.md` 기반 최종 점검 및 build 통과 확인
