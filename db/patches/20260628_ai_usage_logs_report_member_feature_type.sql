-- ai_usage_logs feature_type CHECK 제약에 ADMIN_REPORT_MEMBER 추가
-- 관리자 신고 상세 > 대상 회원 AI 분석 사용량 기록용

ALTER TABLE ai_usage_logs DROP CONSTRAINT chk_ai_usage_feature;

ALTER TABLE ai_usage_logs
    ADD CONSTRAINT chk_ai_usage_feature
        CHECK (feature_type IN ('DOCUMENT', 'INTERVIEW', 'INTERVIEW_STT', 'INTERVIEW_TTS', 'ADMIN_CS', 'ADMIN_REPORT', 'ADMIN_REPORT_MEMBER')) NOT VALID;

ALTER TABLE ai_usage_logs VALIDATE CONSTRAINT chk_ai_usage_feature;

COMMENT ON COLUMN ai_usage_logs.feature_type IS '기능 유형 (DOCUMENT / INTERVIEW / INTERVIEW_STT / INTERVIEW_TTS / ADMIN_CS / ADMIN_REPORT / ADMIN_REPORT_MEMBER)';
