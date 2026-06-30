-- ================================================
-- interview_messages.question_order 컬럼 및 유니크 제약 추가
-- 엔티티(InterviewMessage)와 init.sql 스키마 불일치 해소 (#941)
-- ================================================

ALTER TABLE interview_messages
    ADD COLUMN IF NOT EXISTS question_order INTEGER NULL;

COMMENT ON COLUMN interview_messages.question_order IS '질문 순서 (QUESTION 타입은 NOT NULL, ANSWER/SYSTEM은 NULL 허용)';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_interview_messages_session_sender_order'
    ) THEN
        ALTER TABLE interview_messages
            ADD CONSTRAINT uq_interview_messages_session_sender_order
                UNIQUE (session_id, sender, question_order);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_question_order_not_null_for_question'
    ) THEN
        ALTER TABLE interview_messages
            ADD CONSTRAINT chk_question_order_not_null_for_question
                CHECK (message_type != 'QUESTION' OR question_order IS NOT NULL);
    END IF;
END $$;
