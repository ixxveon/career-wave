# Checklist: FastAPI User Interview

> `fastapi-spec.md`가 "무엇을 만들지"라면, 이 파일은 "제대로 만들어졌는지" 검증한다.  
> 구현 완료 후 이 체크리스트를 모두 통과해야 PR을 올린다.

---

## Phase 1 — 설정 & 구조

- [x] `fastapi/core/config.py`에서 `pydantic-settings BaseSettings`로 환경 변수를 읽는다 (`os.environ.get()` 직접 호출 없음).
- [x] `logging.LoggerAdapter`를 사용한 세션별 로거가 구현되어 있으며, 모든 파이프라인 로그에 `[Session: {sessionId}]` 컨텍스트가 자동으로 포함된다 (로깅 코드마다 `sessionId`를 수동으로 전달하지 않음).
- [x] `WEBHOOK_SECRET`, `JWT_SECRET`, `OPENAI_API_KEY` 값이 소스 코드에 하드코딩되지 않았다.
- [x] `.env.example`에 면접 도메인 환경 변수 (`WEBHOOK_SECRET`, `JWT_SECRET`, `OPENAI_MODEL_INTERVIEW`, `OPENAI_MODEL_STT`, `OPENAI_MODEL_TTS`, `OPENAI_TTS_VOICE`, `OPENAI_LLM_TIMEOUT_SECONDS`)가 명시되어 있다.
- [x] `fastapi/user/api/interview_router.py`에 비즈니스 로직이 직접 작성되지 않고 `pipeline/` 계층을 호출한다.
- [x] `fastapi/main.py`에 면접 라우터가 등록되어 있다.

---

## Phase 2 — WebSocket 핸들러

- [x] `WS /ws/user/interview/{sessionId}/ai` 엔드포인트가 구현되어 있다.
- [x] 연결 시 `?token=` JWT 검증이 수행되며, 실패 시 Close 1008로 연결이 종료된다.
- [x] `sessionId` 기반으로 세션별 WebSocket을 저장하고 중복 연결 시 이전 연결을 종료한다.
- [x] `send_stt_partial` / `send_stt_final` / `send_tts_audio` / `send_error` 헬퍼가 정의되어 있다.
- [x] 모든 WebSocket 메시지에 `type` / `errorCode` 필드가 포함된다 (없으면 `null`).
- [x] FastAPI WebSocket(`/ai`)은 Server → Client 단방향 Push 채널이다. 클라이언트는 연결만 수립하며 메시지를 업링크로 전송하지 않는다. `sequenceNumber`는 서버가 Push하는 메시지에만 포함된다.
- [x] 서버가 Push하는 메시지의 `sequenceNumber`가 세션 내 단조 증가하며, 재연결 시 `lastReceivedSequenceNumber` 이후 메시지를 순서대로 재전송한다.

---

## Phase 3 — STT 파이프라인

- [ ] `POST /internal/user/interview/sessions/{sessionId}/trigger/voice-chunk` 라우터에 `X-Internal-Secret` 헤더 검증이 구현되어 있다.
- [ ] STT 파이프라인이 `asyncio.create_task`로 비동기 실행된다 (라우터가 즉시 200 응답 반환).
- [ ] `voiceQualityRatio` 산정 로직이 구현되어 있다 (Whisper `no_speech_prob` 기반).
- [ ] `voiceQualityRatio < 50.00`인 답변의 `deliveryScore` / `fluencyScore`가 Spring 콜백 페이로드에서 `null`로 포함된다.
- [ ] `voiceQualityRatio`가 `null`인 답변(텍스트 면접)의 `deliveryScore` / `fluencyScore`가 `null`로 포함된다.
- [ ] STT 변환 실패 시 `INTERVIEW_STT_FAILED` errorCode WebSocket 메시지가 클라이언트에 전송된다.

---

## Phase 4 — LLM 질문 생성 & TTS

- [ ] `POST /internal/user/interview/sessions/{sessionId}/trigger/text-answer` 라우터에 `X-Internal-Secret` 헤더 검증이 구현되어 있다.
- [ ] LLM 파이프라인이 `asyncio.create_task`로 비동기 실행된다.
- [ ] LLM 호출 시 `OPENAI_LLM_TIMEOUT_SECONDS` 타임아웃이 적용된다.
- [ ] LLM 타임아웃 또는 실패 시 폴백 질문 목록에서 대체 질문이 반환된다.
- [ ] RAG 컨텍스트가 있는 세션의 경우 LLM 프롬프트에 컨텍스트가 주입된다.
- [ ] `POST /internal/user/interview/sessions/{sessionId}/rag-context` 라우터에 `X-Internal-Secret` 헤더 검증이 구현되어 있다.
- [ ] RAG 인덱싱이 비동기로 처리되며, 실패 시 세션을 중단하지 않고 일반 면접 모드로 폴백한다.
- [ ] TTS 오디오가 `TTS_AUDIO` → `TTS_AUDIO_END` 순으로 순차 전송된다.
- [ ] TTS 실패 시 텍스트 질문만 전달하고 `INTERVIEW_TTS_FAILED` 메시지를 전송한다.
- [ ] TTS 생성 모듈이 Generator 기반 스트리밍 방식으로 구현되어 있으며, 세션 WebSocket 연결이 끊기면 진행 중인 TTS `asyncio.Task`가 즉시 취소(`task.cancel()`)되어 오디오 버퍼가 메모리에 잔류하지 않는다.
- [ ] 폴백 질문 목록이 `fastapi/user/prompts/interview_prompts.py`에 정의되어 있다 (각 유형 최소 5개).

---

## Phase 5 — 리포트 생성 & Spring 콜백

