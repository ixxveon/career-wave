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

> Convention(`/api/v1/user/{domain}`) 기준으로 확정. 프론트 스펙도 동일하게 통일 완료.

### 인증

```
Authorization: Bearer {accessToken}
```

모든 API는 JWT 인증 + `ROLE_USER` 권한 필수. `memberId`는 `@AuthenticationPrincipal`로 추출.

> **예외 — Webhook** (`POST /api/v1/user/resume/webhook`):  
> FastAPI 내부 호출 전용으로, JWT/ROLE_USER 인증 대상에서 제외한다.  
> 대신 `X-Internal-Secret` 헤더로 내부 보안을 검증한다.  
> `SecurityConfig`에서 해당 경로를 `permitAll()` + IP 제한(또는 Secret 검증 필터)로 별도 처리한다.

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

### Response `201 Created`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "이력서가 업로드되었습니다.",
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
> 클라이언트는 `documentId` 수신 후 STOMP(`/ws/user/resume?token=...`) 연결 후 `/topic/resume/{documentId}/status` 토픽 구독 시작.

### Error Cases

| ErrorCode | HTTP | 상황 |
|-----------|------|------|
| `INVALID_FILE_SIZE` | 400 | 파일 크기 10MB 초과 |
| `INVALID_FILE_TYPE` | 400 | PDF·DOC·DOCX 외 확장자 |
| `S3_UPLOAD_FAILED` | 500 | S3 업로드 실패 (권한·네트워크·버킷 오류 등) |
| `UNAUTHORIZED` | 401 | 토큰 없음 또는 만료 |

---

## 2. 자기소개서 제출

- **Endpoint**: `POST /api/v1/user/resume/cover-letter`
- **Content-Type**: `application/json`

> 자기소개서는 파일이 없으므로 `documents` 테이블의 `file_url`, `original_name` 컬럼은 nullable.  
> **수정(Update) 미지원 (v1)**: 제출 후 내용 수정 API는 제공하지 않는다. 수정이 필요한 경우 재제출(`POST .../cover-letter`)로 새 `documentId`를 발급받는다.  
> PUT `/api/v1/user/resume/cover-letter/{documentId}` 엔드포인트는 v1 범위 외 — v2 이후 요구사항 확정 시 추가한다.

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
| `company` | `string` | ✅ | 지원 회사명 → `cover_letter_meta.company` 저장 |
| `job` | `string` | ✅ | 지원 직무명 → `cover_letter_meta.job` 저장 |
| `content` | `array` | ✅ | 최소 1개, 최대 5개 → `cover_letter_contents` 테이블에 행 단위 반복 저장 |
| `content[].order` | `number` | ✅ | 문항 순서 (1~5 범위 필수, 동일 document 내 중복 불가 — DB UNIQUE 제약) |
| `content[].question` | `string` | ✅ | 문항 내용 → `cover_letter_contents.question` |
| `content[].answer` | `string` | ✅ | 답변 내용, 최대 1000자 → `cover_letter_contents.answer` |

> **DB 매핑 요약**  
> - `company`, `job` → `cover_letter_meta` 테이블 1행 저장  
> - `content[]` 배열 → `cover_letter_contents` 테이블 배열 길이만큼 행 삽입 (`saveAll()`)  
> - `cover_letter_contents.order_num`은 동일 `document_id` 내 UNIQUE 제약 (`uq_clc_document_order`) — 프론트에서 중복 order 전송 시 DB 레벨에서 에러 발생

### Response `201 Created`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "자기소개서가 제출되었습니다.",
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
| `DUPLICATE_CONTENT_ORDER` | 400 | 동일 문서 내 문항 순서 중복 |
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

