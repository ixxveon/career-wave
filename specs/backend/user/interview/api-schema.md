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
  "message": "해당 면접 세션에 접근할 권한이 없습니다.",
  "code": "INTERVIEW_SESSION_FORBIDDEN",
  "data": null
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

### Multipart 요청 필드명 계약

모든 `multipart/form-data` 요청의 `Content-Disposition` 헤더 `name` 속성은 아래 명세와 **정확히 일치**해야 한다.  
필드명이 다르면 Spring이 파라미터를 바인딩하지 못해 400 오류가 발생한다.

> `audioChunk`, `questionOrder`, `chunkIndex`, `isFinal` — 대소문자 포함 일치 필수

### WebSocket errorCode 상수 테이블

WebSocket `ERROR` 메시지의 `errorCode` 필드 값은 아래 상수로 관리한다.  
서버(`ErrorCode` enum)와 클라이언트(constants 파일) 양쪽 모두 이 테이블을 기준으로 동기화한다.

| errorCode | 설명 |
|-----------|------|
| `INTERVIEW_AI_PIPELINE_ERROR` | FastAPI AI 파이프라인 처리 오류 |
| `INTERVIEW_STT_FAILED` | 음성 인식(STT) 실패 |
| `INTERVIEW_TTS_FAILED` | TTS 변환 실패 (FastAPI WebSocket 전용) |
| `INTERVIEW_LLM_FAILED` | LLM 질문 생성 실패 (FastAPI WebSocket 전용) |
| `INTERVIEW_SESSION_EXPIRED` | 세션 타임아웃으로 강제 종료 |
| `INTERVIEW_CALLBACK_FAILED` | FastAPI 콜백 처리 최종 실패 |
| `INTERVIEW_DUPLICATED_CONNECTION` | 동일 세션 중복 WebSocket 연결 시도 (FastAPI WebSocket 전용) |

> 새로운 errorCode 추가 시 이 테이블에 먼저 등록하고, 백엔드·프론트엔드 동시 반영한다.

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
  "focusType": "TECHNICAL_DEPTH",
  "targetCompany": "카카오"
}
```

| Field | Type | 필수 | 제약 |
|-------|------|------|------|
| `documentId` | `String` | ❌ | RAG 컨텍스트용 서류 ID. null/생략 시 RAG 없이 일반 면접 진행. 값이 있으면 존재하는 서류여야 하며, 유효하지 않으면 `404 INTERVIEW_DOCUMENT_NOT_FOUND` 반환 |
| `sessionType` | `String` | ✅ | `@NotBlank`, `TEXT` \| `VOICE` \| `VIDEO` |
| `interviewType` | `String` | ❌ | `TECHNICAL` \| `PERSONALITY` \| `PROJECT` |
| `focusType` | `String` | ❌ | `FOLLOW_UP` \| `TECHNICAL_DEPTH` \| `DELIVERY` \| `FLUENCY` — 개선 추천 액션 집중 유형 |
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

> **Note**: 진행 중인 기존 세션이 있으면 자동으로 FAILED 처리 후 새 세션을 생성한다.

---

## 2. 진행 중 세션 조회

- **Endpoint**: `GET /api/v1/user/interview/sessions/in-progress`
- **Description**: 현재 로그인 회원의 `IN_PROGRESS` 상태 세션을 단건 조회한다. 면접 페이지 진입 시 이전 세션 재개 여부를 확인하는 데 사용한다.
- **Auth**: `hasRole('USER')`

### Response `200 OK` — 진행 중 세션 존재 시

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "sessionId": "uuid-v4",
    "sessionType": "TEXT",
    "interviewType": "TECHNICAL",
    "targetCompany": "카카오",
    "createdAt": "2026-05-29T14:53:44Z"
  }
}
```

| Field | Type | 설명 |
|-------|------|------|
| `data.sessionId` | `String` (UUID) | 재개 가능한 세션 ID |
| `data.sessionType` | `String` | `TEXT` \| `VOICE` \| `VIDEO` |
| `data.interviewType` | `String` \| `null` | 미입력 시 `null` |
| `data.targetCompany` | `String` \| `null` | 미입력 시 `null` |
| `data.createdAt` | `String` | ISO 8601 형식 |

