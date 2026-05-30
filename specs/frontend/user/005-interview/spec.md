# Feature Specification: AI 면접 (Interview)

> 작성일: 2026-05-29  
> 관련 문서: `plan.md` / `api-schema.md` / `constitution.md`  
> **Feature Branch**: `feature/user-interview-session`  
> **Status**: Final

---

## 1. User Scenarios & Testing

### User Story 1 — 텍스트 면접 진행 (Priority: P1)
> 취업 준비생은 지원 직무에 맞는 AI 면접관과 텍스트로 모의 면접을 연습하고 싶다.

**Acceptance Scenarios**:
1. **Given** 유저가 면접 진입 시, **When** 사전 진단(마이크 권한·네트워크)을 통과하고 텍스트 모드를 선택하면, **Then** AI의 첫 질문이 채팅창에 표시되며 면접이 시작된다.
2. **Given** 답변 입력 후 전송 시, **Then** 채팅창에 답변이 반영되고 AI가 꼬리 질문 또는 다음 질문을 생성한다.
3. **Given** 문항당 2분 30초 경과 시, **Then** 타이머가 만료되어 자동으로 다음 질문으로 넘어간다.
4. **Given** 면접 종료 시, **Then** 스크립트가 서버에 동기화되고 리포트 생성이 트리거된다.

### User Story 2 — 음성 면접 진행 (Priority: P1)
> 취업 준비생은 실제 면접과 유사하게 음성으로 답변하고 AI 면접관의 TTS 음성을 들으며 연습하고 싶다.

**Acceptance Scenarios**:
1. **Given** 음성 모드 선택 후 면접 시작 시, **Then** AI 면접관의 질문이 TTS로 재생되고 마이크 녹음이 활성화된다.
2. **Given** 유저 답변 녹음 중, **Then** 5초 단위 청크로 분할 전송되며 STT 변환 결과가 실시간으로 채팅창에 반영된다.
3. **Given** STT 변환 실패 시, **Then** 에러 안내와 함께 텍스트 직접 입력으로 전환할 수 있는 안내가 노출된다.
4. **Given** 마이크 권한이 거부된 상태로 음성 모드 진입 시도 시, **Then** 권한 설정 안내와 함께 면접 시작이 차단된다.

### User Story 3 — 면접 리포트 확인 (Priority: P1)
> 취업 준비생은 면접 종료 후 역량 지표 기반 피드백을 확인하고 부족한 점을 파악하고 싶다.

**Acceptance Scenarios**:
1. **Given** 면접 완료 시, **Then** Relevance·Depth·Delivery·Fluency 4개 지표 레이더 차트와 문항별 AI 피드백이 표시된다.
2. **Given** 텍스트 면접이거나 음성 품질이 50% 미만인 문항은, **Then** Delivery·Fluency 점수가 마스킹 처리되고 안내 문구가 노출된다.
3. **Given** 리포트 페이지 새로고침 시, **Then** TanStack Query가 `sessionId` 기반으로 결과를 재조회하여 화면이 복원된다.

### User Story 4 — 면접 이력 재조회 (Priority: P2)
> 취업 준비생은 이전 면접 결과를 다시 확인하거나 특정 면접을 기반으로 재연습하고 싶다.

**Acceptance Scenarios**:
1. **Given** 이력 목록 진입 시, **Then** 본인의 면접 이력이 최신순으로 페이징되어 표시된다.
2. **Given** 특정 이력 클릭 시, **Then** `sessionId` 기반으로 해당 리포트 페이지로 재진입한다.
3. **Given** 이력이 없을 시, **Then** 빈 상태 안내 문구가 노출된다.

---

## 2. Requirements

### Functional Requirements
- **FR-001**: 면접 진입 전 사전 진단(Pre-flight Check) — 마이크 권한 및 WebSocket 서버 연결 가능 여부 검증. 실패 시 면접 시작 버튼 비활성화.
- **FR-002**: 텍스트/음성 면접 모드 선택 및 면접 도중 텍스트 보조 입력 전환 지원.
- **FR-003**: 음성 답변 5초 단위 Chunk 분할 전송 및 STT 실시간 변환 결과 채팅창 동기화.
- **FR-004**: 문항당 최대 2분 30초(150초) 타이머. 만료 시 `MediaRecorder.stop()` 호출, 잔여 버퍼 전송 후 자동 진행.
- **FR-005**: LLM 기반 꼬리 질문·압박 질문 동적 생성. 응답 지연·타임아웃 시 사전 정의 질문으로 폴백.
- **FR-006**: TTS 오디오 순차 재생 Queue — 이전 문장 완료 후 다음 문장 재생.
- **FR-007**: 면접 종료 후 Relevance·Depth·Delivery·Fluency 4개 지표 리포트 제공.
- **FR-008**: 음성 인식 유효 비율 50% 미만 문항의 Delivery·Fluency 점수 `null` 처리 및 마스킹 안내 UI.
- **FR-009**: 이력서 `documentId` 기반 RAG 컨텍스트 주입 (없으면 일반 면접으로 진행).
- **FR-010**: 면접 이력 최신순 페이징 조회.
- **FR-011**: 면접 세션 취소(Abort) — 클라이언트가 WebSocket 연결을 닫고 상태를 `READY`로 초기화. 별도 서버 취소 API 없음.

