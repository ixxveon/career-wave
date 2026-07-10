# Career Wave

> AI 기반 면접 코칭·서류 분석·커리어 진단 기능을 제공하는 취업 지원 통합 플랫폼

---

## 1. 프로젝트 소개 및 개발 배경

**"기존의 지루한 채용 공고 나열형 플랫폼에서 벗어난, 취준생 맞춤형 AI 취업 트레이닝 룸"**

CareerWave는 수많은 채용 공고 속에서 방향을 잃은 IT 취준생들을 위한 **AI 기반 개인화 취업 준비 플랫폼**입니다.

사용자가 이력서·자기소개서를 등록하면 AI가 서류를 정밀 진단해 핵심 역량을 추출하고, 실시간 AI 모의면접으로 취업 실력을 정량적 데이터로 축적합니다.

단순히 공고를 나열하는 것이 아니라, 서류 분석 결과와 면접 데이터를 결합해 **현재 내 역량으로 합격 확률이 가장 높은 채용 공고를 역으로 추천해 주는 선순환 구조**를 지향합니다.

---

## 2. 주요 화면

| 메인 페이지 | 이력서 AI 분석 |
| :---: | :---: |
| <img width="1381" alt="메인 페이지" src="https://github.com/user-attachments/assets/1c482b39-4c80-45be-8ff8-82e480e3ec0e" /> | <img width="1899" alt="이력서 AI 분석" src="https://github.com/user-attachments/assets/727efb41-41a3-4d7d-ad90-ba168cca660d" /> |

| 자기소개서 AI 분석 | AI 모의면접 |
| :---: | :---: |
| <img width="1474" alt="자기소개서 AI 분석" src="https://github.com/user-attachments/assets/fbad1124-cbbe-4029-b0e7-0752a09292e1" /> | <img width="1788" alt="AI 모의면접" src="https://github.com/user-attachments/assets/cf22fb2a-1fd2-4eb0-9d35-f98e85a10f5a" /> |

| 마이페이지 / 구독 | 관리자 백오피스 |
| :---: | :---: |
| <img width="1492" alt="마이페이지 / 구독" src="https://github.com/user-attachments/assets/78080265-1eb9-4c3b-8f41-0e40a9a67001" /> | <img width="1896" height="901" alt="image" src="https://github.com/user-attachments/assets/7d2d243b-bbd6-4fee-a580-e870fb2aaa60" />
 |

---

## 3. 핵심 기능

| 기능 | 설명 |
| :--- | :--- |
| **이력서 AI 분석** | PDF·Word 파일 업로드 시 직무 적합도·KPI 부족 문장 탐지 및 개선 제안 |
| **자기소개서 AI 분석** | 문항별 답변을 AI가 분석해 구체성·논리성 피드백 제공 |
| **AI 모의면접** | 이력서·채용공고 기반 맞춤 질문 실시간 생성, 텍스트·음성 답변 지원 |
| **채용공고 연동** | 스크래핑 기반 채용공고 수집·검색 및 서류 분석 연동 |
| **구독 / 결제** | 상품별 월 구독 및 토스페이먼츠 자동 빌링 |
| **관리자 백오피스** | 회원·결제·AI 메트릭·공지·FAQ 관리 |

---

## 4. 시스템 아키텍처

> _시스템 아키텍처 다이어그램을 여기에 추가해 주세요._

---

## 5. 기술 스택

본 프로젝트는 모노레포(Monorepo) 구조로 구성되어 있습니다.

| 레이어 | 모듈 | 언어 / 프레임워크 | 주요 라이브러리 |
| :--- | :--- | :--- | :--- |
| **인프라** | Common | GitHub Actions | CI/CD, 빌드 및 테스트 자동화 |
| **데이터베이스** | Data | PostgreSQL, Redis | 관계형 DB, 세션·캐시 |
| **백엔드** | user-backend, admin-backend | Java 21, Spring Boot 3.x | Spring Data JPA, Spring Security, JWT |
| **AI 엔진** | user-fastapi, admin-fastapi | Python 3.11, FastAPI | OpenAI API, APScheduler |
| **프론트엔드** | frontend | TypeScript, React | TanStack Query, React Router, Vite |

---

## 6. 실행 방법

### Local Infra (PostgreSQL + Redis)

```bash
# 1. 루트 .env 파일 생성
cp .env.example .env

# 2. PostgreSQL + Redis 컨테이너 실행
docker compose up -d

# 3. 실행 확인
docker compose ps
docker compose exec redis redis-cli ping
```

> ⚠️ `init.sql`은 볼륨이 비어있는 **최초 실행 시에만** 자동 적용됩니다.
> DDL이 변경된 경우 볼륨을 초기화한 뒤 다시 실행하세요.
> ```bash
> docker compose down -v && docker compose up -d
> ```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

| 플랫폼 | 배포 URL | 로컬 URL |
| :--- | :--- | :--- |
| 사용자 | https://www.careerwave.kr | http://localhost:5173 |
| 관리자 | 내부 문서 참고 | 내부 문서 참고 |

### FastAPI

> **전제 조건**: Python 3.11 이상 / 상세 설정: [`fastapi/LOCAL_DEV_SETUP.md`](fastapi/LOCAL_DEV_SETUP.md)

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

> **전제 조건**: JDK 21 이상 / 상세 설정: [`backend/LOCAL_DEV_SETUP.md`](backend/LOCAL_DEV_SETUP.md)

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

> IntelliJ 환경 변수 설정: `Run > Edit Configurations > CareerWaveApplication > Environment variables`에 `backend/.env` 내용 입력
> ([EnvFile 플러그인](https://plugins.jetbrains.com/plugin/7861-envfile) 사용 권장)

| 항목 | URL |
| :--- | :--- |
| Spring Boot API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |

### 테스트 계정

```bash
# backend/ 디렉토리에서 실행
psql -U careerwave -d careerwave -f src/main/resources/db/seed-local.sql
```

| 아이디 | 비밀번호 | 설명 |
| :--- | :--- | :--- |
| `testfree` | `Testfree` | 일반회원 (무료) |
| `testpremium` | `Testpremium` | 일반회원 (구독) |

---

## 7. 프로젝트 구조

```text
career-wave/
├── .github/        # CI/CD 워크플로우, PR 템플릿, 컨트리뷰션 가이드
├── frontend/       # React + Vite (TypeScript) — user / admin 통합
├── backend/        # Spring Boot (Java 21)
├── fastapi/        # FastAPI (Python 3.11+) — AI 엔진 및 스크래핑
├── db/             # PostgreSQL init.sql / seed 파일
├── docs/           # 컨벤션 문서
├── specs/          # 스펙 명세 문서
└── README.md
```

---

## 8. 기능별 담당자

| 이름 | GitHub | 담당 모듈 |
| :--- | :--- | :--- |
|  | [@ixxveon](https://github.com/ixxveon) |  |
|  | [@hongsoonchan02](https://github.com/hongsoonchan02) |  |
|  | [@sbr7518-bit](https://github.com/sbr7518-bit) |  |
|  | [@maranqian-bot](https://github.com/maranqian-bot) |  |
|  | [@dmsquf9193-dot](https://github.com/dmsquf9193-dot) |  |
|  | [@yul941117-wq](https://github.com/yul941117-wq) |  |

---

## 컨트리뷰션 가이드

브랜치 전략, 커밋 컨벤션, PR 규칙은 [CONTRIBUTION.md](.github/CONTRIBUTION.md)를 참고해 주세요.