### Response `200 OK` — 진행 중 세션 없을 시

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": null
}
```

### Error Cases

| statusCode | ErrorCode | 상황 |
|-----------|-----------|------|
| `401` | `UNAUTHORIZED` | 토큰 없음 또는 만료 |

> **Note**: 이 API는 읽기 전용이며 쓰기 락을 획득하지 않는다 (`findInProgressByMemberIdReadOnly` 사용).

---

## 3. 텍스트 답변 제출

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

#### 파일 업로드 제약사항

| 항목 | 제약값 |
|------|--------|
| 청크당 최대 크기 | **5MB** (`spring.servlet.multipart.max-file-size: 5MB`) |
| 요청당 최대 크기 | **10MB** (`spring.servlet.multipart.max-request-size: 10MB`) |
| 허용 Content-Type | `audio/webm`, `audio/mp4`, `audio/ogg` |
| Content-Type 검증 | Spring Controller에서 `MultipartFile.getContentType()` 검증, 미일치 시 400 반환 |

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
> 리포트 완료 알림은 Spring STOMP(`/topic/interview/{sessionId}`)로 클라이언트에 전달한다.

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

> **`voiceQualityRatio` null 처리 규칙 (비즈니스 로직에 따른 의도된 null)**  
> `voiceQualityRatio`가 `50.00 미만`이거나 `null`인 문항은 `deliveryScore` / `fluencyScore`를 **강제로 null 처리**하여 반환한다.  
> 이는 음성 인식 품질이 신뢰하기 어려운 수준임을 의미하며, `0`으로 대체하지 않는다. (constitution.md §4)  
> Service 계층에서 DTO 조립 시 처리한다.

### Error Cases

| statusCode | ErrorCode | 상황 |
|-----------|-----------|------|
| `403` | `INTERVIEW_SESSION_FORBIDDEN` | 존재하지 않는 `sessionId` 또는 본인 소유가 아닌 세션 (IDOR 방어: 두 경우 모두 동일 응답) |
| `409` | `INTERVIEW_REPORT_NOT_READY` | 리포트 아직 생성 중 |
| `401` | `UNAUTHORIZED` | 토큰 없음 또는 만료 |

#### 409 응답 예시

```json
{
  "success": false,
  "statusCode": 409,
  "message": "리포트가 아직 생성 중입니다.",
  "code": "INTERVIEW_REPORT_NOT_READY",
  "data": {
    "status": "ANALYZING",
    "estimatedWaitSeconds": 15
  }
}
```

> `data.estimatedWaitSeconds`는 고정값(예: 15)으로 내려보내도 무방하다. FE는 이 값을 폴링 간격 힌트로 사용할 수 있다.  
> 응답 헤더에 `Retry-After: 15`를 함께 포함하여 HTTP 표준 방식으로도 대기 시간을 전달한다.

> ⚠️ **미구현 (Phase 7-1)**: 현재 구현은 `data.status` / `data.estimatedWaitSeconds` 없이 `CustomException` 기본 포맷만 반환한다. FE 연동 전 구현 필요.

---

## 6. 면접 이력 목록 조회

- **Endpoint**: `GET /api/v1/user/interview/history`
- **Description**: 본인의 면접 이력을 최신순으로 페이징 조회
- **Auth**: `hasRole('USER')`

### Query Parameters

| Parameter | Type | 필수 | 기본값 | 설명 |
|-----------|------|------|--------|------|
| `page` | `Integer` | ❌ | `0` | 페이지 번호 (0-based), `@Min(0)` |
| `size` | `Integer` | ❌ | `10` | 페이지당 항목 수, `@Min(1) @Max(100)` |

### Response `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "items": [
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
    "totalItems": 15,
    "totalPages": 2
  }
}
```

| Field | Type | 설명 |
|-------|------|------|
| `data.items[].interviewType` | `String` \| `null` | 미입력 시 `null` |
| `data.items[].targetCompany` | `String` \| `null` | 미입력 시 `null` |
| `data.items[].totalScore` | `Integer` \| `null` | 리포트 미완료 또는 `FAILED` 시 `null` |
| `data.items[].pdfUrl` | `String` \| `null` | 종합 진단 PDF URL (S3), 미생성 시 `null` |

### Error Cases

| statusCode | ErrorCode | 상황 |
|-----------|-----------|------|
| `401` | `UNAUTHORIZED` | 토큰 없음 또는 만료 |

---

## 7. 실시간 채널 — Spring WebSocket (STOMP)

- **Endpoint**: `WS /ws/user/interview`
- **Protocol**: STOMP (resume 도메인과 동일한 브로커 통합)
- **Description**: 면접 세션 생명주기 이벤트 및 AI 질문 전달 채널 (Spring 담당)

### 인증

```
WS /ws/user/interview?token={accessToken}
```

핸드셰이크 시 `?token=` 쿼리 파라미터로 JWT 전달 및 검증 → `memberId` 추출.  
SUBSCRIBE 시 `sessionId` 소유권을 DB로 재검증 (IDOR 방지).  
검증 실패 시 `MessageDeliveryException` 발생 → 연결 종료.

### 구독 경로

```
SUBSCRIBE /topic/interview/{sessionId}
```

구독 직후 현재 상태 스냅샷 1회 전송 (`SessionSubscribeEvent` 기반):
- 리포트 완료 → `REPORT_READY` 즉시 전송
- 진행 중 → `SESSION_START` 전송

> `/topic/` prefix 사용 이유: 서버(FastAPI 콜백)가 stompSessionId 없이도 브로드캐스트 가능. 소유권 검증은 SUBSCRIBE 인터셉터(`InterviewStompChannelInterceptor`)에서 수행.

### Connection Lifecycle

```
클라이언트                                          Spring 서버
   │                                                │
   │── WS /ws/user/interview?token=... ─────────────▶│  JWT 검증 → memberId 추출
   │                                                │
   │── SUBSCRIBE /topic/interview/{sessionId} ──────▶│  sessionId 소유권 검증
   │◀─ {"type":"SYSTEM","subType":"SESSION_START",...} │  구독 직후 스냅샷 전송 (SessionSubscribeEvent)
   │                                                │
   │◀─ {"type":"QUESTION","questionOrder":1,...} ────│  AI 첫 질문 (FastAPI → Spring → WS)
   │◀─ {"type":"QUESTION","questionOrder":2,...} ────│  꼬리 질문
   │                                                │
   │◀─ {"type":"SYSTEM","subType":"REPORT_READY",...} │  리포트 생성 완료 알림
   │                                                │
   │  (클라이언트 연결 종료)                        │
