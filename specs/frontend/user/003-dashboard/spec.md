# Feature Specification: Dashboard

**Feature Branch**: `feature/user-dashboard-docs`
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - 내 정보 관리 조회 (Priority: P1)

> 사용자는 자신의 계정 정보와 GitHub 연동 상태를 확인하여 계정 상태를 관리할 수 있다.

**Acceptance Scenarios**:

1. **Given** 사용자가 마이페이지에 접속한 상태에서, **When** 내 정보 관리 화면을 조회하면, **Then** 이름, 이메일, 휴대폰 번호, 가입일 정보를 확인할 수 있다.

2. **Given** 사용자가 내 정보 관리 화면에 접속한 상태에서, **When** 계정 상태 영역을 조회하면, **Then** 회원 유형, 로그인 방식, 알림 수신 여부, 계정 상태를 확인할 수 있다.

3. **Given** 사용자가 GitHub를 연동한 상태에서, **When** GitHub 연동 정보를 조회하면, **Then** GitHub ID, GitHub URL, 연동 상태를 확인할 수 있다.

---

### User Story 2 - 스크랩 공고 관리 (Priority: P1)

> 사용자는 저장한 채용공고를 조회하고 관리할 수 있다.

**Acceptance Scenarios**:

1. **Given** 사용자가 스크랩한 공고가 존재하는 경우, **When** 스크랩 공고 화면에 접속하면, **Then** 스크랩한 채용공고 목록을 확인할 수 있다.

2. **Given** 사용자가 검색어를 입력한 경우, **When** 공고 검색을 수행하면, **Then** 조건에 맞는 스크랩 공고만 조회된다.

3. **Given** 사용자가 특정 공고를 선택한 경우, **When** 상세보기 버튼을 클릭하면, **Then** 해당 공고의 상세 페이지로 이동한다.

4. **Given** 사용자가 스크랩을 취소하려는 경우, **When** 북마크 버튼을 클릭하면, **Then** 스크랩 목록에서 제거된다.

---

### Edge Cases

* 사용자의 계정 정보 조회에 실패하면 어떻게 처리할 것인가?
* GitHub 연동 정보가 존재하지 않으면 어떻게 표시할 것인가?
* 스크랩한 공고가 하나도 없으면 어떤 화면을 보여줄 것인가?
* 검색 결과가 존재하지 않으면 어떤 메시지를 표시할 것인가?
* 삭제된 채용공고가 스크랩 목록에 존재하는 경우 어떻게 처리할 것인가?

## Requirements

### Functional Requirements

* **FR-001**: 사용자는 자신의 기본 계정 정보를 조회할 수 있어야 한다.
* **FR-002**: 사용자는 자신의 계정 상태 정보를 조회할 수 있어야 한다.
* **FR-003**: 사용자는 GitHub 연동 정보를 조회할 수 있어야 한다.
* **FR-004**: 사용자는 자신의 회원 정보를 수정할 수 있어야 한다.
* **FR-005**: 사용자는 GitHub 연동 관리 기능을 사용할 수 있어야 한다.
* **FR-006**: 사용자는 스크랩한 채용공고 목록을 조회할 수 있어야 한다.
* **FR-007**: 사용자는 스크랩 공고를 검색할 수 있어야 한다.
* **FR-008**: 사용자는 스크랩 공고를 최신순으로 정렬할 수 있어야 한다.
* **FR-009**: 사용자는 채용공고 상세 페이지로 이동할 수 있어야 한다.
* **FR-010**: 사용자는 스크랩한 공고를 삭제할 수 있어야 한다.

### Key Entities

* **User**

  * userId
  * name
  * email
  * phone
  * joinDate
  * memberType
  * loginType
  * notificationEnabled
  * accountStatus

* **GithubProfile**

  * githubId
  * githubUrl
  * linked

* **ScrapJob**

  * scrapId
  * jobId
  * companyName
  * title
  * career
  * location
  * createdAt

## Success Criteria

* **SC-001**: 사용자는 3초 이내에 자신의 계정 정보를 조회할 수 있다.
* **SC-002**: 사용자는 스크랩 공고 목록을 정상적으로 조회할 수 있다.
* **SC-003**: 사용자는 스크랩 공고 검색 기능을 사용할 수 있다.
* **SC-004**: 사용자는 스크랩 공고 상세 페이지로 이동할 수 있다.

## Assumptions

* 사용자 인증 및 로그인 기능은 별도 도메인(Member)에서 관리한다.
* GitHub 연동 기능은 별도 API를 통해 제공된다.
* 채용공고 상세 조회 기능은 JobNotice 도메인에서 제공한다.
* AI 서비스 및 구독/결제 기능은 Dashboard 도메인 범위에 포함하지 않는다.
* 본 문서는 Dashboard 도메인의 내 정보 관리 및 스크랩 공고 기능만을 대상으로 한다.
