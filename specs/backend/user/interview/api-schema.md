# API Schema: AI 면접 (User Interview)

> 백엔드 구현을 위한 API 명세서입니다.  
> 관련 FE 스펙: `specs/frontend/user/interview/api-schema.md`

---

## 공통

### Base URL
```
/api/v1/user/interview
```

### 날짜 포맷
모든 날짜와 시간은 **ISO 8601** 표준 형식을 사용한다. (예: `2026-05-29T14:53:44Z`)

### 인증
모든 API는 JWT Bearer 토큰 인증을 사용한다.  
`memberId`는 서버에서 토큰을 통해 추출하며, **Request body에 포함하지 않는다.**

```
Authorization: Bearer {accessToken}
```

### 응답 공통 포맷

모든 응답은 `ApiResponse<T>` 래퍼로 반환한다.

**성공 응답**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {}
}
```

**에러 응답**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "해당 면접 세션에 접근할 권한이 없습니다."
}
```

### 에러 상황별 statusCode

| statusCode | 상황 |
|-----------|------|
| `400` | 유효하지 않은 입력값 (sessionType 오류, 이미 종료된 세션 재종료 등) |
| `401` | 인증 토큰 없음 또는 만료 |
| `403` | 본인 소유가 아닌 세션 접근 (IDOR 방어) |
| `404` | 존재하지 않는 `sessionId` 또는 `documentId` |
| `500` | 서버 내부 오류 |

---

## 1. 면접 세션 시작

- **Endpoint**: `POST /api/v1/user/interview/sessions`
- **Description**: 면접 세션 생성 및 `sessionId` 발급
- **Auth**: `hasRole('USER')`
- **Content-Type**: `application/json`

### Request
```json
{
  "documentId": "uuid-v4",
  "sessionType": "VOICE",
  "interviewType": "TECHNICAL",
  "targetCompany": "카카오"
}
```

| Field | Type | 필수 | 제약 |
|-------|------|------|------|
| `documentId` | `String` | ❌ | RAG 컨텍스트용 서류 ID, 없으면 null |
| `sessionType` | `String` | ✅ | `@NotBlank`, `TEXT` \| `VOICE` \| `VIDEO` |
| `interviewType` | `String` | ❌ | `TECHNICAL` \| `PERSONALITY` \| `PROJECT` |
| `targetCompany` | `String` | ❌ | `@Size(max=100)` |

