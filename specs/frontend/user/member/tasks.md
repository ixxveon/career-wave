# Tasks: Member Auth

> `plan.md`의 Phase와 1:1 대응한다.  
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

> PR 업로드는 팀 작업 지시의 `feature/user-auth-base` → `feature/user-auth-signup` → `feature/user-auth-login` → `feature/user-auth-find-account` 순서를 따른다.

---

## Phase 1 — 타입/API 계약 정의

- [ ] `member.ts` 타입 정의: `MemberType`, `MemberStatus`, `CompanyApprovalStatus`, `VerificationChannel`, `VerificationStatus`
- [ ] ERD 초안과 불일치하는 필드 목록 정리: `subscription_status`, `password`, `role_type`, `suspend_history` 관계, `HrManagers` 승인 상태
- [ ] `api/member/` 인터페이스 설계: auth, register, verification, recovery 모듈 분리
- [ ] 공통 에러 매핑 정의: 400/401/403/409/423/429/500
- [ ] 보안 민감 메시지 카피 정의: 계정 존재 여부 미노출, 블랙리스트/제재 사유 일반화
- [ ] mock state와 실제 API 응답 필드의 매핑표 작성

## Phase 2 — 로그인 및 세션 진입

- [ ] `/auth/login` 개인/기업 로그인 탭 UI 상태 구현
- [ ] 아이디/비밀번호 입력 검증 및 submit 중복 클릭 방지
- [ ] 로그인 API 연동 훅 `useLogin` 구현
- [ ] 로그인 성공 후 `memberStatus`, `memberType`, `companyApprovalStatus` 기반 라우팅 처리
- [ ] 승인 대기 기업회원, 정지 회원, 영구정지/블랙리스트 회원 안내 UI 구현
- [ ] 소셜 로그인 버튼 UI와 provider callback 이후 추가정보 진입 경로 정의
- [ ] 토큰 만료/401 발생 시 세션 정리 및 로그인 페이지 복귀 처리

## Phase 3 — 회원가입 및 인증

- [ ] `/auth/register` 개인/기업 탭 전환 구현
- [ ] 필수 약관 동의 상태와 제출 버튼 활성화 조건 구현
- [ ] 개인회원 가입 폼: 아이디, 이메일, 휴대폰, 비밀번호, 비밀번호 확인
- [ ] 아이디 중복 확인 API 상태: unchecked/checking/available/duplicated/error
- [ ] 이메일/휴대폰 인증번호 발송, 확인, 재전송 쿨다운, 만료 상태 구현
- [ ] 비밀번호 정책 검증: 길이, 복잡도, 재입력 일치, loginId 포함 금지
- [ ] 기업회원 가입 폼: 기업명, 사업자등록번호, 대표자명, 주소, 담당자 정보
- [ ] 재직증명서 PDF 업로드 1차 검증: 확장자, MIME, size, 파일명 표시
- [ ] 기업회원 가입 신청 완료 모달 및 승인 대기 안내 구현
- [ ] 네트워크 실패 또는 파일 업로드 실패 시 재시도 UI 구현

## Phase 4 — 계정 찾기 및 비밀번호 재설정

- [ ] `/auth/find-account` 개인/기업 선택 카드 및 이동 경로 구현
- [ ] `/auth/find-id/user` 이메일/휴대폰 인증 방식 선택 구현
- [ ] `/auth/find-id/company` 담당자명, 사업자등록번호, 담당자 이메일 인증 구현
- [ ] 아이디 찾기 결과 마스킹 표시 정책 적용
- [ ] `/auth/find-password/user` 아이디 입력 + 인증 완료 후 새 비밀번호 입력 구현
- [ ] `/auth/find-password/company` 기업 담당자 인증 + 새 비밀번호 입력 구현
- [ ] 비밀번호 재설정 완료 후 로그인 페이지 CTA 구현
- [ ] 인증 실패/만료/시도 횟수 초과 상태별 UI 구현

## Phase 5 — 소셜 가입 추가정보 및 승인 상태

- [ ] `/auth/register/verify` 소셜 가입 추가정보 입력 폼 구현
- [ ] provider에서 받은 이메일/이름이 수정 가능한지 정책 반영
- [ ] 소셜 가입 휴대폰 인증 및 필수 약관 동의 구현
- [ ] 기업회원 승인 상태 조회 훅 구현: pending/approved/rejected/needsRevision
- [ ] 반려/보완 요청 상태에서 사유 표시 범위와 재신청 CTA 구현
- [ ] 승인 대기 상태에서 서비스 제한 안내 및 고객센터/마이페이지 CTA 구현

## Phase 6 — 보안/접근성/반응형 QA

- [ ] 인증번호 요청 rate limit UI 확인: 쿨다운, 재시도 횟수, 429 메시지
- [ ] 중복 제출 방지 확인: 로그인, 가입, 인증번호 확인, 비밀번호 재설정
- [ ] 민감정보 저장소 점검: password/code/token이 localStorage/sessionStorage에 저장되지 않는지 확인
- [ ] XSS 방어 점검: 사용자/기업 입력값 렌더링 시 HTML 삽입 없음
- [ ] 모바일 375px 기준 로그인/가입/찾기 화면 입력 UX 확인
- [ ] 키보드 접근성 확인: 탭 전환, 약관 체크, 모달 포커스, 오류 메시지 연결
- [ ] mock 데이터와 console/debug 코드 제거
- [ ] `checklist.md` 기반 최종 점검 및 build 통과 확인
