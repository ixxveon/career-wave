# FastAPI Schema: user/resume (서류 분석 AI)

> Spring Boot ↔ FastAPI 간 `user/resume` 도메인 내부 API 계약 문서.
> 프론트엔드는 FastAPI를 직접 호출하지 않는다.
> Spring Boot가 외부 API 계약, 인증/인가, `ApiResponse<T>` 래핑을 담당하고 FastAPI는 내부 AI 처리만 담당한다.
> 관련 문서: `fastapi-spec.md` / `fastapi-constitution.md` / `specs/backend/user/resume/api-schema.md`

---

## 1. 공통 원칙

### 통신 방식

- 프로토콜: HTTP/JSON
- Spring → FastAPI: Spring Boot가 내부 분석 트리거 요청
- FastAPI → Spring: FastAPI가 분석 상태 업데이트 및 완료 결과를 Webhook으로 콜백
- 인증 방식: `X-Internal-Secret` 헤더 (환경 변수 `WEBHOOK_SECRET` 기준 검증)
  - Spring → FastAPI 트리거 요청 시: `X-Internal-Secret` 헤더 포함
  - FastAPI → Spring Webhook 콜백 시: `X-Internal-Secret` 헤더 포함

### 처리 책임 분리

| 책임 영역 | Spring Boot | FastAPI |
|-----------|-------------|---------|
| 파일 수신 | 프론트엔드로부터 `multipart/form-data` 수신 및 S3 저장 | — |
| 인증/인가 | JWT 검증, 사용자 권한 확인 | `X-Internal-Secret` 헤더 검증 |
| 분석 트리거 | FastAPI 내부 API 호출 | `202 Accepted` 즉시 반환 |
| AI 분석 | — | S3 파일 다운로드, 텍스트 추출, OpenAI 호출, 점수·피드백 생성 |
| 상태 전이 | Webhook 수신 후 DB 업데이트 | 단계별 Webhook 콜백 전송 (PENDING → ANALYZING → COMPLETED/FAILED) |
| 프론트 알림 | Webhook 수신 후 WebSocket 브로드캐스트 (AFTER_COMMIT) | — |
| 외부 응답 | `ApiResponse<T>` 래핑 | 내부 JSON 계약만 사용 |
| DB 쓰기 | `resume_documents` 상태 갱신, 점수·피드백 저장 | 없음 (Webhook 패턴으로 분리) |

### 비동기 처리 원칙

- FastAPI는 분석 트리거 수신 후 `202 Accepted`를 즉시 반환한다.
- 실제 분석은 백그라운드 태스크(`BackgroundTasks` 또는 별도 비동기 큐)로 처리한다.
- 진행 상태는 Webhook 콜백으로 Spring Boot에 전달한다.

---

## 2. Spring → FastAPI: 분석 트리거

### Endpoint

```
POST /internal/user/resume/analyze
Content-Type: application/json
X-Internal-Secret: {WEBHOOK_SECRET}
```

### Request: 이력서 (RESUME)

```json
{
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "fileType": "RESUME",
  "fileUrl": "https://s3.bucket/resumes/2026-06-13/uuid.pdf",
  "originalName": "이력서_홍길동.pdf"
}
```

### Request: 자기소개서 (COVER_LETTER)

```json
{
  "documentId": "660f9511-f30c-52e5-b827-557766551111",
  "fileType": "COVER_LETTER",
  "company": "카카오",
  "job": "백엔드 개발자",
  "content": [
    { "order": 1, "question": "지원 동기를 작성하세요.", "answer": "저는 ..." },
    { "order": 2, "question": "성장 과정을 작성하세요.", "answer": "..." }
  ]
}
```

| Field | Type | 필수 | 설명 |
|-------|------|------|------|
| `documentId` | `string (UUID)` | ✅ | Spring이 생성한 문서 고유 식별자 |
| `fileType` | `string` | ✅ | `RESUME` \| `COVER_LETTER` |
| `fileUrl` | `string` | RESUME만 | S3 파일 URL |
| `originalName` | `string` | RESUME만 | 사용자 원본 파일명 (참고용) |
| `company` | `string` | COVER_LETTER만 | 지원 회사명 |
| `job` | `string` | COVER_LETTER만 | 지원 직무명 |
| `content[]` | `array` | COVER_LETTER만 | 문항·답변 배열 (1~5개) |
| `content[].order` | `number` | ✅ | 문항 순서 (1~5) |
| `content[].question` | `string` | ✅ | 문항 내용 |
| `content[].answer` | `string` | ✅ | 답변 내용 (최대 1000자) |

