# Frontend Review Guidelines

## 1. 문서 목적

이 문서는 `user-frontend` 작업에서 반복적으로 지적된 PR review 내용을 정리한 실무 가이드다.
특히 `회원 인증`, `회원가입`, `로그인`, `인증번호 검증`, `토큰 처리` 작업에서 같은 문제가 반복되지 않도록 사전 점검 기준을 남긴다.

적용 범위:

- Phase 단위 frontend feature branch 작업
- Issue / Branch / Commit / PR / Review 반영 흐름
- auth, member, subscription, payment 등 사용자 프론트 도메인 전반

---

## 2. 이번 PR #99에서 실제로 반복된 review 유형

### 2.1 payload 누락

화면에서 사용자가 입력하거나 선택할 수 있는 값이 실제 API 요청 payload에 빠지는 문제.

대표 예시:

- 선택 마케팅 동의 UI는 존재하지만 `terms.marketing` 값이 request mapping에서 누락됨

규칙:

- UI에 있는 값은 request snapshot과 request mapper까지 끝까지 추적한다.
- `form state -> snapshot -> request payload` 3단계를 모두 확인한다.
- 선택값이라고 해서 payload에서 임의로 `false` 고정하지 않는다.

체크 포인트:

- 약관 동의
- checkbox / toggle
- select
- 인증 완료 token
- 업로드 완료 file id

---

### 2.2 비동기 응답 stale overwrite

이전 요청 응답이 늦게 도착하면서 현재 입력 상태를 덮어쓰는 문제.

대표 예시:

- 아이디 중복 확인 요청 후 사용자가 input을 바꿨는데, 이전 응답이 도착하면서 `loginIdState`가 다시 바뀜

규칙:

- async validation 요청은 항상 "요청 시점 값"을 보관한다.
- 응답 반영 전 "현재 값 === 요청 시점 값"인지 확인한다.
- 다르면 state를 갱신하지 않고 무시한다.

적용 대상:

- 아이디 중복 확인
- 이메일 인증번호 확인
- 휴대폰 인증번호 확인
- 검색 자동완성
- 서버 기반 field validation

권장 패턴:

```ts
const requestedValue = currentValue.trim();
const result = await mutation.mutateAsync(requestedValue);

if (requestedValue !== currentValueRef.current.trim()) return;
```

---

### 2.3 문자열 하드코딩

상태값, enum 분기값, error code, type 값을 문자열로 직접 비교하는 문제.

대표 예시:

- `'COMPANY'`
- `'ACTIVE'`
- `'LOCKED'`
- `'available'`

규칙:

- backend 계약값, 분기 상태값, 에러 코드는 반드시 `as const` 상수 객체로 관리한다.
- 비교문에서는 문자열 literal 대신 상수 참조를 사용한다.

권장 예시:

```ts
if (member.memberType === MEMBER_TYPE.COMPANY) {}
if (loginIdState === LOGIN_ID_CHECK_STATE.AVAILABLE) {}
return fallbackMessages[MEMBER_ERROR_CODE.UNAUTHORIZED];
```

---

### 2.4 fallback 메시지 중복 하드코딩

이미 정의된 에러 메시지 상수가 있는데, 다른 함수에서 동일 문장을 다시 직접 쓰는 문제.

규칙:

- 로그인/가입/인증/결제 예외 메시지는 중앙 메시지 맵을 우선 참조한다.
- 동일 문장을 여러 파일에서 반복 작성하지 않는다.

금지 예시:

```ts
return '아이디 또는 비밀번호를 확인해주세요.';
```

권장 예시:

```ts
return fallbackMessages[MEMBER_ERROR_CODE.UNAUTHORIZED];
```

---

### 2.5 인증 요청의 silent failure

인증이 필요한 요청인데 token이 없어도 그냥 API를 보내고 서버 401을 기다리는 문제.

규칙:

- `auth: true` 요청은 client에서 token 존재 여부를 먼저 확인한다.
- token이 없으면 조기 실패(early fail) 처리한다.

권장 예시:

```ts
if (auth && !token) {
  throw toMemberApiError(401, { message: '인증 정보가 없습니다.' });
}
```

---

### 2.6 토큰 저장 전략 오해

reviewer가 localStorage 저장 누락으로 오해할 수 있으나, 실제로는 spec상 memory-only 또는 secure cookie 전략이 맞는 경우.

규칙:

- token 저장 방식은 먼저 spec / constitution / api-schema를 확인하되, 거기서 바로 판단을 끝내지 않는다.
- 실제 사용자 경험, 보안 수준, 새로고침 이후 세션 복원 가능성까지 함께 평가한다.
- memory-only 설계라면 "refresh 후 세션이 완전히 끊기는지", "refresh cookie + bootstrap refresh로 복원 가능한지"를 따로 확인한다.
- spec과 다른 방향으로 localStorage/sessionStorage 저장을 추가할지 여부는 "보안 위험"과 "실사용 복원력"을 함께 비교한 뒤 결정한다.
- 현 Phase에서 바로 구조를 바꾸지 않더라도, 실무적으로 아쉬운 설계라면 reviewer reply에 한계를 인정하고 후속 과제로 분리한다.

