# Constitution: Member Auth 도메인

> 작성자: 마은재 | 작성일: 2026-05-31  
> 관련 문서: `plan.md` / `tasks.md` / `spec.md` / `api-schema.md` / `checklist.md`  
> 레이어: **Frontend Only / Backend Ready**

---

## 0. 컨벤션

* **Feature Branch**: `feature/user-member-{기능명}` (예: `feature/user-member-auth`)
* **PR 제목 예시**: `[MEMBER] 사용자 인증 및 계정 복구 기능 구현`
* **파일 경로 원칙**:
  * 페이지: `src/user/pages/auth/`
  * API 호출: `src/user/api/member/`
  * 상태/사이드이펙트 훅: `src/user/hooks/member/`
  * 타입: `src/user/types/member.ts`
  * 유효성 검사: `src/user/utils/member/validation.ts`
* **문서 범위**: 사용자 로그인, 회원가입, 소셜 가입 추가정보, 아이디 찾기, 비밀번호 재설정, 개인/기업회원 가입, 기업회원 승인 대기 상태, 인증/제재/블랙리스트 UI 대응을 포함한다.

### 예외: 순차 의존 피처

* Phase N+1이 Phase N의 코드를 필요로 하는 경우, Phase N 브랜치에서 분기하여 작업할 수 있다.
* 단, 머지 순서는 반드시 Phase N -> Phase N+1 순서를 지킨다.
* PR 본문에는 의존 브랜치와 선행 PR을 명시한다.
* 선행 Phase가 머지되기 전에는 후행 Phase PR을 merge하지 않는다.

---

## 1. 도메인 원칙

* **인증 신뢰 경계**: 프론트엔드는 로그인 성공/실패를 임의 판단하지 않는다. 계정 상태, 권한, 승인 여부, 제재 여부는 백엔드 응답을 기준으로 렌더링한다.
* **정보 노출 최소화**: 아이디 찾기, 비밀번호 찾기, 인증번호 전송 실패 화면에서 특정 이메일/휴대폰/아이디의 가입 여부를 직접 노출하지 않는다.
* **회원 유형 분리**: 개인회원(`USER`)과 기업회원(`COMPANY`)은 동일한 인증 기반을 공유하되, 가입 입력값과 승인 상태는 분리한다.
* **기업회원 승인제**: 기업회원은 가입 신청 직후 서비스 전체 이용이 허용되지 않는다. 승인 대기, 승인, 반려, 보완 요청 상태가 UI에서 명확히 표현되어야 한다.
* **보안 우선 UX**: 과도한 보안 메시지를 숨기지 않되, 공격자가 계정 존재 여부나 제재 사유를 추론할 수 있는 문구는 피한다.
* **배포 환경 회복력**: 네트워크 단절, 새로고침, 중복 클릭, 인증번호 만료, 토큰 만료, 모바일 입력 오류가 사용자 플로우를 깨뜨리지 않도록 상태를 설계한다.

---

## 2. 상태 머신

### 2.1 로그인 UI 상태

```
IDLE
  -> SUBMITTING
  -> AUTHENTICATED
  -> BLOCKED
  -> ERROR

ERROR -> IDLE
BLOCKED -> IDLE
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| IDLE -> SUBMITTING | 허용 | 로그인 요청 시작 |
| SUBMITTING -> AUTHENTICATED | 허용 | 인증 성공 및 토큰 수신 |
| SUBMITTING -> BLOCKED | 허용 | 정지, 영구정지, 블랙리스트, 기업 승인 대기 등 로그인 후 이용 제한 |
| SUBMITTING -> ERROR | 허용 | 인증 실패, 네트워크 실패, 서버 오류 |
| ERROR -> IDLE | 허용 | 사용자가 입력값 수정 또는 재시도 |

### 2.2 회원 상태 매핑

> 아래 값은 프론트엔드 계약안이다. 현재 ERD 초안의 `member_status`, `role_type`, `subscription_status`는 실제 백엔드 계약 확정 시 enum 명칭과 책임을 재검토한다.
> `WITHDRAWN`, `LOCKED`, `BLACKLISTED`는 현재 ERD 초안에 없는 UI/보안 상태이므로 backend spec에서 enum을 확장하거나, API 응답에서 `restriction.restrictionType`을 통해 프론트 상태로 매핑해야 한다.

| 백엔드 상태 후보 | 프론트 표시 정책 | 비고 |
|------------------|------------------|------|
| `ACTIVE` | 정상 로그인/이용 가능 | 기본 |
| `SUSPENDED` | 로그인 제한 또는 이용 제한 안내 | `suspendEndDate` 표시 여부는 정책 확정 필요 |
| `BANNED` | 영구 제한 안내, 고객센터 CTA | 상세 사유 노출 금지 |
| `WITHDRAWN` | 탈퇴 계정 안내 | ERD 초안에는 없음, 추가 필요 |
| `LOCKED` | 반복 실패/보안 잠금 안내 | ERD 초안에는 없음, 추가 필요 |
| `BLACKLISTED` | 가입/로그인 제한 안내 | ERD 초안에는 없음, 추가 필요 |

### 2.3 기업회원 승인 상태

```
DRAFT -> SUBMITTED -> PENDING_REVIEW -> APPROVED
                                      -> REJECTED
                                      -> NEEDS_REVISION
