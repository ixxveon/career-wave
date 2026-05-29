# API Schema: Document Analysis (서류 코칭)
 
> 백엔드 통신을 위한 API 명세서입니다.  
> 관련 문서: `plan.md` / `tasks.md` / `constitution.md`

---

## 공통

### Base URL
```
/api/v1/resume
```

### 날짜 포맷
모든 날짜와 시간은 **ISO 8601** 표준 형식을 사용한다. (예: `2026-05-29T14:53:44Z`)

### 인증
모든 API는 JWT Bearer 토큰 인증을 사용합니다.  
`memberId`는 서버에서 토큰을 통해 추출하며, **Request body에 포함하지 않습니다.**

```
Authorization: Bearer {accessToken}
```

> ⚠️ TODO: JWT 기반 인증 방식 백엔드 확인 필요 (현재 Request body의 `memberId` 제거 전제)

### 에러 응답 공통 포맷
```json
{
  "errorCode": "ERROR_CODE",
  "message": "에러 설명 메시지"
}
```

| errorCode | 설명 |
|-----------|------|
| `FILE_SIZE_EXCEEDED` | 파일 크기 10MB 초과 |
| `INVALID_FILE_TYPE` | 지원하지 않는 파일 형식 |
| `DOCUMENT_NOT_FOUND` | 존재하지 않는 documentId |
| `FORBIDDEN_DOCUMENT` | 본인 소유가 아닌 문서 접근 (IDOR 방어) |
| `ANALYSIS_TIMEOUT` | AI 분석 타임아웃 |
| `INVALID_CONTENT` | 자기소개서 문항 수 또는 글자 수 초과 |
| `UNAUTHORIZED` | 인증 토큰 없음 또는 만료 |

---

## 1. 이력서 업로드

- **Endpoint**: `POST /api/v1/resume/upload`
- **Description**: 이력서 파일 업로드 및 `documentId` 발급
- **Content-Type**: `multipart/form-data`

### Request

| Field | Type | 필수 | 설명 |
|-------|------|------|------|
| `file` | `File` | ✅ | PDF, DOC, DOCX / Max 10MB |

### Response `200 OK`
```json
{
  "documentId": "uuid-v4",
  "status": "UPLOADED",
  "fileUrl": "https://s3.bucket/path/to/file.pdf",
  "originalName": "이력서_홍길동.pdf",
  "fileType": "RESUME",
  "createdAt": "2026-05-29T14:53:44Z"
}
```

> ℹ️ 업로드 완료 즉시 서버에서 AI 분석 작업을 **자동 트리거**합니다.  
> 클라이언트는 `documentId` 수신 후 즉시 `GET /feedback` 폴링을 시작합니다.

### Error Cases
| errorCode | 상황 |
|-----------|------|
| `FILE_SIZE_EXCEEDED` | 파일 크기 10MB 초과 |
| `INVALID_FILE_TYPE` | PDF·DOC·DOCX 이외 파일 |
| `UNAUTHORIZED` | 토큰 없음 또는 만료 |

---

## 2. 자기소개서 제출

- **Endpoint**: `POST /api/v1/resume/cover-letter`
- **Description**: 문항 및 답변 데이터 제출 및 `documentId` 발급
- **Content-Type**: `application/json`

> ⚠️ TODO: 자기소개서는 파일이 없으므로 DB의 `file_url NOT NULL` 제약 처리 방식 백엔드 확인 필요  
> (빈 문자열 `""` 또는 고정값 `"NONE"` 중 결정 후 이 줄 업데이트)

### Request
```json
{
  "company": "카카오",
  "job": "백엔드 개발자",
  "content": [
    { "order": 1, "question": "지원 동기", "answer": "..." },
    { "order": 2, "question": "성장 과정", "answer": "..." }
  ]
}
```

| Field | Type | 필수 | 제약 |
|-------|------|------|------|
| `company` | `string` | ✅ | 지원 회사명 |
| `job` | `string` | ✅ | 지원 직무명 |
| `content` | `array` | ✅ | 최소 1개, 최대 5개 |
| `content[].order` | `number` | ✅ | 문항 순서 (1~5) |
| `content[].question` | `string` | ✅ | 문항 내용 |
| `content[].answer` | `string` | ✅ | 답변 내용, 최대 1000자 |

