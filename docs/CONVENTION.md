# CareerWave AI Convention

> 본 문서는 CareerWave 프로젝트에서 Cursor, Codex, ChatGPT, Claude Code 등 AI 도구와 팀원이 일관된 방식으로 코드를 생성하기 위한 규칙을 정의한다.

---

## 1. Core Principle

CareerWave는 스펙 주도 개발을 기준으로 작업한다.

### Priority

1. Spec 문서 (`spec.md`, `plan.md`, `tasks.md`, `constitution.md`, `checklist.md`, `api-spec.json`)
2. 본 Convention 문서
3. 기존 코드 패턴
4. 신규 구현

### Rules

- 구현 전 관련 Spec 문서를 먼저 확인한다.
- Spec과 Convention이 충돌하면 구현 전에 문서를 먼저 수정하거나 PR에 충돌 사유를 남긴다.
- 기존 코드와 다른 패턴이 필요한 경우 근거를 코드 리뷰에서 설명할 수 있어야 한다.
- 존재하지 않는 클래스, 패키지, API는 추측해서 생성하지 않는다.

---

## 2. Architecture

### Repository

```text
backend/    Spring Boot API
frontend/   React + Vite UI
fastapi/    AI, scraping, pipeline service
specs/      spec-driven development documents
docs/       convention and project documents
.github/    workflows, prompts, templates, contribution guide
```

### Backend

```text
backend/src/main/java/kr/co/carrer/
├─ global/
│  ├─ config
│  ├─ exception
│  └─ response
├─ admin/
│  └─ {domain}/
│     ├─ entity
│     ├─ repository
│     ├─ type
│     ├─ service      (when needed)
│     ├─ controller   (when needed)
│     ├─ dto          (when needed)
│     └─ docs         (when needed)
└─ user/
   └─ {domain}/
      ├─ entity
      ├─ repository
      ├─ type
      ├─ service
      ├─ controller
      ├─ dto
      └─ docs
```

### Rules

- `global`은 `admin` 또는 `user`의 도메인 코드를 참조하지 않는다.
- `admin`과 `user`는 서로 직접 참조하지 않는다.
- 도메인 단위로 패키지를 구성한다.
- 테스트 코드는 실제 패키지 구조와 동일하게 구성한다.
- 새 계층은 필요한 경우에만 추가하고, 기존 도메인 구조와 맞춘다.

---

## 3. Naming Convention

| Component | Rule | Example |
|-----------|------|---------|
| Controller | `{Domain}Controller` | `MemberController` |
| Service | `{Domain}Service` | `SettlementService` |
| Repository | `{Domain}Repository` | `CompanyRepository` |
| DTO | `{Domain}DTO` | `MemberDTO` |
| Enum | 의미가 드러나는 PascalCase | `CompanyStatus`, `ManagerRole` |
| Java variable | camelCase | `businessNumber` |
| Java constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Table | lowercase snake_case plural | `job_notices` |
| Column | snake_case | `business_number` |

### TypeScript

- Interface는 PascalCase를 사용한다.
- `IUser`, `IMember`처럼 `I` prefix를 붙이지 않는다.
- Props 타입은 `{ComponentName}Props` 형식을 우선 사용한다.

```ts
interface User {}
interface MiniPaginationProps {}
```

---

## 4. DTO Convention

도메인별 DTO는 기본적으로 하나의 파일에서 관리한다.

```java
public class MemberDTO {

    public static class RequestLogin {}

    public static class ResponseLogin {}
}
```

### Rules

- 기본 규칙은 `{Domain}DTO` 파일 1개 유지다.
- Request / Response는 Inner Class 사용을 우선한다.
- DTO가 과도하게 커지거나 하위 기능이 명확히 분리되는 경우 `{Feature}DTO` 분리를 허용한다.
- Entity를 API 응답으로 직접 반환하지 않는다.

---

## 5. Enum Convention

### Backend

```java
@Enumerated(EnumType.STRING)
private CompanyStatus status;
```

### Rules

- 도메인 Enum은 각 도메인의 `type/` 패키지에 둔다.
- JPA Entity에서 Enum 필드는 `EnumType.STRING`을 필수로 사용한다.
- Enum 이름은 역할과 상태를 명확히 드러내야 한다.

---

## 6. API Response Convention

모든 Backend API 응답은 `ApiResponse<T>` 사용을 원칙으로 한다.

```java
ApiResponse.ok(data);
ApiResponse.ok(message, data);
ApiResponse.ok(message);
ApiResponse.fail(statusCode, message);
ApiResponse.fail(statusCode, message, data);
```

### Rules

- Controller에서 직접 `Map`을 반환하지 않는다.
- 성공/실패 응답 형식을 통일한다.
- 실패 응답의 `data`는 기본적으로 `null`이며, 검증 오류처럼 상세 정보가 필요한 경우에만 포함한다.
- 현재 응답 필드는 `success`, `statusCode`, `message`, `data`를 기준으로 한다.

---

## 7. Exception Convention

### Rules

- Controller 내부에서 반복적인 `try-catch`를 작성하지 않는다.
- 공통 예외 처리는 `GlobalExceptionHandler`에서 처리한다.
- 비즈니스 예외는 `CustomException`과 `ErrorCode` 기반으로 처리한다.
- `new RuntimeException(...)` 직접 생성은 금지한다.
- 예상 가능한 예외는 `ErrorCode`를 추가한 뒤 `CustomException`으로 던진다.

### Example

```java
throw new CustomException(ErrorCode.USER_NOT_FOUND);
```

---

## 8. Swagger Convention

Swagger Annotation은 가능한 경우 `docs` 패키지의 인터페이스로 분리한다.

