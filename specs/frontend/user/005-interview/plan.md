# Implementation Plan: AI 면접 (Interview)

> 작성자: 이가연 | 작성일: 2026-05-29  
> 관련 문서: `checklist.md` / `api-schema.md`  
> 레이어: **Frontend Only**

---

## Summary

유저가 이력서 분석 결과(`documentId`)를 기반으로 AI 면접관과 텍스트 또는 음성으로 실시간 면접을 진행하고, 종료 후 역량 지표(Relevance·Depth·Delivery·Fluency) 기반의 하이브리드 피드백 리포트를 제공하는 서비스 도메인.

> **입력 방식 구분**
> - **텍스트 면접**: 채팅창 입력 → 텍스트 전송 → LLM 꼬리 질문
> - **음성 면접**: 마이크 녹음 → Blob 전송 → Whisper STT 변환 → 채팅창 동기화 → LLM 꼬리 질문

---

## Technical Context

| 분류 | 선택 | 근거 |
|------|------|------|
| 서버 상태 | `TanStack Query` | 면접 리포트·이력 캐싱 및 로딩/에러/재시도 관리 |
| 세션·실시간 UI 상태 | React `useReducer` | 복잡한 면접 세션 상태(소켓 연결·녹음·타이머) 단일 리듀서로 집중 관리 |
| Spring WebSocket | native WebSocket | 세션 생명주기 및 채팅 메시지 송수신 |
| FastAPI WebSocket | native WebSocket | LLM 스트리밍 응답, STT 결과 수신, TTS 오디오 스트리밍 |
| 오디오 캡처 | `MediaRecorder API` | 음성 녹음 및 Blob 전송 (Safari WebM 미지원 대비 MIME 타입 분기 처리) |
| 시각화 | `Recharts ^3.8.1` | 역량 지표 레이더 차트 기본 지원 |
| 스타일링 | `Plain CSS` + CSS 트랜지션/애니메이션 | 프로젝트 기존 스타일링 방식 준수 |
| 세션 유지 | `SessionStorage` | 탭 종료 시 자동 만료 — 면접 세션 복구용 데이터 저장 |

### 전제 조건

- resume 도메인에서 `?documentId=xxx` 쿼리 파라미터로 진입 (유효하지 않은 `documentId` 진입 시 에러 처리 필수)
- Spring WebSocket: 세션 생명주기 및 답변 전송 채널
- FastAPI WebSocket: LLM 실시간 응답, STT 결과, TTS 오디오 채널
- WebSocket 재연결 전략 확정 필요 (heartbeat 주기, reconnect 횟수 제한, 복구 불가 시 세션 저장 후 이탈 처리)
- LLM 응답 지연/타임아웃 폴백 정책 확정 필요 (로딩 UI 유지 or 사전 정의 질문으로 대체)
- 질문 개수 정책 확정 필요 (고정값 or LLM 동적 결정)

---

## Project Structure

```text
src/
└── user/
    ├── api/
    │   └── interview/
    │       ├── startSession.ts              # 면접 세션 시작 및 documentId 연동
    │       ├── submitTextAnswer.ts          # 텍스트 답변 전송
    │       ├── submitVoiceBlob.ts           # 음성 Blob 전송 (STT 파이프라인)
    │       ├── endSession.ts               # 면접 세션 종료 및 스크립트 동기화
    │       └── getInterviewReport.ts        # 면접 분석 리포트 조회
    ├── components/
    │   └── interview/
    │       ├── PreflightCheck.tsx           # 면접 진입 전 권한·네트워크 사전 진단
    │       ├── InterviewSetup.tsx           # 면접 모드·직무·이력서 설정
    │       ├── ChatWindow.tsx               # 실시간 대화 스크립트 뷰
    │       ├── TextAnswerInput.tsx          # 텍스트 답변 입력창
    │       ├── VoiceRecorder.tsx            # 음성 녹음 컨트롤 (MediaRecorder)
    │       ├── TTSPlayer.tsx               # AI 목소리 출력 컨트롤러
    │       ├── InterviewTimer.tsx           # 문항별 타이머
    │       ├── ReportChart.tsx             # Recharts 레이더 차트
    │       └── ScriptAnalysisView.tsx       # 스크립트 + 지표 분석 뷰
    ├── hooks/
    │   └── interview/
    │       ├── usePreflightCheck.ts         # 마이크 권한·WebSocket 연결 사전 진단
    │       ├── useInterviewSession.ts       # 세션 생명주기 제어 (READY→RUNNING→FINISHED)
    │       ├── useSpringWebSocket.ts        # Spring WebSocket 연결 (세션/채팅)
    │       ├── useFastApiWebSocket.ts       # FastAPI WebSocket 연결 (LLM/STT/TTS)
    │       ├── useAudioRecorder.ts          # MediaRecorder 래핑, Safari MIME 분기
    │       ├── useTTSQueue.ts              # TTS 오디오 재생 큐 관리
    │       ├── useInterviewTimer.ts         # 문항별 타이머 로직
    │       └── useInterviewReport.ts        # TanStack Query 기반 리포트 조회
    ├── types/
    │   └── interview.d.ts                   # API DTO, 세션·상태 머신 타입, WS 메시지 포맷
    └── utils/
        └── interview/
            ├── audioUtils.ts               # MIME 타입 분기 (Safari WebM 미지원 대응)
            ├── voiceQuality.ts             # 음성 품질 유효성 필터링 (유효 비율 계산)
            └── sessionStorage.ts           # 면접 세션 복구용 직렬화/역직렬화
```

---

## Phases

