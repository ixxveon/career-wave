-- ================================================
-- patch: payments 테이블 payment_type 컬럼 추가
-- issue: #554
-- date:  2026-06-21
-- ================================================

ALTER TABLE payments
    ADD COLUMN payment_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    ADD CONSTRAINT chk_payment_type CHECK (payment_type IN ('MANUAL', 'AUTO_RENEWAL'));

COMMENT ON COLUMN payments.payment_type IS '결제 방식 (MANUAL / AUTO_RENEWAL)';
