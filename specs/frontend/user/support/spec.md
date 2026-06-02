# Feature Specification: 사용자 고객센터 (User Support)

**Feature Branch**: `feature/user-support-fe-spec`
**버전**: v1
**Status**: UI 구현 완료 — API 연동 예정
**담당**: 신보라

---

## 도메인 개요

회원이 공지사항·FAQ를 조회하고, 1:1 문의를 접수·확인하는 사용자 고객센터 페이지.
`/support` 경로 하위에 3탭(공지사항 / FAQ / 1:1 문의) 구조로 구성된다.

- 공지사항·FAQ는 어드민이 등록한 데이터를 READ-ONLY로 표시
- 1:1 문의는 회원 본인이 접수하고 관리자 답변을 확인

---

## 상태 정의

### inquiries.inquiry_status

| ERD 값 | User UI 표시 | 설명 |
|---|---|---|
| `PENDING` | 접수 | 문의 접수, 미답변 |
| `IN_PROGRESS` | 처리 중 | 관리자 답변 작성 중 |
| `COMPLETED` | 답변 완료 | 처리 완료 |

### 카테고리 매핑

#### notices.category

| ERD 값 | User UI 표시 |
|---|---|
| `NOTICE` | 공지 |
| `UPDATE` | 업데이트 |
| `EVENT` | 이벤트 |
| `MAINTENANCE` | 점검 |

#### faqs.category

| ERD 값 | User UI 표시 |
|---|---|
| `ACCOUNT` | 계정 |
| `PAYMENT` | 구독/결제 |
| `SERVICE` | AI 서비스 (이력서 분석 / AI 면접 통합) |
| `ETC` | 기타 (채용 공고 포함) |

#### inquiries.category

| ERD 값 | User UI 표시 |
|---|---|
| `REFUND` | 환불 |
| `PAYMENT_ERROR` | 구독/결제 |
| `SERVICE` | AI 서비스 |
| `ACCOUNT` | 계정 |
| `ETC` | 기타 |

---

## User Stories & Acceptance Scenarios

### Story 1 — 공지사항 목록 조회 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** 고객센터 진입, **When** 공지사항 탭, **Then** 카테고리 필터·검색·목록이 표시된다.
2. **Given** 목록, **When** `is_pinned = true` 공지, **Then** 목록 상단에 고정 배지와 함께 표시된다.
3. **Given** 카테고리 필터 클릭, **When** 필터 적용, **Then** 해당 카테고리 공지만 표시된다.
4. **Given** 키워드 입력, **When** 검색, **Then** 제목에 키워드가 포함된 공지만 표시된다.
5. **Given** `is_visible = false` 공지, **When** 목록 조회, **Then** 표시되지 않는다.

---

### Story 2 — 공지사항 상세 조회 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** 공지 목록 항목 클릭, **When** 상세 페이지 진입, **Then** 제목·카테고리·등록일·조회수·내용이 표시된다.
2. **Given** 상세 페이지 진입, **When** 조회, **Then** `view_count`가 1 증가한다.
3. **Given** 상세 페이지, **When** 이전/다음 공지 버튼 클릭, **Then** 해당 공지 상세로 이동한다.

---

### Story 3 — FAQ 조회 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** FAQ 탭, **When** 진입, **Then** 카테고리 필터·검색·아코디언 목록이 표시된다.
2. **Given** FAQ 항목 클릭, **When** 토글, **Then** 답변이 펼쳐진다. 다른 항목은 닫힌다.
3. **Given** 카테고리 필터 클릭, **When** 적용, **Then** 해당 카테고리 FAQ만 표시된다.
4. **Given** 키워드 입력, **When** 검색, **Then** 질문 또는 답변에 키워드가 포함된 FAQ만 표시된다.

---

### Story 4 — 1:1 문의 목록 조회 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** 1:1 문의 탭, **When** 진입, **Then** 본인이 접수한 문의 목록이 표시된다.
2. **Given** 목록, **When** 카테고리 필터 적용, **Then** 해당 카테고리 문의만 표시된다.
3. **Given** 문의 항목 클릭, **When** 상세 모달, **Then** 문의 내용·상태·관리자 답변(있을 경우)이 표시된다.
4. **Given** 답변 미완료 문의, **When** 모달 열기, **Then** "답변 대기 중" 안내가 표시된다.

