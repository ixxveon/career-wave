# Feature Specification: 관리자 AI 매트릭스

**Feature Branch**: `feature/admin-ai-metrics-spec`
**Status**: 스펙 완료
**Page**: `frontend/src/admin/pages/AiMetrics/AiMetricsPage.tsx`
**Route**: `/admin/ai`

## Overview

관리자 AI 매트릭스는 AI 서류 기능과 AI 면접 기능의 사용량을 도메인별로 모니터링하는 화면이다. 현재 화면의 LLM 비용 컨트롤러, 토큰 차트, 헤비 유저 트래커, RAG 지식 베이스, 이벤트 로그를 도메인 기반 운영 모니터링 구조로 정리한다.

현재 구현에는 실제 모델명이 화면에 표시될 수 있다. 그러나 추후 DB에서는 화면 표시용 모델명과 실제 호출 모델명을 분리할 예정이므로, 스펙은 `displayModelName`과 `actualModelName`을 구분한다.

## User Scenarios & Testing

### User Story 1 - 도메인별 AI 사용량 확인 (Priority: P1)

관리자는 AI 서류 기능과 AI 면접 기능의 요청 수, 토큰 사용량, 비용 추정치를 한 화면에서 비교한다.

**Acceptance Scenarios**:

1. **Given** 관리자가 AI 매트릭스 화면에 진입하면, **When** 도메인 사용량 조회가 성공한다, **Then** 두 AI 도메인 카드가 표시된다.
2. **Given** 특정 도메인의 실패율이 임계치를 넘으면, **When** 도메인 카드가 표시된다, **Then** 위험 상태가 `WARNING` 또는 `CRITICAL`로 표시된다.

### User Story 2 - 토큰 및 비용 추이 확인 (Priority: P1)

관리자는 시간대별 입력/출력 토큰과 비용 추이를 확인해 사용량 급증 구간을 파악한다.

**Acceptance Scenarios**:

1. **Given** 전체 도메인 조회 상태, **When** 토큰 추이 API가 성공한다, **Then** 입력 토큰과 출력 토큰이 구분된 차트가 표시된다.
2. **Given** 관리자가 도메인 필터를 선택하면, **When** 추이 데이터가 다시 조회된다, **Then** 선택한 도메인의 데이터만 차트에 반영된다.

### User Story 3 - 헤비 유저 및 이상 사용량 확인 (Priority: P2)

관리자는 사용량이 높은 사용자와 이상 사용량 사용자를 확인하고 운영 조치가 필요한 대상을 식별한다.

**Acceptance Scenarios**:

1. **Given** 헤비 유저 조회가 성공하면, **When** 테이블이 표시된다, **Then** 마스킹된 사용자 식별자, 도메인, 토큰 사용량, 위험도가 표시된다.
2. **Given** 사용자의 위험도가 `CRITICAL`이면, **When** 행이 표시된다, **Then** 위험 상태가 강조된다.

### User Story 4 - AI 운영 로그 확인 (Priority: P2)

관리자는 최근 AI 호출 이벤트와 장애 징후를 로그 형태로 확인한다.

**Acceptance Scenarios**:

1. **Given** 로그 조회가 성공하면, **When** 로그 콘솔이 표시된다, **Then** 발생 시각, 도메인, 등급, 메시지가 표시된다.
2. **Given** 로그 메시지에 민감 정보가 포함될 수 있는 상황, **When** 응답 데이터가 내려온다, **Then** 프롬프트 원문과 개인정보는 포함되지 않는다.

### User Story 5 - 비용 예산 및 알림 상태 확인 (Priority: P3)

관리자는 월간 예산, 예상 비용, 알림 임계치, 디스코드 알림 상태를 확인하고 운영 설정을 변경한다.

**Acceptance Scenarios**:

1. **Given** 현재 사용 비용이 임계치 이상이면, **When** 예산 영역이 표시된다, **Then** 위험 상태와 예상 초과 여부가 표시된다.
2. **Given** 관리자가 디스코드 알림 상태를 변경하면, **When** 저장 API가 성공한다, **Then** 변경된 알림 상태가 화면에 반영된다.

### User Story 6 - 모델 표시명과 실제 모델명 구분 (Priority: P3)

관리자는 화면에서 비즈니스 표시용 모델명을 확인하고, 상세 진단이 필요할 때 실제 호출 모델명을 확인한다.

