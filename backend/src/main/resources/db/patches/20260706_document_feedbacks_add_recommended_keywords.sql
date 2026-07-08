-- document_feedbacks 테이블에 추천 키워드 컬럼 추가 (#873)
ALTER TABLE document_feedbacks
    ADD COLUMN IF NOT EXISTS recommended_keywords TEXT;
