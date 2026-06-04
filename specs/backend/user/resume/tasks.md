# Tasks: 서류 분석 API (User Resume)

> 관련 문서: `plan.md` / `spec.md`  
> 레이어: **Backend (Spring Boot)**

---

## Phase 1: 도메인 기반 세팅

- [ ] `FileType` Enum 작성 (`RESUME`, `COVER_LETTER`)
- [ ] `DocumentStatus` Enum 작성 (`UPLOADED`, `PENDING`, `ANALYZING`, `COMPLETED`, `FAILED`)
- [ ] `Document` Entity 작성
  - UUID PK (`document_id`)
  - `file_type`, `file_url (nullable)`, `original_name (nullable)`, `status`, `created_at`
  - `@NoArgsConstructor(access = AccessLevel.PROTECTED)`
- [ ] `CoverLetterContent` Entity 작성
  - BIGSERIAL PK, `document_id` FK, `order_num`, `question`, `answer`, `created_at`
- [ ] `DocumentFeedback` Entity 작성
  - BIGSERIAL PK, `document_id` FK UNIQUE, 점수 5개 컬럼, `overall_review`, `feedback_details (JSONB)`, `error_message`, `created_at`
- [ ] `DocumentRepository` 작성
- [ ] `CoverLetterContentRepository` 작성
- [ ] `DocumentFeedbackRepository` 작성
- [ ] `ErrorCode` 추가
  - `INVALID_FILE_SIZE` (400)
  - `INVALID_FILE_TYPE` (400)
  - `INVALID_CONTENT_COUNT` (400)
  - `INVALID_CONTENT_LENGTH` (400)
  - `DOCUMENT_NOT_FOUND` (404)
  - `DOCUMENT_ACCESS_DENIED` (403)

---

## Phase 2: 이력서 업로드 API

- [ ] `ResumeDTO.ResponseUpload` 작성
- [ ] 파일 MIME type 기반 확장자 검증 유틸 작성 (PDF·DOC·DOCX)
- [ ] 파일 크기 10MB 초과 검증
- [ ] S3 업로드 로직 구현 (팀 협의된 방식 적용)
- [ ] `Document` 저장 (`status = UPLOADED`, `file_type = RESUME`)
- [ ] FastAPI 분석 트리거 (비동기, 스텁 → 실제 연동)
- [ ] `ResumeController.uploadResume()` 구현
- [ ] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 3: 자기소개서 제출 API

- [ ] `ResumeDTO.RequestCoverLetter`, `ResumeDTO.ResponseCoverLetter` 작성
- [ ] `@Valid` + `@Size` 기반 문항 수(1~5), 답변 길이(1000자) 검증
- [ ] `Document` 저장 (`status = UPLOADED`, `file_type = COVER_LETTER`, `file_url = null`)
- [ ] `CoverLetterContent` 벌크 저장 (`@Transactional`)
- [ ] FastAPI 분석 트리거 (비동기)
- [ ] `ResumeController.submitCoverLetter()` 구현
- [ ] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 4: 분석 결과 조회 API

- [ ] `ResumeDTO.ResponseFeedback` 및 중첩 record 작성
  - `ScoreDetail`, `FeedbackDetail`, `StarAnalysis`, `QuantAnalysis`, `AnalysisItem`
- [ ] JSONB `feedback_details` 역직렬화 처리 (Jackson `ObjectMapper` 또는 커스텀 컨버터)
- [ ] IDOR 검증 — `document.member_id != memberId` 시 `DOCUMENT_ACCESS_DENIED(403)`
- [ ] `DocumentFeedback` 없는 경우 status만 포함한 응답 반환
- [ ] `ResumeController.getFeedback()` 구현
- [ ] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 5: 이력 목록 조회 API

- [ ] `ResumeDTO.HistoryItem` 작성
- [ ] `DocumentRepository` 커스텀 쿼리 작성 (member_id + created_at DESC + LEFT JOIN feedback)
- [ ] `PaginationResponse<ResumeDTO.HistoryItem>` 변환
- [ ] `ResumeController.getHistory()` 구현
- [ ] `ResumeControllerDocs` Swagger 인터페이스 작성

---

## Phase 6: WebSocket 분석 상태 구독

- [ ] WebSocket 설정 클래스 작성 (`WebSocketConfig`)
- [ ] WebSocket 핸들러 작성
  - 핸드셰이크 시 쿼리 파라미터 `token` 검증
  - `documentId` 소유권 검증 (불일치 시 Close 1008)
  - FastAPI → Spring 상태 수신 후 클라이언트 전송
  - `COMPLETED` / `FAILED` 수신 시 세션 종료
- [ ] FastAPI에서 Spring으로 상태 전달 연동 (팀 협의 방식 적용)
- [ ] `WS /ws/resume/{documentId}/status` 엔드포인트 등록

---

## Phase 7: 검증 및 문서화

- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] Swagger UI에서 요청·응답 예시 확인
- [ ] IDOR 시나리오 수동 테스트 (타인 documentId로 요청 시 403 확인)
- [ ] 프론트 Base URL 최종 일치 여부 확인 (`/api/v1/resume` vs `/api/v1/user/resume`)
- [ ] 파일 MIME type 검증 우회 시도 테스트
