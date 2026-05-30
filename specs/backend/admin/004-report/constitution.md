# Constitution: 신고관리 API (Report Management)

**Feature Branch**: `feature/admin-report-api`
**Scope**: 신고 목록·상세 조회, 블라인드·기각 처리 API
**버전**: v1

---

## 1. 도메인 가치

관리자는 신고된 게시글·댓글·회원을 신속하게 검토하고 처리함으로써 플랫폼 품질을 보호한다.
블라인드 처리는 신고 상태 변경과 콘텐츠 숨김을 단일 트랜잭션으로 원자적으로 수행해야 한다.

---

## 2. 상태 머신

### report_status 전이

```text
PENDING
  → BLINDED   (blindReport 호출, target_type에 따라 콘텐츠 is_blind 동시 변경)
  → DISMISSED (dismissReport 호출)

BLINDED   → (변경 불가 — v1)
DISMISSED → (변경 불가 — v1)
```

| 전이 | 허용 여부 | 처리 방식 |
|------|-----------|-----------|
| PENDING → BLINDED | 허용 | @Transactional, report_status + boards/comments.is_blind 동시 변경 |
| PENDING → DISMISSED | 허용 | @Transactional, report_status만 변경 |
| BLINDED → 기타 | 불가 | ALREADY_PROCESSED(409) |
| DISMISSED → 기타 | 불가 | ALREADY_PROCESSED(409) |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 콘텐츠 블라인드 처리 방식 | ⚠️ **구현 전 팀 합의 필요** — boards/comments가 `user` 도메인에 속할 경우 `admin/report`에서 직접 참조하면 도메인 경계 규칙(`admin`↔`user` 직접 참조 금지) 위반. 해결 방안: ① `admin` 공용 패키지로 이동, ② 이벤트 기반 처리, ③ 별도 공유 서비스 계층 추가 중 선택 필요 | CONVENTION.md — admin과 user는 서로 직접 참조하지 않는다 |
| 동적 필터 | QueryDSL 또는 JPA Specification | null 필터 조건 무시, AND 조건 결합 |
| KPI 집계 | 별도 summary 엔드포인트 | 목록과 독립적으로 집계 카드를 조회할 수 있도록 분리 |
| 정렬 기본값 | `created_at DESC` | 최신 신고를 먼저 확인할 수 있도록 |
| page 1-based | Controller에서 0-based 변환 후 Pageable 전달 | 프론트엔드 계약(`page=1`이 첫 페이지) 준수 |
| 관리자 ID 추출 | Security Context | Controller에서 임의 파싱 금지 |

---

## 4. 불변 규칙

- `PENDING`이 아닌 신고에 처리 요청이 오면 반드시 `ALREADY_PROCESSED(409)` 예외를 발생시킨다.
- 블라인드 처리 시 `target_type = BOARD`이면 `boards.is_blind = TRUE` 변경이 동일 트랜잭션에 포함되어야 한다.
- 블라인드 처리 시 `target_type = COMMENT`이면 `comments.is_blind = TRUE` 변경이 동일 트랜잭션에 포함되어야 한다.
- 블라인드 처리 시 `target_type = MEMBER`이면 `report_status`만 변경한다. 다른 테이블을 수정하지 않는다.
- `ai_suggestion` 필드는 DB에 저장되어 있으나 v1 응답 DTO에 포함하지 않는다.
- 모든 API 응답은 `ApiResponse<T>` 래퍼를 사용한다. Entity를 직접 반환하지 않는다.
- 신고 처리의 `processedBy`는 Security Context에서 추출한 관리자 ID를 사용한다.

---

## 5. 연동 계약

- 프론트엔드 계약 원본: `specs/frontend/admin/004-report/api-schema.md`
- 제공 엔드포인트:
  - `GET /api/admin/reports/summary`
  - `GET /api/admin/reports?status=&targetType=&reason=&page=&size=`
  - `GET /api/admin/reports/{reportId}`
  - `PATCH /api/admin/reports/{reportId}/blind`
  - `PATCH /api/admin/reports/{reportId}/dismiss`
- 블라인드·기각 처리 성공 응답에 변경된 `reportStatus`와 `processedAt`이 포함되어야 한다.

---

## 6. 금지 패턴

- `PENDING`이 아닌 신고에 대해 처리 메서드를 실행하는 것을 금지한다. 상태 체크 후 예외 발생 필수.
- `ai_suggestion` 필드를 v1 응답 DTO에 포함하는 것을 금지한다.
- 블라인드 처리 시 `boards.is_blind` 또는 `comments.is_blind` 변경을 별도 트랜잭션으로 분리하는 것을 금지한다. 반드시 동일 트랜잭션이어야 한다.
- `target_type = MEMBER` 블라인드 처리 시 members 테이블의 `member_status`를 변경하는 것을 금지한다. 회원 제재는 회원관리 API에서 별도 처리한다.
- Controller에서 `try-catch`로 비즈니스 예외를 처리하는 것을 금지한다. `GlobalExceptionHandler`에 위임한다.
- Entity를 직접 반환하거나 `Map`을 직접 반환하는 것을 금지한다. `ApiResponse<DTO>`를 사용한다.
- `new RuntimeException(...)`을 직접 생성하는 것을 금지한다. `CustomException(ErrorCode.xxx)`를 사용한다.