### Phase 1: 인프라 세팅 & 타입 정의
- [ ] `interview.d.ts` — API DTO, 세션 상태 머신 타입, WebSocket 메시지 포맷 정의
- [ ] `api/` — API 함수 인터페이스 및 공통 에러/재시도(TanStack Query) 구조 작성
- [ ] WebSocket 이중 연결 아키텍처 설계 (Spring-Client / FastAPI-Client)
- [ ] WebSocket 재연결 전략 구현 (heartbeat, reconnect 횟수 제한, 복구 불가 시 세션 저장 처리)
- [ ] `audioUtils.ts` — MediaRecorder MIME 타입 분기 (Safari 대응)
- [ ] `sessionStorage.ts` — 면접 세션 복구용 직렬화/역직렬화 헬퍼 구현

### Phase 2: 면접 입력 UI 구현

**Pre-flight Check (면접 진입 전 사전 진단)**
- [ ] `usePreflightCheck` — `navigator.mediaDevices.getUserMedia`로 마이크 권한 확인, WebSocket ping/pong으로 서버 연결 가능 여부 사전 검증
- [ ] `PreflightCheck` 컴포넌트 — 진단 결과에 따른 안내 UI (권한 거부 시 설정 유도, 네트워크 불가 시 재시도 안내)
- [ ] 사전 진단 실패 시 면접 세션 진입 차단 및 에러 메시지 노출

**세션 진입 & 설정**
- [ ] `?documentId=xxx` 쿼리 파라미터 수신 및 유효성 검증, 오류 시 에러 처리
- [ ] `InterviewSetup` 컴포넌트 — 면접 모드(텍스트/음성) 선택 및 세션 시작

**텍스트 답변**
- [ ] `TextAnswerInput` 컴포넌트 — 입력창 및 전송 버튼, 중복 요청 방지
- [ ] `submitTextAnswer` — 텍스트 답변 전송 API 연동

**음성 답변**
- [ ] `useAudioRecorder` — MediaRecorder 래핑, 권한 거부/실패 에러 처리, iOS Safari 대응
- [ ] `VoiceRecorder` 컴포넌트 — 녹음 시작/종료 UI, 녹음 상태 시각화
- [ ] `submitVoiceBlob` — Blob 전송 및 STT 변환 실패 시 폴백 처리 (텍스트 입력 전환 안내)

**공통**
- [ ] `InterviewTimer` 컴포넌트 — 문항당 타이머 및 자동 종료 처리
- [ ] `ChatWindow` 컴포넌트 — 실시간 대화 스크립트 렌더링

### Phase 3: 실시간 WebSocket & LLM 흐름
- [ ] `useSpringWebSocket` — 세션 생명주기 이벤트 처리 (`READY → RUNNING → FINISHED`)
- [ ] `useFastApiWebSocket` — LLM 스트리밍 응답 수신 및 ChatWindow 동기화
- [ ] **스트리밍 텍스트 타이핑 효과** — `ref` + `requestAnimationFrame` 기반 렌더링으로 스트리밍 데이터 단순 `setState` 재렌더링 부하 방지, 텍스트가 부드럽게 나타나도록 구현
- [ ] `useTTSQueue` 및 `TTSPlayer` 컴포넌트 — TTS 오디오 재생 큐 관리
  - 이전 문장 재생 완료 후 다음 문장 순차 재생 (오디오 겹침 방지)
  - 네트워크 지연 시 버퍼링 처리로 매끄러운 재생 보장
- [ ] LLM 꼬리 질문/압박 질문 동적 생성 흐름 구현
  - 응답 지연/타임아웃 시 폴백 처리 (로딩 UI + 사전 정의 질문 대체)
- [ ] 이력서 데이터 RAG 컨텍스트 주입 (documentId 기반)
- [ ] 면접 종료 시 전체 대화 스크립트 서버 동기화 (`endSession`)

### Phase 4: 분석 리포트 시각화
- [ ] `voiceQuality.ts` — 문항별 음성 인식 유효 데이터 비율 계산 (유효 비율 50% 미만 문항은 Delivery·Fluency 점수 `null` 처리하여 AI 지표 신뢰도 보호)
- [ ] `ReportChart` — Recharts 레이더 차트 (Relevance·Depth·Delivery·Fluency 4개 지표, `null` 지표 마스킹 처리 포함)
- [ ] 하이브리드 점수 산정 로직 — 텍스트/음성 혼용 및 음성 품질 필터링 결과에 따른 유효 지표 평균값 계산
- [ ] `ScriptAnalysisView` — 전체 대화 스크립트 + 지표별 분석 뷰 렌더링
- [ ] 마스킹 지표(Delivery·Fluency) 텍스트 전용 면접 또는 음성 품질 미달 시 안내 UI 처리
- [ ] Profiler 체크 — 리포트 화면 내 불필요한 리렌더링 방지

### Phase 5: 도메인 통합
- [ ] `useInterviewReport` — TanStack Query 기반 리포트 조회 및 페이지 재진입 시 복원
- [ ] 면접 중 비정상 종료 시 SessionStorage 기반 세션 복구 정책 구현
- [ ] 서류 도메인 연동 테스트 — 유효하지 않은 `documentId` 진입 시 403/404 에러 처리
- [ ] 모바일 호환성 검증 — iOS Safari getUserMedia 제약 대응 확인

### Phase 6: Polish & QA
- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] a11y — `aria-live` 영역(채팅창·타이머), 키보드 제어, 포커스 흐름 검증
- [ ] 보안 검증 — 타인 소유 `documentId`로 면접 세션 시작 시 차단 테스트
- [ ] 통합 테스트 — 텍스트/음성 면접 전체 플로우 (사전 진단 → 시작 → 답변 → 종료 → 리포트)
- [ ] 최종 확인 — 목업 데이터 제거, Lighthouse(성능 90/접근성 95) 통과