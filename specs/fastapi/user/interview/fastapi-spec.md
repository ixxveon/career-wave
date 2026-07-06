# FastAPI Feature Specification: User Interview

**Feature Branch**: `docs/fastapi-user-interview-spec`  
**Status**: Final  
**관련 문서**: `specs/backend/user/interview/spec.md` / `specs/frontend/user/interview/spec.md`

---

## 개요

FastAPI는 AI 면접 도메인에서 STT·LLM·TTS 파이프라인 전담 서버다.  
Spring Boot는 세션 생명주기와 답변 저장을 담당하고, AI 처리 결과는 FastAPI가 클라이언트에 직접 전달한다.

### 처리 채널 구조

```
클라이언트 ←──── WS /ws/user/interview/{sessionId}/ai ──────── FastAPI
     │                                                              │
     │── REST /api/v1/user/interview/** ─────────── Spring Boot ───┘
     │                                                  │
     └─────── WS /ws/user/interview/{sessionId}/chat ──┘
```

- **FastAPI WebSocket** (`/ws/user/interview/{sessionId}/ai`): STT 결과·LLM 질문·TTS 오디오 실시간 전달
- **Spring WebSocket** (`/ws/user/interview/{sessionId}/chat`): 세션 생명주기 이벤트 (SESSION_START / REPORT_READY / ERROR)
- **FastAPI → Spring 콜백** (`POST /internal/api/v1/interview/callback/{sessionId}/report`): 리포트 완료 알림

---

## User Scenarios & Testing

### User Story 1 — STT 실시간 처리 (Priority: P1)

> 음성 면접 응시자가 마이크로 답변을 녹음하면 FastAPI가 5초 단위 청크를 실시간 STT 변환하여 결과를 클라이언트에 전송한다.

**Acceptance Scenarios**:

1. **Given** Spring이 `POST /answer/voice` 음성 청크를 수신해 FastAPI STT 파이프라인에 비동기 전달했을 때, **When** FastAPI가 `isFinal=true` 청크를 받으면, **Then** FastAPI는 누적된 모든 청크를 합쳐 Whisper에 일괄 전송하고 최종 STT 결과를 `STT_FINAL` 메시지로 클라이언트에 전송해야 한다. 중간 청크는 버퍼에 누적만 한다.
2. **Given** 음성 인식 유효 비율(`voiceQualityRatio`)이 50% 미만인 청크가 포함된 답변이 완료됐을 때, **When** FastAPI가 해당 답변의 `voiceQualityRatio`를 산정하면, **Then** FastAPI는 Spring 콜백 시 해당 항목의 `deliveryScore` / `fluencyScore`를 `null`로 포함해 전송해야 한다.
3. **Given** STT 처리 중 오류가 발생했을 때, **When** FastAPI가 오류를 감지하면, **Then** FastAPI는 WebSocket `ERROR` 메시지(`errorCode: INTERVIEW_STT_FAILED`)를 클라이언트에 전송해야 한다.

### User Story 2 — LLM 질문 생성 (Priority: P1)

> FastAPI는 세션 컨텍스트(RAG + 이전 답변)를 기반으로 다음 질문을 LLM으로 동적 생성하여 클라이언트와 Spring에 전달한다.

**Acceptance Scenarios**:

1. **Given** Spring이 텍스트 답변 저장 후 FastAPI LLM 파이프라인을 트리거했을 때, **When** FastAPI가 LLM을 호출하면, **Then** FastAPI는 다음 질문을 Spring WebSocket 채널을 통해 클라이언트에 전달하기 위해 Spring에 질문 메시지를 전달해야 한다.
2. **Given** LLM 응답이 지연되거나 타임아웃이 발생했을 때, **When** FastAPI가 타임아웃을 감지하면, **Then** FastAPI는 미리 정의된 폴백 질문으로 대체하고 클라이언트에 전달해야 한다.
3. **Given** `documentId`가 있는 세션일 때, **When** FastAPI가 질문을 생성하면, **Then** FastAPI는 해당 서류의 RAG 컨텍스트를 반영하여 직무 연관 질문을 생성해야 한다.

### User Story 3 — TTS 오디오 생성 및 전달 (Priority: P1)

> FastAPI는 LLM이 생성한 AI 면접관 질문을 TTS로 변환하여 클라이언트에 직접 스트리밍한다.

**Acceptance Scenarios**:

1. **Given** FastAPI가 LLM 질문 텍스트를 생성했을 때, **When** FastAPI가 TTS 변환을 수행하면, **Then** FastAPI는 오디오 데이터를 WebSocket을 통해 클라이언트에 스트리밍해야 한다.
2. **Given** TTS 변환 실패 시, **When** FastAPI가 오류를 감지하면, **Then** FastAPI는 TTS 없이 텍스트 질문만 전달하고 `ERROR` 메시지를 전송하여 클라이언트가 텍스트 표시로 대체할 수 있게 해야 한다.

### User Story 4 — 피드백 리포트 생성 (Priority: P1)

> Spring이 세션 종료를 알리면 FastAPI는 전체 면접 답변을 분석하여 4개 역량 지표 피드백을 생성하고 Spring 콜백으로 전달한다.

**Acceptance Scenarios**:

1. **Given** Spring이 세션 종료 후 리포트 생성을 비동기 트리거했을 때, **When** FastAPI가 전체 답변을 분석하면, **Then** FastAPI는 질문별 `relevanceScore` / `depthScore` / `deliveryScore` / `fluencyScore` / `voiceQualityRatio` / `aiFeedback`와 `totalScore`를 Spring 콜백으로 전달해야 한다.
2. **Given** 리포트 생성이 완료됐을 때, **When** FastAPI가 Spring 콜백을 호출하면, **Then** FastAPI는 `POST /internal/api/v1/interview/callback/{sessionId}/report`에 `X-Internal-Secret` 헤더를 포함하여 전달해야 한다.
3. **Given** Spring 콜백이 네트워크 오류로 실패했을 때, **When** FastAPI가 실패를 감지하면, **Then** FastAPI는 최소 1회 재시도 후 최종 실패 시 `log.error`로 기록해야 한다.

### User Story 5 — RAG 컨텍스트 등록 (Priority: P2)

> Spring이 면접 세션 시작 시 서류 기반 RAG 컨텍스트를 FastAPI에 비동기 등록하면, FastAPI는 이후 LLM 질문 생성에 해당 컨텍스트를 활용한다.

**Acceptance Scenarios**:

1. **Given** Spring이 `documentId`가 있는 세션을 생성하고 FastAPI에 RAG 등록을 요청했을 때, **When** FastAPI가 등록 요청을 수신하면, **Then** FastAPI는 해당 서류를 벡터 검색 가능 상태로 인덱싱하고 이후 LLM 호출 시 컨텍스트로 주입해야 한다.
2. **Given** `documentId` 없이 세션이 시작됐을 때, **When** FastAPI가 LLM 질문을 생성하면, **Then** FastAPI는 RAG 없이 일반 면접 모드로 진행해야 한다.

---

## Requirements

### Functional Requirements

- **FR-001**: FastAPI는 Spring이 전달한 음성 청크를 누적 버퍼에 저장하고, `isFinal=true` 청크 수신 시 누적 청크를 합쳐 Whisper에 일괄 전송하여 최종 결과를 `STT_FINAL` WebSocket 메시지로 클라이언트에 전송해야 한다.
- **FR-002**: FastAPI는 `voiceQualityRatio`를 산정하고 50% 미만인 항목의 `deliveryScore` / `fluencyScore`를 `null`로 처리하여 리포트 콜백에 포함해야 한다.
- **FR-003**: FastAPI는 STT 실패 시 `errorCode: INTERVIEW_STT_FAILED` WebSocket 메시지를 클라이언트에 전송해야 한다.
- **FR-004**: FastAPI는 텍스트 답변 저장 완료 트리거를 수신하면 LLM으로 다음 질문을 생성해야 한다.
- **FR-005**: FastAPI는 LLM 질문 생성 시 이전 답변 이력과 RAG 컨텍스트(있는 경우)를 반영해야 한다.
- **FR-006**: FastAPI는 LLM 응답 타임아웃 시 미리 정의된 폴백 질문을 사용해야 한다.
- **FR-007**: FastAPI는 LLM이 생성한 질문 텍스트를 TTS로 변환하여 클라이언트에 오디오 스트리밍해야 한다.
- **FR-008**: FastAPI는 TTS 실패 시 텍스트 질문만 전달하고 클라이언트가 대체 UI를 표시할 수 있도록 해야 한다.
- **FR-009**: FastAPI는 Spring의 리포트 생성 트리거 수신 시 전체 답변을 분석하여 질문별 4개 역량 지표와 종합 점수를 산출해야 한다.
- **FR-010**: FastAPI는 리포트 완료 후 `POST /internal/api/v1/interview/callback/{sessionId}/report`를 `X-Internal-Secret` 헤더와 함께 Spring에 호출해야 한다.
- **FR-011**: FastAPI는 Spring 콜백 실패 시 최소 1회 재시도하고 최종 실패 시 오류를 기록해야 한다.
- **FR-012**: FastAPI는 `documentId`가 있는 세션의 RAG 컨텍스트 등록 요청을 비동기로 처리해야 한다.
- **FR-013**: FastAPI는 WebSocket 연결 요청에서 `sessionId` 소유권을 검증해야 한다 (Spring에서 발급한 토큰 기반).
- **FR-014**: FastAPI는 AI 파이프라인 처리 실패 시 `errorCode: INTERVIEW_AI_PIPELINE_ERROR` WebSocket 메시지를 전송해야 한다.
- **FR-015**: FastAPI는 세션별 AI 사용 토큰과 비용을 사용 로그로 적재해야 한다.
- **FR-016**: FastAPI는 다음 질문 순서가 10을 초과하면 LLM 질문 생성 없이 `report_pipeline.generate_and_send_report()`를 직접 호출하여 리포트 생성을 자동 트리거해야 한다. 최대 질문 수는 10개.
- **FR-017**: FastAPI는 LLM 질문 생성 시 `focusType`이 있으면 기존 `interviewType` 시스템 프롬프트 뒤에 집중 목표 오버레이(`get_focus_overlay`)를 append하여 질문 방향을 조정해야 한다. 지원 값: `FOLLOW_UP` \| `TECHNICAL_DEPTH` \| `DELIVERY` \| `FLUENCY`.
- **FR-018**: FastAPI는 LLM 질문 생성 시 `targetCompany`가 있으면 `interviewType` 프롬프트 뒤, `focusType` 오버레이 앞에 기업 맞춤 오버레이(`get_company_overlay`)를 append하여 해당 기업 인재상·기술 스택을 반영한 질문을 생성해야 한다. 기업 정보가 불확실한 경우 일반 질문으로 대체한다.

