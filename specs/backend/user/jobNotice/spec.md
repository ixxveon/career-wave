# Feature Specification: jobNotice

**Feature Branch**: `docs/user-jobnotice-spec-refine`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 공개 채용 공고 조회 (Priority: P1)

> 사용자는 로그인 여부와 관계없이 공개 중인 채용 공고를 목록과 상세 화면에서 조회할 수 있다.

**Acceptance Scenarios**:
1. **Given** `notice_status = ACTIVE` 상태의 채용 공고가 존재하는 경우, **When** 사용자가 목록 조회를 요청하면, **Then** 시스템은 공개 가능한 공고만 `ApiResponse` 페이지네이션 구조로 반환한다.
2. **Given** 사용자가 특정 채용 공고 상세 조회를 요청한 경우, **When** 해당 공고가 `ACTIVE` 상태이면, **Then** 시스템은 상세 정보와 현재 사용자 기준 북마크 여부를 반환한다.
3. **Given** 비로그인 사용자가 목록 또는 상세 조회를 요청한 경우, **When** 조회 대상 공고가 공개 상태이면, **Then** 시스템은 인증 없이 조회를 허용하고 `bookmarked` 값을 `false`로 반환한다.
4. **Given** 사용자가 존재하지 않거나 사용자에게 노출되지 않는 채용 공고를 상세 조회하는 경우, **When** 상세 API를 호출하면, **Then** 시스템은 `JOB_NOTICE_NOT_FOUND` 오류 응답을 반환한다.

---

### User Story 2 - 채용 공고 북마크 관리 (Priority: P1)

> 로그인한 사용자는 관심 있는 채용 공고를 북마크로 등록하거나 해제할 수 있다.

**Acceptance Scenarios**:
1. **Given** 로그인한 사용자가 아직 북마크하지 않은 공개 채용 공고를 보고 있는 경우, **When** 북마크 등록을 요청하면, **Then** 시스템은 해당 사용자와 공고의 북마크 관계를 1건 생성한다.
2. **Given** 로그인한 사용자가 이미 북마크한 채용 공고를 보고 있는 경우, **When** 북마크 해제를 요청하면, **Then** 시스템은 기존 북마크 관계를 제거한다.
3. **Given** 로그인한 사용자가 동일 공고에 대해 중복 북마크 등록을 요청한 경우, **When** 시스템이 기존 북마크 관계를 확인하면, **Then** 시스템은 중복 데이터를 생성하지 않고 `BOOKMARK_ALREADY_EXISTS` 오류를 반환한다.
4. **Given** 로그인한 사용자가 존재하지 않는 북마크 관계에 대해 해제를 요청한 경우, **When** 시스템이 해제 대상을 찾지 못하면, **Then** 시스템은 `BOOKMARK_NOT_FOUND` 오류를 반환한다.

---

### User Story 3 - 조건 기반 공고 탐색 (Priority: P2)

> 사용자는 검색어, 분류 조건, 정렬, 페이지네이션을 사용해 원하는 채용 공고를 탐색할 수 있다.

**Acceptance Scenarios**:
1. **Given** 사용자가 `keyword`, `jobType`, `jobCategory`, `careerLevel`, `location`, `companySize`, `period`, `sort` 조건을 입력한 경우, **When** 목록 조회를 요청하면, **Then** 시스템은 확정된 Query Parameter 계약에 맞는 결과만 반환한다.
2. **Given** 사용자가 `page`, `size`를 포함해 목록 조회를 요청한 경우, **When** 페이지네이션이 적용되면, **Then** 시스템은 외부 API 기준 1-based 페이지 정보를 응답하고 내부에서는 `page - 1` 변환 기준으로 처리한다.
3. **Given** 사용자가 로그인 상태로 목록 또는 상세 조회를 요청한 경우, **When** 북마크 관계가 존재하면, **Then** 시스템은 현재 사용자 기준 `bookmarked = true`를 반환한다.

---

### Edge Cases

