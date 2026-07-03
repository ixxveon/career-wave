-- #956 채용 공고 목록 API 성능 개선
-- 기본/추천 정렬(deadline ASC, created_at DESC)과 컬럼 순서를 맞춘 복합 부분 인덱스.
-- 기존 idx_job_notices_active_deadline은 복합 인덱스의 leftmost prefix로 커버되므로 제거.
-- 새 인덱스를 먼저 생성한 뒤 기존 인덱스를 삭제하여 인덱스 없는 구간을 방지.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_notices_active_deadline_created
    ON job_notices (deadline ASC NULLS LAST, created_at DESC)
    WHERE notice_status = 'ACTIVE';

DROP INDEX CONCURRENTLY IF EXISTS idx_job_notices_active_deadline;
