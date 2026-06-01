# CareerWave Contribution Guide

> 본 문서는 CareerWave 팀원이 기능을 제안하고, 스펙을 작성하고, 구현하고, Pull Request를 생성하기까지의 기여 절차를 정의한다.

코드 구조, 네이밍, DTO, API 응답, 예외 처리 등 구현 규칙은 `docs/CONVENTION.md`를 따른다.

---

## 1. 기본 원칙

CareerWave는 스펙 주도 개발을 기준으로 작업한다.

### 작업 우선순위

1. 이슈 또는 작업 요구사항 확인
2. 관련 Spec 문서 확인 또는 작성
3. 구현 계획과 작업 범위 합의
4. 브랜치 생성
5. 구현 및 검증
6. Pull Request 생성
7. 리뷰 반영 후 병합

### 공통 규칙

- 작업 시작 전 최신 `develop` 브랜치를 기준으로 새 브랜치를 생성한다.
- 한 PR에는 하나의 목적만 담는다.
- 관련 없는 파일 변경은 커밋에 포함하지 않는다.
- 기존 코드 스타일과 프로젝트 구조를 우선 따른다.
- 구현 세부 규칙은 `docs/CONVENTION.md`를 기준으로 한다.
- Spec과 구현이 충돌하면 구현 전에 Spec 또는 Convention을 먼저 정리한다.

---

## 2. 브랜치 전략

### 기준 브랜치

- 기본 개발 브랜치: `develop`
- 기능 작업은 항상 `develop`에서 분기한다.
- 운영 배포 브랜치가 필요한 경우 팀 합의 후 별도로 관리한다.

### 브랜치명

```text
feature/{작업명}
fix/{작업명}
refactor/{작업명}
docs/{작업명}
chore/{작업명}
```

### 예시

```text
feature/admin-settlement-api
feature/user-interview-ui
docs/contribution-guide
fix/payment-status-validation
```

### 주의사항

- 이미 진행 중인 작업 브랜치 위에서 새 작업 브랜치를 만들지 않는다.
- 브랜치를 잘못 만들었다면 변경사항을 보존한 뒤 `develop` 기준으로 다시 만든다.
- 브랜치명은 작업 내용을 짧고 명확하게 표현한다.

---

## 3. Spec 작성 절차

### Spec 위치

```text
specs/backend/{scope}/{number}-{domain}/
specs/frontend/{scope}/{number}-{domain}/
specs/fastapi/{scope}/{number}-{domain}/
```

### 주요 문서

| File | Purpose |
|------|---------|
| `spec.md` | 요구사항과 기능 범위 정의 |
| `plan.md` | 구현 계획과 기술 결정 정리 |
| `tasks.md` | 실제 작업 단위 목록 |
| `constitution.md` | 도메인 원칙과 불변 규칙 정의 |
| `checklist.md` | 구현 완료 후 최종 점검 항목 정의 |
| `api-spec.json` | API 요청/응답 계약 정의 (OpenAPI 자동화 시 추가) |

### 작성 규칙

- 구현 전에 관련 Spec을 먼저 확인한다.
- 신규 기능은 가능한 한 `spec.md`, `plan.md`, `tasks.md` 순서로 작성한다.
- 도메인 원칙, 상태 전이, 불변 규칙은 `constitution.md`에 남긴다.
- API 작업은 `api-schema.md`에 요청/응답 계약을 명확히 남긴다. (OpenAPI 자동화가 필요한 경우 `api-spec.json`을 별도로 추가한다)
- 상태값이 있는 도메인은 상태 전이 규칙을 문서화한다.
- 구현이 끝나면 `checklist.md` 기준으로 누락된 항목이 없는지 확인한다.
- Spec에 없는 기능을 임의로 추가하지 않는다.

---

## 4. 개발 절차

이 섹션은 작업 흐름만 정의한다. 세부 코드 작성 규칙은 `docs/CONVENTION.md`를 따른다.

### Backend

- Spring Boot 코드는 `backend/src/main/java/kr/co/carrer` 하위에 작성한다.
- 관련 Backend Spec과 API 계약을 먼저 확인한다.
- 도메인 구조, API 응답, 예외 처리 규칙은 Convention을 따른다.

### Frontend

- React 코드는 `frontend/src` 하위에 작성한다.
- 관련 Frontend Spec과 API 계약을 먼저 확인한다.
- 파일 배치, API 계층, 컴포넌트 분리 기준은 Convention을 따른다.

### FastAPI

