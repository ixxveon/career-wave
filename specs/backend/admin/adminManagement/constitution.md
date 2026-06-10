# Constitution: adminManagement

**Feature Branch**: `feature/admin-management-spec`

## 1. 도메인 원칙

- 어드민 관리자 관리는 관리자 계정과 IP ACL의 운영 통제만 담당한다.
- 권한 부여, 상태 변경, 삭제 같은 위험 작업은 `MASTER` 권한과 도메인 불변 규칙을 반드시 통과해야 한다.
- 사용자 기능, 통계성 운영 화면, FastAPI 기능 위임은 이 도메인의 책임이 아니다.

## 2. 상태 머신

```text
ACTIVE
  ↓ (MASTER가 잠금 요청)
LOCKED
  ↑ (MASTER가 해제 요청)
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| ACTIVE → LOCKED | 허용 | `MASTER` 관리자가 운영상 접근을 차단할 수 있어야 한다. |
| LOCKED → ACTIVE | 허용 | `MASTER` 관리자가 잠금 해제를 통해 계정을 복구할 수 있어야 한다. |
| ACTIVE → ACTIVE | 허용 | 동일 상태 요청은 결과적으로 상태 변화가 없어도 일관된 검증 흐름으로 처리할 수 있다. |
| LOCKED → LOCKED | 허용 | 동일 상태 요청은 결과적으로 상태 변화가 없어도 일관된 검증 흐름으로 처리할 수 있다. |
| 마지막 `MASTER` 계정의 ACTIVE → LOCKED | **금지** | 시스템 운영 가능한 최상위 관리자 계정이 최소 1개는 유지되어야 한다. |

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 패키지 경계 분리 | `adminManagement` 기능은 `admin` 패키지 범위에서만 구현한다. | 관리자 관리 기능이 사용자 도메인과 직접 결합되면 권한 경계와 변경 영향 범위가 흐려진다. |
| Service 인터페이스 분리 | 관리자 계정과 IP ACL 유스케이스는 Service 인터페이스와 Impl 구현체로 분리한다. | 팀 합의 사항을 따르며, 권한 검증·상태 전이·감사 기록 같은 비즈니스 규칙을 구현체에 집중시켜 테스트와 교체 가능성을 높인다. |
| 쓰기 작업 Service 집중 | 생성, 권한 변경, 상태 변경, 삭제, ACL 활성화 변경은 모두 Service 레이어에서만 수행한다. | 마지막 `MASTER` 보호, 중복 검증, 감사 추적 보장 같은 규칙은 저장소 직접 호출만으로는 일관되게 강제하기 어렵다. |
| ApiResponse 일관 적용 | 모든 성공/실패 응답은 `ApiResponse` 규격으로 반환한다. | 관리자 프론트엔드와의 계약을 단순화하고 공통 예외 처리기와 결합해 일관된 오류 응답을 보장할 수 있다. |
| ErrorCode 분리 관리 | 공통 예외 코드는 `global.exception.ErrorCode`, 도메인 전용 예외 코드는 `adminManagement` 전용 ErrorCode에서 관리한다. | 도메인별 코드 충돌 위험을 줄이고, 공통 오류와 비즈니스 오류의 책임을 명확히 나눌 수 있다. |
| 페이지 번호 외부 1-based 유지 | 외부 API 계약은 1-based page를 유지하고 내부 Pageable 변환 시 `page - 1`을 적용한다. | 프론트엔드 계약을 깨지 않으면서 Spring Data 기본 규약과 자연스럽게 연결할 수 있다. |
| 감사 로그 연계형 처리 | 관리자 계정 및 ACL의 주요 변경은 감사 추적 가능한 변경 단위로 처리한다. | 운영성 도메인은 사후 추적 가능성이 핵심이며, 누가 무엇을 바꿨는지 남지 않으면 장애 대응과 보안 감사가 어려워진다. |
| Swagger 문서 분리 | Swagger 어노테이션은 Controller가 아니라 docs 인터페이스에 작성한다. | 팀 컨벤션을 지키고 컨트롤러를 HTTP 바인딩 책임에만 집중시키기 위함이다. |

## 4. 불변 규칙 (Invariants)

- 관리자 계정 생성 시 `email`은 항상 유일해야 한다.
- IP ACL 생성 시 `ipRange`는 항상 유일해야 한다.
- 관리자 계정의 `adminRole` 값은 항상 `MASTER`, `CS`, `BACKEND` 중 하나여야 한다.
- 관리자 계정의 `status` 값은 항상 `ACTIVE`, `LOCKED` 중 하나여야 한다.
- 마지막 `MASTER` 계정은 권한 변경, 잠금, 삭제 대상이 될 수 없다.
- 관리자 계정 상태 변경과 ACL 활성 상태 변경은 반드시 Service 레이어를 통해서만 수행되어야 한다.

## 5. 연동 계약

- **Spring ↔ FastAPI**: 본 도메인은 FastAPI와 연동하지 않는다. 관리자 계정 관리와 IP ACL 관리는 Spring Boot 백엔드가 단독으로 책임진다.
- **Spring ↔ DB**: Spring Boot는 `admins`, `ip_acl`, `audit_logs` 테이블의 조회·변경 책임을 가진다. 상태 전이, 중복 검증, 권한 검증은 애플리케이션 계층에서 선행하고 DB는 제약조건과 영속성을 보장한다.
- **Spring ↔ 외부 시스템**: 외부 인증 제공자, 외부 ACL 장비, 외부 감사 시스템과의 직접 연동은 현재 범위에 포함하지 않는다. JWT 인증 결과와 내부 DB 기록만을 기준으로 운영한다.
- **Spring ↔ Security**: 문서상 권한 `MASTER`, `BACKEND`, `CS`는 Spring Security에서 각각 `ROLE_MASTER`, `ROLE_BACKEND`, `ROLE_CS`로 매핑되며, 접근 제어 판단은 Security와 Service 검증이 함께 책임진다.

## 6. 금지 패턴

- Swagger 어노테이션을 Controller에 직접 작성 금지 → `docs/XxxDocs.java` 인터페이스로 분리.
- Controller에서 비즈니스 규칙(마지막 `MASTER` 보호, 중복 검증, 상태 전이 판단)을 직접 처리하는 것 금지.
- Repository에서 JPQL/벌크 업데이트로 `admins.status`, `admins.admin_role`, `ip_acl.is_enabled`를 직접 변경하는 것 금지.
- `global.exception.ErrorCode`에 도메인 전용 오류 코드를 계속 추가해 도메인 책임을 섞는 것 금지.
- Entity를 API 응답으로 직접 반환하는 것 금지.
