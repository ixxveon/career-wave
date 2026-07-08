# Tasks: FastAPI User Interview

> Phase별 구현 체크리스트.  
> 관련 문서: `fastapi-plan.md` / `fastapi-spec.md` / `fastapi-schema.md`

---

## Phase 1 — 프로젝트 구조 & 설정

- [x] `fastapi/core/config.py` 생성
  - [x] `pydantic-settings BaseSettings` 기반 환경 변수 정의
  - [x] `SPRING_BASE_URL`, `WEBHOOK_SECRET`, `JWT_SECRET` 필드
  - [x] `OPENAI_API_KEY`, `OPENAI_MODEL_INTERVIEW`, `OPENAI_MODEL_STT`, `OPENAI_MODEL_TTS`, `OPENAI_TTS_VOICE` 필드
  - [x] `OPENAI_LLM_TIMEOUT_SECONDS: int = 10` 기본값 설정
- [x] `fastapi/core/spring_client.py` 생성
  - [x] `httpx.AsyncClient` 기반 Spring 내부 API 클라이언트
  - [x] `send_report_callback(session_id, payload)` — 지수 백오프 재시도 (최대 3회)
  - [x] 최종 실패 시 `log.error` 기록
- [x] `fastapi/.env.example` 업데이트 — 면접 관련 환경 변수 항목 추가
- [x] `fastapi/user/api/interview_router.py` 기본 파일 생성
- [x] `fastapi/user/pipeline/` 디렉터리 생성
- [x] `fastapi/main.py` — 면접 라우터 import 및 등록 (lifespan Graceful Shutdown으로 마이그레이션)

---

## Phase 2 — WebSocket 핸들러

- [x] `fastapi/user/websocket/interview_ws_handler.py` 생성
  - [x] `WS /ws/user/interview/{sessionId}/ai` 엔드포인트 정의
  - [x] JWT 토큰 검증 (`?token=`) — 실패 시 Close 1008
  - [x] `sessionId` 세션 저장 및 중복 연결 시 이전 연결 종료
    - [x] 교체 직전 기존 소켓에 `{"type": "ERROR", "errorCode": "INTERVIEW_DUPLICATED_CONNECTION"}` 전송 후 `close(code=1000)` 호출 — 클라이언트가 종료 이유를 수신할 수 있도록 보장
  - [x] 세션별 WebSocket 저장: `active_sessions: dict[str, WebSocket]`
  - [x] 메시지 전송 헬퍼 구현
    - [x] `send_stt_partial(session_id, content, question_order, chunk_index)` — (현재 STT 청크 누적 방식으로 미전송)
    - [x] `send_stt_final(session_id, content, question_order, voice_quality_ratio)`
    - [x] `send_tts_audio(session_id, audio_data, question_order, chunk_index, is_final)`
    - [x] `send_error(session_id, content, error_code, question_order)`
- [x] `fastapi/main.py` — WebSocket 핸들러 라우터 등록

---

## Phase 3 — STT 파이프라인

- [x] `fastapi/user/pipeline/stt_pipeline.py` 생성
  - [x] `transcribe_chunk(audio_bytes, session_id, question_order, chunk_index, is_final)` — 청크를 세션별 버퍼에 누적, `is_final=True` 시 합쳐서 Whisper 일괄 호출
  - [x] `calculate_voice_quality_ratio(whisper_response)` — `no_speech_prob` 기반 산정
  - [x] `should_mask_scores(voice_quality_ratio)` — `voiceQualityRatio < 50.00` 판단
  - [x] STT 실패 시 `INTERVIEW_STT_FAILED` WebSocket 메시지 전송
- [x] `fastapi/user/api/interview_router.py` 업데이트
  - [x] `POST /internal/user/interview/sessions/{sessionId}/trigger/voice-chunk` 라우터
  - [x] multipart 파일(`audioChunk`) + 파라미터(`questionOrder`, `chunkIndex`, `isFinal`) 바인딩
  - [x] `asyncio.create_task`로 STT 파이프라인 비동기 실행
  - [x] `X-Internal-Secret` 헤더 검증

---

## Phase 4 — LLM 질문 생성 & TTS

- [x] `fastapi/user/interview/prompts/interview_prompts.py` 생성
  - [x] 시스템 프롬프트 (면접 유형별: `TECHNICAL` / `PERSONALITY` / `PROJECT` / 기본)
  - [x] 폴백 질문 목록 (각 유형 최소 5개)
  - [x] RAG 컨텍스트 주입 프롬프트 템플릿
  - [x] 꼬리 질문·압박 질문 생성 가이드라인 프롬프트
