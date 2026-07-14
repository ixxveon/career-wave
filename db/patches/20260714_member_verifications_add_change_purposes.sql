ALTER TABLE member_verifications
    DROP CONSTRAINT chk_verification_purpose;

ALTER TABLE member_verifications
    ADD CONSTRAINT chk_verification_purpose
    CHECK (purpose IN ('REGISTER', 'FIND_ID', 'RESET_PASSWORD', 'SOCIAL_SIGNUP', 'EMAIL_CHANGE', 'PHONE_CHANGE'));

COMMENT ON COLUMN member_verifications.purpose
    IS '인증 목적 (REGISTER / FIND_ID / RESET_PASSWORD / SOCIAL_SIGNUP / EMAIL_CHANGE / PHONE_CHANGE)';
