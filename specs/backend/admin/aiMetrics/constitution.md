# Constitution: aiMetrics

**Feature Branch**: `docs/admin-ai-metrics-spec`

## 1. 도메인 원칙

> 어드민은 AI 운영 현황 조회, 운영 정책 변경, RAG 문서 운영만 한다.
> Spring Boot는 관리자 API 계약과 권한을 책임지고, FastAPI는 AI 실행·집계·인덱싱만 책임진다.
> 프론트엔드는 FastAPI를 직접 호출하지 않으며, 외부 진입점은 항상 Spring Boot다.

- 관리자 API는 `ApiResponse<T>` 규격과 권한 정책을 유지한다.
- AI 실행/토큰 계산/임베딩/인덱싱은 FastAPI 내부 책임으로 분리한다.
- AI 사용량 집계와 AI 사용 로그 검색은 FastAPI가 담당하고 Spring Boot는 결과를 DTO와 `ApiResponse<T>`로 변환한다.

## 2. 상태 머신

```
UPLOADED
  ↓ (인덱싱 작업 수락)
INDEXING
  ↙             ↘
COMPLETED      FAILED
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| `UPLOADED -> INDEXING` | 허용 | 업로드 완료 후 FastAPI가 인덱싱 작업을 수락한다. |
| `INDEXING -> COMPLETED` | 허용 | 청크 생성과 벡터 인덱싱이 정상 완료되면 완료 상태로 전이한다. |
| `INDEXING -> FAILED` | 허용 | 문서 파싱, 임베딩 생성, 인덱싱 중 오류가 발생하면 실패 상태로 전이한다. |
| `COMPLETED -> INDEXING` | **금지** | 완료 문서는 재인덱싱 정책이 별도 정의되지 않은 이상 상태를 되돌리지 않는다. |
| `FAILED -> INDEXING` | **금지** | 재시도 정책은 별도 운영 기능으로 정의되지 않았으므로 직접 재전이하지 않는다. |
| `UPLOADED -> COMPLETED` | **금지** | 인덱싱 과정을 생략한 완료 처리는 상태 정합성을 깨뜨린다. |

## 3. 아키텍처 결정

> 왜 이렇게 설계했는지 이유까지 적는다. 이유 없는 결정은 나중에 깨진다.

| 결정 | 내용 | 근거 |
|------|------|------|
| 외부 진입점 단일화 | 관리자 프론트엔드는 Spring Boot만 호출하고 FastAPI는 내부 서비스로만 사용한다. | 인증/인가, 응답 규격, ErrorCode 정책을 한 계층에서 일관되게 유지해야 하기 때문이다. |
| AI 처리 책임 분리 | OpenAI 호출, 토큰 계산, 비용 계산, 임베딩/인덱싱은 FastAPI가 담당한다. | AI 실행 로직과 운영 API 로직을 분리해야 모델 교체, 워커 운영, 비동기 확장에 유리하기 때문이다. |
| 운영 정책 동기화 | `ai_ops_settings`는 Spring Boot가 저장하고 FastAPI는 동기화된 설정을 실행 시 참조한다. | 운영 정책의 변경 이력과 권한 검증은 백엔드가 관리하고, 실행 계층은 최신 설정만 반영해야 하기 때문이다. |
| RAG 상태 기반 운영 | RAG 문서는 `rag_documents.status`와 `indexing_progress`를 기준으로 운영 상태를 노출한다. | 비동기 인덱싱 진행 상황을 운영자가 추적할 수 있어야 재업로드, 삭제, 장애 대응 판단이 가능하기 때문이다. |
| 1-based 페이지 정책 유지 | 외부 API는 1-based page를 유지하고 내부 Pageable에서만 `page - 1`을 적용한다. | 프론트 계약을 단순하게 유지하면서도 Spring Data 표준 구현과 충돌하지 않도록 하기 위해서다. |
| 설정/집계/문서 운영 통합 | 예산, 알림, 로그 집계, RAG 문서 운영을 하나의 `aiMetrics` 도메인으로 묶는다. | AI 운영 관점에서 비용, 정책, 문서 인덱싱을 함께 관리해야 운영 화면과 책임 경계가 자연스럽기 때문이다. |
| 집계 책임 외부화 | `ai_usage_logs` 기반 summary, domain-usage, token-trend, heavy-users, usage logs search 계산은 FastAPI가 수행한다. | OpenAI 실행 로그 적재와 집계 기준을 같은 계층에 두어야 토큰/비용/사용량 계산 결과가 일관되기 때문이다. |

## 4. 불변 규칙 (Invariants)

> "항상 참이어야 하는 조건"을 나열한다. 코드 어디서든 이 규칙이 깨지면 버그다.

- 운영 정책 변경은 반드시 `AiMetricsService`를 통과한다. Repository 직접 수정으로 `ai_ops_settings`를 변경하지 않는다.
- `ai_ops_settings.ai_ops_setting_id`는 항상 `1`인 singleton 설정만 사용한다.
- 관리자 프론트엔드는 FastAPI를 직접 호출하지 않는다.
- `rag_documents.status`는 `UPLOADED`, `INDEXING`, `COMPLETED`, `FAILED` 이외의 값으로 저장되면 안 된다.
- `INDEXING` 상태의 문서에 대해 동일한 인덱싱 작업을 중복 수락하면 안 된다.
- `indexing_progress`는 항상 `0 ~ 100` 범위여야 하며, `COMPLETED` 상태에서는 반드시 `100`이어야 한다.
- 비용 집계와 로그 기록은 `ai_usage_logs`에 저장된 입력 토큰, 출력 토큰, 비용 값을 기준으로 계산해야 한다.
- `monthly_budget`는 항상 0보다 커야 하고, `alert_threshold`는 항상 1 이상 100 이하여야 한다.
- `PATCH /api/v1/admin/ai-metrics/alerts/discord`는 `alert_channel = DISCORD`를 전제로 동작하며 다른 채널 전환 용도로 사용하면 안 된다.
- MVP에서는 Discord 알림만 지원하며 `SLACK`, `EMAIL`은 현재 API에서 변경 또는 발송하지 않는다.
- `MASTER`만 예산 수정, rate limit 수정, RAG 문서 삭제를 수행할 수 있다.
- 운영 정책 변경과 RAG 문서 삭제 같은 관리자 변경 행위는 Audit Log 기록이 누락되면 안 된다.

## 5. 연동 계약

> 다른 도메인 또는 외부 시스템(FastAPI 등)과의 경계를 명시한다.

- **Spring Boot -> FastAPI**: Spring Boot가 FastAPI를 호출하는 단방향 구조다. FastAPI가 Spring Boot 관리자 API를 역호출하지 않는다.
- **Spring Boot 책임**: 관리자 권한 검증, 외부 API endpoint 제공, 요청 검증, `ApiResponse<T>` 래핑, ErrorCode 변환, `ai_ops_settings` 저장, `rag_documents` 메타데이터 생성/삭제 API 제공.
- **Spring Boot 집계 책임 제한**: Spring Boot는 `ai_usage_logs`를 직접 집계하지 않고 FastAPI 내부 집계 결과만 DTO로 변환한다.
- **FastAPI 책임**: OpenAI 호출, 토큰/비용 계산, 사용량 집계, 고사용 사용자 집계, 토큰 추이 집계, 문서 파싱, 청크 생성, 임베딩 생성, 벡터 인덱싱, `rag_documents` 상태 갱신.
- **DB 직접 접근 가능 주체**: Spring Boot와 FastAPI 모두 DB에 직접 접근할 수 있다. 다만 `ai_ops_settings`의 쓰기 주체는 Spring Boot, `rag_documents.status/indexing_progress/chunk_count`의 쓰기 주체는 FastAPI로 구분한다.
- **Spring Boot ↔ DB**: Spring Boot는 `ai_models`, `ai_ops_settings`, `rag_documents`를 조회 또는 수정하며, 운영 정책과 문서 메타데이터의 외부 계약을 책임진다.
- **FastAPI ↔ DB**: FastAPI는 `ai_models`, `ai_usage_logs`, `ai_ops_settings`, `rag_documents`를 참조하며, 인덱싱 상태와 AI 사용 로그 적재를 직접 처리할 수 있다.
- **FastAPI ↔ OpenAI**: FastAPI만 OpenAI를 호출한다. Spring Boot는 OpenAI SDK나 토큰 계산 로직을 직접 포함하지 않는다.
- **Spring Boot ↔ 파일 스토리지**: Spring Boot는 외부 관리자 API에서 업로드된 `multipart/form-data` 원본 파일을 수신하고 저장 가능한 경로 또는 스토리지 참조를 확보한 뒤 FastAPI에 전달한다.
- **FastAPI ↔ 파일 스토리지/벡터 스토어**: FastAPI는 원본 문서를 읽고 임베딩·인덱싱을 수행하며, 실패 시 `FAILED` 상태를 DB에 반영한다.
- **알림 시스템 연동**: Spring Boot가 정책을 저장하면 FastAPI는 동기화된 기준으로 Discord 알림만 판단하거나 발송한다. `SLACK`, `EMAIL`은 현재 API에서 변경 또는 발송하지 않는 확장 예약 값이다.

## 6. 금지 패턴

> 실수하기 쉬운 안티패턴을 명시한다.

- Swagger 어노테이션을 Controller에 직접 작성 금지 → `docs/XxxDocs.java` 인터페이스로 분리.
- Spring Boot가 OpenAI 호출, 토큰 계산, 임베딩 생성, 벡터 인덱싱 로직을 직접 구현하는 패턴 금지.
- FastAPI를 프론트엔드에서 직접 호출하도록 API 경로를 노출하는 패턴 금지.
- `rag_documents` 상태를 Repository 직접 update로 임의 변경하는 패턴 금지. 상태 전이는 서비스 또는 FastAPI 워커 책임으로만 수행한다.
- `ai_ops_settings`를 여러 row로 확장하거나 singleton 제약을 무시하는 패턴 금지.
- Controller에서 기간 검증, 예산 검증, 권한 분기, FastAPI 오류 해석까지 처리하는 패턴 금지.
- RAG 문서 삭제 시 DB 메타데이터만 지우고 벡터 인덱스 정리를 생략하는 패턴 금지.
