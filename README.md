# Career Wave

CareerWave는 AI 기반 면접 코칭·서류 분석·커리어 진단 기능을 제공하는 취업 지원 통합 플랫폼입니다.
구직자와 기업 회원을 위한 사용자 플랫폼과 운영팀을 위한 관리자 백오피스로 구성되어 있습니다.

## 컨트리뷰션 가이드

브랜치 전략, 커밋 컨벤션, PR 규칙은 아래 문서를 참고해 주세요.

👉 [CONTRIBUTION.md](.github/CONTRIBUTION.md)

## 기술 스택 (Tech Stack)

본 프로젝트는 하나의 저장소(Repository)에서 전체 플랫폼 서비스를 관리하는 모노레포(Monorepo) 아키처로 구성되어 있으며, 모듈별 기술 스택은 다음과 같습니다.


### 1. 모듈별 기술 스택 매트릭스

| 레이어 | 모듈명 | 언어 / 프레임워크 | 주요 라이브러리 및 상세 명세 |
| :--- | :--- | :--- | :--- |
| **인프라** | `Common` | GitHub, GitHub Actions | 모노레포 CI/CD, 빌드 및 테스트 자동화 파이프라인 |
| **데이터베이스** | `Data` | PostgreSQL | 관계형 데이터베이스 통합 인프라 구축 |
| **백엔드** | `user-backend`<br>`admin-backend` | Java 21<br>Spring Boot 3.x<br>Gradle | Spring Data JPA, Spring Security, JWT, Lombok |
| **AI 및 엔진** | `user-fastapi`<br>`admin-fastapi` | Python 3.11 이상<br>FastAPI | 실시간 AI 면접 분석 피드백, 채용 공고 스크래핑 스케줄러 |
| **프론트엔드** | `frontend` | TypeScript<br>React | TanStack Query, React Router, MSW, Vite |


### 2. 모노레포 프로젝트 디렉토리 구조

각 모듈이 완전히 분리되어 독립적인 레이어로 관리되는 저장소 구조 명세입니다.

```text
career-wave/
├── .github/        # CI/CD 워크플로우 및 PR 템플릿
├── frontend/       # React + Vite (TypeScript) — user / admin 통합
├── backend/        # Spring Boot (Java 21) — 단일 서버
├── fastapi/        # FastAPI (Python 3.11+) — AI 엔진 및 스크래핑
├── db/             # PostgreSQL init.sql / seed 파일
├── specs/          # 스펙 명세 문서
└── README.md
```

## 실행 방법

### Local Infra (PostgreSQL + Redis)

```bash
# 1. 루트 .env 파일 생성 후 DB_PASSWORD 값 채우기
cp .env.example .env

# 2. PostgreSQL + Redis 컨테이너 실행
docker compose up -d

# 3. 실행 확인
docker compose ps
docker compose exec redis redis-cli ping
```

> ⚠️ `init.sql`은 볼륨이 비어있는 **최초 실행 시에만** 자동 적용됩니다.
> DDL이 변경된 경우 아래 명령어로 볼륨을 초기화한 뒤 다시 실행하세요.

```bash
# 볼륨 초기화 (데이터 전체 삭제 후 재생성)
docker compose down -v
docker compose up -d
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

| 플랫폼 | URL |
| :--- | :--- |
| 사용자 | http://localhost:5173 |
| 관리자 | 내부 문서 참고 |

### FastAPI

> **전제 조건**: Python 3.11 이상이 필요합니다.
> 로컬 환경 세팅 상세는 [`fastapi/LOCAL_DEV_SETUP.md`](fastapi/LOCAL_DEV_SETUP.md)를 참고하세요.

```bash
cd fastapi
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

| 항목 | URL |
| :--- | :--- |
| FastAPI 서버 | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |

### Backend

> **전제 조건**: JDK 21 이상이 설치되어 있어야 합니다.
> 로컬 환경 세팅 상세는 [`backend/LOCAL_DEV_SETUP.md`](backend/LOCAL_DEV_SETUP.md)를 참고하세요.

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

