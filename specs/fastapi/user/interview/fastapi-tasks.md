# Tasks: FastAPI User Interview

> Phase별 구현 체크리스트.  
> 관련 문서: `fastapi-plan.md` / `fastapi-spec.md` / `fastapi-schema.md`

---

## Phase 1 — 프로젝트 구조 & 설정

- [ ] `fastapi/core/config.py` 생성
  - [ ] `pydantic-settings BaseSettings` 기반 환경 변수 정의
  - [ ] `SPRING_BASE_URL`, `WEBHOOK_SECRET`, `JWT_SECRET` 필드
  - [ ] `OPENAI_API_KEY`, `OPENAI_MODEL_INTERVIEW`, `OPENAI_MODEL_STT`, `OPENAI_MODEL_TTS`, `OPENAI_TTS_VOICE` 필드
  - [ ] `OPENAI_LLM_TIMEOUT_SECONDS: int = 10` 기본값 설정
- [ ] `fastapi/core/spring_client.py` 생성
  - [ ] `httpx.AsyncClient` 기반 Spring 내부 API 클라이언트
  - [ ] `send_report_callback(session_id, payload)` — 지수 백오프 재시도 (최대 3회)
  - [ ] 최종 실패 시 `log.error` 기록
- [ ] `fastapi/.env.example` 업데이트 — 면접 관련 환경 변수 항목 추가
- [ ] `fastapi/user/api/interview_router.py` 기본 파일 생성
- [ ] `fastapi/user/pipeline/` 디렉터리 생성
- [ ] `fastapi/main.py` — 면접 라우터 import 및 등록 주석 추가

---

## Phase 2 — WebSocket 핸들러

- [ ] `fastapi/user/websocket/interview_ws_handler.py` 생성
  - [ ] `WS /ws/user/interview/{sessionId}/ai` 엔드포인트 정의
  - [ ] JWT 토큰 검증 (`?token=`) — 실패 시 Close 1008
  - [ ] `sessionId` 세션 저장 및 중복 연결 시 이전 연결 종료
    - [ ] 교체 직전 기존 소켓에 `{"type": "ERROR", "errorCode": "INTERVIEW_DUPLICATED_CONNECTION"}` 전송 후 `close(code=1000)` 호출 — 클라이언트가 종료 이유를 수신할 수 있도록 보장
  - [ ] 세션별 WebSocket 저장: `active_sessions: dict[str, WebSocket]`
  - [ ] 메시지 전송 헬퍼 구현
    - [ ] `send_stt_partial(session_id, content, question_order, chunk_index)`
    - [ ] `send_stt_final(session_id, content, question_order, voice_quality_ratio)`
    - [ ] `send_tts_audio(session_id, audio_data, question_order, chunk_index, is_final)`
    - [ ] `send_error(session_id, content, error_code, question_order)`
- [ ] `fastapi/main.py` — WebSocket 핸들러 라우터 등록

---

## Phase 3 — STT 파이프라인

- [ ] `fastapi/user/pipeline/stt_pipeline.py` 생성
  - [ ] `transcribe_chunk(audio_bytes, session_id, question_order, chunk_index)` — OpenAI Whisper 호출
  - [ ] `calculate_voice_quality_ratio(whisper_response)` — `no_speech_prob` 기반 산정
  - [ ] `should_mask_scores(voice_quality_ratio)` — `voiceQualityRatio < 50.00` 판단
  - [ ] STT 실패 시 `INTERVIEW_STT_FAILED` WebSocket 메시지 전송
- [ ] `fastapi/user/api/interview_router.py` 업데이트
  - [ ] `POST /internal/user/interview/sessions/{sessionId}/trigger/voice-chunk` 라우터
  - [ ] multipart 파일(`audioChunk`) + 파라미터(`questionOrder`, `chunkIndex`, `isFinal`) 바인딩
  - [ ] `asyncio.create_task`로 STT 파이프라인 비동기 실행
  - [ ] `X-Internal-Secret` 헤더 검증

---

## Phase 4 — LLM 질문 생성 & TTS

- [ ] `fastapi/user/prompts/interview_prompts.py` 생성
  - [ ] 시스템 프롬프트 (면접 유형별: `TECHNICAL` / `PERSONALITY` / `PROJECT` / 기본)
  - [ ] 폴백 질문 목록 (각 유형 최소 5개)
  - [ ] RAG 컨텍스트 주입 프롬프트 템플릿
  - [ ] 꼬리 질문·압박 질문 생성 가이드라인 프롬프트