```

### Server → Client 메시지 형식

> ⚠️ **미구현 (Phase 7-1)**: 현재 WebSocket 메시지는 `{"type": "...", "data": "..."}` 단순 구조로 전송된다.  
> 아래 스펙(`content` / `questionOrder` / `subType` / `errorCode` 필드)은 FE 연동 전 구현 필요.

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
| `data` | `Object` \| `null` | 타입별 추가 데이터 (아래 참고) |
| `errorCode` | `String` \| `null` | `ERROR` 타입 시 에러 식별 코드 |

#### `type` 별 예시

**REPORT_READY** — `data`에 리포트 조회 URL 포함
```json
{
  "type": "SYSTEM",
  "content": "리포트 생성이 완료되었습니다.",
  "questionOrder": null,
  "subType": "REPORT_READY",
  "data": {
    "reportUrl": "/api/v1/user/interview/sessions/{sessionId}/report"
  },
  "errorCode": null
}
```

**ERROR** — `errorCode`로 FE가 에러별 대응 가능
```json
{
  "type": "ERROR",
  "content": "면접 중 오류가 발생했습니다.",
  "questionOrder": null,
  "subType": null,
  "data": null,
  "errorCode": "INTERVIEW_AI_PIPELINE_ERROR"
}
```

| type | subType | 비고 |
|------|---------|------|
| `QUESTION` | `null` | 신규 질문 또는 꼬리 질문 |
| `SYSTEM` | `SESSION_START` | 세션 시작 |
| `SYSTEM` | `REPORT_READY` | FastAPI 콜백 수신 후 전송, `data.reportUrl` 포함 |
| `SYSTEM` | `SESSION_END` | 세션 종료 안내 |
| `ERROR` | `null` | 처리 오류 시 전송 (연결 유지), `errorCode` 포함 |

### Error Cases

| 상황 | 동작 |
|------|------|
| 토큰 없음 또는 만료 | 핸드셰이크 거부 → 연결 불가 |
| 유효하지 않은 `sessionId` | SUBSCRIBE 시 `MessageDeliveryException` → 연결 종료 |
| 본인 소유가 아닌 `sessionId` | SUBSCRIBE 시 `MessageDeliveryException` → 연결 종료 |
| 서버 처리 오류 | `ERROR` 메시지 전송 후 연결 유지 |
