# Constitution: 서류 분석 도메인 (Backend)

> 관련 문서: `spec.md` / `api-schema.md` / `plan.md`  
> 레이어: **Backend (Spring Boot)**

---

## 1. 도메인 원칙

- **IDOR 방어 필수**: 모든 문서 조회·WebSocket 연결 시 `memberId`와 `document.member_id` 일치 여부를 서비스 레이어에서 검증. 불일치 시 `DOCUMENT_ACCESS_DENIED(403)` 반환.
- **UUID 기반 식별자**: `documentId`는 UUID v4 사용. 순차 BIGINT 노출 시 순번 유추를 통한 타인 문서 접근 가능성 제거.
- **도메인 경계 준수**: `user/resume/` 패키지는 `admin/` 패키지를 직접 참조하지 않는다.
- **분석 결과 무결성**: FastAPI가 기록한 피드백 데이터는 Spring에서 수정하지 않는다. 결과 저장 방식(직접 DB 쓰기 vs 콜백 API)은 팀 협의 후 결정.

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
- 이력서(`RESUME`) 타입 Document의 `file_url`은 null 불가; 자기소개서(`COVER_LETTER`) 타입의 `file_url`은 항상 null.
- 파일 검증(크기·MIME type 기반 확장자)은 서비스 레이어 진입 전에 처리. 검증 실패 시 S3 업로드 절대 수행 금지.
- S3에 저장하는 파일명(`stored_file_name`)은 반드시 `{UUID}.{확장자}` 형식으로 생성. `original_name`을 S3 키로 직접 사용 금지.
- `document.status`의 `PENDING` 이후 전이는 Webhook 콜백 또는 FastAPI만 수행. Spring 서비스 레이어에서 직접 변경 금지.

---

## 4. 보안 규칙

- `@AuthenticationPrincipal`로 `memberId`를 추출하며, Request body·Path variable의 `memberId`를 신뢰하지 않는다.
- WebSocket 핸드셰이크 시 쿼리 파라미터 토큰 검증을 반드시 수행. 검증 실패 시 Close 1008로 즉시 종료.
- 파일 확장자 검증은 MIME type 기반으로 수행 (파일명 확장자 단독 신뢰 금지).

---

## 5. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| `documentId` 타입 | UUID v4 | IDOR 방어, 노출 안전성 |
| 파일 저장 | S3 (외부 스토리지) | DB 직접 저장 지양 |
| S3 파일명 | `{UUID}.{확장자}` | 한글·특수문자 파일명 깨짐 방지, 원본명은 DB 컬럼(`original_name`)에 별도 보존 |
| 분석 결과 수신 | Webhook (FastAPI → Spring `POST .../webhook`) | Spring이 DB 저장 + WebSocket 알림을 한 흐름에서 처리 가능 |
| `feedback_details` 저장 | JSONB + `AttributeConverter` 또는 `hypersistence-utils` | AI 응답 스키마 유연성 + JPA 변환 편의성 |
| WebSocket 인증 | `HandshakeInterceptor` | 핸드셰이크 시점에 `Authentication` 객체 주입, REST와 동일한 보안 체계 유지 |
| 페이징 기준 | 0-based (`page`, `size`) | Spring Data JPA `Pageable` 기본 규칙 |
| `FAILED` 재시도 | v1 미지원 — UI에서 재업로드 유도 | v1 범위 최소화, v2 이후 재시도 정책 설계 |

---

## 6. 금지 패턴

- `admin/` 패키지 클래스 직접 import 금지.
- Entity를 API 응답으로 직접 반환 금지 — 반드시 DTO 변환 후 반환.
- 파일 크기·확장자 검증 없이 S3 업로드 수행 금지.
- `memberId`를 Request body 또는 Path variable에서 파싱하여 소유권 확인에 사용 금지.
- `document.status`를 Spring에서 `PENDING` 이후 상태로 직접 변경 금지 (FastAPI 책임 영역).
- `new RuntimeException(...)` 직접 생성 금지 — 반드시 `CustomException(ErrorCode.*)` 사용.