```

| 상태 | UI 의미 |
|------|---------|
| `DRAFT` | 입력 중, API 제출 전 |
| `SUBMITTED` | 가입 신청 완료 모달 표시 |
| `PENDING_REVIEW` | 관리자 승인 대기 |
| `APPROVED` | 기업회원 서비스 이용 가능 |
| `REJECTED` | 반려 안내 및 재신청 CTA |
| `NEEDS_REVISION` | 보완 필요 항목 안내 |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| API 레이어 분리 | View 컴포넌트에서 `fetch`/`axios` 직접 호출 금지, `api/member/`와 `hooks/member/`로 분리 | 백엔드 연동 시 필드/에러 매핑 변경 범위 최소화 |
| 서버 상태 관리 | 로그인 세션, 프로필 조회, 승인 상태 조회는 TanStack Query 또는 인증 전용 훅으로 관리 | 새로고침/재조회/에러 상태 일관성 |
| 폼 상태 관리 | 로그인/가입/찾기 입력값은 React local state 또는 폼 훅으로 관리 | 단기 입력 상태이며 전역 공유 불필요 |
| 토큰 저장 | access token은 메모리 또는 보안 쿠키 전략 우선, refresh token은 HttpOnly Secure SameSite 쿠키 권장. 단, 새로고침 후 세션 복원 bootstrap 경로를 함께 설계한다. | XSS로 인한 토큰 탈취를 줄이면서도 실사용 세션 복원력 확보 |
| 임시 인증 상태 | 인증번호 확인 완료 상태는 서버 발급 `verificationToken` 또는 서버 세션을 기준으로 검증 | 프론트 boolean 조작 방지 |
| 파일 업로드 | 재직증명서 PDF는 프론트 1차 검증 후 서버 2차 검증, 악성 파일 검사는 백엔드/스토리지 책임 | 확장자 위조 및 악성 업로드 방어 |
| 오류 메시지 | 보안 민감 오류는 일반화된 문구, 사용자가 수정 가능한 입력 오류는 구체화 | UX와 보안 균형 |

---

## 4. 불변 규칙 (Invariants)

* API 호출 로직은 View 컴포넌트에 직접 작성하지 않는다.
* 로그인 성공 후에도 `memberStatus`, `roleType`, `companyApprovalStatus`를 확인하기 전 protected route 접근을 허용하지 않는다.
* 비밀번호, 인증번호, 토큰, 주민성 민감 데이터는 `localStorage`에 저장하지 않는다.
* access token을 메모리에만 보관하더라도, 앱 초기 진입 시 refresh cookie 또는 동등한 보안 전략을 통해 세션 복원 가능 여부를 1회 확인해야 한다.
* 아이디 찾기/비밀번호 찾기는 계정 존재 여부를 공격자가 추론할 수 있는 응답 문구를 사용하지 않는다.
* 인증번호 재전송은 쿨다운과 요청 횟수 제한 UI를 가진다. 실제 rate limit은 백엔드가 강제한다.
* 기업회원 가입은 재직증명서 PDF 첨부 및 기업정보 검증이 완료되어야 제출 가능하다.
* 파일명, 기업명, 사용자 입력값은 화면 렌더링 시 escaping 전제를 가진 컴포넌트로만 표시한다. `dangerouslySetInnerHTML` 사용 금지.
* 블랙리스트/제재/잠금 상태는 프론트에서 임의 해제하지 않는다.
* 모달/토스트는 보조 안내이며, 핵심 오류 상태는 화면 본문에서도 접근 가능해야 한다.

---

## 5. 연동 계약

* **Backend Member API**: 로그인, 회원가입, 인증번호, 계정 찾기, 비밀번호 재설정, 기업회원 승인 상태를 제공한다.
* **Admin Member API**: 기업회원 승인/반려/보완 요청, 제재/블랙리스트 처리를 수행한다. 사용자 프론트는 결과 상태만 조회한다.
* **Storage/File API**: 재직증명서 PDF 업로드 URL 또는 multipart 업로드를 제공한다. 업로드된 파일 URL은 공개 URL이 아니어야 한다.
* **Notification API**: 이메일/SMS 인증번호 발송을 담당한다. 프론트는 발송 성공 여부와 쿨다운만 표시한다.
* **Subscription 도메인**: 로그인 후 구독 상태가 필요할 수 있으나, 회원 도메인의 `subscriptionStatus`는 표시 보조 정보이며 구독 상세 계약은 `subscription`에서 관리한다.

---

## 6. 금지 패턴

* `localStorage`에 access token, refresh token, password, verification code 저장 금지.
* "해당 이메일은 가입되어 있지 않습니다"처럼 계정 존재 여부를 직접 노출하는 문구 금지.
* 프론트에서 인증 완료 boolean만 믿고 비밀번호 재설정 API 호출 금지.
* 기업회원 승인 대기 상태를 프론트 라우팅만으로 우회 가능하게 만드는 패턴 금지.
* 업로드 파일 검증을 확장자 문자열만으로 처리 금지. MIME, size, 서버 검증 결과를 함께 반영한다.
* 로그인 실패 횟수, 제재 상세 사유, 블랙리스트 매칭 기준을 사용자에게 직접 노출 금지.
* ERD 초안 필드를 확정 계약처럼 하드코딩 금지. `api-schema.md`를 기준으로 타입을 생성한다.

---

## 7. 품질 및 안정성

* **상태 복원력**: 회원가입·계정복구 도중 새로고침이 발생하면 비밀번호, 인증번호, 토큰을 제외한 비민감 입력값만 복원할 수 있다. 인증 완료 여부는 반드시 서버의 `verificationToken` 또는 재조회 결과로 복구한다.
* **인증번호 타이머**: 인증번호 만료 시간과 재전송 가능 시간은 서버 응답(`expiresAt`, `resendAvailableAt`) 기준으로 표시한다. 프론트 로컬 타이머가 서버 상태를 대체하지 않는다.
* **비밀번호 입력 UX**: 비밀번호 정책은 입력 중 즉시 피드백을 제공하되, 정확한 정책 우회 힌트가 되지 않도록 최소한의 조건만 표시한다.
* **계정 제재 UX**: `SUSPENDED`, `BANNED`, `LOCKED`, `BLACKLISTED` 상태는 사용자가 다음 행동을 이해할 수 있게 안내한다. 다만 운영 내부 사유, 신고자 정보, 탐지 기준은 표시하지 않는다.
* **접근성(a11y)**: 로그인/회원가입 폼의 모든 입력은 label 또는 `aria-label`을 가진다. 오류 메시지는 관련 input과 연결하고, 인증번호 만료 등 즉시성 안내는 `aria-live="polite"`로 전달한다.
* **성능**: 회원가입 폼은 입력마다 전체 페이지가 리렌더링되지 않도록 필드 상태를 분리한다. 파일 업로드 preview 및 검증은 불필요한 대용량 파일 읽기를 피한다.
* **크로스 브라우저**: iOS Safari 자동완성, 숫자 키패드, 파일 input 동작 차이를 확인한다. 휴대폰/인증번호 입력은 모바일에서 적절한 `inputMode`를 사용한다.
* **감사 가능성**: 로그인 실패, 인증번호 rate limit, 기업회원 신청, 비밀번호 재설정은 백엔드 audit/security log 대상이다. 프론트는 사용자 표시 메시지와 내부 추적용 `messageCode`를 분리해 처리한다.
