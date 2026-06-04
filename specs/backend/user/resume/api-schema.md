# API Schema: 서류 분석 (User Resume)

> 백엔드 구현 관점의 타입·메서드 시그니처 정의.  
> HTTP 요청·응답 계약 원본은 `specs/frontend/user/resume/api-schema.md` 참조.  
> 관련 문서: `spec.md` / `constitution.md`

---

## 공통

### Base Path

```
/api/v1/user/resume
```

> 프론트 스펙의 `/api/v1/resume`와 다르게 Convention에 따라 `/api/v1/user/resume`로 정의.  
> 구현 전 프론트엔드 팀과 최종 Base URL 일치 여부 확인 필요.

### 인증

```
Authorization: Bearer {accessToken}
```

모든 API는 JWT 인증 + `ROLE_USER` 권한 필수. `memberId`는 `@AuthenticationPrincipal`로 추출.

### 응답 공통 포맷

```java
// 성공
ApiResponse.ok(data);

// 실패
ApiResponse.fail(statusCode, message);
```

```json
// 성공 응답
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": { }
}

// 에러 응답 (data 필드 NON_NULL 설정으로 생략)
{
  "success": false,
  "statusCode": 400,
  "message": "에러 설명 메시지"
}
```

---

## Controller 메서드 시그니처

### ResumeController

```java
// 이력서 파일 업로드
ResponseEntity<ApiResponse<ResumeDTO.ResponseUpload>> uploadResume(
    @RequestParam("file") MultipartFile file,
    @AuthenticationPrincipal UserPrincipal user
);

// 자기소개서 제출
ResponseEntity<ApiResponse<ResumeDTO.ResponseCoverLetter>> submitCoverLetter(
    @RequestBody @Valid ResumeDTO.RequestCoverLetter request,
    @AuthenticationPrincipal UserPrincipal user
);

// 분석 결과 조회
ResponseEntity<ApiResponse<ResumeDTO.ResponseFeedback>> getFeedback(
    @PathVariable UUID documentId,
    @AuthenticationPrincipal UserPrincipal user
);

// 이력 목록 조회
ResponseEntity<ApiResponse<PaginationResponse<ResumeDTO.HistoryItem>>> getHistory(
    @RequestParam(defaultValue = "0") @Min(0) int page,
    @RequestParam(defaultValue = "10") @Min(1) @Max(50) int size,
    @AuthenticationPrincipal UserPrincipal user
);
```

---

## 1. 이력서 업로드

- **Endpoint**: `POST /api/v1/user/resume/upload`
- **Content-Type**: `multipart/form-data`

### Request

| Field | Type | 필수 | 제약 |
|-------|------|------|------|
| `file` | `MultipartFile` | ✅ | PDF·DOC·DOCX, 최대 10MB |

### Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "UPLOADED",
    "fileUrl": "https://s3.bucket/path/to/file.pdf",
    "originalName": "이력서_홍길동.pdf",
    "fileType": "RESUME",
    "createdAt": "2026-05-29T14:53:44Z"
  }
}
```

> 업로드 완료 즉시 서버에서 FastAPI 분석 작업을 비동기 트리거.  
> 클라이언트는 `documentId` 수신 후 WebSocket(`WS /ws/resume/{documentId}/status`) 연결 시작.

### Error Cases

| ErrorCode | HTTP | 상황 |
|-----------|------|------|
| `INVALID_FILE_SIZE` | 400 | 파일 크기 10MB 초과 |
| `INVALID_FILE_TYPE` | 400 | PDF·DOC·DOCX 외 확장자 |
| `UNAUTHORIZED` | 401 | 토큰 없음 또는 만료 |

---

## 2. 자기소개서 제출

- **Endpoint**: `POST /api/v1/user/resume/cover-letter`
- **Content-Type**: `application/json`

> 자기소개서는 파일이 없으므로 `documents` 테이블의 `file_url`, `original_name` 컬럼은 nullable.

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
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "UPLOADED",
    "fileType": "COVER_LETTER",
    "createdAt": "2026-05-29T14:53:44Z"
  }
}
```

