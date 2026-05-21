# Career Wave Admin — Claude Code 가이드

## 프로젝트 구조

```
career-wave-admin/
├── frontend/      React 18 + Vite 5  (어드민 대시보드)
├── fastapi/       Python + FastAPI    (채용공고 스크래핑 엔진)
├── backend/       Spring Boot 3.3    (어드민 & 기업용 REST API)
└── .specify/      Spec-Kit           (스펙 주도 개발 산출물)
```

## 모듈별 실행

```bash
# Frontend (http://localhost:3000)
cd frontend && npm install && npm run dev

# FastAPI (http://localhost:8001)
cd fastapi && pip install -r requirements.txt && uvicorn main:app --reload --port 8001

# Backend (http://localhost:8080)
cd backend && ./gradlew bootRun          # Mac/Linux
cd backend && gradlew.bat bootRun        # Windows
```

## Backend 패키지 구조

기본 패키지: `kr.co.carrer`

```
kr.co.carrer/
├── global/               ← 전역 레이어 (domain 참조 절대 금지)
│   ├── config/           SecurityConfig, SwaggerConfig
│   ├── exception/        BusinessException, ErrorCode, GlobalExceptionHandler
│   ├── response/         ApiResponse<T>
│   └── util/
└── domain/
    ├── manager/          플랫폼 관리자
    ├── company/          파트너 기업
    ├── jobnotice/        채용 공고
    └── settlement/       멘토 정산
```

각 도메인 패키지: `controller / service / repository / entity / dto / type / docs`

## 핵심 규칙

**레이어 격리**: `global/`은 `domain/`을 절대 참조하지 않는다.

**응답 포맷**: 모든 API는 `ApiResponse<T>` 래퍼를 사용한다.
```java
return ResponseEntity.ok(ApiResponse.ok(data));
return ResponseEntity.ok(ApiResponse.fail("메시지"));
```

**예외 처리**: `BusinessException(ErrorCode.XXX)`을 던지면 `GlobalExceptionHandler`가 일괄 처리한다.

**Swagger 분리**: 컨트롤러에 Swagger 어노테이션을 직접 쓰지 않고 `docs/` 패키지의 인터페이스로 분리한다.

**FastAPI ↔ Backend**: 직접 통신하지 않는다. DB를 통해서만 데이터를 공유한다.

## 스펙 주도 개발 (SDD) 흐름

기능 개발 전 반드시 아래 순서를 따른다.

```
/speckit.specify   스펙 작성      → .specify/specs/NNN-feature-name/spec.md
/speckit.clarify   요구사항 검증  → (선택)
/speckit.plan      구현 계획      → plan.md + data-model.md + contracts/
/speckit.tasks     태스크 분해    → tasks.md
/speckit.implement 구현
```

스펙 번호는 `001-`, `002-` 순서로 채번한다.
PR 제목에 스펙 번호를 포함한다: `[001] 기업 관리 API 구현`

## 환경변수

각 `.env.example`을 복사해서 `.env`를 만든다.

| 파일 | 주요 변수 |
|------|-----------|
| `backend/.env.example` | DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET |
| `fastapi/.env.example` | DB_URL, OPENAI_API_KEY |
| `frontend/.env.example` | VITE_API_BASE_URL |

## DB

- MySQL 8.x, 스키마명: `career_wave`
- `ddl-auto: validate` — 운영 환경에서 `create`/`update` 절대 금지
- 스키마 변경은 반드시 마이그레이션 스크립트로 관리
