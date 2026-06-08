# Career Wave

## 기술 스택 (Tech Stack)

본 프로젝트는 하나의 저장소(Repository)에서 전체 플랫폼 서비스를 관리하는 모노레포(Monorepo) 아키처로 구성되어 있으며, 모듈별 기술 스택은 다음과 같습니다.


### 1. 모듈별 기술 스택 매트릭스

| 레이어 | 모듈명 | 언어 / 프레임워크 | 주요 라이브러리 및 상세 명세 |
| :--- | :--- | :--- | :--- |
| **인프라** | `Common` | GitHub, GitHub Actions | 모노레포 CI/CD, 빌드 및 테스트 자동화 파이프라인 |
| **데이터베이스** | `Data` | PostgreSQL | 관계형 데이터베이스 통합 인프라 구축 |
| **백엔드** | `user-backend`<br>`admin-backend` | Java 17<br>Spring Boot 3.x<br>Gradle | Spring Data JPA, Spring Security, JWT, Lombok |
| **AI 및 엔진** | `user-fastapi`<br>`admin-fastapi` | Python 3.x<br>FastAPI | 실시간 AI 면접 분석 피드백, 채용 공고 스크래핑 스케줄러 |
| **프론트엔드** | `frontend` | TypeScript<br>React | TanStack Query, React Router, MSW, Vite |


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
└── frontend/                 # 리액트 프론트엔드 시스템 루트 (user + admin 통합)
    ├── public/               # 정적 파일 (MSW 서비스워커 등)
    └── src/
        ├── api/              # API 호출 함수
        │   ├── admin/
        │   └── user/
        ├── components/       # 재사용 컴포넌트
        │   ├── admin/
        │   └── user/
        ├── constants/        # 상수 정의
        ├── data/             # 목 데이터
        ├── hooks/            # 커스텀 훅
        │   └── user/
        ├── layouts/          # 레이아웃 컴포넌트
        │   └── admin/
        ├── mocks/            # MSW 핸들러
        │   ├── admin/
        │   └── user/
        ├── pages/            # 페이지 컴포넌트
        │   ├── admin/
        │   └── user/
        ├── routes/           # 라우팅 설정
        ├── styles/           # 전역 및 도메인별 스타일
        │   ├── admin/
        │   └── user/
        ├── types/            # TypeScript 타입 정의
        │   ├── admin/
        │   └── user/
        └── utils/            # 유틸리티 함수
            ├── admin/
            └── user/
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

## 테스트 계정

| 아이디 | 비밀번호 | 설명 |
| :--- | :--- | :--- |
| `testuser01` | `Test1234!` | 개인 회원 — 구독 없음 |
| `testuser02` | `Test1234!` | 개인 회원 — AI 모의면접만 구독 |
| `testuser03` | `Test1234!` | 개인 회원 — 서류 AI 코칭만 구독 |
| `testuser04` | `Test1234!` | 개인 회원 — 두 상품 모두 구독 |
| `testcompany01` | `Test1234!` | 기업 회원 — 구독 없음 |
| `admin` | `1234` | 관리자 (기존) |

## 환경 변수

각 모듈 디렉토리의 `.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.