- [x] `fastapi/user/interview/pipeline/llm_pipeline.py` 생성
  - [x] `generate_and_deliver_question(session_id, question_order, answer_text, question_text)` — GPT-4o 호출 후 Spring 전달
  - [x] `next_question_order > 10` 시 LLM 생성 없이 `report_pipeline.generate_and_send_report()` 직접 호출 (최대 질문 수: 10개)
  - [x] 이전 답변 이력 컨텍스트 조합 로직 (최근 10개)
  - [x] `asyncio.wait_for`로 LLM 타임아웃 처리 (`OPENAI_LLM_TIMEOUT_SECONDS`)
  - [x] 타임아웃 시 폴백 질문 반환
  - [x] 세션별 `used_fallback_questions: set[str]` 메모리로 이미 사용한 폴백 질문 추적 — 중복 폴백 질문 재출제 방지
  - [x] LLM 실패 시 `INTERVIEW_LLM_FAILED` WebSocket 메시지 전송
- [x] `fastapi/user/interview/pipeline/tts_pipeline.py` 생성
  - [x] `synthesize_and_stream(text, session_id, question_order)` — OpenAI TTS 스트리밍 + WebSocket 전송
  - [x] `TTS_AUDIO` 청크 순차 전송
  - [x] 전송 완료 시 `TTS_AUDIO_END` 전송
  - [x] TTS 실패 시 텍스트 질문만 전달 + `INTERVIEW_TTS_FAILED` 전송
- [x] `fastapi/user/interview/api/interview_router.py` 업데이트
  - [x] `POST /internal/user/interview/sessions/{sessionId}/trigger/text-answer` 라우터
  - [x] `POST /internal/user/interview/sessions/{sessionId}/rag-context` 라우터

---

## Phase 5 — 리포트 생성 파이프라인

- [x] `fastapi/user/interview/prompts/report_prompts.py` 생성
  - [x] 리포트 분석 시스템 프롬프트 (4개 역량 지표: Relevance·Depth·Delivery·Fluency)
  - [x] `totalScore` 산출 기준 및 가중치 프롬프트
  - [x] 질문별 `aiFeedback` 생성 프롬프트
- [x] `fastapi/user/interview/pipeline/report_pipeline.py` 생성
  - [x] `generate_and_send_report(session_id, session_type)` — GPT-4o 리포트 분석 후 Spring 콜백
  - [x] `voiceQualityRatio < 50.00` 항목의 `deliveryScore` / `fluencyScore` null 처리
  - [x] `voiceQualityRatio is None` 항목의 `deliveryScore` / `fluencyScore` null 처리 (텍스트 면접)
  - [x] `totalScore` 계산 및 피드백 직렬화
  - [x] 리포트 생성 실패 시 빈 feedbacks + `totalScore: null` 부분 콜백 전송
- [x] `fastapi/core/spring_client.py` — Phase 1에서 이미 완성 (지수 백오프, duplicated 처리)
- [x] `fastapi/user/interview/api/interview_router.py` 업데이트
  - [x] `POST /internal/user/interview/sessions/{sessionId}/trigger/report` 라우터

---

## Phase 6 — 테스트 & 통합 검증

- [x] `fastapi/` pytest 테스트 파일 작성
  - [x] `test_stt_pipeline.py`
    - [x] `voiceQualityRatio = 49.99` → `deliveryScore` / `fluencyScore` null 처리 확인
    - [x] `voiceQualityRatio = 50.00` → 점수 정상값 유지 확인
    - [x] STT 실패 시 `INTERVIEW_STT_FAILED` WebSocket 메시지 전송 확인
  - [x] `test_llm_pipeline.py`
    - [x] LLM 타임아웃 → 폴백 질문 반환 확인
    - [x] RAG 컨텍스트 포함 시 프롬프트 조합 확인
  - [x] `test_report_pipeline.py`
    - [x] 리포트 생성 후 콜백 페이로드 구조 검증
    - [x] 텍스트 면접 시 `voiceQualityRatio: null`, `deliveryScore: null` 확인
  - [x] `test_spring_client.py`
    - [x] 콜백 성공 1회 테스트
    - [x] 콜백 2회 실패 → 3차 시도 성공 테스트 (httpx mock)
    - [x] 최종 실패 시 `log.error` 호출 확인
  - [x] `test_ws_handler.py`
    - [x] JWT 검증 실패 → Close 1008 확인
    - [x] 중복 연결 시 이전 연결 종료 확인
- [x] `python -m pytest fastapi/` 전체 통과 확인
- [x] Spring BE 연동 E2E: 텍스트 면접 전체 플로우 확인 (Q1~Q10, 자동 리포트 트리거 포함)
- [ ] Spring BE 연동 E2E: 음성 면접 전체 플로우 확인

