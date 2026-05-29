# Tasks: Document Analysis (서류 코칭)

> `plan.md`의 Phase와 1:1 대응한다.  
> 각 항목은 하나의 커밋 또는 PR 단위로 쪼갠다.  
> 관련 문서: `plan.md` / `checklist.md` / `constitution.md`

---

## Phase 1 — 인프라 세팅 & 타입 정의

- [ ] `types/resume.d.ts` 정의 (Request/Response DTO, AnalysisResult, 상태 머신 타입)
- [ ] `store/resumeStore.ts` 구현 (서버 상태 / UI 상태 분리, Zustand slice 설계 및 리렌더링 최적화)
- [ ] `api/resume/` API 호출 함수 인터페이스 작성 (AbortController 지원) 및 공통 에러 핸들링 구조 세팅
- [ ] TanStack Query 커스텀 훅 세팅 (queryKey 컨벤션, `retry` 정책 포함)
- [ ] SessionStorage 헬퍼 유틸리티 구현 (`try-catch` 통한 직렬화/역직렬화 예외 처리 포함)

---

## Phase 2 — 입력 UI 구현

### 이력서 파일 업로드
- [ ] `utils/resume/validation.ts` — 파일 용량(10MB) / 확장자(PDF·DOC·DOCX) / MIME 타입 검증
- [ ] `hooks/resume/useResumeUpload.ts` — 검증 → `POST /upload` 서버 전송 → `documentId` 저장 → 폴링 시작 흐름 구현
- [ ] `components/resume/ResumeUpload.tsx` — 드롭존 UI 구현, 업로드 중 중복 요청 방지
- [ ] 에러 처리 — 용량/확장자/네트워크 실패 메시지 분기 처리

### 자기소개서 텍스트 입력
- [ ] `utils/resume/validation.ts` — 문항(max 5) / 글자 수(max 1000) / 필수 필드 검증
- [ ] `hooks/resume/useCoverLetterForm.ts` — 폼 상태 관리 및 유효성 검사 로직
- [ ] `components/resume/CoverLetterForm.tsx` — 동적 문항 추가/삭제 UI 및 실시간 글자 수 표시
- [ ] 버튼 인터랙션 — 미입력 시 분석 시작 버튼 비활성화

### 공통
- [ ] `documentId` SessionStorage 저장 및 새로고침 후 복원 검증

---

## Phase 3 — AI 분석 로딩 흐름

- [ ] `hooks/resume/useAnalysisResult.ts` — 폴링 또는 WebSocket 기반 상태 구독 구현
- [ ] `components/resume/LoadingModal.tsx` — 상태 머신(`IDLE → SUBMITTING → ANALYZING → SUCCESS/ERROR`)에 따른 단계별 메시지 전환
- [ ] 비정상 종료 처리 — 타임아웃/API 에러 시 Modal 닫힘 + 에러 상태 전이 + 에러 메시지 노출
- [ ] 네트워크 단절 시 토스트 메시지 알림 처리
- [ ] 페이지 이탈 후 재진입 시 SessionStorage 기반 분석 상태 복원 검증

---

## Phase 4 — 결과 리포트 시각화

- [ ] `components/resume/ReportChart.tsx` — Recharts 레이더 차트 및 Framer Motion 애니메이션 구현
- [ ] `components/resume/FeedbackList.tsx` — Good / Bad / Fix 3단 구조 렌더링
- [ ] Empty State 처리 — 피드백 항목이 비어 있을 때 안내 UI 렌더링
- [ ] 성능 최적화 — React DevTools Profiler 활용하여 불필요한 리렌더링 제거

---

## Phase 5 — 리스트 페이징 & 도메인 통합

- [ ] `hooks/resume/useResumeHistory.ts` — 최신순 페이징 조회 구현
- [ ] `components/resume/HistoryItem.tsx` — 이력 목록 아이템 렌더링 및 Empty State 대응
- [ ] 면접 도메인 연동 — `documentId`를 쿼리 파라미터로 전달 및 유효성 검사
- [ ] 면접 도메인 연동 시 404/403 에러 처리 및 담당자 연동 테스트

---

## Phase 6 — Polish & QA

- [ ] 모바일/태블릿 반응형 검증 — `ReportChart` 및 폼 레이아웃 대응
- [ ] 통합 테스트 (MSW 활용) — 주요 시나리오(업로드/분석/조회) 테스트
- [ ] 최종 클린업 — 하드코딩 목업 데이터 삭제, ESLint `no-console` 검사
- [ ] 성능 측정 — Lighthouse 성능 90점 / 접근성 95점 이상 달성
- [ ] `checklist.md` 기반 최종 점검 및 PR 생성 (`.github/pull_request_template.md` 형식 준수)