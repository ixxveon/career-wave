-- ============================================================
-- job_notices deep pagination 최적화 — 커버링 인덱스 (Issue #1285)
-- 목록 조회의 deferred join(지연 취행)이 Index Only Scan을 타도록
-- (deadline, created_at, job_notice_id) ACTIVE 부분 인덱스를 추가한다.
--
-- 효과(100만 기준): OFFSET 500,000 목록 조회 ~84s → ~137ms (EXPLAIN ANALYZE)
-- 실행: psql -U careerwave -d careerwave -f 20260713_job_notices_keyset_covering_index.sql
-- 주의: CREATE INDEX CONCURRENTLY는 트랜잭션 블록 안에서 실행할 수 없다.
-- ============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jn_active_keyset
    ON job_notices (deadline ASC NULLS LAST, created_at DESC, job_notice_id)
    WHERE notice_status = 'ACTIVE';
