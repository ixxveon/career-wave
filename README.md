# Career Wave Admin

## 기술 스택 (Tech Stack)

본 프로젝트는 하나의 저장소(Repository)에서 전체 플랫폼 서비스를 관리하는 모노레포(Monorepo) 아키처로 구성되어 있으며, 모듈별 기술 스택은 다음과 같습니다.


### 1. 모듈별 기술 스택 매트릭스

| 레이어 | 모듈명 | 언어 / 프레임워크 | 주요 라이브러리 및 상세 명세 |
| :--- | :--- | :--- | :--- |
| **인프라** | `Common` | GitHub, GitHub Actions | 모노레포 CI/CD, 빌드 및 테스트 자동화 파이프라인 |
| **데이터베이스** | `Data` | PostgreSQL | 관계형 데이터베이스 통합 인프라 구축 |
| **백엔드** | `user-backend`<br>`admin-backend` | Java 17<br>Spring Boot 3.x<br>Gradle | Spring Data JPA, Spring Security, JWT, Lombok |
| **AI 및 엔진** | `user-fastapi`<br>`admin-fastapi` | Python 3.x<br>FastAPI | 실시간 AI 면접 분석 피드백, 채용 공고 스크래핑 스케줄러 |
| **프론트엔드** | `user-frontend`<br>`admin-frontend` | JavaScript / TypeScript<br>React | 컴포넌트 기반 웹 아키텍처, Tailwind CSS |


### 2. 모노레포 프로젝트 디렉토리 구조

각 모듈이 완전히 분리되어 독립적인 레이어로 관리되는 저장소 구조 명세입니다.

```text
career-wave/
├── .github/                  # GitHub 이슈/PR 템플릿 및 자동화 워크플로우 (CI)
├── backend/                  # 스프링 부트 백엔드 시스템 루트
│   ├── admin-backend/        # 관리자 백오피스 비즈니스 로직 및 API
│   └── user-backend/         # 일반 사용자 서비스 비즈니스 로직 및 API
├── fastapi/                  # 파이썬 FastAPI 시스템 루트
│   ├── admin-fastapi/        # 외부 채용 사이트 공고 수집 크롤링 엔진
│   └── user-fastapi/         # 사용자 답변 데이터 분석 및 AI 피드백 엔진
└── frontend/                 # 리액트 프론트엔드 시스템 루트
    ├── admin-frontend/       # 관리자 대시보드 웹 애플리케이션
    └── user-frontend/        # 일반 사용자 서비스 웹 애플리케이션
```

## 실행 방법

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### FastAPI
```bash
cd fastapi
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Backend
```bash
cd backend
./gradlew bootRun
```

## 환경 변수

각 모듈 디렉토리의 `.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.
