# FastAPI Plan: User Interview

**Feature Branch**: `feature/user-interview-fastapi`  
**Status**: 구현 예정  
**관련 문서**: `specs/backend/user/interview/plan.md` / `specs/fastapi/user/interview/fastapi-spec.md`

---

## 브랜치 전략

| 순서 | 브랜치명 | 작업 내용 | 대응 Phase |
|------|---------|----------|-----------|
| 1 | `feature/user-interview-fastapi-setup` | 프로젝트 구조·환경 변수·core 설정·Spring 클라이언트 기반 공사 | Phase 1·2 |
| 2 | `feature/user-interview-fastapi-stt` | STT 파이프라인·음성 청크 수신 라우터·WebSocket 핸들러 | Phase 3 |
| 3 | `feature/user-interview-fastapi-llm` | LLM 질문 생성·RAG 컨텍스트 주입·폴백 질문·TTS 파이프라인 | Phase 4 |
| 4 | `feature/user-interview-fastapi-report` | 리포트 생성 파이프라인·Spring 콜백·재시도 로직 | Phase 5 |
| 5 | `feature/user-interview-fastapi-qa` | 통합 테스트·WebSocket E2E·Swagger 문서화 | Phase 6 |

### 브랜치 의존 관계

```
fastapi-setup
  └─▶ fastapi-stt
        └─▶ fastapi-llm
              └─▶ fastapi-report
                    └─▶ fastapi-qa
```

---

## Summary

FastAPI가 음성/텍스트 면접에서 AI 파이프라인(STT·LLM·TTS) 전담 서버 역할을 수행한다.  
Spring Boot는 세션 생명주기와 DB 저장을 담당하고, FastAPI는 AI 처리 결과를 WebSocket으로 클라이언트에 직접 전달한다.  
면접 완료 후 리포트를 생성하여 Spring Boot에 콜백으로 전달한다.

---

## Technical Context

| 분류 | 선택 | 근거 |
|------|------|------|
| STT 엔진 | OpenAI Whisper (`whisper-1`) | 기존 `openai` 라이브러리 사용 (requirements.txt 기존 의존성) |
| LLM | OpenAI GPT-4o (`gpt-4o`) | 복잡한 꼬리 질문 생성·리포트 분석 — `OPENAI_MODEL_INTERVIEW` |
| TTS | OpenAI TTS (`tts-1`) | 동일 OpenAI SDK 내 지원, 낮은 지연 |
| RAG | LangChain (`langchain==0.2.0`) | 기존 의존성, 벡터 검색 추상화 |
| 벡터 스토어 | LangChain 추상 클라이언트 | MVP는 인메모리 또는 파일 기반, 추후 교체 가능 |
| WebSocket 서버 | FastAPI + `websockets==12.0` | 기존 의존성 |
| HTTP 클라이언트 | `httpx==0.27.0` | Spring 내부 API 호출 (비동기 지원) |
| 설정 관리 | `pydantic-settings==2.3.0` | 환경 변수 타입 안전 접근 |

### 전제 조건 및 협의 사항

- `WEBHOOK_SECRET` 환경 변수는 Spring과 동일한 값을 공유한다.
- `JWT_SECRET` 환경 변수는 Spring과 동일한 값을 공유하여 FastAPI WebSocket 연결 시 토큰 검증에 사용한다.
- FastAPI WebSocket 포트는 Spring과 분리된 독립 포트(`8001`)를 사용한다.
- 폴백 질문 목록은 `fastapi/user/prompts/interview_prompts.py`에 도메인·유형별로 관리한다.

---

## 환경 변수 전략

`fastapi/core/config.py`에서 `pydantic-settings` `BaseSettings`로 환경 변수를 읽는다.

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    spring_base_url: str
    webhook_secret: str
    openai_api_key: str
    openai_model_interview: str = "gpt-4o"
    openai_model_stt: str = "whisper-1"
    openai_model_tts: str = "tts-1"
    openai_tts_voice: str = "alloy"
    openai_llm_timeout_seconds: int = 10
    jwt_secret: str

    class Config:
        env_file = ".env"

settings = Settings()
```

환경 변수는 `.env`에만 관리하며 코드에 하드코딩하지 않는다.

---

## 개발 전략

### 1. 스텁 우선

Spring BE 구현 전에 FastAPI 파이프라인을 먼저 스텁으로 구현한다.  
실제 OpenAI 호출 없이 모의 응답으로 WebSocket 메시지 흐름을 검증한다.

```python
# 스텁 예시 — 실제 STT 전 동작 검증용
async def stt_stub(audio_chunk: bytes) -> str:
    return "스텁 STT 결과입니다."