### Response `202 Accepted`

```json
{
  "accepted": true,
  "documentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

FastAPI는 `202 Accepted`를 즉시 반환하고 분석을 백그라운드로 시작한다.

### 내부 오류 응답 (400/409/500)

```json
{
  "success": false,
  "errorCode": "DOCUMENT_ALREADY_PROCESSING",
  "message": "이미 처리 중인 documentId입니다.",
  "detail": {
    "documentId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

| FastAPI ErrorCode | HTTP | 설명 |
|-------------------|------|------|
| `INVALID_FILE_TYPE` | 400 | `fileType`이 `RESUME`·`COVER_LETTER` 외 값 |
| `MISSING_FILE_URL` | 400 | `fileType: RESUME`인데 `fileUrl` 누락 |
| `MISSING_COVER_LETTER_CONTENT` | 400 | `fileType: COVER_LETTER`인데 `content` 누락 |
| `DOCUMENT_ALREADY_PROCESSING` | 409 | 동일 `documentId` 중복 요청 |
| `INTERNAL_ANALYSIS_ERROR` | 500 | FastAPI 내부 처리 오류 |

---

## 3. FastAPI → Spring: 분석 상태 Webhook 콜백

FastAPI는 분석 단계마다 Spring Boot Webhook을 호출하여 상태를 전달한다.
Spring Boot는 수신 즉시 DB를 업데이트하고 WebSocket으로 프론트에 브로드캐스트한다.

### Endpoint (Spring Boot가 제공)

```
POST {SPRING_BASE_URL}/api/v1/user/resume/{documentId}/webhook
Content-Type: application/json
X-Internal-Secret: {WEBHOOK_SECRET}
```

---

### 3.1 중간 상태 콜백 (PENDING)

분석 트리거를 수신하고 큐에 등록 직후 전송한다.

```json
{
  "status": "PENDING",
  "message": "분석 요청을 받았어요",
  "progress": 0
}
```

---

### 3.2 중간 상태 콜백 (ANALYZING)

분석 단계가 시작될 때마다 전송한다. `message`와 `progress`는 단계에 따라 변경된다.

```json
{
  "status": "ANALYZING",
  "message": "파일을 읽고 있어요",
  "progress": 10
}
```

#### 단계별 ANALYZING 콜백 예시

| 단계 | message | progress |
|------|---------|----------|
| 파일 파싱 / 텍스트 추출 | `"파일을 읽고 있어요"` | 10 |
| 키워드 추출 | `"키워드를 추출하고 있어요"` | 40 |
| 피드백 생성 | `"피드백을 생성하고 있어요"` | 70 |

> 자기소개서는 텍스트 추출 단계 없이 "키워드 추출" 단계부터 시작한다.

---

### 3.3 완료 콜백 (COMPLETED)

분석 성공 시 전송한다. `feedbackText`는 `FeedbackDetail[]`를 JSON 직렬화한 문자열이다.

```json
{
  "status": "COMPLETED",
  "message": "분석이 완료되었어요",
  "progress": 100,
  "scoreJobFitness": 78,
  "scoreTechStack": 85,
  "scoreQuantified": 60,
  "scoreLogical": 72,
  "scoreTotal": 74,
  "overallReview": "전반적으로 백엔드 역량이 우수하나 성과의 정량적 수치화가 아쉽습니다.",
  "feedbackText": "[{\"sectionNumber\":1,\"question\":\"주요 프로젝트 경험\",\"originalText\":\"결제 시스템 개발에 참여하였습니다.\",\"goodPoint\":\"백엔드 프로젝트 경험이 확인됩니다.\",\"badPoint\":\"역할, 규모, 성과가 빠져 있습니다.\",\"improvedText\":\"월 거래액 50억 규모의 결제 시스템 API를 설계 및 구현...\",\"starAnalysis\":{\"s\":{\"ok\":true,\"comment\":\"상황 설명이 적절합니다.\"},\"t\":{\"ok\":false,\"comment\":\"과제가 구체적으로 드러나지 않습니다.\"},\"a\":{\"ok\":true,\"comment\":\"행동이 명시되어 있습니다.\"},\"r\":{\"ok\":false,\"comment\":\"결과가 수치로 표현되지 않았습니다.\"}},\"quantAnalysis\":{\"numbers\":{\"ok\":false,\"comment\":\"수치가 사용되지 않았습니다.\"},\"timeframe\":{\"ok\":false,\"comment\":\"기간 표현이 없습니다.\"},\"scale\":{\"ok\":true,\"comment\":\"규모 언급이 있습니다.\"},\"impact\":{\"ok\":false,\"comment\":\"성과가 수치로 측정되지 않았습니다.\"}}}]",
  "errorMessage": null
}
```

#### COMPLETED 콜백 필드

| Field | Type | 설명 |
|-------|------|------|
| `status` | `string` | `"COMPLETED"` |
| `message` | `string` | `"분석이 완료되었어요"` |
| `progress` | `number` | `100` |
| `scoreJobFitness` | `number` | 직무 적합도 (0~100) |
| `scoreTechStack` | `number` | 기술 스택 (0~100) |
| `scoreQuantified` | `number` | 경험 수치화 (0~100) |
| `scoreLogical` | `number` | 논리력 (0~100) |
| `scoreTotal` | `number` | 종합 점수 (0~100) |
| `overallReview` | `string` | AI 종합 총평 |
| `feedbackText` | `string` | `FeedbackDetail[]` JSON 직렬화 문자열 |
| `errorMessage` | `null` | 정상 완료 시 항상 `null` |

---

### 3.4 실패 콜백 (FAILED)

분석 실패 시 전송한다. 점수·피드백 필드는 모두 `null`.

```json
{
  "status": "FAILED",
  "message": "분석 중 오류가 발생했어요",
  "progress": null,
  "scoreJobFitness": null,
  "scoreTechStack": null,
  "scoreQuantified": null,
  "scoreLogical": null,
  "scoreTotal": null,
  "overallReview": null,
  "feedbackText": null,
  "errorMessage": "파일에서 텍스트를 추출할 수 없습니다."
}
```

---

## 4. feedbackText 직렬화 계약

`feedbackText`는 `FeedbackDetail[]` 배열을 JSON 문자열로 직렬화한 값이다.
Spring Boot의 `ObjectMapper.readValue(feedbackText, FeedbackDetail[].class)`로 역직렬화 가능해야 한다.

### FeedbackDetail 구조

```json
{
  "sectionNumber": 1,
  "question": "주요 프로젝트 경험",
  "originalText": "결제 시스템 개발에 참여하였습니다.",
  "goodPoint": "백엔드 프로젝트 경험이 확인됩니다.",
  "badPoint": "역할, 규모, 성과가 빠져 있습니다.",
  "improvedText": "월 거래액 50억 규모의 결제 시스템 API를 설계 및 구현...",
  "starAnalysis": {
    "s": { "ok": true, "comment": "상황 설명이 적절합니다." },
    "t": { "ok": false, "comment": "과제가 구체적으로 드러나지 않습니다." },
    "a": { "ok": true, "comment": "행동이 명시되어 있습니다." },
    "r": { "ok": false, "comment": "결과가 수치로 표현되지 않았습니다." }
  },
  "quantAnalysis": {
    "numbers":   { "ok": false, "comment": "수치가 사용되지 않았습니다." },
    "timeframe": { "ok": false, "comment": "기간 표현이 없습니다." },
    "scale":     { "ok": true,  "comment": "규모 언급이 있습니다." },
    "impact":    { "ok": false, "comment": "성과가 수치로 측정되지 않았습니다." }
  }
}
```

| Field | Type | 이력서 | 자기소개서 | 설명 |
|-------|------|--------|----------|------|
| `sectionNumber` | `number` | ✅ | ✅ | 항목 번호 (1부터 시작) |
| `question` | `string` | ✅ | ✅ | 이력서: 분석 섹션 제목, 자기소개서: 문항 내용 |
| `originalText` | `string` | ✅ | ✅ | 원문 텍스트 |
| `goodPoint` | `string` | ✅ | ✅ | 잘된 점 |
| `badPoint` | `string` | ✅ | ✅ | 아쉬운 점 |
| `improvedText` | `string` | ✅ | ✅ | 개선 예시 |
| `starAnalysis` | `object \| null` | ✅ | `null` | STAR 분석 (이력서 전용) |
| `quantAnalysis` | `object \| null` | ✅ | 선택 | 수치화 분석 |

> **이력서**: `sectionNumber`는 이력서 섹션 번호 (경력, 기술 스택 등 AI가 구분)  
> **자기소개서**: `sectionNumber`는 `content[].order`와 동일, `question`은 `content[].question` 그대로 사용

### Spring Boot의 `@JsonIgnoreProperties` 보장

FastAPI가 `FeedbackDetail` 구조에 새 필드를 추가해도 Spring Boot는 크래시 없이 알려진 필드만 역직렬화한다.
(`@JsonIgnoreProperties(ignoreUnknown = true)` Spring Boot 구현 기준 — FastAPI가 필드를 자유롭게 확장 가능)

---

## 5. 환경 변수

| 환경 변수 | 설명 | 예시 |
|-----------|------|------|
| `SPRING_BASE_URL` | Spring Boot 내부 URL (Webhook 콜백 대상) | `http://localhost:8080` |
| `WEBHOOK_SECRET` | 내부 인증 공유 키 (Spring Boot와 동일 값) | `(임의 생성 비밀값)` |
| `OPENAI_API_KEY` | OpenAI API 키 | `sk-...` |
| `OPENAI_MODEL_LIGHT` | 텍스트 추출·요약 단계 모델 | `gpt-4o-mini` |
| `OPENAI_MODEL_DEEP` | 심층 피드백·STAR 분석 단계 모델 | `gpt-4o` |
| `AWS_ACCESS_KEY_ID` | S3 접근 Access Key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | S3 접근 Secret Key | `wJalrXUtn...` |
| `AWS_REGION` | S3 버킷 리전 | `ap-northeast-2` |
| `AWS_S3_BUCKET_NAME` | S3 버킷명 | `careerwave-files` |

> 모든 환경 변수는 `fastapi/core/` 설정 계층에서 관리한다. 코드에 직접 하드코딩 금지.

---

## 6. 패키지 구조 (구현 가이드)

```text
fastapi/user/
└── resume/
    ├── api/
    │   └── resume_router.py        POST /internal/user/resume/analyze 라우터
    ├── schema/
    │   ├── request.py              AnalyzeDocumentRequest (Pydantic)
    │   └── response.py             TriggerAcceptedResponse (Pydantic)
    ├── service/
    │   ├── resume_service.py       분석 오케스트레이션 (파싱 → AI → 콜백)
    │   ├── file_parser.py          S3 다운로드 + 텍스트 추출 (pdfplumber / python-docx)
    │   └── webhook_client.py       Spring Boot Webhook 콜백 HTTP 클라이언트
    └── prompts/
        └── resume_prompts.py       이력서·자기소개서 분석 프롬프트 템플릿

fastapi/core/
└── config.py                   환경 변수 로딩 (Settings 클래스)
```

> `api/resume_router.py`에 비즈니스 로직을 직접 작성하지 않는다. — Convention § 12 준수

---

## 7. 내부 오류 계약

### 공통 내부 오류 응답 형식

```json
{
  "success": false,
  "errorCode": "FILE_PARSE_FAILED",
  "message": "파일에서 텍스트를 추출할 수 없습니다.",
  "detail": {
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "ENCRYPTED_PDF"
  }
}
```

- `success`: FastAPI 내부 처리 성공 여부
- `errorCode`: Spring Boot가 도메인 ErrorCode로 변환할 수 있는 내부 식별자
- `message`: 내부 오류 설명
- `detail`: 선택 필드 — 디버깅용 추가 정보

### FastAPI ErrorCode → Spring Boot ErrorCode 매핑

| FastAPI ErrorCode | HTTP | Spring ErrorCode | 설명 |
|-------------------|------|------------------|------|
| `INVALID_FILE_TYPE` | 400 | `DOCUMENT_INVALID_FILE_TYPE` | `fileType`이 `RESUME`·`COVER_LETTER` 외 값 |
| `MISSING_FILE_URL` | 400 | `DOCUMENT_MISSING_FILE_URL` | `fileType: RESUME`인데 `fileUrl` 누락 |
| `MISSING_COVER_LETTER_CONTENT` | 400 | `DOCUMENT_MISSING_CONTENT` | `fileType: COVER_LETTER`인데 `content` 누락 |
| `DOCUMENT_ALREADY_PROCESSING` | 409 | `DOCUMENT_ALREADY_PROCESSING` | 동일 `documentId` 중복 요청 |
| `S3_DOWNLOAD_FAILED` | 500 | `DOCUMENT_ANALYSIS_FAILED` | S3 파일 다운로드 실패 |
| `FILE_PARSE_FAILED` | 500 | `DOCUMENT_ANALYSIS_FAILED` | 파일 텍스트 추출 실패 (암호화 PDF 등) |
| `OPENAI_API_ERROR` | 500 | `DOCUMENT_ANALYSIS_FAILED` | OpenAI API 호출 실패 또는 타임아웃 |
| `WEBHOOK_CALLBACK_FAILED` | 500 | — | Webhook 콜백 3회 재시도 후 최종 실패 (Spring에 전달 불가 — 로그만 기록) |
| `INTERNAL_ANALYSIS_ERROR` | 500 | `DOCUMENT_ANALYSIS_FAILED` | 그 외 FastAPI 내부 오류 |

> Spring Boot ErrorCode는 `specs/backend/user/resume/` 문서 기준으로 확인한다. 위 매핑은 참고용이며 백엔드 구현과 동기화 필요.

### 사용자 노출용 errorMessage 매핑 기준

`errorMessage`는 프론트엔드에 최종 노출된다. 예외 종류에 따라 아래 공통 메시지군으로 매핑하고, 내부 스택 트레이스·파일 경로·DB 쿼리는 절대 포함하지 않는다.

| 예외 상황 | errorMessage (사용자 노출) | 개발자 로그 |
|-----------|--------------------------|------------|
| 지원하지 않는 파일 형식 | `"지원하지 않는 파일 형식입니다. PDF 또는 DOCX 파일을 업로드해주세요."` | `logger.error(..., exc_info=True)` |
| 암호화된 PDF | `"암호화된 파일은 분석할 수 없습니다. 암호 해제 후 다시 업로드해주세요."` | `logger.error(..., exc_info=True)` |
| 텍스트 추출 불가 (이미지 기반 PDF 등) | `"파일에서 텍스트를 읽을 수 없습니다. 텍스트가 포함된 파일로 다시 업로드해주세요."` | `logger.error(..., exc_info=True)` |
| S3 다운로드 실패 | `"파일을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."` | `logger.error(..., exc_info=True)` |
| OpenAI API 오류 / 타임아웃 | `"AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."` | `logger.error(..., exc_info=True)` |
| 그 외 예기치 못한 오류 (Fallback) | `"분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."` | `logger.error(..., exc_info=True)` |

> `errorMessage`가 빈 문자열이거나 `null`인 FAILED 콜백은 허용하지 않는다. 항상 위 표 중 하나의 문구를 사용한다.

### Error Registry 구조 가이드

`if-else`가 코드 곳곳에 흩어지지 않도록 `user/service/error_registry.py`에 중앙 매핑 테이블을 두고 관리한다.

```python
# user/service/error_registry.py
ERROR_MESSAGES: dict[str, str] = {
    "PDF_ENCRYPTION":      "암호화된 파일은 분석할 수 없습니다. 암호를 해제 후 다시 업로드해주세요.",
    "FILE_PARSE_FAILED":   "파일에서 텍스트를 읽을 수 없습니다. 텍스트가 포함된 파일로 다시 업로드해주세요.",
    "UNSUPPORTED_FORMAT":  "지원하지 않는 파일 형식입니다. PDF 또는 DOCX 파일을 업로드해주세요.",
    "S3_DOWNLOAD_FAILED":  "파일을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    "OPENAI_API_ERROR":    "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    "ANALYSIS_TIMEOUT":    "분석에 너무 많은 시간이 소요되고 있습니다. 잠시 후 다시 시도해주세요.",
    "INTERNAL_SERVER_ERROR": "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",  # Fallback
}

def get_user_message(error_code: str) -> str:
    return ERROR_MESSAGES.get(error_code, ERROR_MESSAGES["INTERNAL_SERVER_ERROR"])
```

### Webhook 3회 재시도 최종 실패 처리

3회 재시도 후에도 Spring Boot 콜백 전달이 실패한 경우:

- Spring Boot 측 DB 상태가 갱신되지 않아 Zombie Task 위험이 있음
- `WEBHOOK_CALLBACK_FAILED` ERROR 레벨 로그를 반드시 기록한다
- MVP 범위: 로그 기록으로 대응, 운영 알림(Slack 등) 연동은 aiMetrics 운영 정책과 합산하여 추후 결정

---

## 8. DB 접근 범위

FastAPI는 `user/resume` 도메인에서 DB를 직접 쓰지 않는다.
모든 상태 갱신은 Spring Boot Webhook 콜백을 통해 Spring Boot가 처리한다.

| 접근 유형 | 대상 테이블 | 설명 |
|-----------|------------|------|
| 읽기 | 없음 | FastAPI는 페이로드에서 필요한 정보를 모두 수신 |
| 쓰기 | 없음 | DB 저장은 Spring Boot 책임 |

> Spring Boot 내부 DB에 FastAPI가 직접 연결하지 않는다. Webhook 콜백 패턴으로 분리.