현재 회원 도메인 기준:

- access token: memory 또는 secure cookie 우선
- refresh token: HttpOnly Secure SameSite cookie 권장
- localStorage에 token 저장 금지

실무 판단 기준:

- `localStorage`에 token을 저장하지 않는 원칙 자체는 타당하다.
- 하지만 memory-only access token만 있고 앱 초기 세션 복원 경로가 없다면 UX 품질은 낮다.
- 따라서 "memory-only"와 "refresh 후 로그인 풀림"은 같은 의미가 아니다.
- 좋은 구현은 보통 아래 둘 중 하나다.

```text
1. access token은 memory, refresh token은 HttpOnly cookie, 앱 초기화 시 refresh/bootstrap으로 세션 복원
2. 보안 정책상 허용되는 범위에서 sessionStorage 등 제한된 저장 전략 사용
```

- 즉, spec이 memory-only를 말하더라도 "새로고침 후 세션 복원 전략"이 빠져 있다면 review 지적은 실무적으로 유효할 수 있다.

---

## 3. 구현 전 체크리스트

코드 작성 전에 아래를 먼저 확인한다.

- spec의 FR / NFR / SC 항목에 현재 작업 범위가 정확히 들어가는가
- constitution에 상태 관리 / 토큰 저장 / 보안 제약이 명시되어 있는가
- api-schema에 request / response / error code가 정의되어 있는가
- 기존 UI state가 page 내부에만 있고 분리되지 않았다면 snapshot / util / hook / api 계층으로 나눌 수 있는가
- 이번 변경이 현재 Phase 범위를 넘지 않는가

---

## 4. 코드 작성 중 체크리스트

### 4.1 form / payload

- 화면 입력값이 snapshot에 모두 반영되는가
- snapshot 값이 request payload로 모두 반영되는가
- 선택 입력값이 임의 기본값으로 덮이지 않는가

### 4.2 async validation / verification

- 중복 제출 방지 disabled 처리가 있는가
- stale response guard가 있는가
- 만료 / 재전송 / 남은 횟수 상태가 분리되어 있는가
- 실패 메시지가 field 단위로 표시되는가

### 4.3 enum / branching

- `as const` 상수를 기준으로 분기하는가
- 문자열 literal 비교가 남아 있지 않은가

### 4.4 error handling

- 네트워크 오류와 credential 오류를 같은 문구로 보여주지 않는가
- fallback 메시지가 중앙 맵에서 관리되는가
- 401 / 403 / 423 / 429 / 5xx의 의미가 분리되어 있는가

### 4.5 auth request

- `auth=true` 요청에서 token 누락 시 조기 실패하는가
- 401 응답 시 session 정리 정책이 있는가
- 새로고침 후 세션 복원 경로(refresh bootstrap 등)가 있는가

---

## 5. PR 올리기 전 자가 점검

### 5.1 코드

- [ ] spec 범위를 벗어난 기능이 섞이지 않았다
- [ ] UI 값과 payload 값이 1:1로 연결된다
- [ ] stale response 가능성이 있는 요청에 guard를 넣었다
- [ ] 문자열 하드코딩 대신 상수를 사용했다
- [ ] fallback 메시지를 중복 하드코딩하지 않았다
- [ ] auth 요청에서 token 누락을 명확히 처리한다
- [ ] token 저장 전략이 spec과 일치한다
- [ ] token 저장 전략이 실사용 UX와 보안 기준 모두에서 납득 가능한지 확인했다
- [ ] memory-only라면 새로고침 후 세션 복원 전략이 있는지 확인했다

### 5.2 Git

- [ ] `git branch`
- [ ] `git status`
- [ ] `.env`, `secret`, `key`, `token`, `credentials` 파일이 commit 대상이 아니다

### 5.3 검증

- [ ] `npm run build`
- [ ] `npm run lint` (script가 있을 때만)
- [ ] 주요 화면 기본 동작 확인
- [ ] validation / 예외 메시지 확인

### 5.4 문서 동기화

- [ ] commit message가 실제 수정 목적과 일치한다
- [ ] PR body가 최신 변경 내용을 반영한다
- [ ] Issue body TODO가 최신 상태로 업데이트되었다

---

## 6. review 반영 규칙

review 반영 시 아래 원칙을 따른다.

1. reviewer comment를 먼저 분류한다.

- 실제 코드 수정 필요
- 문서 / PR body / Issue body 수정 필요
- spec 근거 설명만 필요
- 이미 반영된 내용