> **IntelliJ 환경 변수 설정**
> 1. `Run > Edit Configurations` 선택
> 2. `CareerWaveApplication` 실행 설정 클릭
> 3. `Environment variables` 항목에 `backend/.env` 파일 내용 입력
>    (또는 [EnvFile 플러그인](https://plugins.jetbrains.com/plugin/7861-envfile) 설치 후 `.env` 파일 경로 지정)

| 항목 | URL |
| :--- | :--- |
| Spring Boot API 서버 | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |

## 테스트 계정

로컬 DB에 테스트 데이터를 넣으려면 아래 명령어를 실행하세요.

```bash
# backend/ 디렉토리에서 실행
psql -U careerwave -d careerwave -f src/main/resources/db/seed-local.sql
```

> 재실행해도 안전합니다 (기존 데이터 DELETE 후 재삽입).

### 사용자 / 기업 계정

| 아이디 | 비밀번호 | roleType | 설명 |
| :--- | :--- | :--- | :--- |
| `testuser01` | `Test1234!` | `USER` | 일반회원 (구독 없음) |
| `testuser02` | `Test1234!` | `USER` | 일반회원 (면접 구독) |
| `testuser03` | `Test1234!` | `USER` | 일반회원 (서류 구독) |
| `testuser04` | `Test1234!` | `USER` | 일반회원 (전체 구독) |
| `testuser05` | `Test1234!` | `USER` | 일반회원 (정지 계정 테스트용) |
| `testcompany01` | `Test1234!` | `COMPANY` | 기업회원 |

### 관리자 계정

관리자 계정 정보는 보안상 내부 문서에서 확인하세요.

## 환경 변수

각 모듈 디렉토리의 `.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.

### 루트 `.env` (Docker DB 설정)

```bash
cp .env.example .env
```

| 변수명 | 설명 | 예시 |
| :--- | :--- | :--- |
| `DB_NAME` | PostgreSQL 데이터베이스명 | `careerwave` |
| `DB_USER` | DB 접속 유저명 | `careerwave` |
| `DB_PASSWORD` | DB 접속 비밀번호 | `(직접 설정)` |
| `DB_PORT` | 로컬 포트 (기본 5432) | `5432` |

### `backend/.env` (Spring Boot 설정)

```bash
cp backend/.env.example backend/.env
```

| 변수명 | 설명 | 예시 |
| :--- | :--- | :--- |
| `DB_URL` | JDBC 접속 URL | `jdbc:postgresql://localhost:5432/careerwave` |
| `DB_USERNAME` | DB 접속 유저명 | `careerwave` |
| `DB_PASSWORD` | DB 접속 비밀번호 | `(루트 .env와 동일)` |
| `JWT_USER_SECRET` | 사용자 JWT 서명 비밀키 (256bit 이상) | `(임의 생성)` |
| `JWT_ADMIN_SECRET` | 관리자 JWT 서명 비밀키 (256bit 이상) | `(임의 생성)` |
| `REDIS_HOST` | Redis 호스트 | `localhost` |
| `REDIS_PORT` | Redis 포트 | `6379` |
| `REDIS_PASSWORD` | Redis 비밀번호 | `(docker-compose와 동일)` |
| `AWS_ACCESS_KEY_ID` | AWS Access Key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | `(인프라 팀 요청)` |
| `AWS_S3_BUCKET_NAME` | S3 버킷명 | `careerwave-files` |
| `AWS_S3_REGION` | S3 버킷 리전 | `ap-northeast-2` |
| `AWS_S3_MOCK_UPLOAD` | 로컬 S3 업로드 목업 여부 | `true` |
| `AWS_SES_REGION` | SES 이메일 발송 리전 | `ap-southeast-2` |
| `AWS_SES_FROM_EMAIL` | SES 발신 이메일 주소 | `no-reply@careerwave.kr` |
| `FASTAPI_BASE_URL` | FastAPI 내부 통신 URL | `http://localhost:8000` |
| `WEBHOOK_SECRET` | FastAPI → Spring Webhook 인증키 | `(임의 생성, FastAPI와 공유)` |
| `WEBSOCKET_ALLOWED_ORIGINS` | WebSocket 허용 Origin | `*` |
| `SOLAPI_API_KEY` | CoolSMS SMS 발송 API Key | `(SOLAPI 콘솔)` |
| `SOLAPI_API_SECRET` | CoolSMS API Secret | `(SOLAPI 콘솔)` |
| `SOLAPI_SENDER_PHONE` | SMS 발신 번호 | `(등록된 번호)` |
| `KAKAO_CLIENT_ID` | 카카오 OAuth 앱 키 | `(카카오 개발자 콘솔)` |
| `KAKAO_CLIENT_SECRET` | 카카오 OAuth 시크릿 | `(카카오 개발자 콘솔)` |
| `NAVER_CLIENT_ID` | 네이버 OAuth 앱 키 | `(네이버 개발자 콘솔)` |
| `NAVER_CLIENT_SECRET` | 네이버 OAuth 시크릿 | `(네이버 개발자 콘솔)` |
| `GOOGLE_CLIENT_ID` | 구글 OAuth 클라이언트 ID | `(Google Cloud Console)` |
| `GOOGLE_CLIENT_SECRET` | 구글 OAuth 시크릿 | `(Google Cloud Console)` |
| `TOSS_SECRET_KEY` | 토스 페이먼츠 시크릿 키 | `(토스 페이먼츠 콘솔)` |
| `TOSS_BILLING_KEY_ENCRYPTION_KEY` | 빌링키 암호화 키 | `(임의 생성)` |
| `FRONTEND_URL` | OAuth 콜백 redirect 대상 URL | `http://localhost:5173` |
| `COOKIE_SECURE` | 쿠키 Secure 속성 (로컬: false) | `false` |

### `fastapi/.env` (FastAPI 설정)

```bash
cp fastapi/.env.example fastapi/.env
```

> 전체 변수 목록과 설명은 [`fastapi/.env.example`](fastapi/.env.example)을 참고하세요. 아래는 초기 설정 시 반드시 채워야 하는 주요 변수만 안내합니다.

| 변수명 | 설명 | 예시 |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL 접속 URL | `postgresql://careerwave:pw@localhost:5432/careerwave` |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-...` |
| `SPRING_BASE_URL` | Spring 서버 내부 URL | `http://localhost:8080` |
| `WEBHOOK_SECRET` | Spring Webhook 인증키 | `(backend/.env와 동일 값)` |
| `JWT_SECRET` | JWT 서명 비밀키 | `(backend/.env와 동일 값)` |
| `AI_METRICS_INTERNAL_SECRET` | AI 메트릭 내부 API 인증키 | `(임의 생성)` |

> ⚠️ `.env` 파일은 절대 Git에 커밋하지 마세요. `.gitignore`에 등록되어 있습니다.
