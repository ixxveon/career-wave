-- ================================================
-- patch: audit_logs 로그 타입에 SETTLEMENT_ACTIVITY 추가
-- 사유:  정산 생성/확정 시 AdminSettlementServiceImpl.saveAuditLog()가
--        log_type = 'SETTLEMENT_ACTIVITY'로 감사 로그를 남기는데
--        chk_log_type CHECK 제약에 'SETTLEMENT_ACTIVITY'가 누락되어
--        DataIntegrityViolationException(500) 발생 → 정산 생성/확정 불가.
--        AuditLogType enum(ADMIN_ACTIVITY/ADMIN_MANAGEMENT/AI_METRICS_SYSTEM/
--        SCRAPING_SYSTEM/SETTLEMENT_ACTIVITY)과 정합화.
-- date:  2026-07-04
-- ================================================

ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS chk_log_type;

ALTER TABLE audit_logs
    ADD CONSTRAINT chk_log_type
        CHECK (log_type IN ('ADMIN_ACTIVITY', 'ADMIN_MANAGEMENT', 'AI_METRICS_SYSTEM', 'SCRAPING_SYSTEM', 'SETTLEMENT_ACTIVITY'));

COMMENT ON COLUMN audit_logs.log_type IS '로그 타입 (ADMIN_ACTIVITY / ADMIN_MANAGEMENT / AI_METRICS_SYSTEM / SCRAPING_SYSTEM / SETTLEMENT_ACTIVITY)';
