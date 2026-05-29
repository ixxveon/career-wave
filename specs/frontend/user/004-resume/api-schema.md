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

### 응답 공통 포맷

백엔드는 모든 응답을 `ApiResponse<T>` 래퍼로 반환한다.

**성공 응답**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": { }
}
```

**에러 응답**  
> `data`가 `null`이므로 `@JsonInclude(NON_NULL)` 에 의해 응답에서 생략된다.
```json
{
  "success": false,
  "statusCode": 400,
  "message": "에러 설명 메시지"
}
```

### 에러 상황별 statusCode

| statusCode | 상황 |
|-----------|------|
| `400` | 파일 크기 10MB 초과 / 지원하지 않는 파일 형식 / 문항 수·글자 수 초과 등 입력값 검증 실패 |
| `401` | 인증 토큰 없음 또는 만료 |
| `403` | 본인 소유가 아닌 문서 접근 (IDOR 방어) |
| `404` | 존재하지 않는 `documentId` |
| `500` | AI 분석 타임아웃 및 서버 내부 오류 |

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
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "documentId": "uuid-v4",
    "status": "UPLOADED",
    "fileUrl": "https://s3.bucket/path/to/file.pdf",
    "originalName": "이력서_홍길동.pdf",
    "fileType": "RESUME",
    "createdAt": "2026-05-29T14:53:44Z"
  }
}
```

> ℹ️ 업로드 완료 즉시 서버에서 AI 분석 작업을 **자동 트리거**합니다.  
> 클라이언트는 `data.documentId` 수신 후 즉시 WebSocket(`WS /ws/resume/{documentId}/status`) 연결을 시작합니다.

### Error Cases
| statusCode | 상황 |
|-----------|------|
| `400` | 파일 크기 10MB 초과 |
| `400` | PDF·DOC·DOCX 이외 파일 |
| `401` | 토큰 없음 또는 만료 |

---

## 2. 자기소개서 제출

- **Endpoint**: `POST /api/v1/resume/cover-letter`
- **Description**: 문항 및 답변 데이터 제출 및 `documentId` 발급
- **Content-Type**: `application/json`

> ℹ️ 자기소개서는 파일이 없으므로 DB의 `file_url` 컬럼은 **nullable**로 설계한다.

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
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "documentId": "uuid-v4",
    "status": "UPLOADED",
    "fileType": "COVER_LETTER",
    "createdAt": "2026-05-29T14:53:44Z"
  }
}
```

> ℹ️ 제출 완료 즉시 서버에서 AI 분석 작업을 **자동 트리거**합니다.  
> 클라이언트는 `data.documentId` 수신 후 즉시 WebSocket(`WS /ws/resume/{documentId}/status`) 연결을 시작합니다.

### Error Cases
| statusCode | 상황 |
|-----------|------|
| `400` | 문항 수 5개 초과 또는 답변 1000자 초과 |
| `401` | 토큰 없음 또는 만료 |

---

## 3. 분석 결과 조회

- **Endpoint**: `GET /api/v1/resume/{documentId}/feedback`
- **Description**: 분석 완료 후 피드백 결과 조회 (페이지 재진입·새로고침 시 TanStack Query로 재조회)
- **Content-Type**: `application/json`

> ℹ️ 실시간 분석 상태 추적은 **WebSocket**을 사용한다 (`WS /ws/resume/{documentId}/status`).  
> 이 엔드포인트는 `COMPLETED` 상태의 전체 결과를 가져오거나 재진입 시 복원 용도로 사용한다.

### Response `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
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
}
```

| Field | Type | 설명 |
|-------|------|------|
| `data.status` | `string` | `PENDING` \| `ANALYZING` \| `COMPLETED` \| `FAILED` |
| `data.score` | `number` \| `null` | AI 진단 점수 (0~100), 분석 미완료 시 `null` |
| `data.feedback.good` | `string[]` | 잘된 점 목록, 없을 경우 빈 배열 `[]` |
| `data.feedback.bad` | `string[]` | 아쉬운 점 목록, 없을 경우 빈 배열 `[]` |
| `data.feedback.fix` | `string[]` | 개선 제안 목록, 없을 경우 빈 배열 `[]` |

### Error Cases
| statusCode | 상황 |
|-----------|------|
| `404` | 존재하지 않는 `documentId` |
| `403` | 본인 소유가 아닌 문서 접근 |
| `500` | AI 분석 타임아웃 |
| `401` | 토큰 없음 또는 만료 |

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
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
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
}
```

