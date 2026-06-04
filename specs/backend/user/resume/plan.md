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
| 파일 저장소 | AWS S3 | 기존 프로젝트 인프라 준수 |
| 분석 트리거 | 내부 HTTP (FastAPI) 또는 메시지 큐 | 팀 협의 후 결정 |
| WebSocket | Spring WebSocket | Spring Boot 내장 — 추가 의존성 없음 |
| `feedback_details` 저장 | JSONB | AI 응답 스키마 유연성 확보 |
| 페이지네이션 | Spring Data JPA `Pageable` | 프로젝트 기존 패턴 준수 |
| `documentId` 타입 | UUID v4 | IDOR 방어 |

---

## 전제 조건 및 미결 사항

| 항목 | 상태 | 비고 |
|------|------|------|
| S3 업로드 방식 (Presigned URL vs 서버 직접 전송) | 협의 필요 | 구현 전 인프라 팀 확인 |
| FastAPI 분석 트리거 방식 | 협의 필요 | 내부 HTTP 호출 vs 메시지 큐 |
| FastAPI → Spring 결과 전달 방식 | 협의 필요 | 직접 DB 쓰기 vs 콜백 API |
| WebSocket 구현 방식 | 협의 필요 | `@ServerEndpoint` vs STOMP |
| members 테이블 PK 타입 | 코드 확인 필요 | UUID 전제 — 다를 경우 DTO 타입 조정 |
| Base URL 최종 결정 | 프론트 팀 확인 필요 | `/api/v1/resume` vs `/api/v1/user/resume` |

---

## Phases

### Phase 1: 도메인 기반 세팅

- [ ] `FileType` Enum 정의 (`RESUME`, `COVER_LETTER`)
- [ ] `DocumentStatus` Enum 정의 (`UPLOADED`, `PENDING`, `ANALYZING`, `COMPLETED`, `FAILED`)
- [ ] `Document` Entity 작성 (UUID PK, `@NoArgsConstructor(PROTECTED)`)
- [ ] `CoverLetterContent` Entity 작성
- [ ] `DocumentFeedback` Entity 작성 (JSONB `feedback_details` 처리 방식 결정)
- [ ] Repository 3개 작성 (`DocumentRepository`, `CoverLetterContentRepository`, `DocumentFeedbackRepository`)
- [ ] ErrorCode 추가 (`INVALID_FILE_SIZE`, `INVALID_FILE_TYPE`, `INVALID_CONTENT_COUNT`, `INVALID_CONTENT_LENGTH`, `DOCUMENT_NOT_FOUND`, `DOCUMENT_ACCESS_DENIED`)

### Phase 2: 이력서 업로드 API

- [ ] `ResumeDTO.ResponseUpload` DTO 작성
- [ ] 파일 검증 로직 (크기 10MB, 확장자 MIME type 기반)
- [ ] S3 업로드 연동 (방식은 팀 협의 후 구현)
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

- [ ] `ResumeDTO.ResponseFeedback` DTO 작성 (JSONB 역직렬화 포함)
- [ ] IDOR 검증 로직 구현
- [ ] `GET /api/v1/user/resume/{documentId}/feedback` Controller + Swagger Docs

### Phase 5: 이력 목록 조회 API

- [ ] `ResumeDTO.HistoryItem` DTO 작성
- [ ] `created_at DESC` 페이징 쿼리
- [ ] `GET /api/v1/user/resume/history` Controller + Swagger Docs

### Phase 6: WebSocket 분석 상태 구독

- [ ] WebSocket 핸들러 구현 (토큰 검증 + documentId 소유권 검증)
- [ ] FastAPI → Spring 상태 수신 후 클라이언트 브로드캐스트
- [ ] `COMPLETED` / `FAILED` 수신 시 연결 종료 처리
- [ ] `WS /ws/resume/{documentId}/status` 엔드포인트 등록

### Phase 7: 검증 및 문서화

- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] Swagger 응답 예시 확인
- [ ] IDOR 방어 시나리오 수동 테스트
- [ ] 프론트 API 계약 최종 일치 여부 확인 (Base URL 포함)
