# Implementation Plan: 서류 분석 API (User Resume)

> 관련 문서: `spec.md` / `api-schema.md` / `tasks.md`  
> 레이어: **Backend (Spring Boot)**

---

## Summary

이력서(파일 업로드) 및 자기소개서(문항·답변 입력)를 수신하고, FastAPI AI 서비스에 분석을 위임한 뒤
WebSocket으로 실시간 상태를 전달하며, 최종 결과를 REST API로 제공하는 백엔드 구현 계획.

---

## Technical Context

| 분류 | 선택 | 근거 |
|------|------|------|
| 파일 저장소 | AWS S3, 경로 `resumes/{yyyy-MM-dd}/{UUID}.{확장자}` | 날짜별 분산 관리, 루트 나열 성능 저하 방지 |
| 분석 트리거 | Spring → FastAPI 분석 요청, FastAPI → Spring Webhook 콜백 | DB 저장과 WebSocket 알림을 Spring 한 곳에서 처리 |
| WebSocket | STOMP (`spring-boot-starter-websocket`) + `ChannelInterceptor` | CONNECT 프레임 시점 JWT 검증 |
| `feedback_details` 저장 | `feedback_text TEXT` (JSON 직렬화 문자열) + `ObjectMapper` 역직렬화 | 외부 의존성 없음, 점수 5개 컬럼 별도 분리 |
| 피드백 파싱 실패 | `FEEDBACK_PARSE_ERROR(500)` + `GlobalExceptionHandler` 등록 | FastAPI 응답 구조 변경 등 외부 요인으로 인한 서버 크래시 방지 |
| 페이지네이션 | Spring Data JPA `Pageable` | 프로젝트 기존 패턴 준수 |
| `documentId` 타입 | UUID v4 | IDOR 방어 |

---

## 전제 조건 및 미결 사항

| 항목 | 상태 | 비고 |
|------|------|------|
| S3 업로드 방식 | **확정** | 서버 경유 방식 (`Spring → S3`) |
| `feedback_text` 저장 방식 | **확정** | `TEXT` 컬럼에 JSON 직렬화, `ObjectMapper`로 역직렬화 |
| Webhook 내부 보안 방식 | **확정** | `X-Internal-Secret` 헤더, 환경 변수 `WEBHOOK_SECRET` |
| WebSocket 구현 방식 | **확정** | STOMP (`spring-boot-starter-websocket`) |
| members 테이블 PK 타입 | **확정** | UUID (`gen_random_uuid()`) |
| Base URL | **확정** | `/api/v1/user/resume` |

---

## 팀 결정 필요 항목

### A. S3 업로드 방식

| 방식 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **서버 경유** | 프론트 → Spring → S3 | 구현 간단, 보안 관리 Spring 중심 | 파일 데이터가 Spring 서버를 거쳐 트래픽 증가 |
| **Presigned URL** | 프론트가 Spring에 URL 발급 요청 후 S3 직접 업로드 | Spring 서버 파일 트래픽 없음, 가벼움 | S3 버킷 CORS 설정 + 권한 설정 필요 |

> 팀 내 S3 인프라 설정 가능 여부에 따라 결정. v1 기준으로는 **서버 경유 방식이 구현 난이도가 낮음**.

### B. 피드백 텍스트 저장 방식 (확정)

> `feedback_text TEXT` 컬럼에 JSON 직렬화 문자열로 저장. 점수 5개(`score_job_fitness` 등)는 별도 INTEGER 컬럼으로 분리.  
> Spring에서 `ObjectMapper.readValue()`로 `List<FeedbackDetail>` 역직렬화 — `hypersistence-utils` 등 외부 의존성 불필요.

---

## 필요 환경 변수

> 코드에 하드코딩하지 않고 모두 환경 변수로 관리합니다.

| 환경 변수 | 설명 | 담당 | 예시 |
|-----------|------|------|------|
| `AWS_S3_BUCKET_NAME` | 파일 업로드 대상 S3 버킷명 | 인프라 팀 요청 | `careerwave-files` |
| `AWS_REGION` | S3 버킷 리전 | 인프라 팀 요청 | `ap-northeast-2` |
| `FASTAPI_BASE_URL` | Spring → FastAPI 분석 요청 내부 URL | 본인 직접 설정 | `http://localhost:8000` |
| `WEBHOOK_SECRET` | FastAPI → Spring Webhook 인증 키 | 본인 직접 설정 | `(임의 생성 비밀값)` |
| `AWS_S3_MOCK_UPLOAD` | `true` 설정 시 S3 실제 업로드 없이 가짜 URL 반환 (로컬 개발용) | 본인 직접 설정 | `true` \| `false` (기본값 `false`) |
| `WEBSOCKET_ALLOWED_ORIGINS` | WebSocket CORS 허용 출처 (기본값 `*`, 프로덕션에서는 명시 필요) | 인프라 팀 요청 | `https://careerwave.co.kr` |

---

## Phases

### Phase 1: 도메인 기반 세팅

- [ ] `FileType` Enum 정의 (`RESUME`, `COVER_LETTER`)
- [ ] `DocumentStatus` Enum 정의 (`UPLOADED`, `PENDING`, `ANALYZING`, `COMPLETED`, `FAILED`)
- [ ] `Document` Entity 작성 (UUID PK, `@NoArgsConstructor(PROTECTED)`)
- [ ] `CoverLetterContent` Entity 작성
- [ ] `DocumentFeedback` Entity 작성 (`feedback_text TEXT` + 점수 5개 INTEGER 컬럼 + `overall_review TEXT`)
- [ ] Repository 3개 작성 (`DocumentRepository`, `CoverLetterContentRepository`, `DocumentFeedbackRepository`)
- [ ] ErrorCode 추가 (`INVALID_FILE_SIZE`, `INVALID_FILE_TYPE`, `INVALID_CONTENT_COUNT`, `INVALID_CONTENT_LENGTH`, `DOCUMENT_NOT_FOUND`, `DOCUMENT_ACCESS_DENIED`)

