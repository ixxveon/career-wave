-- ================================================
-- interview_messages.question_order 컬럼 및 유니크 제약 추가
-- 엔티티(InterviewMessage)와 init.sql 스키마 불일치 해소 (#941)
-- ================================================

ALTER TABLE interview_messages
    ADD COLUMN IF NOT EXISTS question_order INTEGER NULL;

COMMENT ON COLUMN interview_messages.question_order IS '질문 순서 (SYSTEM 메시지는 NULL 허용)';

ALTER TABLE interview_messages
    ADD CONSTRAINT uq_interview_messages_session_sender_order
        UNIQUE (session_id, sender, question_order);