### Response `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "sessionId": "uuid-v4",
    "sessionStatus": "IN_PROGRESS",
    "sessionType": "VOICE",
    "documentId": "uuid-v4",
    "createdAt": "2026-05-29T14:53:44Z"
  }
}
```

### Error Cases

| statusCode | ErrorCode | 상황 |
|-----------|-----------|------|
| `400` | `INTERVIEW_INVALID_SESSION_TYPE` | 유효하지 않은 `sessionType` 값 |
| `404` | `INTERVIEW_DOCUMENT_NOT_FOUND` | 유효하지 않은 `documentId` |
| `401` | `UNAUTHORIZED` | 토큰 없음 또는 만료 |

---

## 2. 텍스트 답변 제출

- **Endpoint**: `POST /api/v1/user/interview/sessions/{sessionId}/answer/text`
- **Description**: 텍스트 입력 답변 저장
- **Auth**: `hasRole('USER')`
- **Content-Type**: `application/json`

### Path Variables

| Variable | Type | 설명 |
|----------|------|------|
| `sessionId` | `String` (UUID) | 면접 세션 ID |

### Request
```json
{
  "questionOrder": 1,
  "messageContent": "저는 Spring Boot와 JPA를 활용한 백엔드 개발 경험이 있습니다..."
}
```

| Field | Type | 필수 | 제약 |
|-------|------|------|------|
| `questionOrder` | `Integer` | ✅ | `@NotNull @Min(1)`, 현재 답변 중인 질문 순서 |
| `messageContent` | `String` | ✅ | `@NotBlank` |

### Response `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "messageId": 1,
    "createdAt": "2026-05-29T14:55:00Z"
  }
}
```

### Error Cases

| statusCode | ErrorCode | 상황 |
|-----------|-----------|------|
| `400` | — | `messageContent` 누락 또는 `questionOrder` 1 미만 |
| `403` | `INTERVIEW_SESSION_FORBIDDEN` | 본인 소유가 아닌 세션 |
| `404` | `INTERVIEW_SESSION_NOT_FOUND` | 존재하지 않는 `sessionId` |
| `401` | `UNAUTHORIZED` | 토큰 없음 또는 만료 |

---

## 3. 음성 청크 제출

- **Endpoint**: `POST /api/v1/user/interview/sessions/{sessionId}/answer/voice`
- **Description**: 5초 단위 음성 Blob 청크 수신 및 FastAPI STT 파이프라인 트리거
- **Auth**: `hasRole('USER')`
- **Content-Type**: `multipart/form-data`

> 음성 데이터는 **트랜잭션 외부**에서 FastAPI로 전달한다. (CONVENTION.md §2-3)

### Path Variables

| Variable | Type | 설명 |
|----------|------|------|
| `sessionId` | `String` (UUID) | 면접 세션 ID |

### Request (multipart/form-data)

| Field | Type | 필수 | 설명 |
|-------|------|------|------|
| `audioChunk` | `MultipartFile` | ✅ | 5초 단위 음성 청크 (WebM / MP4 / OGG) |
| `questionOrder` | `Integer` | ✅ | 현재 답변 중인 질문 순서 (1-based) |
| `chunkIndex` | `Integer` | ✅ | 청크 순서 인덱스 (0-based) |
| `isFinal` | `Boolean` | ✅ | 해당 답변의 마지막 청크 여부 |

### Response `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "chunkIndex": 0,
    "received": true
  }
}
```

### Error Cases

| statusCode | ErrorCode | 상황 |
|-----------|-----------|------|
| `400` | — | 지원하지 않는 오디오 포맷 또는 필수 파라미터 누락 |
| `403` | `INTERVIEW_SESSION_FORBIDDEN` | 본인 소유가 아닌 세션 |
| `404` | `INTERVIEW_SESSION_NOT_FOUND` | 존재하지 않는 `sessionId` |
| `401` | `UNAUTHORIZED` | 토큰 없음 또는 만료 |

---

## 4. 면접 세션 종료

- **Endpoint**: `POST /api/v1/user/interview/sessions/{sessionId}/end`
- **Description**: 면접 세션 종료 처리 및 FastAPI 리포트 생성 트리거
- **Auth**: `hasRole('USER')`
- **Content-Type**: `application/json`

### Path Variables

| Variable | Type | 설명 |
|----------|------|------|
| `sessionId` | `String` (UUID) | 면접 세션 ID |

### Response `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "sessionId": "uuid-v4",
    "sessionStatus": "COMPLETED",
    "endedAt": "2026-05-29T15:20:00Z"
  }
}
```

> 세션 종료 즉시 서버에서 FastAPI 리포트 생성 작업을 **비동기로 트리거**한다.  
> 리포트 완료 알림은 Spring WebSocket(`WS /ws/interview/{sessionId}/chat`)으로 클라이언트에 전달한다.

### Error Cases

| statusCode | ErrorCode | 상황 |
|-----------|-----------|------|
| `400` | `INTERVIEW_SESSION_ALREADY_ENDED` | 이미 종료된 세션 (`COMPLETED` / `FAILED`) |
| `403` | `INTERVIEW_SESSION_FORBIDDEN` | 본인 소유가 아닌 세션 |
| `404` | `INTERVIEW_SESSION_NOT_FOUND` | 존재하지 않는 `sessionId` |
| `401` | `UNAUTHORIZED` | 토큰 없음 또는 만료 |

---

## 5. 면접 리포트 조회

- **Endpoint**: `GET /api/v1/user/interview/sessions/{sessionId}/report`
- **Description**: 면접 완료 후 피드백 리포트 조회
- **Auth**: `hasRole('USER')`

### Path Variables

| Variable | Type | 설명 |
|----------|------|------|
| `sessionId` | `String` (UUID) | 면접 세션 ID |

### Response `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "sessionId": "uuid-v4",
    "sessionStatus": "COMPLETED",
    "sessionType": "VOICE",
    "totalScore": 78,
    "feedbacks": [
      {
        "questionOrder": 1,
        "questionText": "Spring Boot에서 트랜잭션을 어떻게 관리하시나요?",
        "answerText": "@Transactional 어노테이션을 활용하여...",
        "relevanceScore": 85,
        "depthScore": 70,
        "deliveryScore": 80,
        "fluencyScore": 75,
        "voiceQualityRatio": 92.5,
        "aiFeedback": "직무 관련성은 높으나 구체적인 예시가 부족합니다.",
        "createdAt": "2026-05-29T15:10:00Z"
      }
    ],
    "createdAt": "2026-05-29T15:20:00Z"
  }
}
```

| Field | Type | 설명 |
|-------|------|------|
| `data.totalScore` | `Integer` \| `null` | 종합 점수 (0~100), 리포트 미완료 시 `null` |
| `data.feedbacks[].relevanceScore` | `Integer` \| `null` | 직무 연관성 점수 |
| `data.feedbacks[].depthScore` | `Integer` \| `null` | 답변 깊이 점수 |
| `data.feedbacks[].deliveryScore` | `Integer` \| `null` | 전달력 점수 — 텍스트 면접 또는 `voiceQualityRatio < 50.00` 시 `null` |
| `data.feedbacks[].fluencyScore` | `Integer` \| `null` | 유창성 점수 — 텍스트 면접 또는 `voiceQualityRatio < 50.00` 시 `null` |
| `data.feedbacks[].voiceQualityRatio` | `Number` \| `null` | 음성 인식 유효 비율 (0.00~100.00) — 텍스트 면접 시 `null` |

> `voiceQualityRatio` 50.00 미만 문항은 `deliveryScore` / `fluencyScore`가 `null`로 반환된다.  
> Service 계층에서 DTO 조립 시 처리한다. `0`으로 대체하지 않는다. (constitution.md §4)

### Error Cases

| statusCode | ErrorCode | 상황 |
|-----------|-----------|------|
| `403` | `INTERVIEW_SESSION_FORBIDDEN` | 본인 소유가 아닌 세션 |
| `404` | `INTERVIEW_SESSION_NOT_FOUND` | 존재하지 않는 `sessionId` |
| `401` | `UNAUTHORIZED` | 토큰 없음 또는 만료 |

---

## 6. 면접 이력 목록 조회

- **Endpoint**: `GET /api/v1/user/interview/history`
- **Description**: 본인의 면접 이력을 최신순으로 페이징 조회
- **Auth**: `hasRole('USER')`

### Query Parameters

| Parameter | Type | 필수 | 기본값 | 설명 |
|-----------|------|------|--------|------|
| `page` | `Integer` | ❌ | `0` | 페이지 번호 (0-based) |
| `size` | `Integer` | ❌ | `10` | 페이지당 항목 수 |

### Response `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "content": [
      {
        "careerHistoryId": 1,
        "sessionId": "uuid-v4",
        "sessionType": "VOICE",
        "interviewType": "TECHNICAL",
        "targetCompany": "카카오",
        "sessionStatus": "COMPLETED",
        "totalScore": 78,
        "pdfUrl": "https://s3.amazonaws.com/.../report.pdf",
        "createdAt": "2026-05-29T14:53:44Z"
      },
      {
        "careerHistoryId": 2,
        "sessionId": "uuid-v4-2",
        "sessionType": "TEXT",
        "interviewType": "PERSONALITY",
        "targetCompany": null,
        "sessionStatus": "COMPLETED",
        "totalScore": 82,
        "pdfUrl": null,
        "createdAt": "2026-05-28T10:20:00Z"
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 15,
    "totalPages": 2
  }
}
```

| Field | Type | 설명 |
|-------|------|------|
| `data.content[].interviewType` | `String` \| `null` | 미입력 시 `null` |
| `data.content[].targetCompany` | `String` \| `null` | 미입력 시 `null` |
| `data.content[].totalScore` | `Integer` \| `null` | 리포트 미완료 또는 `FAILED` 시 `null` |
| `data.content[].pdfUrl` | `String` \| `null` | 종합 진단 PDF URL (S3), 미생성 시 `null` |

### Error Cases

| statusCode | ErrorCode | 상황 |
|-----------|-----------|------|
| `401` | `UNAUTHORIZED` | 토큰 없음 또는 만료 |

---

## 7. 실시간 채널 — Spring WebSocket

- **Endpoint**: `WS /ws/interview/{sessionId}/chat`
- **Description**: 면접 세션 생명주기 이벤트 및 AI 질문 전달 채널 (Spring 담당)

### 인증

```
WS /ws/interview/{sessionId}/chat?token={accessToken}
```

연결 시 토큰 검증 및 `sessionId` 소유권 검증을 수행한다.  
검증 실패 시 Close 1008로 즉시 연결을 종료한다.

### Connection Lifecycle

```
클라이언트                               Spring 서버
   │                                     │
   │── WS 연결 요청 ─────────────────────▶│  토큰 + sessionId 소유권 검증
   │                                     │
   │◀─ {"type":"SYSTEM","subType":"SESSION_START",...} ──│  면접 시작 안내
   │◀─ {"type":"QUESTION","questionOrder":1,...} ────────│  AI 첫 질문
   │◀─ {"type":"QUESTION","questionOrder":2,...} ────────│  꼬리 질문
   │                                     │
   │◀─ {"type":"SYSTEM","subType":"REPORT_READY",...} ───│  리포트 생성 완료 알림
   │                                     │
   │  (클라이언트 연결 종료)              │