---

## Phase 7 — Redis 기반 세션 상태 저장소 (v2, 브랜치: `feat/952-redis-session-store`)

> 관련 이슈: #952, #802 / Scale-out 대비 in-process dict → Redis 전환

- [x] `fastapi/requirements.txt` — `redis[asyncio]==5.0.8` 추가
- [x] `fastapi/core/config.py` — `redis_url`, `redis_session_ttl_seconds`, `redis_rate_limit_ttl_seconds` 환경 변수 추가
- [x] `fastapi/core/redis.py` 생성
  - [x] 비동기 Redis 클라이언트 싱글톤 (`get_redis` / `close_redis`)
- [x] `fastapi/user/interview/store/session_store.py` 생성
  - [x] `save_session_meta` / `load_session_meta` / `delete_session` / `refresh_session_ttl` — Redis Hash
  - [x] `increment_seq` / `get_seq` / `set_seq` — Redis INCR (원자적 seq 증가)
  - [x] `push_to_buffer` / `get_buffer` — Redis List (최근 50개)
  - [x] `save_pending_llm` / `pop_pending_llm` / `has_pending_llm` — WS 연결 전 도착한 LLM trigger 보관
  - [x] `rate_limit_check_and_record` — Redis Sorted Set 슬라이딩 윈도우 rate limit
  - [x] Redis 장애 정책: 허용(false-negative) 방향 fallback
- [x] `fastapi/core/rate_limit.py` 업데이트
  - [x] `is_rate_limited(redis, session_id, …)` 비동기 함수 추가 (session_store 위임)
  - [x] 기존 `SessionRateLimiter` (in-process) 하위 호환 유지
- [x] `fastapi/user/interview/websocket/interview_ws_handler.py` 리팩터링
  - [x] `_SessionContext` / `_sessions` / `_pending_llm` 제거
  - [x] `_LiveSession` (WS + member_id + token_exp만 인프로세스 유지)
  - [x] 연결 시 `load_session_meta` → 재연결 seq 계승 / 신규 세션 초기화
  - [x] `_push()` → `increment_seq` + `push_to_buffer` (Redis 장애 시 `_local_seq` fallback)
  - [x] `get_session_meta` / `update_session_meta` / `is_session_live` 헬퍼 노출
  - [x] WS 연결 전 도착한 LLM trigger: `pop_pending_llm`으로 flush
  - [x] 재연결 시 `get_buffer`로 미전달 메시지 재전송 (`lastReceivedSequenceNumber` 기준)
  - [x] Spring 검증 실패 + Redis 메타 있는 재연결 → false-negative 허용 fallback
- [x] `fastapi/user/interview/pipeline/llm_pipeline.py` 리팩터링
  - [x] `_SessionContext` → `dict[str, Any]` (get_session_meta 기반)
  - [x] 모든 내부 함수 signature `meta: dict[str, Any]`로 변경
  - [x] 변경된 메타 (`answer_history`, `recent_answer_quality`, `used_fallback_questions`) `update_session_meta`로 저장
- [x] `fastapi/user/interview/pipeline/stt_pipeline.py` 리팩터링
  - [x] `_sessions` → `get_session_meta` (member_id 캡처)
  - [x] `ctx.voice_quality_by_order` → `update_session_meta` 저장
- [x] `fastapi/user/interview/pipeline/tts_pipeline.py` 리팩터링
  - [x] `_sessions` → `get_session_meta` (member_id 캡처) + `is_session_live` (스트리밍 중단 체크)
- [x] `fastapi/user/interview/pipeline/report_pipeline.py` 리팩터링
  - [x] `_sessions` → `get_session_meta` (answer_history, voice_quality_by_order, member_id)
- [x] `fastapi/user/interview/api/interview_router.py` 리팩터링
  - [x] `_sessions` → `is_session_live` / `_pending_llm` → `session_store.save_pending_llm` (Redis)
  - [x] RAG context → `update_session_meta` (WS 연결 없이도 저장 가능)
- [x] 테스트 전면 리팩터링
  - [x] `conftest.py` — `make_meta()` 헬퍼, `REDIS_URL` 환경변수 추가
  - [x] `test_ws_handler.py` — `_LiveSession` / `_live_sessions` 기반, `increment_seq` / `push_to_buffer` mock
  - [x] `test_stt_pipeline.py` — `get_session_meta` / `update_session_meta` mock
  - [x] `test_llm_pipeline.py` — `make_meta()` dict 기반 폴백 / RAG 테스트
  - [x] `test_report_pipeline.py` — `get_session_meta` mock
- [x] `python -m pytest fastapi/` 전체 통과 확인 (186개)