### Non-functional Requirements

- **NFR-001**: STT 변환 지연은 청크 수신 후 3초 이내를 목표로 한다.
- **NFR-002**: LLM 질문 생성 타임아웃은 10초이며, 초과 시 폴백 질문으로 대체한다.
- **NFR-003**: TTS 스트리밍은 문장 단위로 순차 전송하여 첫 오디오 시작 지연을 최소화한다.
- **NFR-004**: FastAPI WebSocket 연결은 세션별 1개만 허용하며, 중복 연결 시 이전 연결을 종료한다.
- **NFR-005**: Spring 콜백 재시도는 지수 백오프(1초, 3초)를 적용한다.

### Key Entities (FastAPI 관점)

- **InterviewSession**: `sessionId`, `memberId`, `documentId`, `sessionType`, `sessionStatus` — FastAPI가 읽기 전용으로 참조
- **InterviewMessage**: FastAPI가 AI 질문을 Spring 경유로 저장 (Spring이 DB 쓰기 담당)
- **AIInterviewFeedback**: FastAPI가 리포트 콜백으로 Spring에 전달, Spring이 DB 저장
- **CareerHistory**: FastAPI 콜백 수신 후 Spring이 생성 (FastAPI DB 직접 접근 금지)

---

## Edge Cases

- **음성 청크 순서 불일치**: `chunkIndex` 기반 순서로 재조립. 청크 누락 시 1회 재전송 요청, 실패 시 `INTERVIEW_STT_FAILED` 처리.
- **LLM 컨텍스트 초과**: 대화 이력이 LLM 컨텍스트 한도를 초과하면 최근 N개 답변만 포함하여 요청.
- **RAG 등록 실패**: RAG 등록이 실패해도 세션을 중단하지 않고 일반 면접 모드로 진행하며 오류를 로깅한다.
- **AI 파이프라인 중간 실패**: STT는 성공했지만 LLM이 실패한 경우, 폴백 질문으로 대체하고 계속 진행.
- **Spring 콜백 최종 실패**: 재시도 소진 후에도 Spring에 콜백 전달 실패 시, FastAPI는 `log.error`를 기록하고 별도 데드레터 처리 방안을 모니터링한다.
- **세션 타임아웃 중 파이프라인 실행**: Spring 스케줄러가 세션을 `FAILED`로 처리한 후 FastAPI 파이프라인이 실행되는 경우, FastAPI는 콜백 실패(Spring이 409 반환)를 오류 로깅만 하고 종료한다.

---

## Success Criteria

