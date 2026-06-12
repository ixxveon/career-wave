# Constitution: 서류 분석 AI 도메인 (FastAPI)

> 관련 문서: `fastapi-spec.md` / `fastapi-schema.md` / `fastapi-plan.md`
> 레이어: **FastAPI (AI 엔진)**

---

## 1. 도메인 원칙

- **Spring Boot 연동 전용**: FastAPI는 Spring Boot의 내부 호출만 처리한다. 프론트엔드가 FastAPI를 직접 호출하는 경우는 없다.
- **비동기 처리 필수**: 분석 트리거 수신 후 `202 Accepted`를 즉시 반환하고, 분석은 백그라운드 태스크로 처리한다. 동기 처리 시 Spring Boot의 응답 지연으로 전파된다.
- **Webhook 콜백으로 상태 전달**: FastAPI는 DB를 직접 쓰지 않는다. 모든 상태 갱신은 Spring Boot Webhook 콜백으로 전달한다.
- **내부 인증 필수**: 모든 요청에 `X-Internal-Secret` 헤더가 포함되어야 한다. 헤더 누락 또는 불일치 시 즉시 `403`을 반환한다.
- **도메인 경계 준수**: `user/` 패키지는 `admin/` 패키지를 직접 참조하지 않는다.

---

## 2. 상태 전이 책임

FastAPI는 분석 진행 단계마다 Spring Boot Webhook 콜백으로 상태를 전달한다.
DB 상태 전이는 Spring Boot가 수행하며 FastAPI는 직접 변경하지 않는다.

```
UPLOADED (Spring 설정)
    ↓ FastAPI 트리거 수신
PENDING  (콜백 전송)
    ↓ 분석 시작
ANALYZING  (콜백 전송 — 진행 단계마다)
    ↓
COMPLETED (콜백 전송) 또는 FAILED (콜백 전송)
```

| 상태 | Webhook 전송 주체 | 조건 |
|------|-----------------|------|
| `PENDING` | FastAPI | 분석 큐 수신 직후 |
| `ANALYZING` | FastAPI | 각 분석 단계 시작 시 |
| `COMPLETED` | FastAPI | 분석 정상 완료 |
| `FAILED` | FastAPI | 파싱 오류, AI 오류, 타임아웃 등 |

---

## 3. 불변 규칙 (Invariants)

- `feedbackText`는 반드시 `FeedbackDetail[]`을 JSON 직렬화한 문자열이어야 한다. Spring Boot의 `ObjectMapper.readValue()`로 역직렬화 가능한 형식을 유지한다.
- `scoreJobFitness`, `scoreTechStack`, `scoreQuantified`, `scoreLogical`, `scoreTotal`은 각각 0~100 범위의 정수여야 한다.
- `FAILED` 콜백 시 점수 5개, `overallReview`, `feedbackText`는 반드시 `null`이어야 한다. `errorMessage`는 반드시 문자열이어야 한다.
- 이력서(`RESUME`)의 각 `FeedbackDetail`에 `starAnalysis`가 포함되어야 한다.
- 자기소개서(`COVER_LETTER`)의 각 `FeedbackDetail`에 `starAnalysis`는 `null`이어야 한다.
- `feedbackDetails`의 `sectionNumber`는 1부터 시작하는 연속 정수여야 한다.
- 자기소개서의 경우 `feedbackDetails` 항목 수는 `content[]` 배열 길이와 동일해야 한다. 각 항목의 `sectionNumber`는 `content[].order`와 일치한다.
- Webhook 콜백은 `X-Internal-Secret` 헤더를 반드시 포함해야 한다.

---

## 4. 보안 규칙

