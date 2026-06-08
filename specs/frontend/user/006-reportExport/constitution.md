# Constitution: Report Export

**Feature Branch**: `006-report-export`

## 1. 도메인 원칙

> 이 도메인이 존재하는 이유와 핵심 책임을 3줄 이내로 정의한다.

- Report Export는 Document Analysis, Interview, Career History 결과를 통합하여 종합 진단 PDF 리포트를 산출하는 도메인이다.
- 이 도메인은 PDF 생성용 데이터 매핑, 리포트 미리보기, PDF 렌더링, 다운로드를 담당한다.
- Report Export는 분석 자체를 수행하지 않으며, 각 도메인의 분석 결과를 통합해 문서화하는 역할만 담당한다.

## 2. 상태 머신

```txt
REQUESTED
  ↓ (리포트 데이터 수집 완료)
MAPPED
  ↓ (PDF 렌더링 시작)
RENDERING
  ↓        ↘
COMPLETED  FAILED
  ↓
DOWNLOADED
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| REQUESTED → MAPPED | 허용 | 리포트 생성 요청 후 각 도메인 데이터가 통합 DTO로 매핑된다. |
| MAPPED → RENDERING | 허용 | 매핑된 데이터를 기반으로 PDF 렌더링을 시작할 수 있다. |
| RENDERING → COMPLETED | 허용 | PDF 생성이 정상 완료되면 완료 상태가 된다. |
| RENDERING → FAILED | 허용 | PDF 생성 중 오류가 발생하면 실패 상태가 된다. |
| COMPLETED → DOWNLOADED | 허용 | 생성된 PDF 파일을 사용자가 다운로드할 수 있다. |
| FAILED → RENDERING | **금지** | 실패 상태에서 직접 렌더링 상태로 되돌릴 수 없다. 재요청이 필요하다. |
| DOWNLOADED → RENDERING | **금지** | 이미 다운로드된 리포트를 렌더링 중 상태로 되돌릴 수 없다. |
| COMPLETED → REQUESTED | **금지** | 완료된 리포트를 최초 요청 상태로 되돌릴 수 없다. |

## 3. 아키텍처 결정

> 왜 이렇게 설계했는지 이유까지 적는다. 이유 없는 결정은 나중에 깨진다.

| 결정 | 내용 | 근거 |
|------|------|------|
| 도메인 통합 DTO 사용 | Document Analysis, Interview, Career History 데이터를 `ReportExportDataDto`로 통합한다. | PDF 생성에 필요한 데이터 구조를 일관되게 관리하기 위함이다. |
| 분석 책임 분리 | Report Export는 분석을 수행하지 않고 기존 분석 결과만 사용한다. | 도메인 책임이 중복되는 것을 방지한다. |
| PDF 생성 상태 관리 | 리포트 생성 상태를 `ReportExportStatus` Enum으로 관리한다. | 생성 요청, 렌더링, 완료, 실패, 다운로드 상태를 명확히 추적하기 위함이다. |
| 파일 타입 분리 | PDF 파일 타입은 `ReportFileType` Enum으로 관리한다. | 추후 다른 파일 형식이 추가될 가능성에 대비한다. |
| 미리보기와 다운로드 분리 | PDF 미리보기 데이터 조회와 실제 다운로드 API를 분리한다. | 화면 렌더링과 파일 응답의 책임을 분리하기 위함이다. |
| mock data 우선 허용 | 백엔드 API 연동 전 프론트엔드에서는 mock data로 PDF 미리보기 화면을 구성할 수 있다. | UI 개발과 백엔드 개발을 병렬로 진행하기 위함이다. |

## 4. 불변 규칙 (Invariants)

> "항상 참이어야 하는 조건"을 나열한다. 코드 어디서든 이 규칙이 깨지면 버그다.

- PDF 생성 상태 변경은 반드시 `ReportExportService`를 통과한다. Repository 직접 상태 변경은 금지한다.
- Report Export는 Document Analysis, Interview, Career History의 데이터를 직접 수정하지 않는다.
- Report Export는 각 도메인의 결과 데이터를 읽고 PDF 생성용 DTO로 매핑하는 역할만 수행한다.
- PDF 생성 요청은 반드시 사용자 식별자 `userId`와 연결되어야 한다.
- PDF 리포트에는 최소한 사용자 정보와 생성일, 리포트 제목이 포함되어야 한다.
- 일부 데이터가 누락되어도 PDF 생성 화면 또는 미리보기 화면은 깨지지 않아야 한다.
- PDF 다운로드는 생성 완료 상태인 리포트에 대해서만 허용한다.
- Entity를 Controller 응답으로 직접 반환하지 않는다.

## 5. 연동 계약

> 다른 도메인 또는 외부 시스템과의 경계를 명시한다.

- Document Analysis 도메인에서 자기소개서 분석 점수, 피드백, 개선 포인트를 제공받는다.
- Interview 도메인에서 면접 점수, 답변 분석, 태도 피드백, 개선 필요 답변 데이터를 제공받는다.
- Career History 도메인에서 누적 성장 추이, 평균 점수, 우선 학습 타겟, 로드맵 요약 데이터를 제공받는다.
- PDF 생성 방식은 팀 결정에 따라 백엔드 템플릿 엔진 또는 프론트엔드 `html2canvas`, `jsPDF` 방식을 적용한다.
- 인증 및 사용자 식별은 기존 Auth/User 도메인의 구조를 따른다.
- 파일 다운로드 응답은 프론트엔드에서 처리 가능한 형식으로 제공되어야 한다.

## 6. 금지 패턴

> 실수하기 쉬운 안티패턴을 명시한다.

- Swagger 어노테이션을 Controller에 직접 작성 금지 → `docs/ReportExportDocs.java` 인터페이스로 분리.
- Controller에서 Repository 직접 호출 금지.
- Controller에서 PDF 생성 비즈니스 로직 작성 금지.
- Entity를 API 응답으로 직접 반환 금지.
- 상태값을 문자열로 직접 비교하거나 하드코딩 금지 → Enum 사용.
- Report Export에서 Document Analysis, Interview, Career History 원본 데이터를 수정하는 행위 금지.
- PDF 생성 실패 시 단순 콘솔 로그만 남기고 사용자 안내를 생략하는 방식 금지.
- 데이터 누락 시 화면 또는 PDF가 깨지는 방식 금지.
- 다운로드 가능한 리포트인지 상태 확인 없이 파일 다운로드를 허용하는 방식 금지.