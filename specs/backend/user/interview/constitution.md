# Constitution: AI 면접 API (User Interview)

**Feature Branch**: `feature/user-interview-be`  
**Scope**: 면접 세션 생명주기 / 답변 저장 / 리포트 조회 / 이력 조회  
**버전**: v1  
**관련 FE 스펙**: `specs/frontend/user/interview/constitution.md`

---

## 1. 도메인 가치

- **세션 무결성**: 면접 세션의 상태는 단방향 흐름(`IN_PROGRESS → COMPLETED / FAILED`)을 유지하며, 한 번 종료된 세션은 재개할 수 없다.
- **소유권 보호**: 모든 면접 리소스(세션·메시지·피드백)는 생성한 회원만 접근할 수 있으며, 타인 접근 시 403을 반환하여 IDOR를 방어한다.
- **데이터 신뢰도**: 음성 인식 유효 비율(`voice_quality_ratio`)이 50% 미만인 항목의 `delivery_score` / `fluency_score`는 `null`로 취급하여 신뢰할 수 없는 지표를 절대 노출하지 않는다.
- **역할 분리**: Spring은 세션 생명주기와 답변 저장을 담당하고, AI 파이프라인(STT·LLM·TTS)은 FastAPI 서버가 전담한다. Spring이 AI 처리 로직을 직접 구현하지 않는다.

---

## 2. 상태 머신 (InterviewSession)