- [ ] `POST /internal/user/interview/sessions/{sessionId}/trigger/report` 라우터에 `X-Internal-Secret` 헤더 검증이 구현되어 있다.
- [ ] 리포트 파이프라인이 `asyncio.create_task`로 비동기 실행된다.
- [ ] Spring 콜백 요청에 `X-Internal-Secret` 헤더가 포함된다.
- [ ] Spring 콜백 재시도 횟수가 최대 3회를 초과하지 않는다 (지수 백오프 1초, 3초 대기).
- [ ] 최종 콜백 실패 시 `log.error`가 기록된다.
- [ ] 콜백 응답 `duplicated: true` 시 정상 처리로 간주하고 오류를 발생시키지 않는다.
- [ ] FastAPI 코드에 DB 직접 접근 (`import sqlalchemy`, `import pymysql` 등) 코드가 없다.

---

## Phase 6 — 보안 & 컨벤션

- [ ] `POST /internal/user/interview/**` 경로의 모든 라우터에 `X-Internal-Secret` 헤더 검증이 적용된다.
- [ ] `X-Internal-Secret` 시크릿 값이 환경 변수(`WEBHOOK_SECRET`)로만 관리된다.
- [ ] FastAPI WebSocket 라우터 코드가 Spring WebSocket 채널(`/chat`)에 직접 메시지를 전송하지 않는다.
- [ ] FastAPI 라우터에 복잡한 AI 파이프라인 로직이 직접 구현되지 않고 `pipeline/` 계층으로 분리된다.
- [ ] 환경 변수 접근이 `core/config.py`의 `settings` 객체를 통해서만 이루어진다.
- [ ] FastAPI 도메인(`user/interview`)이 `admin/` 도메인 코드를 직접 참조하지 않는다.

---

## Phase 7 — 테스트 & 검증

- [ ] `voiceQualityRatio = 49.99` 경계값 테스트 — `deliveryScore` / `fluencyScore` `null` 반환 확인.
- [ ] `voiceQualityRatio = 50.00` 경계값 테스트 — 점수 정상값 반환 확인.
- [ ] LLM 타임아웃 → 폴백 질문 반환 단위 테스트 통과.
- [ ] Spring 콜백 재시도 단위 테스트 — 2회 실패 후 3회 성공, 3회 모두 실패 후 `log.error` 기록.
- [ ] WebSocket JWT 검증 실패 → Close 1008 테스트 통과.
- [ ] `python -m pytest fastapi/` 전체 통과.
- [ ] Spring BE 연동 텍스트 면접 E2E 플로우 수동 검증 완료.
- [ ] Spring BE 연동 음성 면접 E2E 플로우 수동 검증 완료.

---

## Phase 8 — 면접 도메인 핵심 시나리오 검증

> 구현 완료 후 아래 시나리오를 수동 또는 통합 테스트로 검증한다.

### STT·점수 처리

- [ ] 음성 청크 5초 단위 수신 → STT 중간 결과가 실시간으로 클라이언트 WebSocket에 전달된다.
- [ ] `isFinal=true` 청크 처리 후 `STT_FINAL` 메시지와 `voiceQualityRatio`가 전달된다.
- [ ] `voiceQualityRatio < 50.00`인 청크가 포함된 답변의 리포트 콜백에서 해당 항목의 `deliveryScore` / `fluencyScore`가 `null`이다.

### LLM·TTS

- [ ] 텍스트 답변 제출 트리거 수신 후 10초 이내에 다음 질문이 클라이언트에 전달된다.
- [ ] LLM 타임아웃 시 10초 내에 폴백 질문이 클라이언트에 전달된다.
- [ ] 음성 면접 시 TTS 오디오가 `TTS_AUDIO` → `TTS_AUDIO_END` 순으로 클라이언트에 전달된다.

### 리포트 생성

- [ ] `endSession` 트리거 수신 후 리포트 완료 콜백이 Spring에 전달된다.
- [ ] 콜백 전달 후 Spring WebSocket에서 `REPORT_READY` 메시지가 클라이언트에 도달한다.
- [ ] 리포트 콜백에 `totalScore` / `feedbacks[]` 전체 필드가 포함되어 있다.

### 오류 처리

- [ ] STT 실패 시 `INTERVIEW_STT_FAILED` WebSocket 메시지가 클라이언트에 전달된다.
- [ ] Spring 콜백 최종 실패 시 `log.error`가 기록되고 서버가 종료되지 않는다.
- [ ] RAG 인덱싱 실패 시 세션이 중단되지 않고 일반 면접 모드로 진행된다.

### 좀비 세션 처리

- [ ] 클라이언트 WebSocket 연결이 끊어졌을 때 FastAPI가 해당 `sessionId`에 대해 5분간 재연결 대기(`Reconnection Window`)를 유지한다.
- [ ] 5분 내에 재연결이 성공하면 기존 세션 컨텍스트(이전 답변 이력, RAG 컨텍스트)가 복원되어 면접이 이어진다.
- [ ] 5분 경과 후에도 재연결이 없으면 FastAPI가 해당 세션의 마지막 상태로 Spring에 리포트 콜백을 전송하고 세션 리소스를 해제한다.
- [ ] 좀비 세션 강제 종료 및 리소스 해제 시 `log.info`로 `sessionId`와 강제 종료 사유가 기록된다.
- [ ] 재연결 성공 시 클라이언트가 전송한 `lastReceivedSequenceNumber` 기준으로 그 이후 미전달 메시지만 재전송하며, 이미 수신한 메시지를 중복 전송하지 않는다. (v1은 서버 메모리 기반 `lastProcessedSequenceNumber` 유지, Scale-out 시 Redis 전환 고려)