- [ ] `fastapi/user/pipeline/llm_pipeline.py` 생성
  - [ ] `generate_next_question(session_id, question_order, answer_text, rag_context, interview_type)` — GPT-4o 호출
  - [ ] 이전 답변 이력 컨텍스트 조합 로직
  - [ ] `asyncio.wait_for`로 LLM 타임아웃 처리 (`OPENAI_LLM_TIMEOUT_SECONDS`)
  - [ ] 타임아웃 시 폴백 질문 반환
  - [ ] 세션별 `used_fallback_questions: set[str]` 메모리로 이미 사용한 폴백 질문 추적 — 중복 폴백 질문 재출제 방지
  - [ ] LLM 실패 시 `INTERVIEW_LLM_FAILED` WebSocket 메시지 전송
- [ ] `fastapi/user/pipeline/tts_pipeline.py` 생성
  - [ ] `synthesize_and_stream(text, session_id, question_order)` — OpenAI TTS 호출 + WebSocket 스트리밍
  - [ ] 문장 단위 청크 분할 후 `TTS_AUDIO` 순차 전송
  - [ ] 전송 완료 시 `TTS_AUDIO_END` 전송
  - [ ] TTS 실패 시 텍스트 질문만 전달 + `INTERVIEW_TTS_FAILED` 전송
- [ ] `fastapi/user/api/interview_router.py` 업데이트
  - [ ] `POST /internal/user/interview/sessions/{sessionId}/trigger/text-answer` 라우터
  - [ ] `POST /internal/user/interview/sessions/{sessionId}/rag-context` 라우터

---

## Phase 5 — 리포트 생성 파이프라인

- [ ] `fastapi/user/prompts/report_prompts.py` 생성
  - [ ] 리포트 분석 시스템 프롬프트 (4개 역량 지표: Relevance·Depth·Delivery·Fluency)
  - [ ] `totalScore` 산출 기준 및 가중치 프롬프트
  - [ ] 질문별 `aiFeedback` 생성 프롬프트
- [ ] `fastapi/user/pipeline/report_pipeline.py` 생성
  - [ ] `generate_report(session_id, session_type, answer_records)` — GPT-4o 리포트 분석
  - [ ] `voiceQualityRatio < 50.00` 항목의 `deliveryScore` / `fluencyScore` null 처리
  - [ ] `voiceQualityRatio is None` 항목의 `deliveryScore` / `fluencyScore` null 처리 (텍스트 면접)
  - [ ] `totalScore` 계산 및 피드백 직렬화
  - [ ] 리포트 생성 실패 시 빈 feedbacks + `totalScore: null` 부분 콜백 전송
- [ ] `fastapi/core/spring_client.py` 업데이트
  - [ ] `send_report_callback` 지수 백오프 구현 (1초, 3초 대기)
  - [ ] 콜백 전송 직전 Pydantic 모델(`ReportCallbackPayload`)로 페이로드 유효성 검증 — 필수 필드 누락 시 Spring 전송 차단 및 `log.error` 기록
  - [ ] `duplicated: true` 응답 시 정상 처리 (중복 콜백 허용)
- [ ] `fastapi/user/api/interview_router.py` 업데이트
  - [ ] `POST /internal/user/interview/sessions/{sessionId}/trigger/report` 라우터

---

## Phase 6 — 테스트 & 통합 검증

- [ ] `fastapi/` pytest 테스트 파일 작성
  - [ ] `test_stt_pipeline.py`
    - [ ] `voiceQualityRatio = 49.99` → `deliveryScore` / `fluencyScore` null 처리 확인
    - [ ] `voiceQualityRatio = 50.00` → 점수 정상값 유지 확인
    - [ ] STT 실패 시 `INTERVIEW_STT_FAILED` WebSocket 메시지 전송 확인
  - [ ] `test_llm_pipeline.py`
    - [ ] LLM 타임아웃 → 폴백 질문 반환 확인
    - [ ] RAG 컨텍스트 포함 시 프롬프트 조합 확인
  - [ ] `test_report_pipeline.py`
    - [ ] 리포트 생성 후 콜백 페이로드 구조 검증
    - [ ] 텍스트 면접 시 `voiceQualityRatio: null`, `deliveryScore: null` 확인
  - [ ] `test_spring_client.py`
    - [ ] 콜백 성공 1회 테스트
    - [ ] 콜백 2회 실패 → 3차 시도 성공 테스트 (httpx mock)
    - [ ] 최종 실패 시 `log.error` 호출 확인
  - [ ] `test_ws_handler.py`
    - [ ] JWT 검증 실패 → Close 1008 확인
    - [ ] 중복 연결 시 이전 연결 종료 확인
- [ ] `python -m pytest fastapi/` 전체 통과 확인
- [ ] Spring BE 연동 E2E: 텍스트 면접 전체 플로우 확인
- [ ] Spring BE 연동 E2E: 음성 면접 전체 플로우 확인