```text
[IN_PROGRESS] → [COMPLETED]
[IN_PROGRESS] → [FAILED]     # 비정상 종료 시 (24h 타임아웃 스케줄러)
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| IN_PROGRESS → COMPLETED | 허용 | 정상 세션 종료 (`/end` API 호출) |
| IN_PROGRESS → FAILED | 허용 | 24시간 타임아웃 스케줄러에 의한 강제 종료 |
| COMPLETED → 任 | 금지 | 한 번 종료된 세션은 상태 변경 불가 |
| FAILED → 任 | 금지 | 한 번 실패한 세션은 상태 변경 불가 |

**전이 규칙**

- `COMPLETED` 또는 `FAILED` 상태의 세션에 `/end`를 재호출하면 `INTERVIEW_SESSION_ALREADY_ENDED(400)` 반환.
- 상태 변경은 반드시 Service 계층에서만 수행한다. Controller에서 Entity 상태를 직접 변경하는 것을 금지한다.

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 세션 ID 타입 | UUID (gen_random_uuid()) | 외부 노출 ID이므로 추측 불가능한 UUID 사용 (CONVENTION.md §10) |
| 소유권 검증 위치 | Service 진입 시점 | Controller가 아닌 Service에서 `memberId` 비교로 IDOR 방어 일원화 |
| AI 파이프라인 분리 | FastAPI 담당 | LLM·STT·TTS 처리를 Spring에 직접 구현하지 않음. FastAPI와 비동기 통신 |
| 음성 청크 트랜잭션 | 트랜잭션 외부 | 오디오 파일 전달(외부 I/O)은 트랜잭션 밖에서 수행 (CONVENTION.md §2-3) |
| WebSocket 채널 | Spring WebSocket | 세션 생명주기 이벤트, AI 질문 수신 담당 |
| 점수 null 처리 | Service 계층 | `voiceQualityRatio < 50.00` 조건을 Service에서 판단하여 DTO 조립 시 null 세팅 |
| 리포트 생성 트리거 | 세션 종료 시 FastAPI 비동기 호출 | 종료 API 응답 지연 방지를 위해 비동기 처리 |
| 이력 페이징 | 0-based PageRequest | FE api-schema.md 계약 준수 (`page=0`이 첫 페이지) |

---

## 4. 불변 규칙 (Invariants)

- **소유권 필수**: 세션 조회·답변 제출·리포트 조회 등 모든 세션 관련 API에서 `memberId` 소유권 검증을 생략하지 않는다.
- **상태 단방향**: `COMPLETED` / `FAILED` 세션의 `session_status`를 다시 변경하는 코드를 작성하지 않는다.
- **점수 null 우선**: `voiceQualityRatio`가 `null`이거나 50.00 미만인 피드백의 `deliveryScore` / `fluencyScore`는 반드시 `null`로 반환한다. `0`으로 대체하지 않는다.
- **Entity 직접 반환 금지**: Controller에서 Entity를 직접 반환하지 않는다. 반드시 `InterviewDTO`로 변환 후 `ApiResponse<T>`에 담아 반환한다.
- **트랜잭션 최소화**: 음성 청크 FastAPI 전달 등 외부 I/O는 트랜잭션 범위 밖에서 수행한다.
- **WebSocket 에러 메시지**: 서버 소켓 처리 중 에러 발생 시 `type: ERROR` 메시지를 클라이언트로 전송하고, 연결을 유지한다. 에러를 무시하고 연결을 유지하는 것을 금지한다.

---

## 5. 연동 계약

- **프론트엔드 HTTP 계약**: `specs/frontend/user/interview/api-schema.md`
- **FastAPI 연동**: LLM 응답, STT 결과, TTS 오디오는 FastAPI WebSocket(`WS /ws/user/interview/{sessionId}/ai`)으로 클라이언트에 직접 전달되며, Spring은 세션 종료 및 리포트 완료 알림만 담당한다.
- **서류 도메인 연동**: `documentId` 유효성 검증은 `document_id` 존재 여부 확인으로 처리. 유효하지 않으면 `INTERVIEW_DOCUMENT_NOT_FOUND(404)` 반환.
- **이력 캐시 무효화**: 면접 종료(`COMPLETED`) 후 `career_histories`에 이력이 저장되며, 이력 목록이 최신 상태를 반영할 수 있도록 응답에 종료 정보를 포함한다.

---

## 6. 금지 패턴

- `COMPLETED` / `FAILED` 세션에 대해 상태를 재변경하는 것을 금지한다.
- `memberId` 소유권 검증 없이 세션·피드백·메시지를 조회하는 것을 금지한다.
- `voiceQualityRatio < 50.00` 항목의 `deliveryScore` / `fluencyScore`를 `0`으로 반환하는 것을 금지한다.
- Controller에서 비즈니스 예외를 `try-catch`로 처리하는 것을 금지한다.
- Entity를 API 응답으로 직접 반환하는 것을 금지한다.
- 음성 청크 전달(외부 I/O)을 `@Transactional` 범위 안에 포함하는 것을 금지한다.
- `new RuntimeException(...)`을 직접 생성하는 것을 금지한다. `CustomException(ErrorCode.xxx)` 사용.
- Entity 간 양방향 관계 매핑 시 순환 참조를 유발하는 것을 금지한다. `InterviewSession` ↔ `InterviewMessage` 등 양방향 매핑이 필요한 경우, `toString()` 및 JSON 직렬화에서 무한 루프가 발생하지 않도록 `@JsonIgnore` 또는 `@JsonManagedReference` / `@JsonBackReference`를 사전에 적용한다. 미적용 시 리포트 조회 등에서 `StackOverflowError`가 발생한다.

---

## 7. 이 명세서가 보장하는 것

| 속성 | 보장 내용 |
|------|-----------|
| **불변성** | `COMPLETED` / `FAILED` 세션은 상태 재변경이 불가능하다. 한 번 종료된 면접 기록은 영구 보존된다. |
| **투명성** | `voiceQualityRatio < 50.00` 조건부 null 처리를 통해 신뢰할 수 없는 AI 측정값을 정직하게 노출한다. `0`으로 은폐하지 않는다. |
| **확장성** | WebSocket 메시지의 `data` / `errorCode` 필드 구조 덕분에 새로운 에러 코드나 메시지 타입이 추가되어도 기존 클라이언트 파싱 구조를 깨지 않고 확장할 수 있다. |
| **안전성** | 모든 세션 API에 `memberId` 소유권 검증이 강제되어 IDOR 공격을 방어한다. |
| **신뢰성** | 세션 타임아웃 스케줄러와 FastAPI 콜백 재시도 로직으로 방치된 세션과 유실된 리포트 알림을 시스템이 자동 처리한다. |