```

### 2. 파이프라인 독립 테스트

각 파이프라인(STT·LLM·TTS·리포트)을 독립 단위로 pytest로 검증한다.  
Spring과의 통합 테스트는 Phase 6에서 수행한다.

### 3. 로그 전략

Spring 연동 포인트마다 구조화된 로그를 남긴다.

```python
import logging
log = logging.getLogger(__name__)

log.info("STT pipeline triggered: sessionId=%s, chunkIndex=%d", session_id, chunk_index)
log.info("LLM question generated: sessionId=%s, questionOrder=%d", session_id, question_order)
log.info("Report generation started: sessionId=%s", session_id)
log.info("Spring callback sent: sessionId=%s, totalScore=%d", session_id, total_score)
log.warning("Spring callback retry: sessionId=%s, attempt=%d", session_id, attempt)
log.error("Spring callback failed after all retries: sessionId=%s", session_id)
```

---

## Phases

### Phase 1 — 프로젝트 구조 & 설정

- [ ] `fastapi/core/config.py` — `pydantic-settings` 기반 환경 변수 설정
- [ ] `fastapi/core/spring_client.py` — `httpx.AsyncClient` 기반 Spring 내부 API 클라이언트
  - [ ] `trigger_llm_pipeline(session_id, payload)` 스텁
  - [ ] `send_report_callback(session_id, payload)` + 재시도 로직
- [ ] `fastapi/.env.example` — 면접 도메인 환경 변수 추가
  - [ ] `WEBHOOK_SECRET`, `JWT_SECRET`, `OPENAI_MODEL_INTERVIEW`, `OPENAI_MODEL_STT`, `OPENAI_MODEL_TTS` 등

### Phase 2 — WebSocket 핸들러 기반 공사

- [ ] `fastapi/user/websocket/interview_ws_handler.py`
  - [ ] `WS /ws/user/interview/{sessionId}/ai` 엔드포인트 등록
  - [ ] 연결 시 JWT 토큰 검증 (Close 1008 처리)
  - [ ] `dict[str, WebSocket]` 세션별 WebSocket 관리
  - [ ] 신규 연결 수립 전, 동일 `sessionId` 키가 이미 존재하면 `await existing_ws.close(code=1000)` 호출로 이전 소켓을 안전하게 정리한 뒤 교체
  - [ ] 메시지 전송 헬퍼: `send_stt_partial`, `send_stt_final`, `send_tts_audio`, `send_error`
- [ ] `fastapi/main.py` — 면접 WebSocket 라우터 등록

### Phase 3 — STT 파이프라인

- [ ] `fastapi/user/pipeline/stt_pipeline.py`
  - [ ] `transcribe_chunk(audio_bytes, session_id, question_order, chunk_index)` — Whisper API 호출
  - [ ] `voiceQualityRatio` 산정 로직 (Whisper confidence 기반)
  - [ ] `deliveryScore` / `fluencyScore` null 조건 처리 (`voiceQualityRatio < 50.00`)
  - [ ] STT 실패 시 WebSocket `INTERVIEW_STT_FAILED` 전송
- [ ] `fastapi/user/api/interview_router.py`
  - [ ] `POST /internal/user/interview/sessions/{sessionId}/trigger/voice-chunk` 라우터
  - [ ] multipart 파일 + 파라미터 바인딩
  - [ ] 비동기 STT 파이프라인 실행 (`asyncio.create_task`)

### Phase 4 — LLM 질문 생성 & TTS 파이프라인

- [ ] `fastapi/user/prompts/interview_prompts.py`
  - [ ] 시스템 프롬프트 (직무 유형별: TECHNICAL / PERSONALITY / PROJECT)
  - [ ] 모든 프롬프트에 `temperature` 고정값 명시 (예: `temperature=0.7`) — 응답 재현성 확보
  - [ ] 시스템 프롬프트에 "반드시 JSON 형식으로만 응답" 명시 — 예외적 텍스트 혼입 방지
  - [ ] 폴백 질문 목록 (최소 5개/유형)
  - [ ] RAG 컨텍스트 주입 프롬프트 템플릿
- [ ] `fastapi/user/pipeline/llm_pipeline.py`
  - [ ] `generate_next_question(session_id, question_order, answer_text, context)` — GPT-4o 호출 (`temperature` 고정)
  - [ ] LLM 응답 파싱 시 `json.JSONDecodeError` 포착 → "JSON 형식으로만 답변" 재요청 1회 후 최종 실패 시 폴백 전환
  - [ ] RAG 컨텍스트 벡터 검색 + 프롬프트 조합
  - [ ] 타임아웃(`OPENAI_LLM_TIMEOUT_SECONDS`) 처리 → 폴백 질문 대체
  - [ ] LLM 실패 시 WebSocket `INTERVIEW_LLM_FAILED` 전송
- [ ] `fastapi/user/pipeline/tts_pipeline.py`
  - [ ] `synthesize_and_stream(text, session_id, question_order)` — TTS API 호출 + WebSocket 스트리밍
  - [ ] 문장 단위 청크 스트리밍 (`TTS_AUDIO` → `TTS_AUDIO_END`)
  - [ ] TTS 실패 시 텍스트 질문만 전달 + `INTERVIEW_TTS_FAILED` 전송
- [ ] `fastapi/user/api/interview_router.py`
  - [ ] `POST /internal/user/interview/sessions/{sessionId}/trigger/text-answer` 라우터
  - [ ] `POST /internal/user/interview/sessions/{sessionId}/rag-context` 라우터

### Phase 5 — 리포트 생성 파이프라인

- [ ] `fastapi/user/prompts/report_prompts.py`
  - [ ] 리포트 분석 시스템 프롬프트 (4개 역량 지표 기준)
  - [ ] `totalScore` 산출 기준 프롬프트
- [ ] `fastapi/user/pipeline/report_pipeline.py`
  - [ ] `generate_report(session_id, session_type, feedbacks_input)` — GPT-4o 리포트 분석
  - [ ] `voiceQualityRatio < 50.00` 항목 `deliveryScore` / `fluencyScore` null 처리
  - [ ] `totalScore` 계산 (4개 지표 가중 평균)
  - [ ] 리포트 실패 시 Spring 콜백에 부분 데이터라도 전달 시도
- [ ] `fastapi/core/spring_client.py`
  - [ ] `send_report_callback(session_id, payload)` — 지수 백오프 재시도 (최대 3회)
  - [ ] 최종 실패 시 `log.error` 기록
- [ ] `fastapi/user/api/interview_router.py`
  - [ ] `POST /internal/user/interview/sessions/{sessionId}/trigger/report` 라우터

### Phase 6 — 통합 테스트 & 검증

- [ ] `fastapi/` 내 pytest 테스트 파일 작성
  - [ ] STT 파이프라인 단위 테스트 — `voiceQualityRatio < 50.00` null 처리 경계값 검증
  - [ ] LLM 타임아웃 → 폴백 전환 단위 테스트
  - [ ] 리포트 생성 → Spring 콜백 전송 단위 테스트
  - [ ] Spring 콜백 재시도 로직 단위 테스트 (httpx mock)
  - [ ] WebSocket 연결 JWT 검증 실패 (Close 1008) 테스트
- [ ] `python -m pytest fastapi/` 전체 통과 확인
- [ ] Spring BE 로컬 연동 E2E 검증 (텍스트 면접 + 음성 면접)

---

## 설계 결정

### A. STT 중간 결과 전송

Whisper는 스트리밍 API를 지원하지 않아 청크별로 처리 후 결과를 전송한다.  
`STT_PARTIAL`은 청크 단위 Whisper 결과, `STT_FINAL`은 `isFinal=true` 청크 처리 완료 시 전송한다.  
클라이언트는 `STT_PARTIAL`을 실시간 자막으로, `STT_FINAL`을 최종 답변 텍스트로 사용한다.

### B. `voiceQualityRatio` 산정 방식

Whisper `no_speech_prob` 값을 기반으로 산정한다:

```python
voice_quality_ratio = (1 - no_speech_prob) * 100  # 0.00~100.00
```

`voiceQualityRatio < 50.00`이면 해당 답변의 `deliveryScore` / `fluencyScore`를 `null`로 처리한다.

### C. 세션별 WebSocket 관리

```python
active_sessions: dict[str, WebSocket] = {}
```

`ConcurrentDict` 대신 단일 프로세스 내 `dict`로 관리한다.  
v1 단일 프로세스 환경에서는 충분하며, Scale-out 시 Redis Pub/Sub으로 전환을 고려한다.

### D. 리포트 생성 실패 시 처리

리포트 생성이 완전히 실패한 경우(LLM 응답 없음), FastAPI는 빈 feedbacks 배열과 `totalScore: null`로 Spring 콜백을 전송한다.  
Spring은 이를 수신하여 `REPORT_READY`(빈 리포트) 또는 `ERROR` WebSocket 메시지를 클라이언트에 전달한다.