```text
docs/
└─ MemberControllerDocs
```

### Rules

- Controller에는 Swagger Annotation을 최소화한다.
- API 문서와 비즈니스 로직을 분리한다.
- 새 API를 만들 때 Spec 문서의 요청/응답과 Swagger 설명이 어긋나지 않게 한다.

---

## 9. Security Convention

### Roles

```text
ROLE_USER
ROLE_COMPANY
ROLE_ADMIN
```

### Rules

- `admin` API는 권한 검사를 필수로 고려한다.
- 메서드 단위 권한이 필요한 경우 `@PreAuthorize` 사용을 우선 검토한다.
- JWT 인증/인가 예외는 Spring Security 진입점 또는 공통 예외 흐름에서 처리한다.
- 인증 사용자 정보는 Controller에서 임의 파싱하지 않고 Security Context 또는 공통 유틸을 사용한다.

---

## 10. Database Convention

### Table Naming

- 모든 테이블명은 lowercase snake_case를 사용한다.
- 테이블명은 복수형을 사용한다.
- PostgreSQL 예약어 단독 사용을 금지한다.

#### Examples

- `companies`
- `managers`
- `job_notices`
- `settlements`

### Column Naming

- DB 컬럼명은 snake_case를 사용한다.
- Java Entity 필드는 camelCase를 사용한다.
- 현재 Entity PK 필드명은 `id`를 기준으로 한다.
- 명시적인 DB 컬럼명이 필요한 경우 `@Column(name = "...")`로 snake_case를 지정한다.

### PK Strategy

- 기본 PK 전략은 `GenerationType.IDENTITY`를 사용한다.
- 현재 기본 PK 타입은 `Long`을 우선 사용한다.
- 외부 URL, 결제, 세션, 공개 리소스처럼 ID 노출 위험이 있는 경우 UUID 사용을 검토한다.
- 모든 FK 타입은 참조 대상 PK 타입과 동일해야 한다.

### Entity Rules

- Entity는 `@NoArgsConstructor(access = AccessLevel.PROTECTED)`를 사용한다.
- Entity 필드는 직접 setter를 열지 않는다.
- 변경이 필요한 경우 의미 있는 메서드로 상태를 변경한다.
- 연관관계는 필요한 경우에만 설정한다.
- Cascade 사용 시 명확한 근거가 필요하다.
- `BaseEntity`가 도입되기 전까지는 모든 Entity 상속을 강제하지 않는다.

---

## 11. Frontend Convention

### Structure

```text
frontend/src/
├─ admin/
│  ├─ api
│  ├─ components
│  ├─ data
│  ├─ layouts
│  ├─ pages
│  └─ styles
├─ user/
│  ├─ api
│  ├─ components
│  ├─ hooks
│  ├─ pages
│  ├─ types
│  └─ utils
├─ components/
├─ hooks/
├─ routes/
├─ styles/
└─ utils/
```

### State Management

- Server State는 TanStack Query 사용을 우선한다.
- 전역 상태는 현재 의존성 기준으로 React state/context를 우선 사용한다.
- Zustand 등 새 상태 관리 라이브러리는 팀 합의와 의존성 추가가 있을 때만 사용한다.

### API

- 페이지 또는 컴포넌트에서 `axios`를 직접 호출하지 않는다.
- 공통 설정은 `utils/axiosInstance.js` 또는 `utils/apiClient.js`를 사용한다.
- 도메인별 API 호출은 `admin/api` 또는 `user/api`에 둔다.

```text
admin/api/settlementApi.js
user/api/documentApi.ts
```

### Component

- 공통 컴포넌트는 `components/common` 또는 기존 공통 영역을 우선 재사용한다.
- 300줄 이상 컴포넌트는 분리를 고려한다.
- 페이지별 스타일은 컴포넌트와 같은 경로에 co-locate하거나, 도메인 내 `styles/` 하위 폴더로 분리할 수 있다. 도메인 내에서 일관성을 유지한다.
- TypeScript 파일과 JavaScript 파일이 공존하므로, 새 파일은 주변 파일의 확장자와 패턴을 우선 따른다.

---

## 12. FastAPI Convention

### Structure

```text
fastapi/
├─ main.py
├─ core/
├─ admin/
│  ├─ api/
│  ├─ pipeline/
│  └─ scrapers/
├─ user/
│  ├─ api/
│  ├─ prompts/
│  └─ websocket/
└─ specs/
```

### Rules

- API endpoint는 `api/` 하위에 둔다.
- AI 프롬프트는 `prompts/` 하위에서 관리한다.
- scraping 또는 batch pipeline 코드는 `pipeline/`, `scrapers/` 하위에 둔다.
- 환경 변수는 `core/`의 설정 계층을 통해 접근한다.
- API 라우터에 복잡한 비즈니스 로직을 직접 작성하지 않는다.

---

## 13. AI Generation Rules

### MUST

- 관련 Spec 문서를 먼저 읽는다.
- 기존 패턴을 우선 재사용한다.
- Domain 경계를 준수한다.
- DTO, ApiResponse, Exception 규칙을 준수한다.
- 새 의존성 추가 전 팀 합의가 필요하다고 표시한다.
- 구현 후 관련 테스트 또는 빌드 명령을 확인한다.

### MUST NOT

- 존재하지 않는 클래스나 API를 추측해서 사용하지 않는다.
- 새로운 라이브러리를 임의로 추가하지 않는다.
- `RuntimeException`을 직접 생성하지 않는다.
- 의미 없는 TODO 코드를 남기지 않는다.
- `admin`과 `user` 도메인 간 직접 참조를 만들지 않는다.
- Spec과 다른 동작을 조용히 구현하지 않는다.