---

### Story 5 — 1:1 문의 접수 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** "문의하기" 버튼 클릭, **When** 접수 페이지 진입, **Then** 문의 유형·제목·내용 입력 폼이 표시된다.
2. **Given** 문의 유형 미선택 또는 제목·내용 미입력(내용 10자 미만), **When** 접수 시도, **Then** 접수 버튼이 비활성화된다.
3. **Given** 모든 필드 입력 후 "문의 접수" 클릭, **When** API 호출 성공, **Then** 접수 완료 화면이 표시된다.

---

## Functional Requirements

- **FR-001**: 공지사항 목록에서 `is_visible = true` 건만 표시한다.
- **FR-002**: 공지사항 목록에서 `is_pinned = true` 건을 상단에 고정 표시한다.
- **FR-003**: 공지사항 상세 조회 시 `view_count` 1 증가 API 호출한다.
- **FR-004**: 공지사항·FAQ 카테고리 필터와 키워드 검색을 동시에 적용할 수 있다.
- **FR-005**: FAQ 아코디언은 하나씩만 열린다 (단일 열림).
- **FR-006**: 1:1 문의 목록은 본인(로그인 회원) 문의만 표시한다.
- **FR-007**: 1:1 문의 접수 시 카테고리·제목·내용(10자 이상) 모두 필수 입력이다.
- **FR-008**: `inquiry_status` ERD 영문 값을 UI에서 한글로 변환하여 표시한다 (PENDING → 접수, IN_PROGRESS → 처리 중, COMPLETED → 답변 완료).
- **FR-009**: 공지사항 카테고리 ERD 영문 값을 UI에서 한글로 변환하여 표시한다.
- **FR-010**: FAQ·문의 카테고리 ERD 영문 값을 UI에서 한글로 변환하여 표시한다.

---

## Key Entities (참조)

### notices
| 필드 | 설명 |
|---|---|
| `notice_id` | 공지 ID |
| `category` | NOTICE / UPDATE / EVENT / MAINTENANCE |
| `title` | 제목 |
| `content` | 내용 |
| `is_visible` | 노출 여부 (false인 경우 User 미노출) |
| `is_pinned` | 고정 여부 (true인 경우 목록 상단 고정) |
| `view_count` | 조회수 |
| `created_at` | 등록일 |

### faqs
| 필드 | 설명 |
|---|---|
| `faq_id` | FAQ ID |
| `category` | ACCOUNT / PAYMENT / SERVICE / ETC |
| `question` | 질문 |
| `answer` | 답변 |
| `created_at` | 등록일 |

### inquiries
| 필드 | 설명 |
|---|---|
| `inquiry_id` | 문의 ID |
| `member_id` | 문의 회원 (본인 조회 필터 기준) |
| `category` | REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC |
| `title` | 제목 |
| `content` | 문의 내용 |
| `reply` | 관리자 답변 (null이면 미답변) |
| `inquiry_status` | PENDING / IN_PROGRESS / COMPLETED |
| `created_at` | 접수일 |

---

## Success Criteria

- **SC-001**: 공지사항 목록에서 핀 공지가 일반 공지보다 먼저 표시된다.
- **SC-002**: 공지 상세 조회 시 조회수가 정확히 증가한다.
- **SC-003**: 1:1 문의 접수 후 목록에 즉시 반영된다.
- **SC-004**: FAQ·공지 카테고리 필터와 검색이 교집합으로 동작한다.

---

## Assumptions

- 공지사항·FAQ는 로그인 없이 조회 가능 (비로그인 허용)
- 1:1 문의 목록·접수는 로그인 필수
- 이벤트(`EVENT`) 카테고리는 구현 예정 — User UI에 필터 버튼 포함
- FAQ `SERVICE` 카테고리 = AI 이력서 분석 + AI 면접 통합 (서브 분류는 v2)
- 채용 공고 카테고리는 현재 `ETC`로 매핑, 내부 채용공고 구현 시 별도 카테고리 추가 예정
- 문의 답변 알림(이메일/앱 푸시)은 v1 범위 외
