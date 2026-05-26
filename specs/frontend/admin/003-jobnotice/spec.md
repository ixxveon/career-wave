# Feature Specification: 채용 공고 (JobNotice)

**Feature Branch**: `003-jobnotice`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 공고 목록 조회 (Priority: P1)

관리자는 전체 채용 공고를 상태/출처별로 조회할 수 있다.

**Acceptance Scenarios**:
1. **Given** 관리자 로그인 상태, **When** 공고 목록 조회, **Then** 페이징된 공고 목록 반환
2. **Given** source=CRAWLED 필터, **When** 조회, **Then** 크롤링 공고만 반환

---

### User Story 2 - 공고 승인/반려 (Priority: P1)

관리자는 기업이 직접 등록한 공고를 검토 후 게시하거나 반려한다.

**Acceptance Scenarios**:
1. **Given** DRAFT 상태 공고, **When** 승인, **Then** 상태 PUBLISHED로 변경
2. **Given** DRAFT 상태 공고, **When** 반려, **Then** 상태 REJECTED로 변경

---

### User Story 3 - 크롤링 공고 이관 (Priority: P2)

FastAPI가 수집한 크롤링 데이터를 공고로 등록한다.

**Acceptance Scenarios**:
1. **Given** FastAPI가 DB에 저장한 크롤링 데이터, **When** 이관 API 호출, **Then** source=CRAWLED 공고로 자동 등록

---

### Edge Cases
- 마감일이 지난 공고를 승인하면?
- 동일 URL의 크롤링 공고 중복 등록 시도 시?

## Requirements

### Functional Requirements
- **FR-001**: 공고 목록을 상태/출처별 필터링 및 페이징으로 조회한다.
- **FR-002**: 공고 상세 내용을 조회할 수 있다.
- **FR-003**: DRAFT 공고를 승인(PUBLISHED) 또는 반려(REJECTED)할 수 있다.
- **FR-004**: source=DIRECT(기업 직접 등록), source=CRAWLED(스크래핑) 두 가지를 구분한다.
- **FR-005**: 크롤링 공고 이관 API를 제공한다.

### Key Entities
- **JobNotice**: id, company(FK), title, content, position, deadline, status, source

## Success Criteria
- **SC-001**: 공고 목록 조회 응답 1초 이하
- **SC-002**: 크롤링 이관 처리 시 중복 공고 방지

## Assumptions
- 크롤링 데이터는 FastAPI가 DB에 직접 저장하며, 어드민 백엔드는 이관 처리만 담당한다.
