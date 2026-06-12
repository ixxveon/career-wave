# FastAPI Constitution: User Interview

**Feature Branch**: `feature/user-interview-fastapi`  
**Scope**: STT·LLM·TTS 파이프라인 / 리포트 생성 / Spring 콜백  
**관련 문서**: `specs/backend/user/interview/constitution.md`

---

## 1. 도메인 가치

- **AI 파이프라인 분리**: LLM·STT·TTS 처리는 FastAPI가 전담한다. Spring Boot는 이 처리 로직을 직접 구현하지 않는다.
- **데이터 신뢰도**: `voiceQualityRatio < 50.00`인 항목의 `deliveryScore` / `fluencyScore`는 FastAPI가 콜백 전송 전에 반드시 `null`로 처리한다. `0`으로 대체하지 않는다.
- **DB 분리 원칙**: FastAPI는 DB에 직접 접근하지 않는다. 모든 영속성은 Spring Boot가 담당한다.
- **신뢰성**: 리포트 콜백 전송은 재시도 로직을 포함하여 네트워크 오류로 인한 데이터 유실을 방지한다.
- **보안**: Spring과의 내부 통신은 `X-Internal-Secret` 헤더로 인증한다. 시크릿 값은 환경 변수로만 관리한다.

---

## 2. 상태 머신 (AI 파이프라인 관점)

FastAPI는 세션 상태를 직접 관리하지 않는다. Spring Boot가 `interview_sessions.session_status`를 관리하며, FastAPI는 `sessionId`만 사용한다.

### FastAPI 내부 파이프라인 흐름

```text
[IDLE]
  │── 음성 청크 수신 ──▶ [STT_PROCESSING] ──▶ [STT_DONE]
  │── 텍스트 답변 수신 ──▶ [LLM_PROCESSING] ──▶ [LLM_DONE] ──▶ [TTS_PROCESSING] ──▶ [TTS_DONE]
  │── 리포트 트리거 ──▶ [REPORT_GENERATING] ──▶ [CALLBACK_SENT]
```

- 각 단계의 실패는 해당 단계의 `ErrorCode` WebSocket 메시지로 클라이언트에 통보하고, 파이프라인을 폴백 또는 부분 처리로 계속 진행한다.
- FastAPI는 STT·LLM·TTS 실패 시에도 Spring에 세션 종료를 직접 요청하지 않는다. Spring이 세션 생명주기를 결정한다.

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| DB 접근 금지 | FastAPI는 DB에 직접 접근하지 않음 | 레이어 분리 원칙, Spring이 DB 쓰기 전담 |
| WebSocket 채널 분리 | FastAPI WS(`/ai`)는 STT·TTS·AI 오류, Spring WS(`/chat`)는 세션 이벤트 | 처리 책임 분리 |
| 점수 null 처리 위치 | FastAPI 파이프라인 계층에서 처리 후 콜백에 포함 | Spring이 수신한 값을 그대로 저장, 이중 처리 없음 |
| 콜백 재시도 | 지수 백오프 최대 3회 | 네트워크 일시 오류 대응 |
| LLM 타임아웃 | 10초 (`OPENAI_LLM_TIMEOUT_SECONDS`) 후 폴백 질문 | 클라이언트 대기 시간 최소화 |
| TTS 실패 처리 | 텍스트 질문만 전달하고 계속 진행 | TTS 실패로 면접 전체를 중단하지 않음 |
| 세션 WebSocket 관리 | 단일 프로세스 `dict[sessionId, WebSocket]` | v1 단일 서버 환경, Scale-out 시 Redis Pub/Sub 전환 |

---

## 4. 불변 규칙 (Invariants)

