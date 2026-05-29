# Constitution: Document Analysis 도메인

> 관련 문서: `plan.md` / `checklist.md` / `api-schema.md`  
> 레이어: **Frontend Only**

## 0. 컨벤션

* **Feature Branch**: `feature/user-resume-{기능명}` (예: `feature/user-resume-analyze`)
* **PR 작성**: `.github/pull_request_template.md` 형식 필수 준수 (CONTRIBUTION.md § 6)
* **파일 경로**: `src/user/{api|components|hooks|types|utils}/resume/`

---

## 1. 도메인 원칙

* **분석 무결성**: 사용자가 입력한 데이터와 파일은 서버 전송 전 `utils/resume/validation.ts`를 통한 1차 검증을 거치며, 분석 결과는 원본과 매핑되어 유실 없이 UI에 투영한다.
* **사용자 경험(UX) 우선**: 분석 과정의 모든 단계(`IDLE → SUBMITTING → ANALYZING → SUCCESS/ERROR`)는 사용자에게 시각적으로 투명하게 공유되어야 한다.
* **보안 및 프라이버시**: 분석된 개인정보 및 서류 데이터는 해당 유저만 접근 가능하며, IDOR 공격을 원천 차단한다.
* **상태 일관성**: 서버 상태(분석 결과)는 `TanStack Query`로 관리하고, 입력 폼 상태는 `React local state`로 관리한다. 새로고침 시에도 `SessionStorage`를 통해 `documentId` 및 분석 상태가 복원되어야 한다.

---

## 2. 상태 머신

> 이력서(파일 업로드)와 자기소개서(텍스트 입력)는 제출 방식이 다르나 동일한 상태 머신을 따른다.

```
[IDLE] → [SUBMITTING] → [ANALYZING] → [SUCCESS]
                                     ↘ [ERROR]
ANY → [IDLE]  # 폼 초기화 및 재시도
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| IDLE → SUBMITTING | 허용 | 이력서 업로드 또는 자기소개서 제출 시작 |
| SUBMITTING → ANALYZING | 허용 | 서버 전송 완료 후 AI 분석 트리거 |
| ANALYZING → SUCCESS | 허용 | 분석 완료 및 결과 수신 |
| ANALYZING → ERROR | 허용 | API 타임아웃 또는 처리 실패 |
| ANY → IDLE | 허용 | 폼 초기화 및 분석 재시도 |

**에러 처리 정책**
* `ANALYZING → ERROR` 전이 시 상태는 `IDLE`로 복원하여 재시도를 허용한다.
* API 에러는 `ErrorCode` 기반 공통 모달로 처리한다.
* 네트워크 단절은 별도 토스트 메시지로 처리한다.
* `LoadingModal`은 `ERROR` 전이 시 반드시 닫혀야 한다.

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 서버 상태 관리 | TanStack Query | 분석 결과 캐싱 및 로딩/에러/재시도 관리 |
| 입력 폼 상태 | React local state (`useState`) | 컴포넌트 내 단기 입력 상태 — 전역 공유 불필요 |
| API 계약 | `api-schema.md` 엄격 준수 | 프론트엔드-백엔드 간 데이터 불일치 방지 |
| 유효성 검사 | 클라이언트 1차 검증 필수 | 파일 타입/용량/문항수 등 예외 상황 사전 차단 (서버 2차 검증은 백엔드 책임) |
| 세션 저장소 | SessionStorage | 탭 종료 시 민감 데이터 자동 삭제 (`localStorage` 사용 금지) |
| API 레이어 분리 | 순수 API 호출 → `api/` / 상태·사이드이펙트 포함 → `hooks/` | 역할 혼재 방지 |

---

## 4. 불변 규칙 (Invariants)

* **API 독립성**: API 호출 로직은 View 레이어에 직접 작성하지 않고 반드시 `api/` 또는 `hooks/`로 분리한다.
    * 순수 API 호출 함수 → `user/api/resume/`
    * 상태·사이드이펙트가 포함된 비동기 로직 → `user/hooks/resume/`
* **데이터 검증**: 이력서 업로드 및 자기소개서 제출 전 `utils/resume/validation.ts`를 반드시 통과해야만 API 요청이 허용된다.
* **IDOR 대응**: 프론트엔드는 서버 응답으로 받은 `documentId`만을 쿼리 키로 사용하며, 임의 값을 직접 생성하거나 조작하지 않는다.
* **리포트 렌더링**: 분석 결과 리포트는 고정된 3단 구조(Good/Bad/Fix)를 엄격히 준수하며, 항목 중 하나가 비어 있을 경우 Empty State UI를 렌더링한다.
* **자기소개서 상태 관리**: 문항/답변 상태는 `useCoverLetterForm` 훅을 통해 일관되게 관리하며, 컴포넌트 로컬 `useState`로 개별 관리하지 않는다.

---

## 5. 연동 계약

* **면접 도메인**: 분석 완료 후 `documentId`를 URL 파라미터(`?documentId=xxx`)로 전달하여 면접 질문 컨텍스트로 활용한다. 유효하지 않은 `documentId`로 진입 시 에러 처리가 되어야 한다.
* **목록 관리**: 페이징 데이터 조회 시 반드시 최신순 정렬을 기본으로 한다.

---

## 6. 금지 패턴

* **서버 상태 직접 관리**: TanStack Query로 관리하는 서버 상태를 컴포넌트 내부 `useState`에 복사하여 동기화를 깨뜨리는 행위 금지.
* **자기소개서 상태 분산**: 문항/답변 데이터를 각 컴포넌트가 개별 `useState`로 파편화하여 관리하는 행위 금지.
* **로그 출력**: 배포 전 모든 `console.log` 및 디버깅 코드 제거 (ESLint `no-console` 룰로 강제).
* **DOM 직접 접근**: `document.getElementById` 등 원시적인 DOM 접근 금지 (React Ref 활용).
* **데이터 직접 저장**: 분석 결과 및 세션 정보를 `localStorage`에 저장 금지 (`SessionStorage` 강제).
* **window 전역 오염**: 세션 정보나 상태를 `window` 객체에 직접 저장 금지.