1.5 spec과 review가 충돌하면 추가 판단 단계를 넣는다.

- spec 문구가 왜 그렇게 작성되었는지 본다
- reviewer 지적이 실제 사용자 경험 / 보안 / 운영 측면에서 더 타당한지 본다
- "spec에 써 있으니 유지"로 바로 종료하지 않는다
- 현재 Phase에서 수정 가능한지와, 후속 과제로 분리해야 하는지를 나눈다

판단 기준:

- 보안
- 사용자 경험
- 새로고침 / 네트워크 단절 / 만료 상황에서의 복원력
- 구현 복잡도 대비 효과
- 현재 Phase 범위 적합성

2. 하나의 목적만 담은 fix commit으로 나눈다.

좋은 예시:

- `fix(auth): 회원가입 약관 payload 반영`
- `fix(auth): 아이디 중복 확인 stale response guard 추가`
- `fix(auth): 인증 요청 토큰 누락 조기 실패 처리`

나쁜 예시:

- `fix: review`
- `fix: 수정`
- `fix(auth): review 반영`

3. 코드가 바뀌면 문서도 같이 바꾼다.

- PR body
- Issue body
- 필요 시 reviewer 전달 사항

4. spec과 충돌하는 의견은 바로 구현하지 않는다.

- 먼저 spec / constitution / api-schema 근거를 확인한다.
- 그 다음 현재 spec이 실무적으로도 좋은지 한 번 더 검토한다.
- 현재 설계가 의도된 것이어도 품질상 아쉬움이 있으면 그대로 인정하고, 이번 Phase 보류인지 후속 수정인지 구분해서 답한다.
- reviewer reply에서는 "spec상 맞다"와 "실무적으로도 충분히 좋은가"를 분리해서 설명한다.

---

## 7. reviewer reply 템플릿

### 7.1 코드 수정 후

```md
반영했습니다. [무엇을 어떻게 수정했는지 한 문장으로 설명]했습니다. 커밋: [commit sha]
```

예시:

```md
반영했습니다. 선택 마케팅 동의값이 회원가입 payload의 `terms.marketing`으로 전달되도록 snapshot과 request mapping을 수정했습니다. 커밋: a26aad5
```

### 7.2 spec 근거로 유지할 때

```md
이 부분은 현재 spec/constitution 기준에 따라 의도된 설계입니다. [관련 문서와 조항]에 맞춰 [현재 정책]을 유지하고 있어 이번 Phase에서는 구조를 변경하지 않았습니다.
```

예시:

```md
이 부분은 현재 spec/constitution 기준에 따라 의도된 설계입니다. `spec.md`의 NFR-003, `api-schema.md`의 token storage 항목, `constitution.md`의 토큰 저장 원칙에 맞춰 access token은 브라우저 저장소가 아닌 memory 기반으로 유지하고 있습니다.
```

### 7.3 spec은 맞지만 review 우려도 타당할 때

```md
말씀 주신 우려가 실무적으로 타당하다고 판단했습니다. 현재 구현은 [spec 근거]에 맞춰 [현재 정책]을 따르고 있지만, 이 상태만으로는 [UX/복원력/운영상 한계]가 남습니다. 이번 Phase에서는 저장 전략 자체를 바꾸지 않고 유지하되, 후속 단계에서 [세션 복원/bootstrap refresh/구조 보완]이 필요하다는 점을 기준으로 관리하겠습니다.
```

예시:

```md
말씀 주신 우려가 실무적으로 타당하다고 판단했습니다. 현재 구현은 token을 브라우저 저장소에 남기지 않는 spec을 따르고 있지만, access token이 memory에만 있고 초기 세션 복원 경로가 없으면 새로고침 후 로그인 상태가 끊기는 UX 한계가 있습니다. 이번 Phase에서는 localStorage 저장으로 바꾸지 않고 유지하되, 후속 단계에서 refresh 기반 세션 복원 bootstrap이 필요하다는 전제로 관리하겠습니다.
```

### 7.4 이미 반영된 경우

```md
해당 내용은 현재 브랜치 최신 커밋에서 이미 반영된 상태입니다. [적용 위치 또는 commit] 기준으로 확인 가능합니다.
```

---

## 8. 이후 작업에 반드시 적용할 운영 규칙

- Phase 작업 전 spec / constitution / api-schema를 먼저 확인한다.
- request payload 누락 여부를 항상 점검한다.
- async validation에는 stale response guard를 기본값처럼 넣는다.
- 상태값 / 타입값 / 에러코드는 전부 상수 기반으로 분기한다.
- review 반영 후에는 commit, PR body, Issue body를 같이 업데이트한다.
- spec과 충돌하는 review는 바로 방어하지 말고, spec의 실무 타당성까지 한 번 더 검토한 뒤 응답한다.