### Response `200 OK`
```json
{
  "documentId": "uuid-v4",
  "status": "UPLOADED",
  "fileType": "COVER_LETTER",
  "createdAt": "2026-05-29T14:53:44Z"
}
```

> ℹ️ 제출 완료 즉시 서버에서 AI 분석 작업을 **자동 트리거**합니다.  
> 클라이언트는 `documentId` 수신 후 즉시 `GET /feedback` 폴링을 시작합니다.

### Error Cases
| errorCode | 상황 |
|-----------|------|
| `INVALID_CONTENT` | 문항 수 5개 초과 또는 답변 1000자 초과 |
| `UNAUTHORIZED` | 토큰 없음 또는 만료 |

---

## 3. 분석 결과 조회

- **Endpoint**: `GET /api/v1/resume/{documentId}/feedback`
- **Description**: AI 분석 완료 후 피드백 결과 조회
- **Content-Type**: `application/json`

> ⚠️ TODO: 분석 상태 추적 방식(폴링 vs WebSocket) 백엔드 협의 후 확정 필요
> - 폴링 방식: 클라이언트가 일정 주기로 이 엔드포인트를 호출하여 `status` 확인
> - WebSocket 방식: 별도 WS 엔드포인트 명세 추가 필요

### Response `200 OK`
```json
{
  "documentId": "uuid-v4",
  "status": "COMPLETED",
  "score": 82,
  "feedback": {
    "good": ["논리적인 문장 구조"],
    "bad": ["직무 연관성 부족"],
    "fix": ["3번 문항 두괄식 수정 필요"]
  },
  "errorMessage": null,
  "createdAt": "2026-05-29T14:55:00Z"
}
```

| Field | Type | 설명 |
|-------|------|------|
| `status` | `string` | `PENDING` \| `ANALYZING` \| `COMPLETED` \| `FAILED` |
| `score` | `number` \| `null` | AI 진단 점수 (0~100), 분석 미완료 시 `null` |
| `feedback.good` | `string[]` | 잘된 점 목록, 없을 경우 빈 배열 `[]` |
| `feedback.bad` | `string[]` | 아쉬운 점 목록, 없을 경우 빈 배열 `[]` |
| `feedback.fix` | `string[]` | 개선 제안 목록, 없을 경우 빈 배열 `[]` |

### Error Cases
| errorCode | 상황 |
|-----------|------|
| `DOCUMENT_NOT_FOUND` | 존재하지 않는 `documentId` |
| `FORBIDDEN_DOCUMENT` | 본인 소유가 아닌 문서 접근 |
| `ANALYSIS_TIMEOUT` | AI 분석 타임아웃 |
| `UNAUTHORIZED` | 토큰 없음 또는 만료 |

---

## 4. 분석 이력 목록 조회

- **Endpoint**: `GET /api/v1/resume/history`
- **Description**: 본인의 서류 분석 이력을 최신순으로 페이징 조회
- **Content-Type**: `application/json`

### Query Parameters

| Parameter | Type | 필수 | 기본값 | 설명 |
|-----------|------|------|--------|------|
| `page` | `number` | ❌ | `0` | 페이지 번호 (0-based) |
| `size` | `number` | ❌ | `10` | 페이지당 항목 수 |

### Response `200 OK`
```json
{
  "content": [
    {
      "documentId": "uuid-v4",
      "fileType": "RESUME",
      "originalName": "이력서_홍길동.pdf",
      "company": null,
      "job": null,
      "score": 82,
      "createdAt": "2026-05-29T14:53:44Z"
    },
    {
      "documentId": "uuid-v4-2",
      "fileType": "COVER_LETTER",
      "originalName": null,
      "company": "카카오",
      "job": "백엔드 개발자",
      "score": 76,
      "createdAt": "2026-05-28T10:20:00Z"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 24,
  "totalPages": 3
}
```

| Field | Type | 설명 |
|-------|------|------|
| `fileType` | `string` | `RESUME` \| `COVER_LETTER` |
| `originalName` | `string` \| `null` | 이력서: 파일명, 자기소개서: `null` |
| `company` | `string` \| `null` | 자기소개서: 지원 회사명, 이력서: `null` |
| `job` | `string` \| `null` | 자기소개서: 지원 직무명, 이력서: `null` |
| `score` | `number` \| `null` | 분석 미완료 시 `null` |

### Error Cases
| errorCode | 상황 |
|-----------|------|
| `UNAUTHORIZED` | 토큰 없음 또는 만료 |
