# Career Wave Admin

기업 파트너 및 채용 공고 관리, 멘토 정산 처리를 담당하는 어드민 시스템입니다.

## 구성

| 모듈 | 기술 스택 | 역할 |
|------|-----------|------|
| `frontend/` | React + Vite | 어드민/기업용 대시보드 웹 UI |
| `fastapi/` | Python + FastAPI | 외부 채용 공고 스크래핑 엔진 |
| `backend/` | Spring Boot | 어드민 & 기업용 REST API 서버 |

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