### Error Cases

| ErrorCode | HTTP | 상황 |
|-----------|------|------|
| `INVALID_CONTENT_COUNT` | 400 | 문항 수 범위(1~5) 위반 |
| `INVALID_CONTENT_LENGTH` | 400 | 답변 1000자 초과 |
| `UNAUTHORIZED` | 401 | 토큰 없음 또는 만료 |

---

## 3. 분석 결과 조회

- **Endpoint**: `GET /api/v1/user/resume/{documentId}/feedback`
- **Content-Type**: `application/json`

> 실시간 분석 상태 추적은 WebSocket 사용.  
> 이 엔드포인트는 `COMPLETED` 상태 전체 결과 조회 및 페이지 재진입 시 복원 용도.

### Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "documentId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "COMPLETED",
    "scores": {
      "jobFitness": 78,
      "techStack": 85,
      "quantifiedAchievement": 60,
      "logicalStructure": 72,
      "total": 74
    },
    "overallReview": "전반적으로 백엔드 역량이 우수하나 성과의 정량적 수치화가 아쉽습니다.",
    "feedbackDetails": [
      {
        "sectionNumber": 1,
        "question": "주요 프로젝트 경험",
        "originalText": "결제 시스템 개발에 참여하였습니다.",
        "goodPoint": "백엔드 프로젝트 경험이 확인됩니다.",
        "badPoint": "역할, 규모, 성과가 빠져 있습니다.",
        "improvedText": "월 거래액 50억 규모의 결제 시스템 API를 설계 및 구현...",
        "starAnalysis": {
          "s": { "ok": true,  "comment": "상황 설명이 적절합니다." },
          "t": { "ok": false, "comment": "과제가 구체적으로 드러나지 않습니다." },
          "a": { "ok": true,  "comment": "행동이 명시되어 있습니다." },
          "r": { "ok": false, "comment": "결과가 수치로 표현되지 않았습니다." }
        },
        "quantAnalysis": {
          "numbers":   { "ok": false, "comment": "수치가 사용되지 않았습니다." },
          "timeframe": { "ok": false, "comment": "기간 표현이 없습니다." },
          "scale":     { "ok": true,  "comment": "규모 언급이 있습니다." },
          "impact":    { "ok": false, "comment": "성과가 수치로 측정되지 않았습니다." }
        }
      }
    ],
    "errorMessage": null,
    "createdAt": "2026-05-29T14:55:00Z"
  }
}
```

| Field | Type | 설명 |
|-------|------|------|
| `data.status` | `string` | `PENDING` \| `ANALYZING` \| `COMPLETED` \| `FAILED` |
| `data.scores` | `object` \| `null` | 분석 미완료 시 `null` |
| `data.feedbackDetails` | `array` \| `null` | 분석 미완료 시 `null` |
| `data.feedbackDetails[].starAnalysis` | `object` \| `null` | 이력서 파일 분석 시 제공, 자기소개서는 null일 수 있음 |
| `data.feedbackDetails[].quantAnalysis` | `object` \| `null` | 항목에 따라 null 허용 |

### Error Cases

| ErrorCode | HTTP | 상황 |
|-----------|------|------|
| `DOCUMENT_NOT_FOUND` | 404 | 존재하지 않는 documentId |
| `DOCUMENT_ACCESS_DENIED` | 403 | 본인 소유가 아닌 문서 접근 (IDOR) |
| `UNAUTHORIZED` | 401 | 토큰 없음 또는 만료 |

---

## 4. 이력 목록 조회

- **Endpoint**: `GET /api/v1/user/resume/history`
- **Content-Type**: `application/json`

### Query Parameters

| Parameter | Type | 필수 | 기본값 | 설명 |
|-----------|------|------|--------|------|
| `page` | `number` | ❌ | `0` | 페이지 번호 (0-based) |
| `size` | `number` | ❌ | `10` | 페이지당 항목 수 (최대 50) |

### Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "content": [
      {
        "documentId": "550e8400-e29b-41d4-a716-446655440000",
        "fileType": "RESUME",
        "originalName": "이력서_홍길동.pdf",
        "company": null,
        "job": null,
        "totalScore": 74,
        "createdAt": "2026-05-29T14:53:44Z"
      },
      {
        "documentId": "660f9511-f30c-52e5-b827-557766551111",
        "fileType": "COVER_LETTER",
        "originalName": null,
        "company": "카카오",
        "job": "백엔드 개발자",
        "totalScore": 76,
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

> `PaginationResponse<T>`는 `common/dto/` 패키지 공통 사용.

| Field | Type | 설명 |
|-------|------|------|
| `content[].fileType` | `string` | `RESUME` \| `COVER_LETTER` |
| `content[].originalName` | `string` \| `null` | 이력서: 파일명, 자기소개서: `null` |
| `content[].company` | `string` \| `null` | 자기소개서: 지원 회사명, 이력서: `null` |
| `content[].job` | `string` \| `null` | 자기소개서: 지원 직무명, 이력서: `null` |
| `content[].totalScore` | `number` \| `null` | 종합 점수, 분석 미완료 시 `null` |

### Error Cases

| ErrorCode | HTTP | 상황 |
|-----------|------|------|
| `UNAUTHORIZED` | 401 | 토큰 없음 또는 만료 |

---

## 5. 분석 완료 콜백 수신 (Webhook — FastAPI → Spring 내부 전용)

- **Endpoint**: `POST /api/v1/user/resume/{documentId}/webhook`
- **호출 주체**: FastAPI (외부 클라이언트 호출 차단 — IP 제한 또는 내부 Secret 헤더 검증)
- **Content-Type**: `application/json`

> FastAPI가 분석을 마친 뒤 이 엔드포인트를 호출한다.  
> Spring은 수신 즉시 DB를 업데이트하고, WebSocket으로 프론트엔드에 상태 알림을 발송한다.

### Request

```json
{
  "status": "COMPLETED",
  "scores": {
    "jobFitness": 78,
    "techStack": 85,
    "quantifiedAchievement": 60,
    "logicalStructure": 72,
    "total": 74
  },
  "overallReview": "전반적으로 백엔드 역량이 우수하나 ...",
  "feedbackDetails": [ ... ],
  "errorMessage": null
}
```

| Field | Type | 설명 |
|-------|------|------|
| `status` | `string` | `COMPLETED` \| `FAILED` |
| `scores` | `object` \| `null` | 분석 점수, `FAILED` 시 `null` |
| `overallReview` | `string` \| `null` | AI 종합 총평 |
| `feedbackDetails` | `array` \| `null` | 항목별 첨삭 결과, `FAILED` 시 `null` |
| `errorMessage` | `string` \| `null` | 실패 시 오류 메시지 |

### Response `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": null
}
```

### 처리 흐름

```
FastAPI                              Spring
  │                                    │
  │── POST .../webhook ────────────────▶│  documentId 유효성 확인
  │                                    │  DocumentFeedback DB 저장
  │                                    │  document.status 업데이트
  │                                    │  WebSocket 브로드캐스트
  │◀─ 200 OK ──────────────────────────│
