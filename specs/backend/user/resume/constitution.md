# Constitution: 서류 분석 도메인 (Backend)

> 관련 문서: `spec.md` / `api-schema.md` / `plan.md`  
> 레이어: **Backend (Spring Boot)**

---

## 1. 도메인 원칙

- **IDOR 방어 필수**: 모든 문서 조회·WebSocket 연결 시 `memberId`와 `document.member_id` 일치 여부를 서비스 레이어에서 검증. 불일치 시 `DOCUMENT_ACCESS_DENIED(403)` 반환.
- **UUID 기반 식별자**: `documentId`는 UUID v4 사용. 순차 BIGINT 노출 시 순번 유추를 통한 타인 문서 접근 가능성 제거.
- **도메인 경계 준수**: `user/resume/` 패키지는 `admin/` 패키지를 직접 참조하지 않는다.
- **분석 결과 무결성**: FastAPI가 기록한 피드백 데이터는 Spring에서 수정하지 않는다. 결과 저장 방식은 **Webhook 콜백(FastAPI → Spring `POST .../webhook`)으로 확정** — FastAPI가 분석 완료 후 Spring에 콜백을 보내면 Spring이 DB에 저장한다.

---

## 2. 상태 전이

```
UPLOADED → PENDING → ANALYZING → COMPLETED
                              ↘ FAILED
```

| 전이 | 주체 | 조건 |
|------|------|------|
| `UPLOADED` 설정 | Spring | 이력서 업로드 또는 자기소개서 저장 성공 직후 |
| `PENDING` 전이 | FastAPI | 분석 큐 수신 후 |
| `ANALYZING` 전이 | FastAPI | 분석 작업 시작 |
| `COMPLETED` 전이 | FastAPI | 분석 완료 및 결과 저장 |
| `FAILED` 전이 | FastAPI | 분석 타임아웃 또는 오류 |

> Spring은 `UPLOADED` 상태만 직접 설정. 이후 전이는 FastAPI 또는 콜백 API 책임.

---

## 3. 불변 규칙 (Invariants)

- `document.member_id`는 최초 생성 시 설정 후 변경 불가.
- `document_feedbacks`는 `document_id` 기준 1:1 (UNIQUE 제약).
- `cover_letter_contents`의 `order_num`은 동일 `document_id` 내에서 1~5 범위 내 중복 불가.
- `documents.file_url`과 `documents.original_name`은 둘 다 NOT NULL — 이력서·자기소개서 모두 필수 저장.
- 파일 검증(크기·MIME type 기반 확장자)은 서비스 레이어 진입 전에 처리. 검증 실패 시 S3 업로드 절대 수행 금지.
- S3 저장 키는 `resumes/{yyyy-MM-dd}/{UUID}.{확장자}` 형식으로 생성. `original_name`을 S3 키로 직접 사용 금지. `file_url`에는 완성된 S3 URL, `original_name`에는 사용자 원본 파일명을 저장.
- `cover_letter_contents`의 `order_num`은 동일 `document_id` 내에서 UNIQUE 제약(`uq_clc_document_order`) — DB 레벨에서 중복 방지.
- `document.status`는 Spring이 `UPLOADED`로 초기 설정. `PENDING` 이후 전이는 Webhook 수신 시 Spring이 업데이트. 서비스 레이어에서 임의 변경 금지.
- Webhook 멱등성 보장: `document.status`가 이미 `COMPLETED` 또는 `FAILED`인 경우 동일 Webhook 재수신 시 DB 덮어쓰기 및 예외 발생 없이 조용히 무시한다.

---

## 4. 보안 규칙

- `@AuthenticationPrincipal`로 `memberId`를 추출하며, Request body·Path variable의 `memberId`를 신뢰하지 않는다.
- WebSocket 핸드셰이크 시 쿼리 파라미터 토큰 검증을 반드시 수행. 검증 실패 시 Close 1008로 즉시 종료.
- Webhook 수신 시 `X-Internal-Secret` 헤더 값을 환경 변수 `WEBHOOK_SECRET`과 비교하여 검증. 헤더 누락 또는 불일치 시 즉시 `403` 반환. Secret Key를 코드에 하드코딩 금지.
- 파일 확장자 검증은 MIME type 기반으로 수행 (파일명 확장자 단독 신뢰 금지).

---

