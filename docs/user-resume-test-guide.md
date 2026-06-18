# 서류 분석 API 로컬 테스트 가이드

> 대상: user-backend, user-fastapi 담당 팀원  
> 관련 브랜치: `feature/backend-user-resume-setup`, `feature/fastapi-user-resume-validation`

---

## 사전 준비

### 1. 환경 변수 설정

**Spring Boot `.env`**
```env
FASTAPI_BASE_URL=http://localhost:8000
WEBHOOK_SECRET=<팀 공유 시크릿 값>
AWS_S3_MOCK_UPLOAD=true          # 로컬 S3 실제 업로드 없이 테스트할 경우
```

**FastAPI `.env`**
```env
SPRING_BASE_URL=http://localhost:8080
WEBHOOK_SECRET=<Spring Boot와 동일한 값>
OPENAI_API_KEY=<본인 OpenAI API 키>
OPENAI_MODEL_LIGHT=gpt-4o-mini
OPENAI_MODEL_DEEP=gpt-4o
```

> `WEBHOOK_SECRET` 값이 양쪽에서 반드시 일치해야 합니다.  
> 다르면 FastAPI → Spring Boot webhook 수신 시 `403 Forbidden`이 발생합니다.

### 2. 서버 실행 순서

```bash
# 터미널 1 — Spring Boot
cd backend && ./gradlew bootRun

# 터미널 2 — FastAPI
cd fastapi && uvicorn main:app --reload --port 8000
```

> Spring Boot가 완전히 뜬 뒤 FastAPI를 실행하면 됩니다.  
> Spring Boot 기본 포트: `8080`, FastAPI: `8000`

---

## 테스트 시나리오

Swagger UI: `http://localhost:8080/swagger-ui.html`

### Step 0. 로그인 (공통)

```
POST /api/v1/user/members/login
```
```json
{
  "loginId": "테스트 계정 아이디",
  "password": "비밀번호"
}
```
응답의 `accessToken`을 복사해 Swagger 우측 상단 **Authorize** → `Bearer {토큰}` 입력

---

### 시나리오 1 — 자기소개서 분석 (COVER_LETTER)

**① 제출**
```
POST /api/v1/user/resume/cover-letter
```
```json
{
  "company": "카카오",
  "job": "백엔드 개발자",
  "content": [
    {
      "order": 1,
      "question": "지원 동기를 작성해주세요.",
      "answer": "저는 대규모 트래픽 처리에 관심이 많아 카카오에 지원하게 되었습니다..."
    },
    {
      "order": 2,
      "question": "본인의 강점을 기술해주세요.",
      "answer": "저의 강점은 문제 해결 능력입니다..."
    }
  ]
}
```
응답에서 `documentId` 확인

**② 분석 완료 대기 (10~30초)**

**③ 결과 조회**
```
GET /api/v1/user/resume/{documentId}/feedback
```
예상 응답:
```json
{
  "success": true,
  "data": {
    "documentId": "...",
    "status": "COMPLETED",
    "scores": {
      "jobFitness": 75,
      "techStack": 60,
      "quantified": 45,
      "logical": 80,
      "total": 70
    },
    "overallReview": "전반적으로 ...",
    "feedbackDetails": [...]
  }
}
```

---

### 시나리오 2 — 이력서 파일 분석 (RESUME)

> `AWS_S3_MOCK_UPLOAD=true`이면 실제 파일을 S3에 올리지 않고 가짜 URL로 테스트됩니다.  
> 실제 S3 업로드 테스트 시에는 `false`로 변경 후 AWS 자격증명 필요.

**① 업로드**
```
POST /api/v1/user/resume/upload
Content-Type: multipart/form-data
```
- `file`: PDF·DOC·DOCX 파일 선택 (최대 10MB)

응답에서 `documentId` 확인

**② 분석 완료 대기 (30초~2분, 파일 크기에 따라 상이)**

**③ 결과 조회**
```
GET /api/v1/user/resume/{documentId}/feedback
```

---

### 시나리오 3 — 이력 목록 조회

```
GET /api/v1/user/resume/history?page=0&size=10
```
본인이 제출한 이력서·자기소개서 목록이 최신순으로 반환됩니다.

---

### 시나리오 4 — 오류 케이스

| 케이스 | 방법 | 예상 응답 |
|--------|------|-----------|
| 파일 크기 초과 (10MB+) | 10MB 이상 파일 업로드 | `400` + `파일 크기가 최대 허용 용량을 초과했습니다.` |
| 지원하지 않는 파일 형식 | `.jpg`, `.txt` 등 업로드 | `400` + `지원하지 않는 파일 형식입니다.` |
| 존재하지 않는 documentId | 임의 UUID로 feedback 조회 | `404` |
| 타인 documentId 접근 (IDOR) | 다른 계정의 documentId로 조회 | `403` |
| 문항 수 초과 (6개+) | content 배열 6개 이상 제출 | `400` + 검증 오류 |

---

## 분석 상태 흐름

```
UPLOADED → PENDING → ANALYZING → COMPLETED
                               ↘ FAILED
```

| 상태 | 설명 |
|------|------|
| `UPLOADED` | 파일 업로드 또는 자기소개서 제출 완료, FastAPI 트리거 전 |
| `PENDING` | FastAPI가 분석 요청 수신, 큐 대기 중 |
| `ANALYZING` | OpenAI 분석 진행 중 |
| `COMPLETED` | 분석 완료, feedback 조회 가능 |
| `FAILED` | 파일 파싱 실패, OpenAI 오류 등 — `errorMessage` 확인 |

---

## 자주 발생하는 오류

### FastAPI 트리거 후 상태가 UPLOADED에서 안 바뀜
- FastAPI 서버가 실행 중인지 확인 (`http://localhost:8000/docs`)
- Spring Boot `.env`의 `FASTAPI_BASE_URL`이 `http://localhost:8000`인지 확인

### webhook 수신 시 403
- `WEBHOOK_SECRET` 값이 Spring Boot `.env`와 FastAPI `.env`에서 동일한지 확인

### 상태가 FAILED로 바뀜
- FastAPI 터미널 로그 확인 — `[documentId] Analysis started` 이후 오류 메시지 확인
- `OPENAI_API_KEY` 유효한지 확인

### ddl-auto 스키마 오류로 Spring Boot 미기동
- DB 스키마 마이그레이션이 완료되었는지 확인 (관련 이슈: #528)