- **SC-001**: 음성 면접 전체 플로우 — 청크 수신 → STT → TTS → LLM 질문 → 클라이언트 전달이 오류 없이 완주된다.
- **SC-002**: `voiceQualityRatio < 50.00`인 항목의 `deliveryScore` / `fluencyScore`가 Spring 콜백에서 `null`로 전달된다.
- **SC-003**: 리포트 생성 트리거 후 Spring 콜백이 성공적으로 전달되고, Spring WebSocket에서 `REPORT_READY`가 클라이언트에 도달한다.
- **SC-004**: LLM 타임아웃 시 폴백 질문이 10초 이내에 클라이언트에 도달한다.
- **SC-005**: Spring 콜백 실패 시 재시도 1회 이상이 실행되고 최종 실패 시 `log.error`가 기록된다.
- **SC-006**: RAG 있는 세션에서 LLM 질문이 서류 내용을 반영하여 생성된다.

---

## Assumptions

- FastAPI는 Spring Boot의 내부 트리거 및 WebSocket 연결만 처리한다. 프론트엔드의 직접 HTTP REST 호출을 처리 대상으로 간주하지 않는다.
- FastAPI WebSocket(`/ws/user/interview/{sessionId}/ai`)은 클라이언트가 직접 연결하며, STT 결과·LLM 질문·TTS 오디오를 수신한다.
- 음성 면접에서 실제 면접관 역할(질문 생성, STT, TTS)은 FastAPI가 전담하며 Spring은 결과 저장만 담당한다.
- `voiceQualityRatio` 계산 알고리즘은 FastAPI가 STT 엔진의 confidence 값을 기반으로 산정한다.
- FastAPI는 DB를 직접 읽거나 쓰지 않고 Spring과의 내부 API 계약을 통해서만 데이터를 교환한다.
- LLM 폴백 질문 목록은 `fastapi/user/prompts/` 하위 파일로 관리한다.
- 인증 토큰 검증 방식은 Spring과 공유한 시크릿 키 기반 JWT 검증을 사용한다.

---

## 6. 구현 유의사항

### Graceful Shutdown

`asyncio.create_task`로 실행된 STT·LLM·TTS·리포트 파이프라인 태스크는 서버가 갑자기 종료되면 중단된다.  
`lifespan` 이벤트의 shutdown 단계에서 실행 중인 태스크를 최대 10~20초 대기(`asyncio.gather` + timeout)한 뒤 종료한다.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # shutdown: 진행 중인 파이프라인 태스크 우아하게 종료
    pending = [t for t in asyncio.all_tasks() if not t.done()]
    if pending:
        await asyncio.wait(pending, timeout=15)
```

### `voiceQualityRatio` 임계치 환경 변수화

`50.00` 임계치를 `core/config.py`의 `Settings`에 환경 변수로 분리한다.  
코드 수정 없이 환경 변수 튜닝만으로 임계치를 조정할 수 있다.

```python
class Settings(BaseSettings):
    voice_quality_threshold: float = 50.0   # VOICE_QUALITY_THRESHOLD 환경 변수로 오버라이드 가능
```

### WebSocket 에러 코드 Enum 중앙화

에러 코드를 `Enum` 클래스로 정의하여 `send_error` 헬퍼에서 타입 체킹을 강제한다.  
오타로 인한 버그를 컴파일 타임에 차단한다.

```python
from enum import Enum

class InterviewErrorCode(str, Enum):
    AI_PIPELINE_ERROR = "INTERVIEW_AI_PIPELINE_ERROR"
    STT_FAILED        = "INTERVIEW_STT_FAILED"
    TTS_FAILED        = "INTERVIEW_TTS_FAILED"
    LLM_FAILED        = "INTERVIEW_LLM_FAILED"
    SESSION_EXPIRED   = "INTERVIEW_SESSION_EXPIRED"
    CALLBACK_FAILED   = "INTERVIEW_CALLBACK_FAILED"
```

### STT 청크 누적 방식

Whisper는 스트리밍 API를 지원하지 않아, 청크를 수신할 때마다 Whisper를 호출하면 부분 WebM 포맷 오류가 발생한다.  
세션별, 질문 순서별 버퍼(`_audio_buffers: dict[str, dict[int, list[bytes]]]`)에 청크를 누적하고 `isFinal=true` 시 병합하여 일괄 전송한다.

```python
_audio_buffers: dict[str, dict[int, list[bytes]]] = defaultdict(lambda: defaultdict(list))

async def transcribe_chunk(audio_bytes, session_id, question_order, chunk_index, is_final):
    _audio_buffers[session_id][question_order].append(audio_bytes)
    if not is_final:
        return  # 중간 청크: 누적만 함
    merged = b"".join(_audio_buffers[session_id].pop(question_order, []))
    # Whisper 일괄 전송
```
