# API Schema: AI 면접 (Interview)

> 백엔드 통신을 위한 API 명세서입니다.  
> 관련 문서: `plan.md` / `tasks.md` / `constitution.md`

---

## 공통

### Base URL
```
/api/v1/interview
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
  "data": {}
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
| `400` | 입력값 검증 실패 (유형 오류, 필수 필드 누락 등) |
| `401` | 인증 토큰 없음 또는 만료 |
| `403` | 본인 소유가 아닌 세션 접근 (IDOR 방어) |
| `404` | 존재하지 않는 `sessionId` |
| `500` | 서버 내부 오류 |

---

## 1. 면접 세션 시작

- **Endpoint**: `POST /api/v1/interview/sessions`
- **Description**: 면접 세션 생성 및 `sessionId` 발급
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
| `documentId` | `string` | ❌ | 연결할 서류 `documentId` (RAG 컨텍스트용, 없으면 `null`) |
| `sessionType` | `string` | ✅ | `TEXT` \| `VOICE` \| `VIDEO` |
| `interviewType` | `string` | ❌ | `TECHNICAL` \| `PERSONALITY` \| `PROJECT` |
| `targetCompany` | `string` | ❌ | 준비 대상 기업명 |

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

> ℹ️ 세션 생성 직후 클라이언트는 `data.sessionId` 수신 후 즉시  
> Spring WebSocket(`WS /ws/interview/{sessionId}/chat`) 및  
> FastAPI WebSocket(`WS /ws/interview/{sessionId}/ai`) 연결을 시작합니다.

### Error Cases

| statusCode | 상황 |
|-----------|------|
| `400` | 유효하지 않은 `sessionType` 값 |
| `401` | 토큰 없음 또는 만료 |

---

## 2. 텍스트 답변 제출

- **Endpoint**: `POST /api/v1/interview/sessions/{sessionId}/answer/text`
- **Description**: 텍스트 입력 답변 저장
- **Content-Type**: `application/json`

### Request
```json
{
  "questionOrder": 1,
  "messageContent": "저는 Spring Boot와 JPA를 활용한 백엔드 개발 경험이 있습니다..."
}
```

| Field | Type | 필수 | 제약 |
|-------|------|------|------|
| `questionOrder` | `number` | ✅ | 현재 답변 중인 질문 순서 (1~N) |
| `messageContent` | `string` | ✅ | 텍스트 답변 본문 |

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

> ℹ️ 답변 저장 완료 후 AI의 다음 질문 또는 꼬리 질문은  
> FastAPI WebSocket(`WS /ws/interview/{sessionId}/ai`)으로 스트리밍 전달됩니다.

### Error Cases

| statusCode | 상황 |
|-----------|------|
| `400` | `messageContent` 누락 |
| `403` | 본인 소유가 아닌 세션 |
| `404` | 존재하지 않는 `sessionId` |
| `401` | 토큰 없음 또는 만료 |

---

## 3. 음성 청크 제출

- **Endpoint**: `POST /api/v1/interview/sessions/{sessionId}/answer/voice`
- **Description**: 5초 단위 음성 Blob 청크 전송 및 STT 파이프라인 트리거
- **Content-Type**: `multipart/form-data`

> ℹ️ constitution 정책: 마이크 녹음 데이터는 **5초 단위 Chunk**로 분할하여 전송한다.  
> STT 변환 결과는 FastAPI WebSocket(`WS /ws/interview/{sessionId}/ai`)으로 수신한다.

### Request

| Field | Type | 필수 | 설명 |
|-------|------|------|------|
| `audioChunk` | `File` (Blob) | ✅ | 5초 단위 음성 청크 (WebM / MP4 / OGG — 브라우저 지원 포맷) |
| `questionOrder` | `number` | ✅ | 현재 답변 중인 질문 순서 (1~N) |
| `chunkIndex` | `number` | ✅ | 청크 순서 인덱스 (0-based) |
| `isFinal` | `boolean` | ✅ | 해당 답변의 마지막 청크 여부 |

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

| statusCode | 상황 |
|-----------|------|
| `400` | 지원하지 않는 오디오 포맷 |
| `403` | 본인 소유가 아닌 세션 |
| `404` | 존재하지 않는 `sessionId` |
| `401` | 토큰 없음 또는 만료 |

---

## 4. 면접 세션 종료

- **Endpoint**: `POST /api/v1/interview/sessions/{sessionId}/end`
- **Description**: 면접 세션 종료 처리 및 AI 리포트 생성 트리거
- **Content-Type**: `application/json`

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

> ℹ️ 세션 종료 즉시 서버에서 AI 리포트 생성 작업을 **자동 트리거**합니다.  
> 리포트 완료 알림은 Spring WebSocket(`WS /ws/interview/{sessionId}/chat`)으로 수신합니다.

### Error Cases

| statusCode | 상황 |
|-----------|------|
| `400` | 이미 종료된 세션 |
| `403` | 본인 소유가 아닌 세션 |
| `404` | 존재하지 않는 `sessionId` |
| `401` | 토큰 없음 또는 만료 |

---

## 5. 면접 리포트 조회

- **Endpoint**: `GET /api/v1/interview/sessions/{sessionId}/report`
- **Description**: 면접 완료 후 피드백 리포트 조회 (페이지 재진입·새로고침 시 TanStack Query로 재조회)
- **Content-Type**: `application/json`

> ℹ️ 실시간 리포트 생성 완료 알림은 Spring WebSocket을 통해 수신한다.  
> 이 엔드포인트는 `COMPLETED` 상태의 전체 결과를 가져오거나 재진입 시 복원 용도로 사용한다.

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
        "aiFeedback": "직무 관련성은 높으나 구체적인 예시가 부족합니다."
      }
    ],
    "createdAt": "2026-05-29T15:20:00Z"
  }
}
```