- **DB 직접 접근 금지**: FastAPI 코드에서 SQLAlchemy 또는 ORM을 통한 `interview_sessions` / `interview_messages` / `ai_interview_feedbacks` / `career_histories` 테이블 직접 접근을 금지한다.
- **점수 null 보장**: `voiceQualityRatio`가 `null`이거나 `50.00 미만`인 피드백의 `deliveryScore` / `fluencyScore`를 `null`로 콜백에 포함한다. `0`으로 대체하는 것을 금지한다.
- **재시도 상한**: Spring 콜백 재시도는 최대 3회를 초과하지 않는다. 재시도 초과 후 `log.error`로 기록하고 무한 재시도하지 않는다.
- **WebSocket 오류 전달 필수**: STT·LLM·TTS·리포트 파이프라인 오류 발생 시 반드시 해당 `errorCode`를 클라이언트 WebSocket으로 전송한다. 오류를 무시하고 연결을 유지하는 것을 금지한다.
- **시크릿 하드코딩 금지**: `WEBHOOK_SECRET`, `JWT_SECRET`, `OPENAI_API_KEY` 등 모든 시크릿 값은 환경 변수로만 관리한다.
- **내부 API 전용**: `POST /internal/user/interview/**` 라우터는 Spring Boot에서만 호출 가능해야 한다. IP 화이트리스트 또는 `X-Internal-Secret` 검증을 적용한다.

---

## 5. 연동 계약

- **Spring → FastAPI 트리거**: `POST /internal/user/interview/sessions/{sessionId}/trigger/**` 경로로 수신. `X-Internal-Secret` 헤더 검증 필수.
- **FastAPI → Spring 콜백**: `POST /internal/api/v1/interview/callback/{sessionId}/report`로 리포트 완료 통보. `X-Internal-Secret` 헤더 포함 필수.
- **FastAPI → 클라이언트 WebSocket**: `WS /ws/user/interview/{sessionId}/ai`로 STT·TTS·AI 오류 실시간 전달.
- **Spring → 클라이언트 WebSocket**: `WS /ws/user/interview/{sessionId}/chat`으로 세션 이벤트·AI 질문 전달. FastAPI가 이 채널에 직접 메시지를 전송하지 않는다.

> LLM이 생성한 다음 질문을 클라이언트 Spring WebSocket 채널로 전달하는 방식은 Spring 내부 API를 통해 수행한다.  
> FastAPI가 Spring WebSocket에 직접 접근하는 것을 금지한다.

---

## 6. 금지 패턴

- FastAPI 코드에서 DB(PostgreSQL)에 직접 접근하는 것을 금지한다.
- `voiceQualityRatio < 50.00` 항목의 `deliveryScore` / `fluencyScore`를 `0`으로 반환하는 것을 금지한다.
- `WEBHOOK_SECRET` / `JWT_SECRET` / `OPENAI_API_KEY`를 소스 코드에 하드코딩하는 것을 금지한다.
- 무한 재시도 루프를 구현하는 것을 금지한다. 재시도는 최대 3회로 제한한다.
- FastAPI 라우터에 AI 파이프라인 비즈니스 로직을 직접 작성하는 것을 금지한다. `pipeline/` 계층으로 분리한다.
- FastAPI WebSocket(`/ai`)에서 Spring WebSocket(`/chat`) 이벤트를 대신 전송하는 것을 금지한다. 채널 역할을 혼재하지 않는다.
- 환경 변수를 `os.environ.get()` 직접 호출로 읽는 것을 금지한다. `core/config.py`의 `settings` 객체를 통해서만 접근한다.

---

## 7. 이 명세서가 보장하는 것

| 속성 | 보장 내용 |
|------|-----------|
| **AI 파이프라인 분리** | STT·LLM·TTS 처리는 FastAPI만 담당하며, Spring Boot에 AI 로직이 포함되지 않는다. |
| **데이터 신뢰도** | `voiceQualityRatio < 50.00` 조건부 null 처리를 FastAPI가 수행하여 신뢰할 수 없는 음성 지표를 콜백 단계에서 차단한다. |
| **신뢰성** | Spring 콜백 재시도와 오류 로깅으로 리포트 데이터 유실을 최소화한다. |
| **보안** | `X-Internal-Secret` 헤더 기반 내부 API 인증으로 외부에서의 리포트 콜백 위조를 방어한다. |
| **확장성** | WebSocket 세션 관리와 벡터 스토어 구현체를 추상화하여 Scale-out 시 Redis Pub/Sub 전환이 가능하다. |
