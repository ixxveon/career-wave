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
| **AI 및 엔진** | `user-fastapi`<br>`admin-fastapi` | Python 3.x<br>FastAPI | 실시간 AI 면접 분석 피드백, 채용 공고 스크래핑 스케줄러 |
| **프론트엔드** | `frontend` | TypeScript<br>React | TanStack Query, React Router, MSW, Vite |


### 2. 모노레포 프로젝트 디렉토리 구조

각 모듈이 완전히 분리되어 독립적인 레이어로 관리되는 저장소 구조 명세입니다.

```text
career-wave/
├── .github/        # CI/CD 워크플로우 및 PR 템플릿
├── frontend/       # React + Vite (TypeScript) — user / admin 통합
├── backend/        # Spring Boot (Java 21) — 단일 서버
├── fastapi/        # FastAPI (Python) — AI 엔진 및 스크래핑
├── specs/          # 스펙 명세 문서
└── README.md
```

## 실행 방법

### Database (로컬 PostgreSQL)

```bash
# 1. .env 파일 생성 후 DB_PASSWORD 값 채우기
copy .env.example .env

# 2. PostgreSQL 컨테이너 실행 (최초 1회 init.sql 자동 적용)
docker-compose up -d
```

> ⚠️ `init.sql`은 볼륨이 비어있는 **최초 실행 시에만** 자동 적용됩니다.
> DDL이 변경된 경우 아래 명령어로 볼륨을 초기화한 뒤 다시 실행하세요.

```bash
# 볼륨 초기화 (데이터 전체 삭제 후 재생성)
docker-compose down -v
docker-compose up -d
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
| 관리자 | http://localhost:5173/admin |

### FastAPI
```bash
cd fastapi
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Backend

> **전제 조건**: JDK 21 이상이 설치되어 있어야 합니다.
> 로컬 환경 세팅 상세는 [`backend/LOCAL_DEV_SETUP.md`](backend/LOCAL_DEV_SETUP.md)를 참고하세요.

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

| 항목 | URL |
| :--- | :--- |
| Swagger UI | http://localhost:8080/swagger-ui.html |

## 테스트 계정

로컬 DB에 테스트 데이터를 넣으려면 아래 명령어를 실행하세요.

```bash
# backend/ 디렉토리에서 실행
psql -U careerwave -d careerwave -f src/main/resources/db/seed-local.sql
```

> 재실행해도 안전합니다 (기존 데이터 DELETE 후 재삽입).

| 아이디 | 비밀번호 | roleType | 설명 |
| :--- | :--- | :--- | :--- |
| `testuser01` | `Test1234!` | `USER` | 일반회원 FREE |
| `testuser02` | `Test1234!` | `USER` | 일반회원 PREMIUM (면접) |
| `testuser03` | `Test1234!` | `USER` | 일반회원 PREMIUM (서류) |
| `testuser04` | `Test1234!` | `USER` | 일반회원 PREMIUM (전체) |
| `testcompany01` | `Test1234!` | `COMPANY` | 기업회원 |
| `admin` | `1234` | — | 관리자 MASTER |

## 환경 변수

각 모듈 디렉토리의 `.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.