- 존재하지 않는 `jobNoticeId`로 상세 조회, 북마크 등록, 북마크 해제를 요청하면 어떻게 처리하는가?
- `notice_status = CLOSED` 공고는 목록과 상세에서 모두 사용자에게 비노출 처리되는가?
- 비로그인 요청에서 `bookmarked` 값은 항상 `false`로 유지되는가?
- 동일 사용자와 동일 공고의 북마크 중복 생성은 DB 제약과 애플리케이션 로직 양쪽에서 차단되는가?
- 북마크 해제 요청 시 북마크 관계가 존재하지 않으면 `BOOKMARK_NOT_FOUND`를 반환하는가?
- `jobCategory` Query Parameter는 단일 문자열 입력이지만 `job_notices.job_category` 배열 컬럼 조건으로 해석되는가?
- 목록 조회 응답의 `page` 값은 1-based를 유지하면서 내부 Pageable 변환 시 `page - 1`이 적용되는가?

## Requirements

### Functional Requirements

- **FR-001**: 시스템은 `GET /api/v1/user/job-notices`를 통해 비로그인 사용자에게도 채용 공고 목록 조회 기능을 제공해야 한다.
- **FR-002**: 시스템은 `GET /api/v1/user/job-notices/{jobNoticeId}`를 통해 비로그인 사용자에게도 채용 공고 상세 조회 기능을 제공해야 한다.
- **FR-003**: 시스템은 사용자 조회 대상에서 `job_notices.notice_status = ACTIVE`인 채용 공고만 노출해야 한다.
- **FR-004**: 시스템은 목록 조회 시 `keyword`, `jobType`, `jobCategory`, `careerLevel`, `location`, `companySize`, `period`, `sort`, `page`, `size` Query Parameter 계약을 지원해야 한다.
- **FR-005**: 시스템은 목록 조회 응답을 `ApiResponse<T>` 래퍼와 `content`, `page`, `size`, `totalElements`, `totalPages` 페이지네이션 구조로 반환해야 한다.
- **FR-006**: 시스템은 상세 조회 응답에 채용 공고 식별 정보, 공고 본문 정보, 공고 분류 정보, 원문 URL, 마감일, 현재 사용자 기준 북마크 여부를 포함해야 한다.
- **FR-007**: 시스템은 Optional 인증 API에서 비로그인 요청의 `bookmarked` 값을 항상 `false`로 반환해야 한다.
- **FR-008**: 시스템은 Optional 인증 API에서 로그인 요청 시 현재 로그인 사용자 기준 북마크 여부를 계산해 반환해야 한다.
- **FR-009**: 시스템은 `POST /api/v1/user/job-notices/{jobNoticeId}/bookmarks`를 통해 `USER` 권한 사용자의 북마크 등록 기능을 제공해야 한다.
- **FR-010**: 시스템은 `DELETE /api/v1/user/job-notices/{jobNoticeId}/bookmarks`를 통해 `USER` 권한 사용자의 북마크 해제 기능을 제공해야 한다.
- **FR-011**: 시스템은 북마크 등록 및 해제를 Spring Security의 `ROLE_USER` 권한 사용자에게만 허용해야 한다.
- **FR-012**: 시스템은 동일 사용자와 동일 채용 공고의 북마크 관계를 최대 1건만 허용해야 한다.
- **FR-013**: 시스템은 북마크 등록 시 중복 관계가 존재하면 `BOOKMARK_ALREADY_EXISTS` 오류를 반환해야 한다.
- **FR-014**: 시스템은 북마크 해제 시 대상 관계가 존재하지 않으면 `BOOKMARK_NOT_FOUND` 오류를 반환해야 한다.
- **FR-015**: 시스템은 존재하지 않거나 사용자에게 노출되지 않는 채용 공고에 대한 상세 조회 또는 북마크 요청에 대해 `JOB_NOTICE_NOT_FOUND` 도메인 오류 응답을 반환해야 한다.
- **FR-016**: 시스템은 목록 조회의 검색 조건 조합(`keyword`, `jobType`, `jobCategory`, `careerLevel`, `location`, `companySize`, `period`, `sort`)을 동적으로 처리할 수 있도록 QueryDSL 기반 조회 전략을 사용해야 한다.
- **FR-017**: 시스템은 사용자 JobNotice API와 관련 문서를 `user` 패키지 및 사용자 문맥 범위 안에서 유지해야 하며 관리자 기능 요구사항을 포함하지 않아야 한다.
- **FR-018**: 시스템은 Spring Boot가 사용자 JobNotice 조회 및 북마크 비즈니스 책임을 전담하도록 정의해야 한다.
- **FR-019**: 시스템은 FastAPI가 본 도메인 기능 범위에 참여하지 않으며, Spring Boot와 FastAPI 간 런타임 연동 계약이 없음을 명시해야 한다.
- **FR-020**: 시스템은 외부 채용 플랫폼 원문 URL을 응답 데이터로만 제공하고, 외부 플랫폼 호출 성공 여부를 본 기능의 필수 처리 조건으로 두지 않아야 한다.