**Acceptance Scenarios**:

1. **Given** `displayModelName`이 존재하면, **When** 도메인 카드와 로그가 표시된다, **Then** 화면에는 `displayModelName`이 우선 표시된다.
2. **Given** `displayModelName`이 없고 `actualModelName`만 존재하면, **When** MVP 화면이 표시된다, **Then** `actualModelName`을 대체 표시하되 통계 기준은 도메인으로 유지한다.

## Edge Cases

- 조회 기간 기본값은 최근 7일이며, 최대 조회 기간은 90일로 제한한다. `to - from`이 90일을 초과하면 "조회 기간은 최대 90일을 초과할 수 없습니다." 오류를 표시한다.
- 특정 도메인 데이터가 없으면 0 값과 빈 상태를 표시한다.
- API 실패 시 실패 상태와 재시도 동선을 표시한다.
- 실제 모델명이 변경되어도 도메인별 통계와 필터가 유지되어야 한다.
- 비용 단가가 없으면 `estimatedCost`, `currentSpend`, `forecastSpend`는 `null`로 처리하고 비용 영역은 추정 불가 상태로 표시한다.
- 로그에는 프롬프트 원문, 면접 답변 전문, 개인정보를 표시하지 않는다.

## Functional Requirements

- **FR-001**: 관리자는 전체 AI 사용량 요약을 확인할 수 있어야 한다.
- **FR-002**: 관리자는 `DOCUMENT`, `INTERVIEW`별 사용량을 확인할 수 있어야 한다.
- **FR-003**: 관리자는 시간대별 입력/출력 토큰 추이를 확인할 수 있어야 한다.
- **FR-004**: 관리자는 도메인별 요청 수, 실패율, 평균 응답 시간을 확인할 수 있어야 한다.
- **FR-005**: 관리자는 비용 추정치, 월간 예산, 예상 비용을 확인할 수 있어야 한다.
- **FR-006**: 관리자는 헤비 유저와 이상 사용량 사용자를 확인할 수 있어야 한다.
- **FR-007**: 관리자는 최근 AI 운영 로그를 도메인과 등급 기준으로 확인할 수 있어야 한다.
- **FR-008**: 관리자는 디스코드 알림과 사용량 제한 상태를 변경할 수 있어야 한다.
- **FR-009**: 화면은 `displayModelName`과 `actualModelName`을 구분해 처리해야 한다.
- **FR-010**: 관리자는 관리자 RAG 지식 베이스 인덱싱 상태를 확인할 수 있어야 한다.

## Key Entities

- **AiMetricSummary**: 전체 요청 수, 성공/실패 수, 토큰, 비용, 평균 지연 시간, 상태
- **AiDomainUsage**: 도메인별 요청 수, 토큰, 비용, 실패율, 위험도, 모델명
- **AiTokenTrendPoint**: 시간 버킷별 입력/출력 토큰, 비용, 요청 수
- **AiHeavyUser**: 마스킹 사용자 식별자, 도메인, 토큰 사용량, 위험도
- **AiMetricLog**: 발생 시각, 도메인, 등급, 메시지, 모델명
- **AiBudgetSetting**: 월간 예산, 현재 비용, 예상 비용, 임계치, 알림 상태
- **RagDocumentMetric**: 문서명, 청크 수, 인덱싱 진행률, 상태

## Success Criteria

- **SC-001**: 화면 진입 후 주요 요약 데이터가 1초 이내 렌더링된다.
- **SC-002**: 두 AI 도메인의 사용량이 카드와 차트에서 명확히 구분된다.
- **SC-003**: 실제 모델명이 바뀌어도 도메인별 통계와 필터가 정상 동작한다.
- **SC-004**: API 실패, 빈 데이터, 권한 오류 상태가 구분되어 표시된다.
- **SC-005**: 민감 데이터가 로그와 테이블에 노출되지 않는다.

## Assumptions

- AI 사용 로그와 비용 추정 데이터는 백엔드 Admin API가 집계해 제공한다.
- MVP에서는 비용을 추정치로 표시하며 실제 청구 정산 기능은 포함하지 않는다.
- 표시용 모델명 DB 분리는 후속 백엔드 작업에서 진행될 수 있으므로 프론트엔드는 두 필드를 모두 수용한다.