- FastAPI 코드는 `fastapi` 하위에 작성한다.
- 관련 FastAPI Spec과 API 계약을 먼저 확인한다.
- endpoint, prompt, pipeline, 환경 변수 접근 규칙은 Convention을 따른다.

---

## 5. 커밋 규칙

### 커밋 메시지 형식

```text
{type}({branch-name}) : {summary}
```

### Type

| Type | Meaning |
|------|---------|
| `feat` | 기능 추가 |
| `fix` | 버그 수정 |
| `style` | 코드 포맷 또는 스타일 변경 |
| `chore` | 기타 설정 또는 문서 작업 |
| `design` | UI/UX 변경 |
| `rename` | 파일 또는 이름 변경 |
| `remove` | 삭제 |
| `build` | 빌드 설정 변경 |
| `refactor` | 리팩토링 |

### 예시

```text
feat(feature/user-login-api) : 회원 로그인 API 추가
fix(fix/payment-status-validation) : 결제 상태 검증 오류 수정
chore(docs/contribution-guide) : 기여 가이드 문서 추가
```

### 주의사항

- 커밋은 리뷰 가능한 단위로 나눈다.
- 자동 생성 파일, 빌드 산출물, 관련 없는 파일 변경은 포함하지 않는다.
- 커밋 전 `git status`와 `git diff --cached`를 확인한다.

---

## 6. Pull Request 규칙

### PR 대상 브랜치

- 기본 대상 브랜치는 `develop`이다.
- 특별한 이유 없이 `main` 또는 다른 기능 브랜치로 PR을 열지 않는다.

### PR 작성

PR은 `.github/pull_request_template.md` 형식을 따른다.

필수 작성 항목:

- 관련 이슈
- 작업 모듈
- 변경 사항 안내
- 테스트 및 검증 결과
- 리뷰어 전달 사항

### PR 체크리스트

- [ ] 작업 브랜치가 `develop`에서 분기되었는가?
- [ ] PR 범위가 하나의 목적에 집중되어 있는가?
- [ ] 관련 없는 파일 변경이 제외되었는가?
- [ ] Spec 또는 Convention과 충돌하지 않는가?
- [ ] 필요한 테스트 또는 빌드 확인을 수행했는가?
- [ ] 리뷰어가 확인해야 할 사항을 PR 본문에 남겼는가?

---

## 7. 리뷰 반영 규칙

### 기본 원칙

- 리뷰 코멘트는 반영, 보류, 반려 중 하나로 명확히 처리한다.
- 반영하지 않는 경우 이유를 코멘트로 남긴다.
- 리뷰 반영 커밋은 기존 PR 브랜치에 추가로 push한다.
- 리뷰 thread가 해결되면 resolved 처리한다.

### CodeRabbit 또는 AI 리뷰

- 자동 리뷰도 유효한 지적이면 반영한다.
- 단순 스타일 경고라도 팀 규칙과 충돌하지 않으면 가능한 한 정리한다.
- AI 리뷰가 현재 코드와 맞지 않는 경우 근거를 남기고 스킵한다.

---

## 8. 테스트 및 검증

### Backend

```bash
cd backend
./gradlew test
```

### Frontend

```bash
cd frontend
npm run build
```

### FastAPI

```bash
cd fastapi
python -m pytest
```

### 주의사항

- 명령어가 아직 프로젝트에 준비되어 있지 않으면 PR에 미실행 사유를 남긴다.
- 문서만 수정한 경우 빌드 또는 테스트를 생략할 수 있으나, 생략 사유를 PR에 적는다.
- API 변경은 Swagger, Postman, 또는 수동 호출 결과를 함께 남긴다.

---

## 9. 금지 사항

- `develop`에 직접 커밋하지 않는다.
- 관련 없는 변경사항을 같은 PR에 섞지 않는다.
- Spec 없이 기능 범위를 임의로 확장하지 않는다.
- 새 라이브러리를 팀 합의 없이 추가하지 않는다.
- 임시 TODO 코드나 사용하지 않는 코드를 남기지 않는다.
- 보안 정보, 토큰, 비밀번호, 개인키를 커밋하지 않는다.
- 리뷰 코멘트를 확인하지 않은 채 병합하지 않는다.

---

## 10. 작업 전 확인 명령어

```bash
git switch develop
git pull origin develop
git switch -c feature/{작업명}
git status
```

## 11. 작업 후 확인 명령어

```bash
git status
git diff
git add {changed-files}
git diff --cached
git commit -m "{type}({branch-name}) : {summary}"
git push -u origin {branch-name}
```