## 5. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| `documentId` 타입 | UUID v4 | IDOR 방어, 노출 안전성 |
| 파일 저장 | S3 (외부 스토리지) | DB 직접 저장 지양 |
| S3 키 생성 | `resumes/{yyyy-MM-dd}/{UUID}.{확장자}` | 한글·특수문자 깨짐 방지, 날짜별 분산 관리, 원본명은 `original_name` 컬럼에 보존 |
| `documents.status` | VARCHAR(20), DEFAULT 'UPLOADED' | 프론트 스펙 상태 추적에 맞춰 추가 — Spring이 UPLOADED 설정, 이후 전이는 Webhook 책임 |
| 분석 결과 수신 | Webhook (FastAPI → Spring `POST .../webhook`) | Spring이 DB 저장 + WebSocket 알림을 한 흐름에서 처리 가능 |
| 분석 결과 저장 | 점수 5개 개별 INTEGER 컬럼 + `feedback_text` TEXT | 실제 DB 스키마 기준 (JSONB 미사용, `AttributeConverter` 불필요) |
| WebSocket 구현 | STOMP (`spring-boot-starter-websocket`) | 표준화된 메시지 프로토콜, 토픽 기반 구독 구조 |
| WebSocket 인증 | `WebSocketHandshakeInterceptor` (1차) + `StompChannelInterceptor` (2차) | 핸드셰이크 시 `?token=` 쿼리 파라미터로 JWT 전달 — 프론트 `@stomp/stompjs` 연결 방식으로 확정. 1차 핸드셰이크에서 검증 후 세션 주입, CONNECT 프레임에서 재검증 |
| 페이징 기준 | 0-based (`page`, `size`) | Spring Data JPA `Pageable` 기본 규칙 |
| `FAILED` 재시도 | v1 미지원 — UI에서 재업로드 유도 | v1 범위 최소화, v2 이후 재시도 정책 설계 |
| WebSocket 종료 방식 | `COMPLETED`/`FAILED` 전송 후 30초 Grace Period 유지 후 서버 종료 | 즉시 종료 시 프론트 재연결 루프 유발 위험 방지 |
| WebSocket 초기 상태 전송 | STOMP 연결 성공 직후 현재 `document.status`를 1회 브로드캐스트 | 재연결 시 프론트가 현재 진행 상태를 즉시 파악 가능 |
| Webhook 멱등성 | 이미 최종 상태(`COMPLETED`/`FAILED`)인 문서 재수신 시 무시. 처리 중 상태(`PENDING`/`ANALYZING`)는 정상 처리 | 네트워크 재시도로 인한 중복 요청 대응, ANALYZING 중 정상 업데이트 누락 방지 |

---

## 6. 트랜잭션 경계 주의사항

**파일 업로드와 분석 트리거는 트랜잭션 단위가 다르다.**

- `Document` DB 저장(`status = UPLOADED`)과 FastAPI 분석 트리거 호출은 **별개의 처리 단위**다.
- DB 저장은 Spring 트랜잭션 안에서 보장되지만, FastAPI 호출 성공 여부는 트랜잭션으로 묶을 수 없다.
- 따라서 FastAPI 서버가 다운된 경우, DB에는 `UPLOADED` 상태의 Document가 남지만 분석은 시작되지 않는 불일치 상태가 발생할 수 있다.

**v1 최소 대응 전략 (구현 시 고려)**

```
FastAPI 분석 트리거 호출
  ├── 202 Accepted 수신      → 정상 (FastAPI 큐 수신 완료)
  └── 호출 실패 (타임아웃·5xx) → document.status = FAILED 마킹
                               + 에러 로그 기록 (관리자 인지용)
                               + 사용자에게 재시도 안내
```

> v1에서는 재시도 자동화(Retry Queue 등)는 구현하지 않는다.  
> 호출 실패 시 `FAILED` 마킹 + 로그 기록까지만 처리하고, 재업로드는 사용자가 직접 수행한다.  
> v2 이후 Dead Letter Queue 또는 Retry 정책 도입을 검토한다.

---

## 7. 금지 패턴

- `admin/` 패키지 클래스 직접 import 금지.
- Entity를 API 응답으로 직접 반환 금지 — 반드시 DTO 변환 후 반환.
- 파일 크기·확장자 검증 없이 S3 업로드 수행 금지.
- `memberId`를 Request body 또는 Path variable에서 파싱하여 소유권 확인에 사용 금지.
- `document.status`를 Spring에서 `PENDING` 이후 상태로 직접 변경 금지 (FastAPI 책임 영역).
- `new RuntimeException(...)` 직접 생성 금지 — 반드시 `CustomException(ErrorCode.*)` 사용.
- 자기소개서 내용 수정(Update) API 구현 금지 (v1 범위 외) — 수정 필요 시 재제출로 신규 `documentId` 발급.
- `SimpMessagingTemplate.convertAndSend()`를 `@Transactional` 메서드 안에서 직접 호출 금지.  
  반드시 `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`를 통해 커밋 완료 후 발행할 것.  
  이유: 커밋 전에 메시지를 보내면 클라이언트는 수신했으나 DB에는 아직 미반영인 데이터 불일치 상태가 발생한다.
- `document_feedbacks` 컬럼을 JSONB나 `AttributeConverter`로 처리 금지 — 점수 5개 INTEGER 컬럼은 직접 매핑, `feedback_text`는 `ObjectMapper`로 JSON 역직렬화.
