# Constitution: Interview 도메인

**Feature Branch**: `feature/user-interview-[기능명]` 

## 1. 도메인 원칙
* 실시간 면접 세션(AI 텍스트/화상)의 생성부터 결과 리포트 산출까지의 전체 생명주기를 관리한다.
* AI 분석 데이터는 수정이 불가능한(Immutable) 로그 형태로 저장하여 결과의 신뢰성을 보장한다.
* 면접 중 발생하는 모든 상태(REC, 통신 연결 등)는 실시간성을 최우선으로 제어한다.
* 모든 면접 세션 생성은 로그인된 유저를 전제로 하며, 유저의 구독 플랜 및 권한 레벨을 사전에 검증해야 한다.

## 2. 상태 머신
[READY] -> (start) -> [RUNNING] -> (finish) -> [FINISHED/ANALYZING] -> (complete) -> [REPORT]

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| READY → RUNNING | 허용 | 면접 시작 |
| RUNNING → FINISHED/ANALYZING | 허용 | 면접 종료 후 분석 대기 |
| ANALYZING → REPORT | 허용 | 분석 완료 후 결과 산출 |
| ANALYZING → ANALYZING (Timeout) | 허용 | 분석 지연 시 최대 30초 대기 후 Fallback(임시 결과 리포트) 처리 |
| ANY → READY | **금지** | 면접 중 세션 초기화 금지 |

## 3. 아키텍처 결정
| 결정 | 내용 | 근거 |
|------|------|------|
| WebSocket 채널 분리 | Spring(메인) / FastAPI(분석) 이중 연결 | AI 분석 데이터의 부하 분산 및 실시간 처리 속도 최적화 |
| RAG 질문 생성 | Document Analysis 도메인 참조 | 유저 이력서 기반의 맞춤형 면접 환경 구축 |
| 상태 관리 | Zustand (FE) | 실시간 스트리밍 및 소켓 데이터의 불필요한 리렌더링 방지 |
| 장애 시 처리 정책 | Spring 단절 시 면접 자동 종료 후 서버 세션 유지, FastAPI 단절 시 분석 데이터 보존하며 면접은 세션 유지 | 데이터 무결성 보호 |

## 4. 불변 규칙 (Invariants)
* 상태 변경은 반드시 `InterviewService`의 비즈니스 로직을 통과한다. (Repository 직접 수정 금지)
* 모든 면접 데이터는 `SessionID`를 기준으로 논리적으로 격리되어야 한다.
* 분석 데이터(시선, WPM 등)는 `interview.finish` 이벤트 수신 직후 전체 Flush를 수행하며, 서버 로그는 90일, 로컬 스토리지는 세션 종료 시점에 만료 정책(TTL)을 적용한다.
* 유저 중복 접속 시, 기존 세션을 강제 종료하고 신규 접속을 허용하는 'Last-in-Wins' 정책을 원칙으로 한다.

## 5. 연동 계약
* **Job Notice 도메인:** 공고 ID를 입력받아 타겟 정보(Job Notice)를 제공받음. 조회 실패 시 기본 일반 면접 질문셋(Default Question Set)으로 대체.
* **Document Analysis 도메인:** 이력서 데이터를 면접 질문 컨텍스트로 사용함. 파싱 실패 시 파싱되지 않은 원본 텍스트 기반 혹은 범용 직무 질문으로 fallback.
* **FastAPI 모듈:** 분석된 감정/자세 수치(JSON)를 반환함. 반환 실패 시 해당 구간의 점수를 '측정 불가'로 마킹하고 사용자에게 재측정 안내 알림 발송.

## 6. 금지 패턴
* Swagger 어노테이션을 Controller에 직접 작성 금지 → `InterviewDocs` 인터페이스로 분리.
* Controller 레이어에서 직접 `ResponseEntity`를 반환 금지 → 반드시 `ApiResponse<T>` 래퍼 사용.
* 프론트엔드에서 전역 데이터(소켓 수신 데이터 등)를 로컬 상태(`useState`)에 복사하여 사용하는 패턴 금지. 단, `isOpen`, `hover` 등 UI 전용 상태는 허용.
* 면접 중인 세션 정보를 브라우저의 전역 객체(window)에 직접 저장 금지.