```

### Server → Client 메시지 형식

```json
{
  "type": "QUESTION",
  "content": "Spring에서 트랜잭션 전파 방식에 대해 설명해 주세요.",
  "questionOrder": 2,
  "subType": null
}
```

| Field | Type | 설명 |
|-------|------|------|
| `type` | `String` | `QUESTION` \| `SYSTEM` \| `ERROR` |
| `content` | `String` | 메시지 본문 |
| `questionOrder` | `Integer` \| `null` | 질문 순서 (`QUESTION` 타입 시에만 포함) |
| `subType` | `String` \| `null` | `SESSION_START` \| `REPORT_READY` \| `SESSION_END` |

#### `type` 별 예시

| type | subType | content 예시 | 비고 |
|------|---------|-------------|------|
| `QUESTION` | `null` | `"지원 동기를 말씀해 주세요."` | 신규 질문 또는 꼬리 질문 |
| `SYSTEM` | `SESSION_START` | `"면접이 시작되었습니다."` | 세션 시작 |
| `SYSTEM` | `REPORT_READY` | `"리포트 생성이 완료되었습니다."` | FastAPI 콜백 수신 후 전송 |
| `SYSTEM` | `SESSION_END` | `"면접이 종료되었습니다."` | 세션 종료 안내 |
| `ERROR` | `null` | `"세션 처리 중 오류가 발생했습니다."` | 처리 오류 시 전송 (연결 유지) |

### Error Cases

| 상황 | 동작 |
|------|------|
| 유효하지 않은 `sessionId` | 연결 즉시 종료 (Close 1008) |
| 본인 소유가 아닌 `sessionId` | 연결 즉시 종료 (Close 1008) |
| 토큰 없음 또는 만료 | 연결 즉시 종료 (Close 1008) |
| 서버 처리 오류 | `ERROR` 메시지 전송 후 연결 유지 |
