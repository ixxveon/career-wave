-- ================================================
-- 정산 리포트 데모용 더미 데이터
-- settlement_items는 payments FK 필수라 reports만 삽입
-- 실행 전제: seed-local.sql (admin 계정) 실행 완료 상태
-- ================================================

-- ────────────────────────────────────────────
-- 기존 더미 데이터 정리 (재실행 안전)
-- ────────────────────────────────────────────
DELETE FROM settlement_reports
WHERE settlement_period_start IN (
  '2026-02-01', '2026-03-01', '2026-04-01',
  '2026-05-01', '2026-06-01'
);

DO $$
DECLARE
  v_admin_id BIGINT;
BEGIN
  SELECT admin_id INTO v_admin_id FROM admins WHERE login_id = 'admin';

  -- 2월 (확정 완료)
  INSERT INTO settlement_reports (
    settlement_period_start, settlement_period_end,
    total_sales_amount, total_refund_amount, net_sales_amount,
    supply_amount, vat_amount,
    total_transaction_count, paid_count, refund_count,
    settlement_status, settled_at, admin_id, note,
    created_at, updated_at, version
  ) VALUES (
    '2026-02-01', '2026-02-28',
    348000, 29000, 319000,
    290000, 29000,
    12, 11, 1,
    'CONFIRMED', '2026-03-03 10:00:00+09', v_admin_id, '2월 정산 확정',
    '2026-03-03 09:00:00+09', '2026-03-03 10:00:00+09', 1
  );

  -- 3월 (확정 완료)
  INSERT INTO settlement_reports (
    settlement_period_start, settlement_period_end,
    total_sales_amount, total_refund_amount, net_sales_amount,
    supply_amount, vat_amount,
    total_transaction_count, paid_count, refund_count,
    settlement_status, settled_at, admin_id, note,
    created_at, updated_at, version
  ) VALUES (
    '2026-03-01', '2026-03-31',
    551000, 58000, 493000,
    448182, 44818,
    19, 17, 2,
    'CONFIRMED', '2026-04-02 10:00:00+09', v_admin_id, '3월 정산 확정',
    '2026-04-02 09:00:00+09', '2026-04-02 10:00:00+09', 1
  );

  -- 4월 (확정 완료)
  INSERT INTO settlement_reports (
    settlement_period_start, settlement_period_end,
    total_sales_amount, total_refund_amount, net_sales_amount,
    supply_amount, vat_amount,
    total_transaction_count, paid_count, refund_count,
    settlement_status, settled_at, admin_id, note,
    created_at, updated_at, version
  ) VALUES (
    '2026-04-01', '2026-04-30',
    841000, 29000, 812000,
    738182, 73818,
    29, 28, 1,
    'CONFIRMED', '2026-05-02 10:00:00+09', v_admin_id, '4월 정산 확정',
    '2026-05-02 09:00:00+09', '2026-05-02 10:00:00+09', 1
  );

  -- 5월 (확정 완료)
  INSERT INTO settlement_reports (
    settlement_period_start, settlement_period_end,
    total_sales_amount, total_refund_amount, net_sales_amount,
    supply_amount, vat_amount,
    total_transaction_count, paid_count, refund_count,
    settlement_status, settled_at, admin_id, note,
    created_at, updated_at, version
  ) VALUES (
    '2026-05-01', '2026-05-31',
    1189000, 87000, 1102000,
    1001818, 100182,
    41, 38, 3,
    'CONFIRMED', '2026-06-03 10:00:00+09', v_admin_id, '5월 정산 확정',
    '2026-06-03 09:00:00+09', '2026-06-03 10:00:00+09', 1
  );

  -- 6월 (대기 중 — 아직 확정 전)
  INSERT INTO settlement_reports (
    settlement_period_start, settlement_period_end,
    total_sales_amount, total_refund_amount, net_sales_amount,
    supply_amount, vat_amount,
    total_transaction_count, paid_count, refund_count,
    settlement_status, settled_at, admin_id, note,
    created_at, updated_at, version
  ) VALUES (
    '2026-06-01', '2026-06-30',
    1537000, 116000, 1421000,
    1291818, 129182,
    53, 49, 4,
    'PENDING', NULL, NULL, NULL,
    '2026-07-01 09:00:00+09', '2026-07-01 09:00:00+09', 0
  );

END $$;

-- 결과 확인
SELECT
  settlement_period_start AS 기간,
  net_sales_amount        AS 순매출,
  total_transaction_count AS 총건수,
  settlement_status       AS 상태
FROM settlement_reports
ORDER BY settlement_period_start;