```

### 멱등성 (Idempotency)

Webhook은 네트워크 재시도로 동일 요청이 중복 수신될 수 있다.

```
수신 시 document.status 확인
  ├── COMPLETED 또는 FAILED → 이미 처리 완료 → 200 OK 반환 후 조용히 무시
  └── 그 외 → 정상 처리 (DB 저장 + WebSocket 알림)
```

- 중복 수신 시 DB를 덮어쓰거나 예외를 발생시키지 않는다.
- 중복 수신 여부와 관계없이 항상 `200 OK`를 반환하여 FastAPI의 재시도 루프를 방지한다.

### 보안

- FastAPI는 모든 Webhook 요청 시 `X-Internal-Secret` 헤더에 사전 공유 키를 실어서 보낸다.
- Spring은 요청 수신 즉시 헤더 값을 환경 변수에 저장된 키와 비교하여 검증한다.
- 키 불일치 또는 헤더 누락 시 `403 Forbidden`으로 즉시 차단한다.
- Secret Key는 코드에 하드코딩하지 않고 반드시 환경 변수(`WEBHOOK_SECRET`)로 관리한다.
- `documentId` 존재하지 않을 경우 로그 기록 후 무시 (프론트 에러 노출 없음)

```
X-Internal-Secret: {WEBHOOK_SECRET 환경 변수 값}
```

---

## 6. 분석 상태 실시간 구독 (WebSocket)

- **Endpoint**: `WS /ws/resume/{documentId}/status`

### 인증

JWT를 WebSocket 핸드셰이크 시 쿼리 파라미터로 전달.  
Spring의 `HandshakeInterceptor`에서 토큰 파싱 후 `Authentication` 객체를 세션 속성에 주입한다.

```
WS /ws/resume/{documentId}/status?token={accessToken}
```

### Connection Lifecycle

```
클라이언트                               서버
   │                                     │
   │── WS 연결 요청 ──────────────────────▶│  documentId 소유권 + 토큰 검증
   │                                     │
   │◀─ {"status":"ANALYZING", ...} ──────│  분석 진행 중 (1회 이상)
   │◀─ {"status":"ANALYZING", ...} ──────│
   │                                     │
   │◀─ {"status":"COMPLETED", ...} ──────│  완료 메시지 전송
   │   (또는 "FAILED")                   │  ↓ Grace Period 시작 (30초)
   │                                     │
   │── (클라이언트 정상 종료) ────────────▶│  클라이언트가 먼저 끊으면 즉시 세션 해제
   │   또는 Grace Period 만료            │  30초 경과 시 서버에서 세션 정리
