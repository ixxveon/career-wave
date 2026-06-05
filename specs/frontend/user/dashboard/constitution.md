# Constitution: Dashboard

**Feature Branch**: `feature/user-dashboard`

## 1. 도메인 원칙

> Dashboard는 사용자가 자신의 계정 정보와 스크랩 공고를 조회·관리하는 기능만 제공한다.
> Dashboard는 채용공고 자체를 관리하지 않으며, 상세 정보는 JobNotice 도메인에 위임한다.

* Dashboard는 회원 정보 및 GitHub 연동 상태를 조회·수정한다.
* Dashboard는 스크랩 공고를 조회·관리하며, 공고 상세 데이터의 소유권은 갖지 않는다.

## 2. 아키텍처 결정

> 왜 이렇게 설계했는지 이유까지 적는다. 이유 없는 결정은 나중에 깨진다.

| 결정                   | 내용                                                           | 근거                               |
| -------------------- | ------------------------------------------------------------ | -------------------------------- |
| TypeScript 타입 분리     | Dashboard 전용 타입(UserProfile, GithubProfile, ScrapJob)을 별도 정의 | API Schema와 UI 간 계약을 명확히 유지하기 위함 |
| Mock 데이터 기반 구현       | 실제 API 연동 전 Mock 데이터로 UI 구현                                  | 프론트엔드 개발과 백엔드 개발을 병렬 진행하기 위함     |
| JobNoticeDetail 재사용  | 채용공고 상세는 기존 JobNoticeDetail 컴포넌트 사용                          | 중복 구현 방지 및 UI 일관성 유지             |
| 상태 UI 분리             | Loading, Error, Empty 상태를 별도 처리                              | API 연동 시 예외 상황을 안정적으로 처리하기 위함    |
| React Local State 사용 | Dashboard UI 상태를 useState로 관리                                | 현재 범위에서 전역 상태 관리가 필요하지 않기 때문     |

## 3. 불변 규칙 (Invariants)

> 항상 참이어야 하는 조건

* API Schema와 TypeScript 타입은 항상 동일한 필드 구조를 유지해야 한다.
* Mock 데이터 구조는 API 응답 구조와 동일해야 한다.
* GitHub 연동 여부는 `linked` 값을 기준으로 판단한다.
* 삭제된 공고(`deleted=true`)는 목록에 유지되어야 한다.
* 삭제된 공고는 상세보기 진입이 불가능해야 한다.
* 스크랩 공고 상세보기는 반드시 JobNoticeDetail 컴포넌트를 사용한다.
* Empty State, Error State, Loading State는 항상 제공되어야 한다.

## 4. 연동 계약

> 다른 도메인 또는 외부 시스템과의 경계를 명시한다.

* 회원 정보는 Member 도메인 데이터를 사용한다.
* GitHub 연동 정보는 GitHub OAuth 연동 결과를 사용한다.
* 스크랩 공고 데이터는 Bookmark 및 JobNotice 도메인 데이터를 사용한다.
* 채용공고 상세 정보는 JobNotice 도메인의 JobNoticeDetail 컴포넌트에 위임한다.
* Dashboard는 FastAPI와 직접 통신하지 않는다.

## 5. 금지 패턴

> 실수하기 쉬운 안티패턴

* API Schema 수정 후 TypeScript 타입 미반영 금지.
* TypeScript 타입 수정 후 Mock 데이터 미반영 금지.
* 삭제된 공고를 목록에서 제거하는 처리 금지.
* Dashboard 내부에서 채용공고 상세 UI를 별도 구현 금지.
* GitHub 연동 여부를 githubId 존재 여부만으로 판단 금지 (`linked` 필드 사용).
* Mock 데이터 구조와 실제 API 응답 구조를 다르게 유지하는 것 금지.