| Field | Type | 설명 |
|-------|------|------|
| `data.content[].fileType` | `string` | `RESUME` \| `COVER_LETTER` |
| `data.content[].originalName` | `string` \| `null` | 이력서: 파일명, 자기소개서: `null` |
| `data.content[].company` | `string` \| `null` | 자기소개서: 지원 회사명, 이력서: `null` |
| `data.content[].job` | `string` \| `null` | 자기소개서: 지원 직무명, 이력서: `null` |
| `data.content[].score` | `number` \| `null` | 분석 미완료 시 `null` |

### Error Cases
| statusCode | 상황 |
|-----------|------|
| `401` | 토큰 없음 또는 만료 |

---

## 5. 분석 상태 실시간 구독 (WebSocket)

- **Endpoint**: `WS /ws/resume/{documentId}/status`
- **Description**: 업로드 또는 자기소개서 제출 후 AI 분석 상태를 실시간으로 수신

### 인증

JWT를 WebSocket 핸드셰이크 시 쿼리 파라미터로 전달한다.

```
WS /ws/resume/{documentId}/status?token={accessToken}
```

### Connection Lifecycle

```
클라이언트                          서버
   │                                │
   │── WS 연결 요청 ────────────────▶│  documentId 소유권 검증
   │                                │
   │◀─ {"status":"ANALYZING", ...} ─│  분석 진행 중 (1회 이상)
   │◀─ {"status":"ANALYZING", ...} ─│
   │                                │
   │◀─ {"status":"COMPLETED", ...} ─│  분석 완료 → 서버가 연결 종료
   │   (또는 "FAILED")              │
   │                                │
   │  (클라이언트 연결 종료)         │
```

> ℹ️ 클라이언트가 먼저 연결을 끊을 경우(탭 이탈 / 분석 취소): 서버 측 별도 취소 API 없음 — 클라이언트만 WS 연결을 닫고 UI 상태를 `IDLE`로 초기화한다.

### Server → Client 메시지 형식

```json
{
  "status": "ANALYZING",
  "message": "키워드를 추출하고 있어요",
  "progress": 40
}
```

| Field | Type | 설명 |
|-------|------|------|
| `status` | `string` | `ANALYZING` \| `COMPLETED` \| `FAILED` |
| `message` | `string` | 현재 단계 안내 문구 (UI 표시용) |
| `progress` | `number` | 진행률 0~100 |

#### 단계별 `message` 예시

| status | message | progress |
|--------|---------|----------|
| `ANALYZING` | `"파일을 읽고 있어요"` | 10 |
| `ANALYZING` | `"키워드를 추출하고 있어요"` | 40 |
| `ANALYZING` | `"피드백을 생성하고 있어요"` | 70 |
| `COMPLETED` | `"분석이 완료되었어요"` | 100 |
| `FAILED` | `"분석 중 오류가 발생했어요"` | — |

> ℹ️ `COMPLETED` 또는 `FAILED` 수신 즉시 서버가 WS 연결을 종료한다.  
> 클라이언트는 `COMPLETED` 수신 후 `GET /api/v1/resume/{documentId}/feedback`으로 전체 결과를 조회한다.

### Error Cases

| 상황 | 동작 |
|------|------|
| 유효하지 않은 `documentId` | 연결 즉시 종료 (Close 1008) |
| 본인 소유가 아닌 `documentId` | 연결 즉시 종료 (Close 1008) |
| 토큰 없음 또는 만료 | 연결 즉시 종료 (Close 1008) |
| AI 분석 타임아웃 | `FAILED` 메시지 전송 후 연결 종료 |
