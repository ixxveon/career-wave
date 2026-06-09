# Constitution: 관리자 AI 매트릭스

## 목적

관리자 AI 매트릭스는 CareerWave의 AI 기능 사용량을 도메인별로 모니터링하기 위한 관리자 화면이다.  
MVP의 중심은 실제 모델 비용 정산이나 모델 관리가 아니라, 어떤 AI 도메인에서 요청, 토큰, 비용 추정치, 오류가 증가하는지 운영자가 빠르게 파악하는 것이다.

## 모니터링 대상 도메인

| Domain | Label | Description |
|--------|-------|-------------|
| `DOCUMENT` | AI 서류 기능 | 자기소개서, 이력서, 서류 분석 등 사용자 서류 AI 사용량 |
| `INTERVIEW` | AI 면접 기능 | AI 면접 질문, 답변 분석, 피드백 등 면접 AI 사용량 |

## 불변 규칙

- AI 매트릭스의 1차 분류 기준은 모델명이 아니라 도메인이다.
- 실제 모델명은 외부 API 변경에 따라 바뀔 수 있으므로 주요 통계 그룹 기준으로 사용하지 않는다.
- 비용은 정산용 데이터가 아니라 운영 참고용 추정치로 표시한다.
- 프롬프트 원문, 면접 답변 전문, 지원자 개인정보는 로그와 테이블에 노출하지 않는다.
- 사용자 식별자는 내부 식별자 또는 마스킹된 값으로 표시한다.
- API 실패 시 mock 데이터로 조용히 대체하지 않고 로딩, 실패, 빈 상태를 구분해 표시한다.

## 모델명 분리 원칙

- `displayModelName`: 관리자 화면에 표시할 모델 이름
- `actualModelName`: 실제 AI API 호출에 사용된 모델 이름

표시 우선순위:

1. `displayModelName`이 있으면 화면에는 `displayModelName`을 표시한다.
2. `displayModelName`이 없고 `actualModelName`만 있으면 MVP에서는 `actualModelName`을 대체 표시할 수 있다.
3. `actualModelName`은 상세 로그, 장애 분석, 비용 근거 확인 영역에서만 보조 정보로 사용한다.

## 보안 원칙

- 모든 관리자 AI 매트릭스 API는 JWT 인증과 `ROLE_ADMIN` 권한을 요구한다.
- 인증 사용자 정보는 Controller에서 임의 파싱하지 않고 Security Context 또는 공통 인증 유틸리티로 조회한다.
- 관리자 API는 `ApiResponse<T>` 형식을 따른다.
- 민감 정보가 포함될 수 있는 원문 데이터는 API 응답에 포함하지 않는다.

## 프론트엔드 원칙

- 페이지 또는 컴포넌트에서 `axios`를 직접 호출하지 않는다.
- 도메인별 API 호출은 `frontend/src/api/admin/aiMetricsApi.ts`에 둔다.
- 서버 상태는 TanStack Query 사용을 우선한다.
- TypeScript interface는 PascalCase를 사용하고 `I` prefix를 붙이지 않는다.
- 기존 관리자 레이아웃, 카드, 테이블, 페이지네이션 패턴을 우선 재사용한다.

## Phase 브랜치 원칙

- 기본 브랜치 생성 원칙은 항상 최신 `develop` 기준이다.
- Phase 1은 최신 `develop`에서 생성한다.
- Phase 2 이후 브랜치는 직전 Phase 최신 커밋을 기준으로 생성한다.
- 이전 Phase PR이 병합되면 후속 브랜치는 최신 base로 rebase 또는 base 변경한다.
- 각 PR은 하나의 Phase 목적만 포함한다.

## 스택 브랜치 허용 조건

AI 매트릭스 구현은 API 계약, 도메인 사용량, 비용/알림, 로그/이상 사용량, RAG 문서 관리가 순차 의존성을 가지므로 팀 합의가 있는 경우에만 Phase별 스택 브랜치로 진행한다.
