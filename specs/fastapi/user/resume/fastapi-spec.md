# FastAPI Feature Specification: user/resume (서류 분석 AI)

**Feature Branch**: `docs/fastapi-user-resume-spec`
**Status**: Draft
**참조 문서**: `specs/backend/user/resume/spec.md` / `specs/frontend/user/resume/spec.md`

---

## 도메인 개요

Spring Boot로부터 서류 분석 트리거를 수신하고, OpenAI를 활용하여 이력서 또는 자기소개서를 분석한 뒤
결과를 Spring Boot Webhook으로 콜백하는 FastAPI AI 엔진.

- FastAPI는 Spring Boot의 내부 호출만 처리한다. 프론트엔드는 FastAPI를 직접 호출하지 않는다.
- 외부 인증(JWT/ROLE_USER), 파일 업로드 수신, S3 저장, `ApiResponse<T>` 래핑은 Spring Boot 책임이다.
- FastAPI는 분석 결과를 Spring Boot Webhook으로 콜백할 때 `X-Internal-Secret` 헤더를 포함한다.

---

## User Stories & Testing

### User Story 1 — 이력서 파일 분석 처리 (Priority: P1)

> Spring Boot가 전달한 S3 파일 URL을 기반으로 이력서를 파싱하고 직무 적합도·항목별 피드백을 분석한다.

**Acceptance Scenarios**:
1. **Given** Spring Boot가 유효한 `documentId`, `fileType: RESUME`, `fileUrl` 페이로드로 분석 요청을 보낸 상태에서,
   **When** FastAPI가 S3에서 파일을 읽어 AI 분석을 수행하면,
   **Then** FastAPI는 Spring Boot Webhook으로 점수 5개, 항목별 `feedbackDetails`, `overallReview`를 포함한 `COMPLETED` 콜백을 전달해야 한다.
2. **Given** AI 분석 중 오류(파일 파싱 실패, OpenAI 타임아웃 등)가 발생한 경우,
   **When** FastAPI가 실패를 감지하면,
   **Then** FastAPI는 `errorMessage`를 포함한 `FAILED` 콜백을 Spring Boot Webhook으로 전달하고 분석을 중단해야 한다.
3. **Given** 암호화된 PDF 또는 텍스트 추출 불가 이미지 기반 PDF가 전달된 경우,
   **Then** FastAPI는 `errorMessage`와 함께 `FAILED` 콜백을 전달해야 한다.

### User Story 2 — 자기소개서 직접 입력 분석 처리 (Priority: P1)

> Spring Boot가 전달한 자기소개서 회사명, 직무명, 문항·답변 배열을 분석하고 항목별 피드백을 반환한다.

**Acceptance Scenarios**:
1. **Given** Spring Boot가 `fileType: COVER_LETTER`, `company`, `job`, `content[]` 페이로드로 분석 요청을 보낸 상태에서,
   **When** FastAPI가 AI 분석을 수행하면,
   **Then** FastAPI는 점수 5개, `feedbackDetails`(항목당 1개, `starAnalysis: null`), `overallReview`를 포함한 `COMPLETED` 콜백을 Spring Boot Webhook으로 전달해야 한다.
2. **Given** `content[]` 배열의 문항 수가 1~5개 범위를 벗어난 경우,
   **Then** FastAPI는 즉시 `INVALID_CONTENT_COUNT` 내부 오류를 반환해야 한다.
   (실제로 Spring Boot가 사전 검증하므로 FastAPI는 방어 체크 수준으로 처리)

### User Story 3 — 분석 진행 상태 중간 알림 (Priority: P2)

> FastAPI가 분석 단계별로 중간 상태 업데이트를 Spring Boot Webhook으로 전달하여 실시간 진행 표시를 지원한다.

**Acceptance Scenarios**:
1. **Given** 분석 작업이 진행 중인 상태에서,
   **When** FastAPI가 각 분석 단계를 시작하면,
   **Then** FastAPI는 `status: ANALYZING`, `message`, `progress` 필드를 포함한 중간 Webhook 콜백을 단계별로 Spring Boot에 전달해야 한다.
2. **Given** 프론트엔드가 WebSocket으로 `/topic/resume/{documentId}/status`를 구독 중인 상태에서,
   **When** Spring Boot가 중간 Webhook을 수신하면,
   **Then** Spring Boot가 해당 WebSocket 토픽으로 메시지를 브로드캐스트해야 한다. (Spring Boot 책임)

---

## Functional Requirements

