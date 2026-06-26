-- ============================================================
-- document_feedbacks.document_id UNIQUE 제약 추가
-- 실행 방법: psql -U careerwave -d careerwave -f 20260626_document_feedbacks_unique_document_id.sql
-- 전제조건 : document_feedbacks 테이블에 document_id 중복 행이 없어야 한다.
--            중복 행이 있으면 아래 진단 쿼리로 확인 후 수동 정리 필요.
-- 진단: SELECT document_id, COUNT(*) FROM document_feedbacks GROUP BY document_id HAVING COUNT(*) > 1;
-- ============================================================

BEGIN;

ALTER TABLE document_feedbacks
    ADD CONSTRAINT uq_document_feedbacks_document UNIQUE (document_id);

COMMIT;
