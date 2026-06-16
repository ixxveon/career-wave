# Constitution: adminManagement

**Feature Branch**: `docs/admin-management-spec`

## 1. 도메인 원칙

- `adminManagement`는 관리자 계정과 IP ACL 운영 책임만 가진다.
- 권한이 필요한 변경 작업은 `MASTER` 중심의 인가 정책과 도메인 검증을 함께 통과해야 한다.
- 감사 로그 조회, 사용자 기능, FastAPI 처리 흐름은 이 도메인의 책임이 아니다.

## 2. 상태 머신

```text
ACTIVE
  -> (MASTER가 잠금 요청)
LOCKED
  -> (MASTER가 활성 요청)
```

| 전이 | 허용 여부 | 이유 |
|------|-----------|------|
| `ACTIVE -> LOCKED` | 허용 | `MASTER` 관리자가 운영상 특정 관리자 계정의 접근을 차단할 수 있어야 하기 때문이다. |
| `LOCKED -> ACTIVE` | 허용 | `MASTER` 관리자가 잠금 해제를 통해 계정 사용을 복구할 수 있어야 하기 때문이다. |
| `ACTIVE -> ACTIVE` | 금지 | 이미 활성 상태인 계정에 대한 중복 활성 요청은 비즈니스적으로 유효한 상태 변경이 아니기 때문이다. |
| `LOCKED -> LOCKED` | 금지 | 이미 잠금 상태인 계정에 대한 중복 잠금 요청은 비즈니스적으로 유효한 상태 변경이 아니기 때문이다. |

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 관리자 문맥 한정 | `adminManagement` 기능과 문서는 `admin` 패키지 및 관리자 문맥 안에서만 유지한다. | 사용자 도메인과 혼합되면 권한 정책과 변경 책임 경계가 흐려지기 때문이다. |
| Service 인터페이스 분리 | 관리자 계정과 IP ACL 유스케이스는 Service 인터페이스와 `impl` 구현체로 분리한다. | 인가, 중복 검증, 상태 전이, 감사 추적 같은 규칙을 테스트 가능하고 교체 가능한 구조로 유지해야 하기 때문이다. |
| Service 중심 변경 처리 | 생성, 권한 변경, 상태 변경, 삭제, ACL 활성/비활성 변경은 모두 Service 계층에서 수행한다. | Repository 직접 변경만으로는 도메인 규칙과 감사 추적 요구를 일관되게 강제하기 어렵기 때문이다. |
| ApiResponse 통일 | 모든 성공/실패 응답은 `ApiResponse` 규격을 따른다. | 관리자 프론트엔드가 예외 처리와 데이터 해석을 일관되게 수행해야 하기 때문이다. |
| ErrorCode 분리 관리 | 공통 오류 코드는 `global.exception.ErrorCode`, 도메인 전용 오류 코드는 `adminManagement` 도메인에서 분리 관리한다. | 도메인 간 코드 충돌 위험을 줄이고 책임 소재를 분명히 해야 하기 때문이다. |
| 1-based 페이지 계약 유지 | 외부 API의 `page`는 1-based로 유지하고 내부 Pageable 변환 시 `page - 1`을 적용한다. | 프론트엔드 계약을 유지하면서 Spring Data 기본 페이지 체계와 자연스럽게 연결해야 하기 때문이다. |
| 감사 추적 연계 | 관리자 계정과 ACL의 주요 변경 작업은 감사 추적 가능한 변경 단위로 처리한다. | 운영 변경의 사후 추적 가능성이 보안성과 운영 통제에서 중요하기 때문이다. |
| Swagger 문서 분리 | Swagger 어노테이션은 Controller가 아니라 docs 인터페이스에 작성한다. | 팀 컨벤션을 지키고 Controller를 HTTP 진입점 책임에 집중시키기 위해서다. |

## 4. 불변 규칙 (Invariants)

- 관리자 계정의 `email`은 항상 유일해야 한다.
- IP ACL의 `ipRange`는 항상 유일해야 한다.
- 관리자 계정의 `adminRole` 값은 항상 `MASTER`, `CS`, `BACKEND` 중 하나여야 한다.
- 관리자 계정의 `status` 값은 항상 `ACTIVE`, `LOCKED` 중 하나여야 한다.
- 이미 `LOCKED` 상태인 관리자 계정은 다시 잠글 수 없고, 이미 `ACTIVE` 상태인 관리자 계정은 다시 활성화할 수 없다.
- 이미 활성 상태인 ACL은 다시 활성화할 수 없고, 이미 비활성 상태인 ACL은 다시 비활성화할 수 없다.
- 관리자 계정과 ACL의 상태 변경은 반드시 Service 계층을 통해 수행되어야 한다.

## 5. 연동 계약

- **Spring ↔ FastAPI**: 본 도메인은 FastAPI 비연동 도메인이다. Spring Boot가 FastAPI를 호출하지 않으며 FastAPI도 `adminManagement` 기능을 위해 Spring Boot를 호출하지 않는다.
- **Spring ↔ DB**: Spring Boot만 `admins`, `ip_acl`, `audit_logs` 테이블에 대한 조회 및 변경 책임을 가진다. DB는 PK, UNIQUE, FK, CHECK 제약으로 최종 정합성을 보장한다.
- **Spring ↔ 외부 시스템**: 관리자 프론트엔드는 Spring Boot가 제공하는 계약을 호출하는 외부 소비자다. 별도 보안 장비, 외부 ACL 시스템, FastAPI와의 직접 동기화는 본 도메인 범위에 포함하지 않는다.
- **Spring ↔ Security**: 관리자 API의 1차 접근 권한은 Spring Security `ROLE_ADMIN`으로 제한한다. 문서상 권한 `MASTER`, `BACKEND`, `CS`는 JWT `principal.adminRole` 값과 `@PreAuthorize` 조건으로 세분화하며, 인증은 JWT 기반으로 처리한다.

## 6. 금지 패턴

- Swagger 어노테이션을 Controller에 직접 작성 금지 -> `docs/XxxDocs.java` 인터페이스로 분리.
- Controller에서 관리자 권한 변경, 상태 전이, 중복 검증 같은 비즈니스 규칙을 직접 처리하는 방식 금지.
- Repository에서 벌크 업데이트나 직접 상태 변경으로 `admins.status`, `admins.admin_role`, `ip_acl.is_enabled`를 우회 수정하는 방식 금지.
- `global.exception.ErrorCode`에 `adminManagement` 전용 오류 코드를 계속 추가해 도메인 경계를 흐리는 방식 금지.
- Entity를 API 응답으로 직접 반환하는 방식 금지.
- FastAPI 연동이 없음에도 관리자 계정 또는 ACL 처리를 FastAPI 호출 전제로 설계하는 방식 금지.