```

**Grace Period 정책 (30초)**

서버가 `COMPLETED` 또는 `FAILED` 메시지를 전송한 뒤 즉시 연결을 끊지 않고 30초간 세션을 유지한다.

- 이유: 서버가 먼저 끊으면 프론트엔드가 `onclose` 이벤트를 "비정상 종료"로 판단해 재연결 루프에 빠질 수 있다.
- 클라이언트가 `COMPLETED`/`FAILED` 수신 후 스스로 연결을 닫으면 서버는 즉시 세션을 해제한다.
- 30초 내 클라이언트가 연결을 닫지 않으면 서버가 정상 종료 코드(Close 1000)로 세션을 정리한다.

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

#### 단계별 메시지 예시

| status | message | progress |
|--------|---------|----------|
| `ANALYZING` | `"파일을 읽고 있어요"` | 10 |
| `ANALYZING` | `"키워드를 추출하고 있어요"` | 40 |
| `ANALYZING` | `"피드백을 생성하고 있어요"` | 70 |
| `COMPLETED` | `"분석이 완료되었어요"` | 100 |
| `FAILED` | `"분석 중 오류가 발생했어요"` | — |

### Error Cases

| 상황 | 동작 |
|------|------|
| 유효하지 않은 `documentId` | 연결 즉시 종료 (Close 1008) |
| 본인 소유가 아닌 `documentId` | 연결 즉시 종료 (Close 1008) |
| 토큰 없음 또는 만료 | 연결 즉시 종료 (Close 1008) |
| AI 분석 타임아웃 | `FAILED` 메시지 전송 후 연결 종료 |

---

## ErrorCode → HTTP 매핑

| ErrorCode | HTTP | 발생 시점 |
|-----------|------|-----------|
| `INVALID_FILE_SIZE` | 400 | 파일 크기 10MB 초과 |
| `INVALID_FILE_TYPE` | 400 | PDF·DOC·DOCX 외 확장자 |
| `INVALID_CONTENT_COUNT` | 400 | 문항 수 범위(1~5) 위반 |
| `INVALID_CONTENT_LENGTH` | 400 | 답변 1000자 초과 |
| `DOCUMENT_NOT_FOUND` | 404 | 존재하지 않는 documentId |
| `DOCUMENT_ACCESS_DENIED` | 403 | 본인 소유가 아닌 문서 접근 |
| `UNAUTHORIZED` | 401 | 토큰 없음 또는 만료 |