| Field | Type | 설명 |
|-------|------|------|
| `data.totalScore` | `number` \| `null` | 면접 종합 점수 (0~100), 리포트 미완료 시 `null` |
| `data.feedbacks[].relevanceScore` | `number` \| `null` | 직무 연관성 점수 (0~100) |
| `data.feedbacks[].depthScore` | `number` \| `null` | 답변 깊이 점수 (0~100) |
| `data.feedbacks[].deliveryScore` | `number` \| `null` | 전달력 점수 — 텍스트 면접 또는 음성 품질 미달 시 `null` |
| `data.feedbacks[].fluencyScore` | `number` \| `null` | 유창성 점수 — 텍스트 면접 또는 음성 품질 미달 시 `null` |
| `data.feedbacks[].voiceQualityRatio` | `number` \| `null` | 음성 인식 유효 비율 (0.00~100.00) — 텍스트 면접 시 `null` |

> ℹ️ `voiceQualityRatio` 50.00 미만 문항은 `deliveryScore` / `fluencyScore`가 `null` 처리된다. (constitution 점수 산정 정책)

### Error Cases

| statusCode | 상황 |
|-----------|------|
| `403` | 본인 소유가 아닌 세션 |
| `404` | 존재하지 않는 `sessionId` |
| `401` | 토큰 없음 또는 만료 |

---

## 6. 면접 이력 목록 조회

