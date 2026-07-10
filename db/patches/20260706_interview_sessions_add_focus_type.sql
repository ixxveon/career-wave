-- 면접 세션에 개선 추천 액션 집중 유형 컬럼 추가
ALTER TABLE interview_sessions
    ADD COLUMN focus_type VARCHAR(20) NULL
        CHECK (focus_type IN ('FOLLOW_UP', 'TECHNICAL_DEPTH', 'DELIVERY', 'FLUENCY'));
