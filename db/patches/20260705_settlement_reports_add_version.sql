-- ================================================
-- patch: settlement_reports에 낙관적 락(version) 컬럼 추가
-- 사유:  confirmSettlement()가 findById 후 상태를 변경하는데 락 없이 저장하면
--        동시 확정 요청 시 두 트랜잭션 모두 PENDING을 읽어 통과하고
--        나중에 커밋한 쪽이 먼저 커밋한 확정자/메모를 조용히 덮어쓸 수 있음.
--        SettlementReport 엔티티에 @Version 필드 추가에 맞춰 컬럼 반영.
-- date:  2026-07-05
-- ================================================

ALTER TABLE settlement_reports
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN settlement_reports.version IS '낙관적 락 버전 (동시 확정 충돌 감지)';
COMMENT ON COLUMN settlement_reports.settlement_period_end IS '정산 기간 종료일 (해당 날짜 포함, inclusive)';
