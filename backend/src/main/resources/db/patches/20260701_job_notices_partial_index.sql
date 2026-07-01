-- ============================================================
-- job_notices 부분 인덱스 추가 (성능 개선 | Issue #935)
-- 실행 방법: psql -U careerwave -d careerwave -f 20260701_job_notices_partial_index.sql
--
-- 왜 부분 인덱스(Partial Index)인가?
--   채용 공고는 시간이 지날수록 CLOSED 공고가 무한히 누적된다.
--   일반 인덱스는 CLOSED 공고까지 모두 인덱싱하여 데이터가 쌓일수록 인덱스가 비대해진다.
--   부분 인덱스는 ACTIVE 상태인 공고만 인덱싱하므로,
--   CLOSED 공고가 아무리 쌓여도 인덱스 크기가 변하지 않아 100만 건에서도 성능이 안정적이다.
--
-- 주의: CREATE INDEX CONCURRENTLY는 트랜잭션 블록 안에서 실행할 수 없다.
--       쓰기 잠금 없이 인덱스를 생성하므로 운영 환경 배포 시 안전하다.
-- ============================================================

-- ① 최신순 정렬 (기본 정렬 / 추천순 보조 정렬)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_notices_active_created
    ON job_notices (created_at DESC)
    WHERE notice_status = 'ACTIVE';

-- ② 마감 임박순 정렬 (추천순 기본 정렬)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_notices_active_deadline
    ON job_notices (deadline ASC NULLS LAST)
    WHERE notice_status = 'ACTIVE';
