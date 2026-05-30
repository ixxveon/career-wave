# Tasks: AI 면접 (Interview)

> `plan.md`의 Phase와 1:1 대응한다.
> 각 항목은 하나의 커밋 또는 PR 단위로 쪼갠다.
> 관련 문서: `plan.md` / `checklist.md` / `constitution.md`

---

## Phase 1 — 인프라 세팅 & 타입 정의

- [ ] `interview.d.ts` 정의 (세션 상태 머신, WebSocket 메시지 타입, 지표 모델링)
- [ ] `api/interview/` API 호출 인터페이스 설계 (AbortController 적용)
- [ ] TanStack Query 커스텀 훅 세팅 (리포트·이력 조회용)
- [ ] WebSocket 이중 연결 구조 설계 (Spring/FastAPI) 및 Heartbeat/Reconnect 정책 구현
- [ ] `audioUtils.ts` 구현 — MediaRecorder MIME 타입 분기 (Safari WebM 미지원 대응)
- [ ] 면접 환경 사전 진단 유틸리티 (`usePreflightCheck` 로직) 구현
- [ ] `sessionStorage.ts` 헬퍼 구현 (세션 복구용 직렬화/역직렬화)

---

## Phase 2 — 면접 입력 UI 구현

- [ ] `?documentId=xxx` 쿼리 파라미터 파싱 및 면접 세션 유효성 검증 로직 구현
- [ ] `InterviewSetup` 컴포넌트 — 면접 모드(텍스트/음성) 선택 및 사전 진단 결과 표시
- [ ] `useAudioRecorder` 구현 (MediaRecorder 래핑 및 Safari/Chrome 브라우저별 MIME 타입 분기)
- [ ] `VoiceRecorder` UI 구현 — 녹음 상태 시각화 및 마이크 권한 거부 시 예외 처리
- [ ] `submitVoiceBlob` API 연동 — STT 실패 시 텍스트 전환 폴백 처리
- [ ] `TextAnswerInput` 컴포넌트 — 텍스트 입력 및 전송 로직, 중복 요청 방지
- [ ] `ChatWindow` 컴포넌트 — 실시간 대화 스크립트 렌더링
- [ ] `InterviewTimer` 컴포넌트 — 문항당 타이머 로직 및 시간 초과 시 자동 종료 처리

---

## Phase 3 — 실시간 WebSocket & LLM 흐름

- [ ] `useSpringWebSocket` 구현 — 면접 세션 생명주기 이벤트(READY, RUNNING, FINISHED) 핸들링 및 RECONNECTING·ERROR 상태 전이 처리 (재연결 횟수 제한, 복구 불가 시 ERROR 전이)
- [ ] `useFastApiWebSocket` 구현 — LLM 스트리밍 응답 수신 로직 및 연결 단절 시 RECONNECTING 상태 전이 처리
- [ ] `TTSPlayer` & `useTTSQueue` 구현 — 문항 단위 TTS 오디오 순차 재생 큐 및 재생 제어
- [ ] **스트리밍 타이핑 효과**: `requestAnimationFrame` 활용하여 텍스트 데이터 렌더링 최적화
- [ ] LLM 꼬리/압박 질문 생성 로직 및 이력서 RAG 컨텍스트 연동
- [ ] LLM 응답 지연/타임아웃 폴백 처리 — 로딩 UI 유지 및 사전 정의 질문으로 대체 로직 구현
- [ ] 면접 종료 시 전체 스크립트 서버 동기화 (`endSession`) 및 상태 머신 전이

---

## Phase 4 — 지표 분석 및 리포트 시각화

- [ ] `voiceQuality.ts` — 음성 인식 유효 비율 계산 로직 구현 (50% 미만 문항 `null` 처리)
- [ ] 하이브리드 점수 산정 유틸리티 구현 (음성 품질 필터링 반영한 평균점 산출)
- [ ] `ReportChart` 컴포넌트 구현 (Recharts 레이더 차트, `null` 지표 마스킹 처리)
- [ ] `ScriptAnalysisView` 구현 (스크립트 및 지표별 상세 분석 뷰)
- [ ] 리포트 페이지 Profiler 최적화 — 대규모 데이터 렌더링 시 리렌더링 방지
- [ ] 마스킹 지표(Delivery·Fluency) 미지원 시 안내 UI/UX 적용

---

## Phase 5 — 도메인 통합 및 안정성

- [ ] `useInterviewReport` 연동 — 리포트 조회 및 페이지 재진입 시 복구 로직 구현
- [ ] **비정상 종료 세션 복구**: `sessionStorage` 기반 세션 상태 강제 복구 로직 구현
- [ ] 서류 도메인 연동 테스트 — `documentId` 기반 403/404 예외 처리
- [ ] iOS Safari getUserMedia 오디오 캡처 제약 대응 확인 및 예외 처리
- [ ] 모바일/태블릿 반응형 레이아웃 검증 및 가로/세로 모드 대응 테스트

---

## Phase 6 — Polish & QA

- [ ] `checklist.md` 기반 최종 점검
- [ ] a11y — 채팅/타이머 영역 `aria-live` 및 키보드 네비게이션 검증
- [ ] 보안 검증 — 타인 소유 문서 접근 차단(IDOR) 테스트 완료
- [ ] 통합 테스트 (MSW 활용) — [사전 진단 → 시작 → 답변 → 종료 → 리포트] 전체 플로우 확인
- [ ] Lighthouse 성능/접근성 최종 측정 (90/95점 목표)
- [ ] 최종 클린업 — 하드코딩된 목업 데이터 제거 및 ESLint `no-console` 검사