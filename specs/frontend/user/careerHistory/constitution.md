# Constitution: Career History

**Feature Branch**: `005-career-history`

## 1. 도메인 원칙

> 이 도메인이 존재하는 이유와 핵심 책임을 3줄 이내로 정의한다.

- Career History는 사용자의 취업 준비 활동 기록을 누적 저장하고 재조회하는 도메인이다.
- 이 도메인은 면접 연습 기록, 질문-답변 매칭 데이터, AI 피드백, 누적 역량 평가, 맞춤형 로드맵을 관리한다.
- Career History는 기록과 분석 결과를 제공하며, PDF 산출 자체는 Report Export 도메인에서 담당한다.

## 2. 상태 머신

```txt
CREATED
  ↓ (면접 연습 또는 분석 데이터 저장 완료)
ANALYZED
  ↓ (누적 평가 및 로드맵 생성 완료)
COMPLETED
  ↘
ARCHIVED
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| CREATED → ANALYZED | 허용 | 기본 기록 저장 후 AI 분석 결과가 생성될 수 있다. |
| ANALYZED → COMPLETED | 허용 | 분석 결과와 로드맵이 생성되면 완료 상태가 될 수 있다. |
| COMPLETED → ARCHIVED | 허용 | 사용자가 오래된 기록을 보관 처리할 수 있다. |
| ARCHIVED → COMPLETED | 허용 | 보관된 기록을 다시 활성화할 수 있다. |
| COMPLETED → CREATED | **금지** | 이미 완료된 기록을 초기 생성 상태로 되돌릴 수 없다. |
| ANALYZED → CREATED | **금지** | 분석된 데이터가 있는 기록을 미분석 상태로 되돌릴 수 없다. |

## 3. 아키텍처 결정

> 왜 이렇게 설계했는지 이유까지 적는다. 이유 없는 결정은 나중에 깨진다.

| 결정 | 내용 | 근거 |
|------|------|------|
| 도메인 분리 | Career History는 취업 준비 기록과 누적 평가만 담당한다. | PDF 생성 책임은 Report Export에 있으므로 관심사를 분리한다. |
| Entity와 DTO 분리 | Controller 응답에 Entity를 직접 노출하지 않고 Response DTO를 사용한다. | DB 구조 변경이 화면/API 응답에 직접 영향을 주지 않도록 하기 위함이다. |
| Service 중심 상태 변경 | 기록 생성, 분석 상태 변경, 로드맵 생성은 Service를 통해 처리한다. | 상태 변경 규칙을 한 곳에서 관리하기 위함이다. |
| Repository 직접 접근 제한 | Controller에서 Repository를 직접 호출하지 않는다. | 비즈니스 로직이 Controller에 흩어지는 것을 방지한다. |
| mock data 우선 허용 | 백엔드 API 연동 전 프론트엔드에서는 mock data로 화면을 구성할 수 있다. | 사용자 화면을 선구현하고 API 확정 후 연동하기 위함이다. |
| 날짜별/기업별 조회 지원 | 기록 목록은 날짜별 또는 기업별로 조회할 수 있게 설계한다. | 사용자가 과거 취업 준비 흐름을 쉽게 탐색할 수 있어야 하기 때문이다. |

## 4. 불변 규칙 (Invariants)

> "항상 참이어야 하는 조건"을 나열한다. 코드 어디서든 이 규칙이 깨지면 버그다.

- 상태 변경은 반드시 `CareerHistoryService`를 통과한다. Repository 직접 상태 변경은 금지한다.
- `CareerHistory`는 반드시 사용자 식별자 `userId`와 연결되어야 한다.
- 면접 연습 기록은 반드시 하나의 `CareerHistory` 기록과 연결되어야 한다.
- AI 피드백은 원본 질문-답변 데이터와 분리하여 관리하되, 조회 시 함께 응답할 수 있어야 한다.
- 완료된 기록의 원본 스크립트와 질문-답변 매칭 데이터는 임의로 삭제하지 않는다.
- Entity를 Controller 응답으로 직접 반환하지 않는다.
- 프론트엔드 화면은 데이터가 없거나 일부 누락되어도 깨지지 않아야 한다.
- Career History 도메인은 PDF 파일 생성이나 다운로드를 직접 수행하지 않는다.

## 5. 연동 계약

> 다른 도메인 또는 외부 시스템과의 경계를 명시한다.

- Document Analysis 도메인으로부터 서류 분석 점수와 피드백 데이터를 참조할 수 있다.
- Interview 도메인으로부터 면접 질문, 답변, 태도 분석, AI 피드백 데이터를 참조할 수 있다.
- Report Export 도메인은 Career History의 누적 기록, 성장 추이, 로드맵 데이터를 PDF 리포트 생성에 사용할 수 있다.
- FastAPI 또는 AI 분석 서버가 제공한 피드백 결과는 Career History에 저장 가능한 형태로 가공되어야 한다.
- 인증 및 사용자 식별은 기존 Auth/User 도메인의 구조를 따른다.

## 6. 금지 패턴

> 실수하기 쉬운 안티패턴을 명시한다.

- Swagger 어노테이션을 Controller에 직접 작성 금지 → `docs/CareerHistoryDocs.java` 인터페이스로 분리.
- Controller에서 Repository 직접 호출 금지.
- Controller에서 비즈니스 로직 작성 금지.
- Entity를 API 응답으로 직접 반환 금지.
- 상태값을 문자열로 직접 비교하거나 하드코딩 금지 → Enum 사용.
- `CareerHistory` 도메인에서 PDF 생성 또는 파일 다운로드 로직 작성 금지.
- 데이터가 없을 때 빈 화면 또는 에러 화면만 노출하는 방식 금지 → 빈 상태 안내 UI 제공.
- 프론트엔드에서 관리자 페이지 또는 다른 도메인 파일을 임의 수정 금지.