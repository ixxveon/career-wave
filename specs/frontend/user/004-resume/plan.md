# Implementation Plan: Document Analysis (서류 코칭)

> 작성자: 이가연 | 작성일: 2026-05-29  
> 관련 문서: `checklist.md` / `api-schema.md`  
> 레이어: **Frontend Only**

---

## Summary

유저가 입력한 이력서(파일 업로드)와 자기소개서(문항 + 답변 직접 입력)를 AI가 분석하여 직무 적합도 및 KPI 기반의 개선 피드백 리포트를 제공하는 서비스 도메인.

> **입력 방식 구분**
> - 이력서: 파일 업로드 (PDF·DOC·DOCX, 최대 10MB)
> - 자기소개서: 지원 회사 / 지원 직무 + 문항·답변 직접 입력 (최대 5문항 / 문항당 1000자)

---

## Technical Context

| 분류 | 선택 | 근거 |
|------|------|------|
| 상태 관리 | `Zustand` | 서버 데이터 및 분석 상태 전역 공유 |
| 비동기 통신 | `Axios` + `TanStack Query` | 서버 데이터 캐싱 및 로딩/에러 상태 관리 |
| 시각화 | `Recharts` | 역량 점수 레이더 차트 기본 지원 |
| 스타일링 | `TailwindCSS` + `Framer Motion` | 로딩 메시지 전환 및 차트 진입 애니메이션 |
| 세션 유지 | `SessionStorage` | 탭 종료 시 자동 만료 — `documentId` 및 분석 결과 저장 (LocalStorage 사용 금지) |

### 전제 조건 및 미결 항목

- 업로드 시 백엔드에서 `documentId`가 발급됨
- 파일 업로드는 S3 Presigned URL 방식 — **백엔드 API 완료 여부 확인 후 Phase 2 착수**
- 분석 상태 추적 방식: **폴링(Polling) vs WebSocket 미결정**
    - 결정 기준: 분석 소요 시간이 10초 이상이면 WebSocket, 미만이면 폴링 권장
    - **Phase 3 착수 전 백엔드와 협의 후 이 줄 업데이트할 것**
- API 응답은 JSON 형태로 내려옴 — 상세 스키마는 `api-schema.md` 참고

---

## Project Structure

```text
src/
└── user/
    ├── api/
    │   └── resume/
    │       ├── uploadResume.ts             # Presigned URL 요청 및 S3 업로드 (이력서)
    │       ├── submitCoverLetter.ts        # 자기소개서 문항/답변 제출
    │       ├── getAnalysisResult.ts        # 분석 결과 조회 (폴링 또는 WebSocket)
    │       └── getResumeHistory.ts         # 이력 목록 페이징 조회
    ├── components/
    │   └── resume/
    │       ├── ResumeUpload.tsx            # 이력서 파일 드롭존 및 업로드 트리거
    │       ├── CoverLetterForm.tsx         # 자기소개서 입력 폼 (문항 추가/삭제, 글자 수 카운터)
    │       ├── LoadingModal.tsx            # 단계별 메시지 상태 머신
    │       ├── ReportChart.tsx             # Recharts 레이더 차트 + 애니메이션
    │       ├── FeedbackList.tsx            # Good / Bad / Fix 피드백 렌더링
    │       └── HistoryItem.tsx             # 이력 목록 단일 아이템
    ├── hooks/
    │   └── resume/
    │       ├── useResumeUpload.ts          # 파일 검증 → 업로드 → documentId 발급
    │       ├── useCoverLetterForm.ts       # 문항 추가/삭제, 글자 수 제한, 유효성 검사
    │       ├── useAnalysisResult.ts        # 분석 상태 구독 및 결과 수신
    │       └── useResumeHistory.ts         # 이력 목록 페이징
    ├── store/
    │   └── resumeStore.ts                  # 서버 상태와 UI 로컬 상태 분리 관리
    ├── types/
    │   └── resume.d.ts                     # API DTO 및 도메인 타입 정의
    └── utils/
        └── resume/
            └── validation.ts               # 파일 용량(10MB) / 확장자(PDF·DOC·DOCX) / MIME 타입 검증
                                            # 자기소개서 문항 수(max 5) / 글자 수(max 1000) 검증
```




---

## Phases

### Phase 1: 인프라 세팅 & 타입 정의
**목표**: 이후 Phase의 공통 기반 확립  
**전제**: `api-schema.md` 스키마 확정

