# Career Wave FastAPI — 로컬 실행 가이드

---

## Step 1. Python 환경 설정

Python 3.11 이상이 필요합니다.

```bash
python --version
# → Python 3.11.x 이상이어야 함
```

가상환경 생성 및 활성화:

### Mac / Linux
```bash
cd fastapi
python -m venv venv
source venv/bin/activate
```

### Windows
```bash
cd fastapi
python -m venv venv
venv\Scripts\activate
```

---

## Step 2. 의존성 설치

```bash
pip install -r requirements.txt
```

---

## Step 3. 환경변수 설정

```bash
cp .env.example .env
```

Windows:
```cmd
copy .env.example .env
```

`fastapi/.env` 파일을 열어 아래 값을 채워주세요.

```env
# Spring 연동
SPRING_BASE_URL=http://localhost:8080
WEBHOOK_SECRET=아무_문자열_입력  ← Spring Boot .env의 WEBHOOK_SECRET과 동일한 값

# OpenAI (Phase 4 AI 분석 구현 전까지는 없어도 됩니다)
OPENAI_API_KEY=sk-...

# AWS S3 (인프라팀 요청 후 발급)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET_NAME=
```

> `WEBHOOK_SECRET`은 Spring Boot `.env`의 값과 반드시 동일하게 설정해야 합니다.

---

## Step 4. 서버 실행

`fastapi/` 디렉토리 안에서 실행합니다.

```bash
uvicorn main:app --reload
```

서버가 정상 실행되면:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

---

## Step 5. 동작 확인

### Swagger UI
브라우저에서 `http://localhost:8000/docs` 접속

### 헬스 체크
```bash
curl http://localhost:8000/health
# → {"status":"ok"}
```

### API 테스트 (Phase 2 이후)

**403 확인 — X-Internal-Secret 헤더 누락**
```bash
curl -X POST http://localhost:8000/internal/user/resume/analyze \
  -H "Content-Type: application/json" \
  -d '{"documentId":"test-id","fileType":"RESUME","fileUrl":"https://s3.test/test.pdf"}'
# → 403 Forbidden
```

**202 확인 — RESUME 타입**
```bash
curl -X POST http://localhost:8000/internal/user/resume/analyze \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: {WEBHOOK_SECRET 값}" \
  -d '{
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "fileType": "RESUME",
    "fileUrl": "https://s3.test/resume.pdf",
    "originalName": "이력서.pdf"
  }'
# → 202 Accepted
```

**202 확인 — COVER_LETTER 타입**
```bash
curl -X POST http://localhost:8000/internal/user/resume/analyze \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: {WEBHOOK_SECRET 값}" \
  -d '{
    "documentId": "660f9511-f30c-52e5-b827-557766551111",
    "fileType": "COVER_LETTER",
    "company": "카카오",
    "job": "백엔드 개발자",
    "content": [
      { "order": 1, "question": "지원 동기를 작성하세요.", "answer": "저는..." }
    ]
  }'
# → 202 Accepted
```

**409 확인 — 동일 documentId 중복 요청**

위 요청을 동일한 `documentId`로 연속 두 번 전송하면 `409 Conflict` 반환.
