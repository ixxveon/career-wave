# Checklist: Report Export

> tasks.md가 "무엇을 만들지"라면, 이 파일은 "제대로 만들었는지" 검증한다.
> 구현 완료 후 PR 올리기 전에 작성자 본인이 체크한다.

## Phase 1 — 통합 데이터 구조 설계

- [ ] Report Export 도메인의 핵심 기능 범위가 명확히 정의되었는가?
- [ ] PDF 리포트에 포함될 데이터 항목이 정리되었는가?
- [ ] Document Analysis 결과 데이터 구조를 확인했는가?
- [ ] Interview 결과 데이터 구조를 확인했는가?
- [ ] Career History 결과 데이터 구조를 확인했는가?
- [ ] 세 도메인의 데이터를 하나의 PDF 생성용 DTO로 매핑하는 구조가 설계되었는가?
- [ ] PDF 리포트 미리보기 화면에 필요한 데이터 구조가 정의되었는가?
- [ ] 일부 데이터가 누락된 경우 기본 안내 문구 처리 방식이 정의되었는가?

## Phase 2 — 엔티티 & 레포지토리

- [ ] `ReportExport` 엔티티 필드 및 제약조건이 적용되었는가?
- [ ] `ReportExportRequestDto`가 작성되었는가?
- [ ] `ReportExportResponseDto`가 작성되었는가?
- [ ] `ReportExportDataDto`가 작성되었는가?
- [ ] `DocumentAnalysisReportDataDto`가 작성되었는가?
- [ ] `InterviewReportDataDto`가 작성되었는가?
- [ ] `CareerHistoryReportDataDto`가 작성되었는가?
- [ ] `ReportExportStatus` enum이 정의되었는가?
- [ ] `ReportFileType` enum이 정의되었는가?
- [ ] `ReportExportRepository`가 작성되었는가?
- [ ] PDF 파일명 생성 규칙이 정의되었는가?
- [ ] PDF 생성 상태값 처리 흐름이 정의되었는가?

## Phase 3 — 핵심 API

- [ ] 종합 진단 리포트 생성 엔드포인트가 구현되었는가?
- [ ] Document Analysis 결과 조회 및 매핑 로직이 구현되었는가?
- [ ] Interview 결과 조회 및 매핑 로직이 구현되었는가?
- [ ] Career History 결과 조회 및 매핑 로직이 구현되었는가?
- [ ] 통합 DTO 생성 로직이 구현되었는가?
- [ ] PDF 템플릿 데이터 변환 로직이 구현되었는가?
- [ ] 정상 케이스 응답에서 `ApiResponse<T>` 래퍼를 사용하는가?
- [ ] 예외 케이스가 `BusinessException(ErrorCode.XXX)` 패턴으로 처리되는가?
- [ ] 데이터 누락 시 기본 안내 문구가 반환되는가?

## Phase 4 — 부가 API & 프론트엔드 화면

- [ ] PDF 미리보기 데이터 조회 엔드포인트가 구현되었는가?
- [ ] PDF 다운로드 엔드포인트가 구현되었는가?
- [ ] PDF 생성 실패 시 예외 처리 로직이 구현되었는가?
- [ ] `ReportExportPage.jsx`에서 종합 진단 리포트 생성 화면이 렌더링되는가?
- [ ] Document Analysis, Interview, Career History 통합 결과 요약 UI가 구현되었는가?
- [ ] `ReportPreviewPage.jsx`에서 PDF 미리보기 화면이 렌더링되는가?
- [ ] 자기소개서 분석 결과 영역이 표시되는가?
- [ ] 면접 분석 결과 영역이 표시되는가?
- [ ] 취업 히스토리 및 성장 추이 영역이 표시되는가?
- [ ] 맞춤형 로드맵 요약 영역이 표시되는가?
- [ ] PDF 생성 버튼 UI가 구현되었는가?
- [ ] PDF 다운로드 버튼 UI가 구현되었는가?
- [ ] PDF 생성 실패 안내 메시지 UI가 구현되었는가?
- [ ] mock data 기준으로 화면이 깨지지 않고 출력되는가?

## Phase 5 — 문서화 & 테스트

- [ ] `ReportExportDocs` 인터페이스가 작성되었는가?
- [ ] Controller에 Swagger 어노테이션을 직접 작성하지 않았는가?
- [ ] 종합 진단 리포트 생성 API 문서가 작성되었는가?
- [ ] PDF 미리보기 데이터 조회 API 문서가 작성되었는가?
- [ ] PDF 다운로드 API 문서가 작성되었는가?
- [ ] 정상 케이스 통합 테스트가 작성되었는가?
- [ ] PDF 생성 실패 케이스 테스트가 작성되었는가?
- [ ] 데이터 누락 케이스 테스트가 작성되었는가?
- [ ] 중복 다운로드 케이스 테스트가 작성되었는가?
- [ ] PDF 파일명과 다운로드 응답 형식을 확인했는가?

## 코드 품질

- [ ] `ApiResponse<T>` 래퍼 누락 엔드포인트가 없는가?
- [ ] `BusinessException(ErrorCode.XXX)` 패턴을 준수했는가?
- [ ] 컨트롤러에서 직접 `ResponseEntity`를 반환하지 않는가?
- [ ] 비즈니스 로직이 서비스 레이어에만 존재하는가?
- [ ] PDF 생성용 DTO와 프론트엔드 미리보기 데이터 구조가 일치하는가?
- [ ] Document Analysis, Interview, Career History 데이터 의존 관계가 명확한가?
- [ ] `global/`에서 `domain/`을 참조하지 않는가?
- [ ] 기존 사용자 페이지와 관리자 페이지에 영향을 주지 않는가?

## 머지 전 최종 확인

- [ ] `contracts/api-spec.json`이 실제 구현과 일치하는가?
- [ ] `constitution.md` 불변 규칙과 실제 구현이 일치하는가?
- [ ] PR 제목 형식을 준수했는가? 예: `[006] Report Export API 구현`
- [ ] tasks.md 모든 항목이 완료 체크되었는가?
- [ ] 브라우저 콘솔에 React 렌더링 오류 또는 import 오류가 없는가?
- [ ] `npm run dev` 실행 시 PDF 리포트 관련 사용자 페이지가 정상 렌더링되는가?
- [ ] PDF 다운로드 버튼 클릭 시 기대한 동작이 수행되는가?