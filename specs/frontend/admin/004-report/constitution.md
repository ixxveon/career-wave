# Constitution: 신고관리 (Report Management)

**Feature Branch**: `feature/admin-report-ui`
**Scope**: 신고 목록 조회, 상세 모달, 블라인드·기각 처리
**버전**: v1
**담당**: 신보라

---

## 1. 도메인 가치

관리자는 커뮤니티 게시글·댓글·회원에 대한 신고 내역을 한 화면에서 파악하고,
신고 콘텐츠의 블라인드 처리 또는 신고 기각을 통해 플랫폼 품질을 유지할 수 있어야 한다.

신고 처리는 단순 클릭이 아닌 확인 모달을 반드시 거쳐야 하며,
블라인드 처리 완료 즉시 해당 게시글·댓글이 사용자 화면에서 숨겨진다.

---

## 2. 상태 머신

### 신고 처리 상태 전이 (report_status)

```text
PENDING
  → BLINDED   (관리자가 콘텐츠 블라인드 처리)
  → DISMISSED (관리자가 신고 기각 처리)

BLINDED
  → (변경 불가 — v1 기준)

DISMISSED
  → (변경 불가 — v1 기준)
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| PENDING → BLINDED | 허용 | 관리자가 확인 모달 후 블라인드 처리 |
| PENDING → DISMISSED | 허용 | 관리자가 확인 모달 후 기각 처리 |
| BLINDED → 기타 | 불가 (v1) | 처리 버튼 비활성화, API 409 반환 |
| DISMISSED → 기타 | 불가 (v1) | 처리 버튼 비활성화, API 409 반환 |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| KPI 카드 4종 | 전체·접수·블라인드·기각 집계값 표시 | 관리자가 처리 현황을 한눈에 파악 |
| 필터 3종 동시 적용 | 처리 상태·신고 유형·신고 사유 | 각 필터는 독립적으로 작동하며 AND 조건으로 결합 |
| 상세 모달 내 처리 버튼 | 목록 "상세보기" 클릭 → 모달 오픈 → 모달 내 처리 버튼 | 콘텐츠 확인 후 처리 결정을 유도 |
| 2단계 처리 모달 | 상세 모달 → 처리 확인 모달 | 실수 방지 (콘텐츠 확인 → 처리 확정 분리) |
| MEMBER 블라인드 특례 | target_type이 MEMBER이면 is_blind 변경 없음, report_status만 BLINDED | 회원 제재는 회원관리 페이지에서 별도 처리 |
| 처리 후 즉시 반영 | API 성공 응답 후 목록의 상태 뱃지를 로컬 상태로 즉시 갱신 | 페이지 전체 재로드 없이 UX 유지 |
| v2 기능 UI 준비 | 체크박스는 v1에서 UI만 구현 (일괄 처리 API 연동은 v2) | 체크박스 선택 상태 관리만 선제적으로 구현 |

---

## 4. 불변 규칙

- 블라인드·기각 처리는 반드시 확인 모달을 거쳐야 한다. 단일 클릭으로 즉시 처리하는 UI를 금지한다.
- `BLINDED` 또는 `DISMISSED` 상태의 신고에 대해 처리 버튼을 노출하거나 활성화하는 것을 금지한다.
- `target_type = MEMBER` 신고 블라인드 처리 시 "회원 콘텐츠"를 블라인드한다는 안내를 표시하지 않는다. (신고 상태만 변경)
- `ai_suggestion` 필드는 DB에 존재하지만 v1 UI에서 표시하지 않는다.
- 신고 사유(`reason`) 필드는 서버 Enum 값 그대로 전달하며, UI에서 임의 변환하지 않는다. (한글 매핑은 상수로 관리)
- 처리 버튼 비활성화는 클라이언트 상태(`report_status`)만으로 판단하며, 서버 응답과 불일치 시 서버 응답을 우선한다.

---

## 5. 연동 계약

- `admin-backend`는 아래 API를 제공한다:
  - `GET /api/admin/reports/summary` — KPI 집계 (전체·접수·블라인드·기각 건수)
  - `GET /api/admin/reports?status=&targetType=&reason=&page=&size=` — 신고 목록 (페이지네이션)
  - `GET /api/admin/reports/{reportId}` — 신고 상세 (신고자·피신고자·대상 콘텐츠)
  - `PATCH /api/admin/reports/{reportId}/blind` — 블라인드 처리
  - `PATCH /api/admin/reports/{reportId}/dismiss` — 기각 처리
- 모든 응답은 `ApiResponse<T>` 형식 (`success`, `statusCode`, `message`, `data`)을 사용한다.
- 처리 성공 시 응답 `data`에 변경된 `reportStatus`가 포함되며, 이를 기반으로 목록 상태 뱃지를 즉시 갱신한다.

---

## 6. 금지 패턴

- `PENDING`이 아닌 신고의 처리 버튼을 활성화하는 것을 금지한다.
- 처리 확인 모달 없이 블라인드·기각 처리를 즉시 실행하는 것을 금지한다.
- `ai_suggestion` 값을 v1 UI에서 표시하거나 전달하는 것을 금지한다.
- 신고 처리 상태(`report_status`)를 프론트엔드에서 직접 변경하는 것을 금지한다. 서버 응답 기준으로만 갱신한다.
- `target_type = MEMBER` 신고에 대해 "콘텐츠 블라인드" 안내를 표시하는 것을 금지한다.
