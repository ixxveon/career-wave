# Constitution: Dashboard

> 작성자: 고유리 | 작성일: 2026-06-01
> 관련 문서: `plan.md` / `tasks.md` / `spec.md` / `api-schema.md` / `checklist.md`
> 레이어: **Frontend First / Backend Ready**

---

## 0. 컨벤션

* **Feature Branch**: `feature/user-dashboard-{기능명}`
* **PR 제목 예시**: `[DASHBOARD] 내 정보 관리 및 스크랩 공고 기능 구현`
* **파일 경로 원칙**

  * 페이지: `src/user/pages/mypage/`
  * API 호출: `src/user/api/dashboard/`
  * 상태/사이드이펙트 훅: `src/user/hooks/dashboard/`
  * 타입: `src/user/types/dashboard.ts`
* **문서 범위**

  * 내 정보 관리
  * GitHub 연동 상태 조회
  * 스크랩 공고 조회
  * 스크랩 공고 검색 및 정렬
  * 스크랩 취소 및 상세 페이지 이동

### 예외: 순차 의존 피처

* Phase N+1이 Phase N의 코드를 필요로 하는 경우, Phase N 브랜치에서 분기하여 작업할 수 있다.
* 단, 머지 순서는 반드시 Phase N → Phase N+1 순서를 지킨다.
* PR 본문에는 의존 브랜치와 선행 PR을 명시한다.
* 선행 Phase가 머지되기 전에는 후행 Phase PR을 merge하지 않는다.

---

## 1. 도메인 원칙

* Dashboard는 사용자의 계정 정보와 스크랩 공고를 한 화면에서 확인할 수 있도록 제공한다.
* Dashboard는 회원 인증 및 권한을 직접 관리하지 않는다.
* Dashboard는 데이터 조회 및 사용자 액션 제공에 집중한다.
* Dashboard는 API Schema를 기준으로 데이터를 표시한다.
* Dashboard는 실제 데이터 연동 전 Mock 데이터를 활용하여 기능을 검증한다.

---

## 2. 상태 머신

Dashboard 도메인은 조회 중심 기능으로 별도 상태 전이를 관리하지 않는다.

---

## 3. 아키텍처 결정

| 결정     | 내용                       | 근거                     |
| ------ | ------------------------ | ---------------------- |
| 데이터 구조 | API Schema 기준 데이터 사용     | 프론트엔드와 백엔드 간 계약 일관성 확보 |
| 화면 이동  | React Router 사용          | 사용자 페이지 라우팅 방식 통일      |
| 타입 관리  | TypeScript 타입 정의 사용      | 타입 안정성 확보              |
| 데이터 연동 | Mock 데이터 → 실제 API 순서로 진행 | 단계별 개발 및 검증 용이         |
| 상태 처리  | 로딩, 오류, 빈 상태 UI 제공       | 사용자 경험 향상              |

---

## 4. 불변 규칙 (Invariants)

* 사용자 정보는 로그인된 사용자 기준으로만 표시한다.
* GitHub 연동 상태는 API 응답의 linked 필드를 기준으로 표시한다.
* 스크랩 공고 목록은 최신 데이터 기준으로 표시한다.
* 스크랩 취소 후 목록 상태는 즉시 갱신되어야 한다.
* 채용공고 상세 조회는 JobNotice 화면으로 이동한다.
* API 응답 구조는 api-schema.md 계약을 따른다.
* 화면 컴포넌트 내부에서 직접 API 호출을 수행하지 않는다.

---

## 5. 연동 계약

* **Member 도메인**: 사용자 기본 정보 제공
* **Profile 도메인**: GitHub 프로필 정보 제공
* **Bookmark 도메인**: 스크랩 공고 데이터 제공
* **JobNotice 도메인**: 채용공고 상세 정보 제공

---

## 6. 금지 패턴

* 화면 컴포넌트 내부에서 직접 API 호출 금지
* Mock 데이터와 실제 API 데이터를 혼용하는 패턴 금지
* 존재하지 않는 GitHub 정보를 연동 상태로 표시하는 패턴 금지
* 스크랩 취소 후 목록 갱신 없이 UI만 변경하는 패턴 금지
* API Schema에 정의되지 않은 필드를 임의로 사용하는 패턴 금지

---

## 7. 품질 및 안정성

* 로딩 상태 UI를 제공한다.
* 오류 상태 UI를 제공한다.
* Empty State UI를 제공한다.
* 반응형 화면을 지원한다.
* API Schema와 TypeScript 타입의 일관성을 유지한다.
* checklist.md 기준 최종 점검 후 PR을 생성한다.