- [ ] `resume.d.ts` — API 응답 DTO 및 도메인 타입 정의
- [ ] `resumeStore.ts` — Zustand 스토어 초기 설계 (서버 상태 / UI 상태 분리)
- [ ] `api/` — API 함수 인터페이스 및 공통 에러 핸들링 구조 작성
- [ ] SessionStorage 유틸 — `documentId` 및 분석 결과 read/write 헬퍼

---

### Phase 2: 입력 UI 구현
**목표**: 이력서 파일 업로드 + 자기소개서 텍스트 입력 → `documentId` 발급까지 완성  
**전제**: 백엔드 Presigned URL API 완료 확인 필요 — 미완료 시 MSW 목업으로 선행 구현

**이력서 파일 업로드**
- [ ] `validation.ts` — 용량(10MB) / 확장자(PDF·DOC·DOCX) / MIME 타입 검증 구현
- [ ] `useResumeUpload` — 검증 → Presigned URL 요청 → S3 업로드 → `documentId` 저장 흐름
- [ ] `ResumeUpload` 컴포넌트 — 드롭존 UI, 업로드 중 버튼 비활성화(중복 요청 방지)
- [ ] 에러 처리 — 용량 초과 / 미지원 확장자 / 네트워크 실패 각각 메시지 분기

**자기소개서 텍스트 입력**
- [ ] `validation.ts` — 문항 수(max 5) / 글자 수(max 1000) / 필수 필드(지원 회사·직무) 검증 추가
- [ ] `useCoverLetterForm` — 문항 추가/삭제, 글자 수 카운터, 유효성 검사 상태 관리
- [ ] `CoverLetterForm` 컴포넌트 — 문항 추가 버튼(5문항 초과 시 비활성화), 실시간 글자 수 표시
- [ ] 미입력 상태에서 "AI 분석 시작하기" 클릭 시 유효성 검사 동작 및 버튼 비활성화

**공통**
- [ ] `documentId` SessionStorage 저장 — 새로고침 후 복원 검증

---

### Phase 3: AI 분석 로딩 흐름
**목표**: 분석 진행 상태를 단계별로 사용자에게 전달  
**전제**: 폴링 vs WebSocket 방식 백엔드 협의 완료 후 착수  
**Phase 2 완료 후 착수**

- [ ] `useAnalysisResult` — 폴링 또는 WebSocket 방식으로 분석 상태 구독
- [ ] `LoadingModal` — 단계별 메시지(파일 읽기 → 키워드 추출 → 피드백 생성) 동적 전환
- [ ] 상태 머신 — `idle → uploading → analyzing → success / error` 전이 누락 없이 처리
- [ ] 비정상 종료 처리 — 타임아웃 / API 오류 시 Modal 닫힘 + 에러 메시지 노출
- [ ] 페이지 이탈 후 재진입 시 분석 중 상태 복원 검증

---

### Phase 4: 결과 리포트 시각화
**목표**: 분석 결과를 차트와 피드백으로 렌더링  
**전제**: Phase 3 분석 완료 상태 및 API 응답 스키마 확정 필요  
**Phase 3 완료 후 착수**

- [ ] `ReportChart` — Recharts 레이더 차트 구현, 0 → N점 진입 애니메이션(Framer Motion) 적용
- [ ] `FeedbackList` — Good / Bad / Fix 3단계 피드백 구조 UI 매핑
- [ ] 피드백 항목 비어 있을 때 빈 상태(Empty State) 처리
- [ ] React DevTools Profiler로 불필요한 리렌더링 없는지 확인

---

### Phase 5: 리스트 페이징 & 도메인 통합
**목표**: 이력 조회 및 면접 도메인 연동 완성  
**전제**: Phase 2 `documentId` 발급 플로우 완료 필요

- [ ] `useResumeHistory` — 최신순 페이징 조회
- [ ] `HistoryItem` — 이력 목록 렌더링 및 빈 상태 안내 문구 처리
- [ ] "이 서류로 면접 시작하기" — `documentId`를 URL query parameter(`?documentId=xxx`)로 면접 도메인에 전달
- [ ] 유효하지 않은 `documentId`로 진입 시 에러 처리 확인
- [ ] 면접 도메인 담당자와 라우팅 연동 테스트

---

### Phase 6: 문서화 & QA
**목표**: `checklist.md` 기반 최종 검증 및 배포 준비

- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] 하드코딩된 목업 데이터 전체 제거 (MSW 설정은 유지)
- [ ] Lighthouse — 성능 90점 이상 / 접근성 95점 이상 확인
- [ ] PR 제목 형식 확인: `[RESUME] 서류 분석 기능 구현`
- [ ] `tasks.md` 전 항목 완료 체크 확인
