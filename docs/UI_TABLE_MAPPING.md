# UI 기준 테이블 매핑 정리

> 기준 DDL: v3  
> 작성일: 2026-05-29

---

## 사용자 플랫폼 — 페이지 ↔ 테이블

| 페이지 | 경로 | 연관 테이블 |
|---|---|---|
| 구직자 대시보드 | `/` | members, interview_sessions, applications |
| 기업 대시보드 | `/dashboard/company` | members, company_profiles, job_notices |
| 로그인/회원가입 | `/auth/*` | members, personal_profiles, company_profiles |
| 기업 프로필 | `/company/profile` | company_profiles |
| HR 담당자 관리 | `/company/hr-managers` | members, hr_managers |
| 채용 공고 목록/상세 | `/jobs/*` | job_notices |
| 지원 현황 | `/applications/status` | applications |
| 지원자 관리 | `/applications/applicants` | applications, members |
| 이력서 분석 | `/documents/resume` | documents, document_feedbacks |
| 자소서 분석 | `/documents/cover-letter` | documents, document_feedbacks |
| 면접 홈/텍스트/미디어 | `/interview/*` | interview_sessions, interview_messages |
| 면접 리포트 | `/interview/report` | interview_sessions, career_histories |
| 커뮤니티 | `/community/*` | boards, comments |
| 멘토 페이지 | `/community/mentor` | members |
| 결제/구독 | `/billing/*` | payments, subscriptions, plans |

---

## 관리자 플랫폼 — 페이지 ↔ 테이블

| 페이지 | 경로 | 연관 테이블 | 담당 |
|---|---|---|:---:|
| 종합 대시보드 | `/admin/dashboard` | 전체 집계 (aggregation) | 고유리 |
| 관리자 관리 | `/admin/admins` | admins | 홍순찬 |
| 회원 관리 | `/admin/members` | members, personal_profiles, company_profiles, suspend_histories | 신보라 |
| 신고 관리 | `/admin/reports` | reports, boards, comments | 신보라 |
| 고객센터 | `/admin/cs` | inquiries, inquiry_answers, notices, faqs | 신보라 |
| 결제·정산 | `/admin/payments` | payments, subscriptions, refunds | 신보라 |
| 통계 | `/admin/stats` | applications, job_notices | 신보라 |
| AI 메트릭스 | `/admin/ai` | ai_usage_logs, interview_sessions | 홍순찬 |
| 스크래핑 관리 | `/admin/scraping` | scraping_logs, job_notices | 홍순찬 |

---

## 주의 사항

### 경로 변경
| 변경 전 | 변경 후 | 사유 |
|---|---|---|
| `/admin/matching` | `/admin/stats` | 매칭 기능 제거, 통계 페이지로 대체 |

### 테이블명 주의
| UI 문서 표기 | 실제 테이블명 | 비고 |
|---|---|---|
| tickets | inquiries + inquiry_answers | 고객센터 문의는 inquiries 테이블 사용 |

### 미확정 항목
| 페이지 | 내용 |
|---|---|
| 멘토 페이지 `/community/mentor` | members 테이블에 ROLE_MENTOR 없음, 추후 기획 확정 필요 |
| 감사 로그 `/admin/log` | audit_logs 테이블 연결, 라우트에는 존재하나 매핑표 미포함 |

---

## 관련 파일

| 파일 | 내용 |
|---|---|
| `docs/ERD_RELATIONS.md` | ERDCloud 관계선 전체 정리 |
| `docs/CONVENTION.md` | 코드 작성 컨벤션 |
| `src/routes/AppRoutes.tsx` | 전체 라우트 정의 |