- `X-Internal-Secret` 헤더 검증은 모든 `/internal/*` 라우터에서 공통으로 수행한다. 환경 변수 `WEBHOOK_SECRET`과 비교하며, 키를 코드에 하드코딩 금지.
- FastAPI → Spring Webhook 콜백 시에도 동일한 `X-Internal-Secret` 헤더를 포함한다.
- 모든 환경 변수는 `core/config.py`(또는 `core/settings.py`)를 통해 접근한다. 라우터·서비스 레이어에서 `os.environ` 직접 접근 금지.
- OpenAI API 키, AWS 자격증명, WEBHOOK_SECRET은 절대 로그에 출력하지 않는다.
- S3 파일 URL에서 직접 파일을 다운로드한다. 임시 파일은 분석 완료 후 즉시 삭제한다.
- FastAPI는 내부 네트워크(Private Subnet)에서만 구동하며, 모든 외부 호출은 반드시 Spring Boot API Gateway를 통한다. 보안 그룹 또는 Nginx 레벨에서 외부 인터넷의 FastAPI 직접 접근을 원천 차단한다.
- S3 파일 다운로드 시 사전 설정된 최대 용량(예: 10MB)을 초과하면 즉시 FAILED 처리한다. 스트리밍 방식으로 다운로드하여 메모리에 전체 파일을 올리지 않는다. (OOM 방지)

---

## 5. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 비동기 처리 방식 | FastAPI `BackgroundTasks` 또는 asyncio 기반 비동기 함수 | Spring이 블로킹되지 않도록 즉시 응답 필요 |
| DB 직접 접근 | 금지 — Webhook 콜백 패턴으로 분리 | Spring Boot가 DB 트랜잭션 + WebSocket 알림을 통합 처리 |
| Webhook 콜백 재시도 | 최대 3회 지수 백오프 (1s, 2s, 4s) | Spring이 일시적으로 다운된 경우 재시도 허용 |
| Webhook 요청 타임아웃 | 단건 요청당 최대 5초 | Spring이 응답 없을 시 이벤트 루프 블로킹 방지 — 타임아웃 시 실패로 간주 후 로그 기록 |
| 파일 파싱 라이브러리 | `pdfplumber`(PDF), `python-docx`(DOCX) | MIT 라이선스. PyMuPDF는 AGPL 이슈로 제외 |
| S3 파일 다운로드 | 스트리밍 방식 + 최대 용량 제한 (예: 10MB) | 대용량 파일에 의한 OOM 방지, 초과 시 즉시 FAILED 처리 |
| AI 모델 | 환경 변수 `OPENAI_MODEL`로 주입 | 코드 변경 없이 모델 교체 가능 |
| 중간 상태 전송 | 분석 단계별 Webhook 콜백 | 프론트엔드 실시간 진행 표시 지원 |
| 네트워크 격리 | FastAPI는 Private Subnet에서만 구동 | 외부 인터넷에서 FastAPI 직접 접근 원천 차단 |

---

## 6. 금지 패턴

- `admin/` 패키지 클래스 직접 import 금지.
- 라우터(`resume_router.py`)에 비즈니스 로직 직접 작성 금지. 모든 로직은 서비스 레이어에 위임.
- DB(PostgreSQL) 직접 접근 금지. 상태 갱신은 Webhook 콜백으로만.
- 환경 변수 직접 하드코딩 금지 (`os.environ["KEY"]` 직접 사용 금지 — `core/config.py` 사용).
- 임시 파일을 `/tmp`에 무기한 보관 금지. 분석 완료 또는 실패 후 즉시 정리.
- `feedbackText`를 `null`이나 빈 문자열로 `COMPLETED` 콜백에 포함 금지. `COMPLETED` 시 반드시 유효한 JSON 배열 문자열이어야 한다.
- Spring Boot API 외에 외부 HTTP 엔드포인트를 FastAPI에서 직접 노출 금지 (내부 전용 `/internal/*`만 허용). 모든 트래픽은 Spring Boot를 거쳐야 한다.
- S3 다운로드 시 스트리밍 없이 전체 파일을 메모리에 로드하는 방식(`response.read()`) 금지.
- Webhook 콜백 시 `httpx.AsyncClient` 타임아웃을 생략하거나 무제한으로 설정 금지.
- 서비스·서비스 레이어의 모든 로그에 `documentId`를 반드시 포함한다. (예: `logger.info(f"[{document_id}] 분석 시작")`) — 구조화된 컨텍스트 로그 없이는 멀티 요청 환경에서 추적 불가.
- AI 분석 완료 후 토큰 소모량(input/output token)을 로그에 반드시 기록한다. 향후 aiMetrics 비용 분석의 원천 데이터가 된다. (예: `logger.info(f"[{document_id}] tokens input={input_tokens} output={output_tokens}")`)
