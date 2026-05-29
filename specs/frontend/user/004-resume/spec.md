# Feature Specification: Document Analysis (서류 코칭)

> 작성일: 2026-05-29  
> 관련 문서: `plan.md` / `api-schema.md` / `db-schema.md` / `constitution.md`  
> **Feature Branch**: `feature/user-resume-analyze`  
> **Status**: Final

---

## 1. User Scenarios & Testing

### User Story 1 — 이력서 파일 분석 요청 (Priority: P1)
> 취업 준비생은 이력서 파일을 업로드하여 직무 적합도를 확인하고 개선점을 제안받고 싶다.

**Acceptance Scenarios**:
1. **Given** 유저가 서류 분석 페이지 진입 시, **When** 유효한 PDF/DOC/DOCX 파일을 업로드하고 분석 요청하면, **Then** AI 분석 모달이 활성화되며 분석 상태가 단계별로 표시된다.
2. **Given** 분석 완료 시, **Then** 점수 및 Good/Bad/Fix 피드백이 포함된 리포트 화면으로 자동 전환된다.
3. **Given** 10MB 초과 또는 미지원 확장자 업로드 시, **Then** 업로드가 차단되고 에러 안내 메시지가 노출된다.

### User Story 2 — 자기소개서 직접 입력 분석 (Priority: P1)
> 취업 준비생은 지원 회사/직무에 맞춘 자소서 문항과 답변을 입력하여 맞춤형 피드백을 받고 싶다.

**Acceptance Scenarios**:
1. **Given** 지원 회사/직무 입력 및 문항/답변 작성 후, **When** 'AI 분석 시작하기' 클릭 시, **Then** 데이터 전송 및 분석 로딩 화면이 나타난다.
2. **Given** 미입력 필드 존재 시, **When** 'AI 분석 시작하기' 클릭 시, **Then** 버튼이 비활성화되거나 필수 입력 안내 메시지가 노출된다.

### User Story 3 — 분석 이력 재조회 (Priority: P2)

**Acceptance Scenarios**:
1. **Given** 이력 목록 진입 시, **Then** 본인의 분석 이력이 최신순으로 페이징되어 표시된다.
2. **Given** 특정 이력 클릭 시, **Then** `documentId` 기반으로 리포트 페이지로 재진입한다.
3. **Given** 이력 없을 시, **Then** 빈 상태 안내 문구가 노출된다.

---

## 2. Requirements

### Functional Requirements
- **FR-001**: 파일 업로드 시 10MB 용량 및 확장자(PDF/DOC/DOCX) 검증.
- **FR-002**: 자기소개서 문항별 1,000자 제한 및 실시간 글자 수 카운팅.
- **FR-003**: 분석 완료 후 `documentId` 기반 결과 재조회 기능.
- **FR-004**: 이력 목록 최신순 페이징 조회.
- **FR-005**: 분석 완료 후 면접 도메인 연동(`?documentId=xxx`).
- **FR-006**: AI 분석 작업 취소(Abort) 및 `IDLE` 상태 복귀 기능 제공.

### Non-functional Requirements
- **NFR-001**: 분석 완료까지 30초 이내 처리(Timeout 시 안내).
- **NFR-002**: Lighthouse 성능 90/접근성 95점 이상.
- **NFR-003**: 본인 소유가 아닌 문서 접근 차단(IDOR 방어).
- **NFR-004**: 새로고침 시 `SessionStorage`를 통한 세션 복원.

### Key Entities
- **Document**: `documentId`, `memberId`, `fileType`, `fileUrl`, `originalName`, `createdAt`
- **CoverLetterContent**: `contentId`, `documentId`, `orderNum`, `question`, `answer(max 1000자)`, `createdAt`
- **Feedback**: `documentFeedbackId`, `documentId`, `status`, `score`, `good[]`, `bad[]`, `fix[]`, `createdAt`

---

## 3. Edge Cases 및 해결 정책

- **네트워크 연결 끊김**: 분석 요청 중 단절 시 토스트 메시지 노출 및 `IDLE` 상태 복귀.
- **분석 중 페이지 이탈**: `SessionStorage`에 `documentId` 저장. 재진입 시 해당 ID로 피드백 조회(`GET /feedback`)하여 분석 중이면 로딩 모달 자동 노출.
- **문항 5개 초과 추가 시도**: UI 상에서 추가 버튼 비활성화(Disabled).
- **피드백 항목 일부 누락**: Good/Bad/Fix 중 데이터 없는 경우 `Empty State` UI 렌더링.
- **유효하지 않은 `documentId`**: 면접 도메인 진입 시 404/403 처리 및 안내.

---

## 4. Success Criteria

- **SC-001**: 분석 완료 후 면접 도메인으로 `documentId` 파라미터가 정상 전달됨.
- **SC-002**: 새로고침 시 `SessionStorage`를 통해 분석 중인 모달 상태 복원.
- **SC-003**: 피드백 항목이 일부 비어 있어도 리포트 UI가 깨지지 않고 정상 렌더링됨.

---

## 5. Assumptions

- 본 기능은 로그인된 회원만 이용 가능.
- 서버 응답 30초 초과 시 타임아웃 모달 노출 후 `IDLE` 상태로 복원.
- 이력서 파싱 및 분석은 서버 사이드(FastAPI)에서 수행하며, 프론트엔드는 결과값 시각화에 집중.