> **scores 매핑**: DB `score_job_fitness` → `scores.jobFitness`, `score_tech_stack` → `scores.techStack`, `score_quantified` → `scores.quantifiedAchievement`, `score_logical` → `scores.logicalStructure`, `score_total` → `scores.total`.  
> Spring에서 `ScoreDTO` inner record로 감싸 반환 — DB 컬럼명과 DTO 필드명이 다르므로 서비스 레이어에서 직접 매핑.  
> `feedback_text` 컬럼(TEXT)에 JSON 문자열로 저장 — `ObjectMapper`로 역직렬화하여 `overallReview` + `feedbackDetails` 배열로 반환.  
> 파싱 실패 시 `FEEDBACK_PARSE_ERROR(500)` — `GlobalExceptionHandler`에서 처리.  
> `errorMessage`: `documents.error_message` 컬럼 값 — `FAILED` 상태가 아닌 경우 `null`.

| Field | Type | 설명 |
|-------|------|------|
| `data.status` | `string` | `PENDING` \| `ANALYZING` \| `COMPLETED` \| `FAILED` |
| `data.scores` | `object` \| `null` | 역량 점수 객체, 분석 미완료 시 `null` |
| `data.scores.jobFitness` | `number` | 직무 적합도 (0~100) |
| `data.scores.techStack` | `number` | 기술 스택 (0~100) |
| `data.scores.quantifiedAchievement` | `number` | 경험 수치화 (0~100) |
| `data.scores.logicalStructure` | `number` | 논리력 (0~100) |
| `data.scores.total` | `number` | 종합 점수 (0~100) |
| `data.overallReview` | `string` \| `null` | AI 종합 총평, 분석 미완료 시 `null` |
| `data.feedbackDetails` | `array` \| `null` | 항목별 첨삭 결과, 분석 미완료 시 `null` |
| `data.feedbackDetails[].starAnalysis` | `object` \| `null` | STAR 분석, 이력서 전용 (자기소개서는 `null`) |
| `data.feedbackDetails[].quantAnalysis` | `object` \| `null` | 수치화 분석, 항목에 따라 `null` 허용 |
| `data.errorMessage` | `string` \| `null` | 분석 실패 시 오류 메시지, 정상 완료 시 `null` |

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
        "status": "COMPLETED",
        "originalName": "이력서_홍길동.pdf",
        "company": null,
        "job": null,
        "totalScore": 74,
        "createdAt": "2026-05-29T14:53:44Z"
      },
      {
        "documentId": "660f9511-f30c-52e5-b827-557766551111",
        "fileType": "COVER_LETTER",
        "status": "ANALYZING",
        "originalName": null,
        "company": "카카오",
        "job": "백엔드 개발자",
        "totalScore": null,
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
| `content[].status` | `string` | `UPLOADED` \| `PENDING` \| `ANALYZING` \| `COMPLETED` \| `FAILED` |
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

- **Endpoint**: `POST /api/v1/user/resume/webhook`
- **호출 주체**: FastAPI (외부 클라이언트 호출 차단 — IP 제한 또는 내부 Secret 헤더 검증)
- **Content-Type**: `application/json`

> FastAPI가 분석을 마친 뒤 이 엔드포인트를 호출한다.  
> Spring은 수신 즉시 DB를 업데이트하고, WebSocket으로 프론트엔드에 상태 알림을 발송한다.

### Request

```json
{
  "documentId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED",
  "scoreJobFitness": 78,
  "scoreTechStack": 85,
  "scoreQuantified": 60,
  "scoreLogical": 72,
  "scoreTotal": 74,
  "overallReview": "전반적으로 백엔드 역량이 우수하나 성과의 정량적 수치화가 아쉽습니다.",
  "feedbackText": "[{\"sectionNumber\":1,\"question\":\"...\",\"goodPoint\":\"...\", ...}]",
  "errorMessage": null
}
```

| Field | Type | 설명 |
|-------|------|------|
| `documentId` | `string (UUID)` | 분석 완료된 문서 ID |
| `status` | `string` | `COMPLETED` \| `FAILED` |
| `scoreJobFitness` | `number` \| `null` | 직무 적합도 (0~100), `FAILED` 시 `null` |
| `scoreTechStack` | `number` \| `null` | 기술 스택 (0~100), `FAILED` 시 `null` |
| `scoreQuantified` | `number` \| `null` | 경험 수치화 (0~100), `FAILED` 시 `null` |
| `scoreLogical` | `number` \| `null` | 논리력 (0~100), `FAILED` 시 `null` |
| `scoreTotal` | `number` \| `null` | 종합 점수 (0~100), `FAILED` 시 `null` |
| `overallReview` | `string` \| `null` | AI 종합 총평, `FAILED` 시 `null` — `document_feedbacks.overall_review` 컬럼에 저장 |
| `feedbackText` | `string` \| `null` | 항목별 첨삭 배열을 JSON 직렬화한 문자열. `FAILED` 시 `document_feedbacks` 행 미생성 → `null` 반환 |
| `errorMessage` | `string` \| `null` | 실패 시 오류 메시지 — `documents.error_message` 컬럼에 저장 |

> **DB 매핑**  
> - `overallReview` → `document_feedbacks.overall_review TEXT NULL`  
> - `feedbackText` → `document_feedbacks.feedback_text TEXT NOT NULL` (JSON 직렬화 문자열)  
> - `errorMessage` → `documents.error_message TEXT NULL`  
> Spring에서 `ObjectMapper.readValue(feedbackText, FeedbackDetail[].class)`로 역직렬화 후 응답 반환.

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
  │── POST .../webhook ────────────────▶│  ① X-Internal-Secret 검증 (트랜잭션 외부)
  │                                    │  ② documentId 유효성 확인 (트랜잭션 외부)
  │                                    │  ┌─ @Transactional 시작 ─────────────┐
  │                                    │  │  ③ 멱등성 체크 ← 트랜잭션 최상단  │
  │                                    │  │    status가 COMPLETED/FAILED?      │
  │                                    │  │    YES → 즉시 return (DB 갱신 없음) │
  │                                    │  │    NO  → 아래 처리 계속            │
  │                                    │  │  ④ DocumentFeedback 저장           │
  │                                    │  │  ⑤ document.status 업데이트        │
  │                                    │  └────────────────────────────────── ┘
  │                                    │  ⑥ @TransactionalEventListener(AFTER_COMMIT)
  │                                    │     WebSocket 브로드캐스트
  │◀─ 200 OK ──────────────────────────│
```

> **멱등성 체크(③)는 반드시 `@Transactional` 블록 최상단에서 수행한다.**  
> 트랜잭션 진입 전 체크 시 동시 요청에서 race condition이 발생할 수 있으므로, DB lock이 보장되는 트랜잭션 안에서 상태를 읽고 판단한다.

> **트랜잭션 경계**: `DocumentFeedback` 저장과 `document.status` 업데이트는 **하나의 `@Transactional` 안에서 처리**한다.  
> WebSocket 브로드캐스트는 `@TransactionalEventListener(phase = AFTER_COMMIT)`으로 커밋 완료 후 발행한다.  
> 구현 흐름: 서비스 내 `ApplicationEventPublisher.publishEvent()` → 리스너에서 `SimpMessagingTemplate.convertAndSend()` 호출.  
> (WebSocket 전송 실패 시 클라이언트는 REST `GET .../feedback`으로 상태 복원 가능)

### 멱등성 (Idempotency)

Webhook은 네트워크 재시도로 동일 요청이 중복 수신될 수 있다.

**최종 상태 판단 기준**: `COMPLETED` 또는 `FAILED`를 "최종 상태"로 간주한다.  
처리 중 상태(`PENDING`, `ANALYZING`)에서 들어오는 동일 `documentId`의 Webhook은 순차적으로 DB에 반영하되,  
최종 상태에 도달한 이후의 재수신 요청부터 무시한다.

> `ANALYZING` 중 Webhook이 중복 수신되더라도 무조건 무시하면 정상 상태 업데이트가 누락될 수 있으므로,  
> 최종 상태 진입 이전까지는 정상 처리 경로를 따른다.

```
수신 시 document.status 확인
  ├── COMPLETED 또는 FAILED (최종 상태) → 이미 처리 완료 → 200 OK 반환 후 조용히 무시
  └── UPLOADED / PENDING / ANALYZING   → 정상 처리 (DB 저장 + WebSocket 알림)
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

- **구현 방식**: STOMP (`spring-boot-starter-websocket`)
- **프론트 클라이언트**: `@stomp/stompjs`

```
STOMP 핸드셰이크 엔드포인트 : /ws/user/resume
구독 토픽 ①               : /topic/resume/{documentId}/status       ← 브로드캐스트 (진행 상태, 완료/실패)
구독 토픽 ②               : /user/queue/resume/{documentId}/status  ← 개인 Snapshot (SUBSCRIBE 직후 1회)
```

> 클라이언트는 **두 토픽을 모두 구독**해야 합니다.  
> - ① `topic`은 Webhook 수신 시 서버가 브로드캐스트하는 ANALYZING/COMPLETED/FAILED 메시지를 수신합니다.  
> - ② `user/queue`는 SUBSCRIBE 직후 서버가 해당 세션에만 1회 전송하는 현재 상태 Snapshot을 수신합니다. 재연결 시 UI 즉시 복원에 활용합니다.

### 인증

JWT를 핸드셰이크 쿼리 파라미터 `?token=`으로 전달한다.  
`HandshakeInterceptor`에서 쿼리 파라미터 `token`을 추출하여 검증하고 세션 attributes에 `memberId`를 저장.  
이후 `ChannelInterceptor`의 `preSend()`에서 CONNECT 프레임 수신 시 세션의 `memberId`를 재검증한다.

```
WS /ws/user/resume?token={accessToken}
```

### Connection Lifecycle

```
클라이언트                                          서버
   │                                                │
   │── STOMP CONNECT ─────────────────────────────▶│  HandshakeInterceptor: ?token 검증 + memberId 세션 저장
   │                                                │  ChannelInterceptor: CONNECT 프레임 재검증
   │── STOMP SUBSCRIBE /topic/resume/{id}/status ──▶│  documentId 소유권 DB 재조회 (IDOR 방지)
   │── STOMP SUBSCRIBE /user/queue/resume/{id}/status ▶│
   │                                                │
   │◀─ [user/queue] {"status":"ANALYZING"} ─────────│  ← SUBSCRIBE 직후 현재 상태 Snapshot 1회 (세션 전용)
   │                                                │    (재연결 시 UI 즉시 복원)
   │◀─ [topic] {"status":"ANALYZING"} ──────────────│  분석 진행 중 (Webhook 수신마다 브로드캐스트)
   │                                                │
   │◀─ [topic] {"status":"COMPLETED"} ──────────────│  완료 메시지 브로드캐스트
   │   (또는 "FAILED")                              │  ↓ Grace Period 시작 (30초, TaskScheduler)
   │                                                │
   │── (클라이언트 정상 종료) ───────────────────────▶│  즉시 세션 해제, 타이머 취소
   │   또는 Grace Period 만료                       │  30초 경과 시 서버에서 Close 1000으로 세션 정리
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

## Database Constraints (구현 참고)

> 프론트엔드 유효성 검증 로직 및 백엔드 구현 시 아래 DB 제약 조건을 반드시 준수한다.

| 테이블 | 제약 | 설명 |
|--------|------|------|
| `document_feedbacks` | `feedback_text` NOT NULL | `COMPLETED` 시에만 행 생성 — `FAILED` 시 행 미생성, API 응답에서 `null` 반환 |
| `document_feedbacks` | `score_*` 5개 컬럼 INTEGER | 분석 완료 시 저장, 미완료 시 `null` — `FAILED` 시 행 자체 미생성 |
| `cover_letter_contents` | `(document_id, order_num)` UNIQUE | 동일 문서 내 문항 순서 중복 불가 (`UK_DOCUMENT_ORDER`) |
| `cover_letter_contents` | `order_num` CHECK (1~5) | 문항 순서 범위 DB 레벨 제한 |
| `cover_letter_contents` | `answer` 최대 1000자 | 서비스 레이어에서 `@Size(max=1000)` 검증 후 저장 |

---

## ErrorCode → HTTP 매핑

> 각 API 섹션의 **Error Cases 표**를 Swagger `@ApiResponse` 어노테이션 작성 시 그대로 참고하면 된다.  
> 아래 표는 전체 도메인의 에러 코드를 한 번에 조회할 때 사용한다.

| ErrorCode | HTTP | 발생 시점 | 관련 API |
|-----------|------|-----------|---------|
| `INVALID_FILE_SIZE` | 400 | 파일 크기 10MB 초과 | § 1 업로드 |
| `INVALID_FILE_TYPE` | 400 | PDF·DOC·DOCX 외 확장자 | § 1 업로드 |
| `S3_UPLOAD_FAILED` | 500 | S3 업로드 실패 (권한·네트워크·버킷 오류) | § 1 업로드 |
| `INVALID_CONTENT_COUNT` | 400 | 문항 수 범위(1~5) 위반 | § 2 자기소개서 |
| `INVALID_CONTENT_LENGTH` | 400 | 답변 1000자 초과 | § 2 자기소개서 |
| `DUPLICATE_CONTENT_ORDER` | 400 | 동일 문서 내 문항 순서 중복 | § 2 자기소개서 |
| `DOCUMENT_NOT_FOUND` | 404 | 존재하지 않는 documentId | § 3 피드백 조회, § 5 Webhook |
| `DOCUMENT_ACCESS_DENIED` | 403 | 본인 소유가 아닌 문서 접근 (IDOR) | § 3 피드백 조회, § 6 WebSocket |
| `FEEDBACK_PARSE_ERROR` | 500 | feedback_text JSON 역직렬화 실패 | § 3 피드백 조회 |
| `WEBHOOK_SECRET_INVALID` | 403 | X-Internal-Secret 헤더 불일치 또는 누락 | § 5 Webhook |
| `WEBHOOK_INVALID_STATUS` | 400 | COMPLETED·FAILED 외 알 수 없는 status 값 | § 5 Webhook |
| `UNAUTHORIZED` | 401 | 토큰 없음 또는 만료 | 전체 API (§ 5 제외) |

---

## 개발 유의사항 요약

> 구현 시 아래 항목을 반드시 점검한다.

| 항목 | 가이드라인 |
|------|-----------|
| **타임아웃** | 외부 호출(FastAPI 트리거, S3 업로드)은 Connection/Read Timeout을 **3~5초 이내**로 설정 — 미설정 시 외부 서비스 지연이 Spring 전체 응답 지연으로 전파 |
| **비동기 호출** | FastAPI 분석 트리거는 `@Async` 또는 `WebClient` 비동기 호출 권장 — 동기 호출 시 타임아웃 필수 |
| **트랜잭션** | Webhook 수신 시 멱등성 체크를 `@Transactional` 최상단에서 수행, DB 저장과 status 업데이트는 동일 트랜잭션 내 처리 |
| **WebSocket 브로드캐스트** | `@TransactionalEventListener(AFTER_COMMIT)` — 트랜잭션 커밋 완료 후 발행, 트랜잭션 내부 직접 호출 금지 |
| **보안** | `X-Internal-Secret` 키는 시스템 환경 변수(`WEBHOOK_SECRET`)로 관리 — 코드·설정 파일 평문 하드코딩 금지 |
| **MIME 검증** | 파일 업로드 시 확장자 검사만으로는 불충분 — `Apache Tika` 등으로 실제 파일 속성 검증 |
| **에러 로그** | `FEEDBACK_PARSE_ERROR` 발생 시 `documentId` + `rawBody`(feedback_text 원문)를 ERROR 레벨로 로그에 기록 — 디버깅 근거 보존 |
| **DTO 유연성** | `FeedbackDetail`에 `@JsonIgnoreProperties(ignoreUnknown = true)` 적용 — FastAPI 필드 추가 시 Spring 서버 크래시 방지 |
