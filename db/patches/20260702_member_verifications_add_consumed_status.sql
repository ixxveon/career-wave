-- ================================================
-- patch: member_verifications 인증 상태에 CONSUMED 추가
-- 사유:  회원가입 완료 시 markConsumed()가 상태를 'CONSUMED'로 변경하는데
--        chk_verification_status CHECK 제약에 'CONSUMED'가 누락되어
--        DataIntegrityViolationException(409) 발생 → 회원가입 불가.
--        VerificationStatus enum(SENT/VERIFIED/CONSUMED/EXPIRED/FAILED/RATE_LIMITED)과 정합화.
-- date:  2026-07-02
-- ================================================

ALTER TABLE member_verifications
    DROP CONSTRAINT IF EXISTS chk_verification_status;

ALTER TABLE member_verifications
    ADD CONSTRAINT chk_verification_status
        CHECK (verification_status IN ('SENT', 'VERIFIED', 'CONSUMED', 'EXPIRED', 'FAILED', 'RATE_LIMITED'));

COMMENT ON COLUMN member_verifications.verification_status IS '인증 상태 (SENT / VERIFIED / CONSUMED / EXPIRED / FAILED / RATE_LIMITED)';
