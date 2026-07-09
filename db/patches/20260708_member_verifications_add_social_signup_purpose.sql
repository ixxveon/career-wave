-- ================================================
-- patch: member_verifications 인증 목적에 SOCIAL_SIGNUP 추가
-- 사유:  소셜 가입 추가정보 단계 휴대폰 인증(purpose=SOCIAL_SIGNUP, PR #1117)에서
--        chk_verification_purpose CHECK 제약에 'SOCIAL_SIGNUP'이 누락되어
--        send() 커밋 시 DataIntegrityViolationException(409) 발생
--        → 문자는 발송되나 인증 레코드 저장 실패로 소셜 가입 불가.
--        VerificationPurpose enum(REGISTER/FIND_ID/RESET_PASSWORD/SOCIAL_SIGNUP)과 정합화.
-- date:  2026-07-08
-- ================================================

ALTER TABLE member_verifications
    DROP CONSTRAINT IF EXISTS chk_verification_purpose;

ALTER TABLE member_verifications
    ADD CONSTRAINT chk_verification_purpose
        CHECK (purpose IN ('REGISTER', 'FIND_ID', 'RESET_PASSWORD', 'SOCIAL_SIGNUP'));

COMMENT ON COLUMN member_verifications.purpose IS '인증 목적 (REGISTER / FIND_ID / RESET_PASSWORD / SOCIAL_SIGNUP)';