### Non-functional Requirements
- **NFR-001**: WebSocket 단절 시 자동 재연결 시도. 최대 횟수 초과 시 `ERROR` 상태 전이 및 안내 노출.
- **NFR-002**: Lighthouse 성능 90점 / 접근성 95점 이상.
- **NFR-003**: `sessionId` 소유권 검증 — 타인 세션 접근 시 403 차단 (IDOR 방어).
- **NFR-004**: `SessionStorage` 기반 세션 복원 — 새로고침·재진입 시 `RUNNING` 상태 복구.
- **NFR-005**: ChatWindow 스크롤 최적화 — 서버 설정 최대 질문 수 초과 시 Virtual List 또는 스크롤 제어 적용.

### Key Entities
- **InterviewSession**: `sessionId`, `memberId`, `documentId`, `sessionType`, `sessionStatus`, `interviewType`, `targetCompany`, `totalScore`, `startedAt`, `endedAt`, `createdAt`
- **InterviewMessage**: `messageId`, `sessionId`, `sender`, `messageType`, `messageContent`, `createdAt`
- **AIInterviewFeedback**: `feedbackId`, `sessionId`, `questionOrder`, `questionText`, `answerText`, `relevanceScore`, `depthScore`, `deliveryScore`, `fluencyScore`, `voiceQualityRatio`, `aiFeedback`, `createdAt`

---

## 3. Edge Cases 및 해결 정책

- **마이크 권한 거부**: Pre-flight Check 단계에서 차단. 권한 설정 안내 UI 노출 후 면접 시작 불가.
- **WebSocket 연결 실패**: 사전 진단(ping/pong) 실패 시 재시도 안내. 재시도 후에도 실패 시 면접 시작 불가.
- **면접 중 소켓 단절**: `RECONNECTING` 상태 전이 후 자동 재연결 시도. 성공 시 `RUNNING` 복귀, 최대 횟수 초과 시 `ERROR` 전이.
- **비정상 종료 후 재진입**: `SessionStorage`에 `sessionId` 저장. 재진입 시 `GET /report`로 상태 복원. `IN_PROGRESS` 상태면 세션 복구 안내 노출.
- **STT 변환 실패**: 에러 토스트 노출 및 텍스트 직접 입력 전환 안내. 해당 청크는 재전송 1회 시도.
- **LLM 응답 지연·타임아웃**: 로딩 인디케이터 유지 후 사전 정의 질문으로 자동 대체.
- **음성 품질 50% 미만**: Delivery·Fluency 점수 `null` 처리. 리포트에서 "데이터 부족" 안내 UI 렌더링.
- **documentId 없이 진입**: RAG 컨텍스트 없이 일반 면접으로 진행 (정상 케이스).
- **유효하지 않은 documentId**: 서버 검증 후 403/404 반환. 클라이언트는 에러 안내 후 이전 페이지로 이동.

---

## 4. Success Criteria

- **SC-001**: 텍스트·음성 면접 전체 플로우(사전 진단 → 세션 시작 → 답변 → 종료 → 리포트)가 오류 없이 완주됨.
- **SC-002**: 음성 면접 시 STT 결과가 실시간으로 채팅창에 반영되고, TTS가 순차 재생됨.
- **SC-003**: 리포트의 4개 지표 레이더 차트가 정상 렌더링되며, 마스킹 지표는 안내 UI로 대체됨.
- **SC-004**: 새로고침·재진입 시 `SessionStorage`를 통해 면접 세션 상태가 복원됨.
- **SC-005**: 타인의 `sessionId`로 API 호출 시 403 차단이 동작함.

---

## 5. Assumptions

- 본 기능은 로그인된 회원만 이용 가능.
- 면접 최대 질문 개수는 서버 설정값으로 제어하며, 프론트엔드는 이를 수신하여 UI에 반영한다.
- 음성 인식(STT), LLM 질문 생성, TTS 변환은 FastAPI 서버에서 수행하며, 프론트엔드는 결과 시각화에 집중한다.
- 이력서 파일 파싱 및 RAG 인덱싱은 서버 사이드에서 처리한다.
- 면접 도중 입력 모드 전환(음성 → 텍스트)은 현재 답변 단위로만 가능하며, 질문 단위가 바뀌면 초기 선택 모드로 유지된다.