-- 같은 회원+플랜에 대해 READY 상태 주문이 동시에 2개 이상 생성되는 것을 방지.
-- 부분 유니크 인덱스: payment_status = 'READY' 인 행에만 적용.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_member_plan_ready
    ON payments (member_id, plan_id)
    WHERE payment_status = 'READY';