### Key Entities

- **JobNotice**: `job_notice_id`, `company_name`, `title`, `description`, `skill_tags`, `job_type`, `company_size`, `job_category`, `career_level`, `location`, `salary`, `notice_status`, `original_url`, `source`, `view_count`, `deadline`, `created_at`, `updated_at` 컬럼을 가지는 채용 공고 엔티티
- **Bookmark**: `bookmark_id`, `member_id`, `job_notice_id`, `created_at` 컬럼을 가지며 사용자와 채용 공고 간 북마크 관계를 관리하는 엔티티

## Success Criteria

- **SC-001**: 사용자 목록 및 상세 조회 응답에는 `notice_status = ACTIVE`인 채용 공고만 100% 포함된다.
- **SC-002**: 비로그인 사용자는 목록 및 상세 조회 API를 호출할 수 있고, 응답의 `bookmarked` 값은 100% `false`로 반환된다.
- **SC-003**: 로그인 사용자의 북마크 등록 요청 성공 시 `(member_id, job_notice_id)` 관계가 정확히 1건 생성된다.
- **SC-004**: 로그인 사용자의 북마크 해제 요청 성공 시 `(member_id, job_notice_id)` 관계가 정확히 1건 삭제된다.
- **SC-005**: 중복 북마크 등록 요청은 추가 데이터 생성 없이 `BOOKMARK_ALREADY_EXISTS` 오류로 처리된다.
- **SC-006**: 존재하지 않는 북마크 해제 요청은 `BOOKMARK_NOT_FOUND` 오류로 처리된다.
- **SC-007**: 사용자에게 노출되지 않는 공고 상세 조회 또는 북마크 요청은 `JOB_NOTICE_NOT_FOUND` 오류로 처리된다.
- **SC-008**: 모든 목록 조회 응답은 `content`, `page`, `size`, `totalElements`, `totalPages` 필드를 포함하며 `page`는 1-based 기준을 유지한다.
- **SC-009**: 모든 사용자 JobNotice API 성공 응답은 `ApiResponse<T>` 래퍼 구조에서 `success`, `message`, `data` 필드를 사용하고 성공 응답에 `statusCode`를 포함하지 않는다.

## Assumptions

- `fastapi-schema.md`가 없으므로 본 스펙은 Spring Boot 기준으로만 작성하며, JobNotice 사용자 기능에 대한 FastAPI 책임은 없다.
- Spring Boot는 채용 공고 조회, 북마크 관계 처리, Optional 인증 응답 계산, 도메인 ErrorCode 반환 책임을 가진다.
- FastAPI는 본 도메인 범위에서 조회, 북마크, 개인화 응답 계산, 외부 시스템 연동 책임을 가지지 않는다.
- 외부 연동 시스템은 채용 공고 `original_url`이 가리키는 외부 채용 플랫폼이며, 본 범위에서는 링크 제공만 다루고 외부 플랫폼 API 호출이나 상태 동기화는 범위 외다.
- 현재 프론트엔드가 사용하는 JobNotice 구계약(`PATCH /bookmark`, `statusCode`, `items`, `totalItems` 등)은 최신 백엔드 스펙 기준으로 후속 마이그레이션 대상이다.
- 관리자용 채용 공고 운영 기능, 스크래핑 파이프라인, AI 메트릭스, 감사 로그, 프론트엔드 마이그레이션 구현은 v1 범위 외다.