### Phase 2: 이력서 업로드 API

- [ ] `ResumeDTO.ResponseUpload` DTO 작성
- [ ] 파일 크기(10MB) + MIME type 기반 확장자 검증 유틸 작성
- [ ] UUID 기반 S3 저장 파일명 생성 로직 (`{UUID}.{확장자}`)
- [ ] S3 업로드 연동 — `stored_file_name`, `file_url`, `original_name` 분리 저장
- [ ] `Document` 저장 (`status = UPLOADED`)
- [ ] FastAPI 분석 비동기 트리거 (스텁으로 시작 후 실제 연동)
- [ ] `POST /api/v1/user/resume/upload` Controller + Swagger Docs

### Phase 3: 자기소개서 제출 API

- [ ] `ResumeDTO.RequestCoverLetter`, `ResumeDTO.ResponseCoverLetter` DTO 작성
- [ ] 문항 수(1~5) 및 답변 길이(1000자) 검증
- [ ] `Document` + `CoverLetterContent` 저장 (트랜잭션)
- [ ] FastAPI 분석 비동기 트리거
- [ ] `POST /api/v1/user/resume/cover-letter` Controller + Swagger Docs

### Phase 4: 분석 결과 조회 API

- [ ] `ResumeDTO.ResponseFeedback` DTO 작성 (`ObjectMapper`로 `feedback_text` 역직렬화 포함)
- [ ] IDOR 검증 로직 구현
- [ ] `GET /api/v1/user/resume/{documentId}/feedback` Controller + Swagger Docs

### Phase 5: 이력 목록 조회 API

- [ ] `ResumeDTO.HistoryItem` DTO 작성
- [ ] `created_at DESC` 페이징 쿼리
- [ ] `GET /api/v1/user/resume/history` Controller + Swagger Docs

### Phase 6: Webhook 수신 API (FastAPI → Spring)

- [ ] `ResumeDTO.RequestWebhook` DTO 작성 (status, scores, feedbackDetails, errorMessage)
- [ ] Webhook 내부 보안 검증 로직 (IP 제한 또는 `X-Internal-Secret` 헤더)
- [ ] 멱등성 처리: `document.status`가 이미 `COMPLETED`/`FAILED`이면 DB 갱신 없이 `200 OK` 반환
- [ ] `DocumentFeedback` DB 저장 + `document.status` 업데이트 (`@Transactional`)
- [ ] 저장 완료 후 WebSocket 세션에 상태 메시지 브로드캐스트
- [ ] `POST /api/v1/user/resume/{documentId}/webhook` Controller 구현

### Phase 7: WebSocket 분석 상태 구독

- [ ] `HandshakeInterceptor` 구현 — 쿼리 파라미터 `token` 파싱 및 JWT 검증, `Authentication` 객체 세션 속성 주입
- [ ] WebSocket 핸들러 작성 — 연결 시 `documentId` 소유권 검증 (불일치 시 Close 1008)
- [ ] Webhook 수신 시 해당 `documentId` 구독 세션에 메시지 발송
- [ ] `COMPLETED` / `FAILED` 전송 후 Grace Period(30초) 적용 — 클라이언트 선종료 즉시 해제, 만료 시 Close 1000
- [ ] STOMP 엔드포인트 `/ws/user/resume` 등록, 구독 토픽 `/topic/resume/{documentId}/status` 확인

### Phase 8: 검증 및 문서화

- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] Swagger 응답 예시 확인
- [ ] IDOR 방어 시나리오 수동 테스트
- [ ] 프론트 API 계약 최종 일치 여부 확인 (Base URL 포함)

---

## 전략적 개발 순서 권장

> 설계 Phase 순서와 별개로, 실제 구현 시작 시 아래 순서를 권장한다.

### Step 1: 데이터 흐름 먼저 검증 (Phase 1 + Phase 2 우선)

```
Phase 1 (엔티티·Repository·ErrorCode) → Phase 2 (이력서 업로드 API)
```

**이유**: `프론트 → Spring → S3` 전체 흐름을 가장 빠르게 뚫어볼 수 있는 루트.  
파일 업로드 한 건이 S3에 정상 저장되고 `documentId`가 응답으로 내려오면,  
이후 Phase들은 같은 패턴의 반복이라 속도가 붙는다.

**검증 포인트**:
- 파일이 `resumes/{yyyy-MM-dd}/{UUID}.{확장자}` 경로로 S3에 저장되는가
- `Document`가 DB에 `status = UPLOADED`로 정상 저장되는가
- 응답 `documentId`(UUID)가 내려오는가

### Step 2: 나머지 API 순차 구현

```
Phase 3 (자기소개서) → Phase 4 (피드백 조회) → Phase 5 (이력 목록)
→ Phase 6 (Webhook) → Phase 7 (STOMP WebSocket) → Phase 8 (검증)
```

> Phase 4 진입 전 FastAPI 팀과 Webhook 페이로드 스키마(`feedbackDetails` 배열 구조)를 반드시 합의한다.  
> 구조가 확정되지 않은 상태에서 역직렬화 코드를 작성하면 재작업 가능성이 높다.
