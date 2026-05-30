# Constitution: AI 면접 (Interview) 도메인

> 관련 문서: `plan.md` / `checklist.md` / `api-schema.md`  
> 레이어: **Frontend Only**

## 0. 컨벤션

* **Feature Branch**: `feature/user-interview-{기능명}` (예: `feature/user-interview-session`)
* **PR 작성**: `.github/pull_request_template.md` 형식 필수 준수 (CONTRIBUTION.md § 6)
* **PR 제목**: `[INTERVIEW] 기능명`
* **파일 경로**: `src/user/{api|components|hooks|types|utils}/interview/`

---

## 1. 도메인 원칙

* **지속적 연결성**: 면접 도중 소켓 연결 끊김은 치명적인 사용자 경험 저하를 유발한다. 모든 네트워크 단절 상황은 토스트 메시지나 재연결 정책을 통해 사용자에게 투명하게 공유되어야 한다.
* **멀티모달 유연성**: 음성 기반의 면접이 중심이지만, 키보드 입력(텍스트)으로 언제든 전환 가능해야 하며, 입력 방식 전환 시에도 면접관의 TTS 재생 흐름은 끊기지 않아야 한다.
* **데이터 신뢰도**: AI 지표는 데이터가 충분할 때만 노출한다. 음성 데이터가 부족한 경우 억지로 점수를 산정하지 않고 명확한 안내 문구(`마스킹`)를 노출한다.
* **상태 복원력**: 사용자가 탭을 새로고침해도 면접 세션(`READY/RUNNING`)은 `sessionStorage`를 통해 즉시 복원되어야 한다.

---

## 2. 상태 머신 (InterviewSession)

> 면접 세션은 단방향 흐름을 가지며, 모든 전이는 `useInterviewSession`의 `useReducer`를 통해 일관되게 관리한다.