- **Endpoint**: `GET /api/v1/interview/history`
- **Description**: 본인의 면접 이력을 최신순으로 페이징 조회
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
        "sessionId": "uuid-v4",
        "sessionType": "VOICE",
        "interviewType": "TECHNICAL",
        "targetCompany": "카카오",
        "sessionStatus": "COMPLETED",
        "totalScore": 78,
        "createdAt": "2026-05-29T14:53:44Z"
      },
      {
        "sessionId": "uuid-v4-2",
        "sessionType": "TEXT",
        "interviewType": "PERSONALITY",
        "targetCompany": null,
        "sessionStatus": "COMPLETED",
        "totalScore": 82,
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
| `data.content[].sessionType` | `string` | `TEXT` \| `VOICE` \| `VIDEO` |
| `data.content[].interviewType` | `string` \| `null` | `TECHNICAL` \| `PERSONALITY` \| `PROJECT`, 미입력 시 `null` |
| `data.content[].targetCompany` | `string` \| `null` | 미입력 시 `null` |
| `data.content[].totalScore` | `number` \| `null` | 리포트 미완료 또는 `FAILED` 시 `null` |

### Error Cases

| statusCode | 상황 |
|-----------|------|
| `401` | 토큰 없음 또는 만료 |

---

## 7. 면접 실시간 채널 — Spring WebSocket

- **Endpoint**: `WS /ws/interview/{sessionId}/chat`
- **Description**: 면접 세션 생명주기 제어 및 AI 질문 실시간 수신 (Spring 담당)

### 인증

```
WS /ws/interview/{sessionId}/chat?token={accessToken}
```

### Connection Lifecycle

```
클라이언트                             Spring 서버
   │                                   │
   │── WS 연결 요청 ───────────────────▶│  sessionId 소유권 검증
   │                                   │
   │◀─ {"type":"SYSTEM", ...} ─────────│  면접 시작 안내
   │◀─ {"type":"QUESTION", ...} ───────│  AI 첫 질문
   │◀─ {"type":"QUESTION", ...} ───────│  꼬리 질문
   │                                   │
   │◀─ {"type":"SYSTEM", ...} ─────────│  리포트 생성 완료 알림
   │                                   │
   │  (클라이언트 연결 종료)            │
```

### Server → Client 메시지 형식

```json
{
  "type": "QUESTION",
  "content": "Spring에서 트랜잭션 전파 방식에 대해 설명해 주세요.",
  "questionOrder": 2
}
```

| Field | Type | 설명 |
|-------|------|------|
| `type` | `string` | `QUESTION` \| `SYSTEM` \| `ERROR` |
| `content` | `string` | 메시지 본문 |
| `questionOrder` | `number` \| `null` | 질문 순서 (`QUESTION` 타입 시에만 포함) |

#### `type` 별 예시

| type | content 예시 | 비고 |
|------|-------------|------|
| `QUESTION` | `"지원 동기를 말씀해 주세요."` | 신규 질문 또는 꼬리 질문 |
| `SYSTEM` | `"면접이 시작되었습니다."` | 세션 시작·종료·리포트 완료 안내 |
| `ERROR` | `"세션 처리 중 오류가 발생했습니다."` | 수신 즉시 `ERROR` 상태 전이 |

### Error Cases

| 상황 | 동작 |
|------|------|
| 유효하지 않은 `sessionId` | 연결 즉시 종료 (Close 1008) |
| 본인 소유가 아닌 `sessionId` | 연결 즉시 종료 (Close 1008) |
| 토큰 없음 또는 만료 | 연결 즉시 종료 (Close 1008) |
| 최대 재연결 횟수 초과 | `ERROR` 메시지 전송 후 연결 종료 |

---

## 8. AI 파이프라인 채널 — FastAPI WebSocket

- **Endpoint**: `WS /ws/interview/{sessionId}/ai`
- **Description**: LLM 스트리밍 응답 수신, STT 변환 결과 수신, TTS 오디오 스트리밍 (FastAPI 담당)

### 인증

```
WS /ws/interview/{sessionId}/ai?token={accessToken}
```

### Server → Client 메시지 형식

```json
{
  "type": "STT_RESULT",
  "content": "Spring Boot에서 트랜잭션을 관리하기 위해서는...",
  "questionOrder": 1,
  "isFinal": true
}
```

| Field | Type | 설명 |
|-------|------|------|
| `type` | `string` | `STT_RESULT` \| `LLM_STREAM` \| `TTS_AUDIO` \| `ERROR` |
| `content` | `string` \| `null` | 텍스트 내용 (`STT_RESULT`, `LLM_STREAM` 시 사용) |
| `audioChunk` | `string` \| `null` | TTS 오디오 청크 base64 인코딩 (`TTS_AUDIO` 시 사용) |
| `questionOrder` | `number` | 현재 처리 중인 질문 순서 — 모든 타입 필수 포함 |
| `isFinal` | `boolean` \| `null` | 스트리밍 완료 여부 (`STT_RESULT`, `LLM_STREAM` 시 사용) |

> ℹ️ `questionOrder`는 모든 메시지 타입에 필수 포함된다. 클라이언트가 동시에 여러 메시지를 수신할 때 어느 질문에 대한 결과인지 시퀀스를 보장하기 위함이다.

#### `type` 별 동작

| type | 설명 |
|------|------|
| `STT_RESULT` | 음성 청크 → 텍스트 변환 결과. `isFinal: true` 이면 해당 `questionOrder` 답변 전체 확정 |
| `LLM_STREAM` | 꼬리 질문 또는 AI 응답 스트리밍 토큰. `isFinal: true` 이면 문장 완성 |
| `TTS_AUDIO` | TTS 오디오 청크 (base64). 순차 재생 Queue에 추가 |
| `ERROR` | STT / LLM / TTS 처리 오류 — 수신 시 에러 토스트 노출 (연결 유지) |

### Error Cases

| 상황 | 동작 |
|------|------|
| 유효하지 않은 `sessionId` | 연결 즉시 종료 (Close 1008) |
| 본인 소유가 아닌 `sessionId` | 연결 즉시 종료 (Close 1008) |
| 토큰 없음 또는 만료 | 연결 즉시 종료 (Close 1008) |
| STT / LLM / TTS 처리 실패 | `ERROR` 메시지 전송 후 연결 유지 |