- **FR-001**: FastAPI는 `POST /internal/user/resume/analyze` 요청을 수신해 분석 작업을 비동기로 시작하고 `202 Accepted`를 즉시 반환해야 한다.
- **FR-002**: FastAPI는 `fileType: RESUME`인 경우 `fileUrl`로 S3에서 파일을 다운로드하고 텍스트를 추출해야 한다. 지원 포맷: PDF, DOC, DOCX.
- **FR-003**: FastAPI는 `fileType: COVER_LETTER`인 경우 전달받은 `content[]` 텍스트를 직접 분석 입력으로 사용해야 한다.
- **FR-004**: FastAPI는 분석 완료 후 `scoreJobFitness`, `scoreTechStack`, `scoreQuantified`, `scoreLogical`, `scoreTotal`을 산출해야 한다. 각 점수는 0~100 정수.
- **FR-005**: FastAPI는 항목별 `feedbackDetails` 배열을 생성해야 한다. 이력서는 `starAnalysis` 포함, 자기소개서는 `starAnalysis: null`.
- **FR-006**: FastAPI는 `overallReview` 종합 총평 문자열을 생성해야 한다.
- **FR-007**: FastAPI는 분석 단계별로 중간 상태 Webhook 콜백(status: PENDING → ANALYZING → COMPLETED/FAILED)을 Spring Boot에 전송해야 한다.
- **FR-008**: FastAPI는 분석 실패 시 `errorMessage`를 포함한 `FAILED` 콜백을 전달하고 분석을 중단해야 한다.
- **FR-009**: FastAPI는 Webhook 콜백 전송 시 `X-Internal-Secret` 헤더를 포함해야 한다.
- **FR-010**: FastAPI는 OpenAI 호출 타임아웃(30초 이내)을 설정해야 한다.
- **FR-011**: FastAPI는 모든 환경 변수를 `core/` 설정 계층을 통해 접근해야 한다. 코드에 하드코딩 금지.

---

## Edge Cases

- S3 파일 다운로드 실패(네트워크 오류, 파일 없음): `FAILED` 콜백, `errorMessage: "파일을 불러올 수 없습니다."`
- 파일 파싱 불가(암호화 PDF, 이미지 PDF): `FAILED` 콜백, `errorMessage: "파일에서 텍스트를 추출할 수 없습니다."`
- OpenAI 응답 타임아웃 또는 API 오류: `FAILED` 콜백, `errorMessage` 포함
- Spring Boot Webhook 콜백 전송 실패(Spring이 다운): 재시도 최대 3회(지수 백오프). 모두 실패 시 로컬 에러 로그 기록 후 포기.
- 동일 `documentId`로 분석 요청이 중복 수신된 경우: 이미 처리 중이면 `409 Conflict` 내부 오류 반환.

---

## Success Criteria

- **SC-001**: 이력서 분석 요청 수신 후 30초 이내에 `COMPLETED` 또는 `FAILED` 콜백이 Spring Boot에 전달된다.
- **SC-002**: `feedbackDetails`의 각 항목은 `sectionNumber`, `question`, `originalText`, `goodPoint`, `badPoint`, `improvedText` 필드를 모두 포함한다.
- **SC-003**: `COMPLETED` 콜백의 `feedbackText`는 Spring Boot의 `ObjectMapper.readValue(feedbackText, FeedbackDetail[].class)`로 역직렬화 가능한 JSON 문자열이다.
- **SC-004**: 이력서 분석 결과의 `feedbackDetails` 각 항목에 `starAnalysis` (S·T·A·R 4개 항목 `ok/comment`)가 포함된다.
- **SC-005**: 자기소개서 분석 결과의 `feedbackDetails` 각 항목에 `starAnalysis: null`이 포함된다.

---

## Assumptions

- 프론트엔드는 FastAPI를 직접 호출하지 않는다.
- Spring Boot는 이미 파일 유효성 검증(크기, MIME 타입)을 완료한 뒤 FastAPI에 트리거를 보낸다.
- S3 파일 접근은 FastAPI가 IAM 역할 또는 환경 변수 자격증명으로 직접 수행한다.
- `documentId` UUID는 Spring Boot가 생성하여 페이로드에 포함한다.
- Spring Boot Webhook 콜백 URL은 환경 변수 `SPRING_BASE_URL`로 구성한다: `{SPRING_BASE_URL}/api/v1/user/resume/{documentId}/webhook`
- OpenAI 모델 선택 및 프롬프트 튜닝은 `user/prompts/` 하위에서 관리한다.
- 자기소개서의 회사·직무 정보(`company`, `job`)는 직무 적합도 점수(`scoreJobFitness`) 산출의 컨텍스트로 활용한다.