```
[READY] → [RUNNING] → [FINISHED]
               ↕
        [RECONNECTING] → [ERROR]
ANY → [READY]  # 세션 초기화 및 재시도
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| READY → RUNNING | 허용 | 사전 진단 통과 후 세션 시작 |
| RUNNING → RECONNECTING | 허용 | 소켓 연결 단절 감지 |
| RECONNECTING → RUNNING | 허용 | 재연결 성공 |
| RECONNECTING → ERROR | 허용 | 최대 재연결 횟수 초과 |
| RUNNING → FINISHED | 허용 | 면접 종료 및 스크립트 동기화 완료 |
| ANY → READY | 허용 | 세션 초기화 및 재시도 |

| 상태 | 설명 |
|------|------|
| `READY` | 사전 진단 통과 후 세션 시작 대기 |
| `RUNNING` | 소켓 연결 활성, 답변 입력/녹음 진행 중 |
| `RECONNECTING` | 네트워크 단절 후 재연결 시도 중 |
| `FINISHED` | 면접 스크립트 동기화 후 결과 산출 |
| `ERROR` | 세션 복구 불가 등 치명적 에러 |

**에러 처리 정책**
* `RECONNECTING → ERROR` 전이 시 상태는 `READY`로 복원하여 재시도를 허용한다.
* 소켓 에러는 토스트 메시지로 처리한다.
* `ERROR` 전이 시 진행 중이던 스크립트는 `sessionStorage`에 임시 저장하여 복구 가능하도록 한다.

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 서버 상태 관리 | TanStack Query | 면접 리포트·이력 캐싱 및 로딩/에러/재시도 관리 |
| 세션·실시간 UI 상태 | React `useReducer` | 복잡한 면접 생명주기 관리 시 `useState` 파편화 방지 |
| WebSocket 연결 | 이중 연결 (Spring / FastAPI) | 세션/채팅(Spring)과 AI 실시간 제어(FastAPI) 로직 분리 |
| 스트리밍 처리 | Queue 기반 재생 + `ref` + `requestAnimationFrame` | TTS 오디오 겹침 방지 및 텍스트 타이핑 렌더링 부하 저감 |
| 오디오 캡처 | `MediaRecorder` + MIME 타입 분기 | iOS Safari 등 크로스 브라우저 대응 |
| API 레이어 분리 | 순수 API 호출 → `api/` / 상태·사이드이펙트 포함 → `hooks/` | 역할 혼재 방지 |
| 세션 저장소 | sessionStorage | 탭 종료 시 민감 데이터 자동 삭제 (`localStorage` 사용 금지) |
| 사전 진단 | `usePreflightCheck` (마이크 권한 + WS ping/pong) | 세션 진입 전 치명적 외부 변수 조기 차단 |

---

## 4. 불변 규칙 (Invariants)

* **API 독립성**: API 호출 로직은 View 레이어에 직접 작성하지 않고 반드시 `api/` 또는 `hooks/`로 분리한다.
* **음성/텍스트 동기화**: `Whisper STT` 결과가 채팅창에 반영되는 시점과 AI가 이를 인지하는 시점은 소켓 이벤트 순서를 준수해야 한다.
* **오디오 재생 순서**: TTS 오디오는 Queue에 담아 이전 문장이 끝난 후 반드시 순차적으로 재생한다. 겹쳐서 들리는 현상은 시스템의 무결성을 해치는 것으로 간주한다.
* **IDOR 방어**: 모든 면접 세션은 서버에서 인증된 `documentId`를 검증받아야 시작 가능하다. 프론트엔드에서 파라미터를 임의 조작한 세션 시작 요청은 차단된다.
* **점수 산정**: 음성 인식 유효 비율 50% 미만 항목은 `null`로 취급하며, `0점`으로 처리하지 않는다.
* **미디어 스트림 정리**: `MediaRecorder`의 스트림은 컴포넌트 언마운트 시 반드시 `.getTracks().forEach(track => track.stop())`으로 해제하여 메모리 누수 및 마이크 켜짐 상태 방지.

---

## 5. 연동 계약

* **서류 도메인**: 분석 완료 후 `documentId`를 URL 파라미터(`?documentId=xxx`)로 수신하여 RAG 컨텍스트로 활용한다. 유효하지 않은 `documentId`로 진입 시 에러 처리가 되어야 한다.
* **목록 관리**: 면접 종료(`FINISHED`) 후 면접 이력 목록 캐시를 무효화하여 최신 결과가 반영되도록 한다.

---

## 6. 금지 패턴

* **직접적인 상태 변경**: `useReducer` 외부에서 액션 없이 상태를 강제 변경하는 행위 금지.
* **소켓 메시지 무시**: 서버에서 오는 `ERROR` 타입의 소켓 메시지를 무시하고 UI를 유지하는 행위 금지.
* **비동기 오디오 동시 재생**: `Promise`를 동기적으로 제어하지 않고 오디오를 여러 개 동시에 실행 금지.
* **새로고침 무시**: `sessionStorage`가 비어 있는데 `FINISHED` 상태가 아닌 경우, 초기 진입 페이지(`InterviewSetup`)로 리다이렉트하지 않는 행위 금지.
* **서버 상태 직접 관리**: TanStack Query로 관리하는 서버 상태를 컴포넌트 내부 `useState`에 복사하여 동기화를 깨뜨리는 행위 금지.
* **데이터 직접 저장**: 세션 정보를 `localStorage`에 저장 금지 (`sessionStorage` 강제).
* **window 전역 오염**: 세션 정보나 소켓 인스턴스를 `window` 객체에 직접 저장 금지.

---

## 7. 품질 및 안정성

* **사전 진단**: `PreflightCheck`를 통과하지 못한 환경에서는 면접 시작 버튼을 비활성화한다.
* **접근성(a11y)**: 채팅창의 메시지 추가는 `aria-live="polite"`로, 타이머의 임박 시점은 `aria-live="assertive"`로 처리한다.
* **성능**: Recharts 레이더 차트 렌더링 시 과도한 리렌더링 방지를 위해 `memo`와 `useMemo`를 필수로 사용한다.
* **ChatWindow 스크롤 제어**: 면접 스크립트가 특정 길이(서버 설정 최대 질문 수 기준)를 초과하면 가상 리스트(Virtual List) 또는 스크롤 제어를 적용한다. 질문 개수는 서버 설정값을 따르며 프론트엔드에서 임의로 제한하지 않는다. DOM 노드 과다로 인한 브라우저 성능 저하를 방지하기 위함이다.
* **타이머 및 녹음 제어**: 문항당 최대 답변 시간은 2분 30초(150초)로 제한하며, 시간 도달 시 즉시 `MediaRecorder`의 `stop()`을 호출하고 녹음을 종료한다. 이후 서버에 남은 버퍼를 전송하여 면접 흐름을 강제로 진행한다.
* **오디오 청크 전송**: 음성 면접 시 마이크 녹음 데이터는 **5초 단위 Chunk**로 분할하여 전송한다. 실시간 STT 정확도 향상 및 네트워크 단절 시 데이터 유실 최소화를 위함이다. 단일 대용량 파일 전송은 금지한다.