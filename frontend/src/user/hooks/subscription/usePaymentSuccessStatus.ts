import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useConfirmPayment } from './useConfirmPayment';
import type { ConfirmPaymentResponse } from '../../types/subscription';

type SuccessState =
  | { phase: 'confirming' }
  | { phase: 'success'; data: ConfirmPaymentResponse }
  | { phase: 'error'; message: string };

export function usePaymentSuccessStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirmedRef = useRef(false);

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  const { mutate: confirmPayment, isPending, isSuccess, isError, data, error } = useConfirmPayment();

  const isDirectAccess = !paymentKey || !orderId || !amount;

  useEffect(() => {
    if (isDirectAccess) {
      navigate('/mypage/subscription', { replace: true });
      return;
    }

    // React Strict Mode double-invoke 방어
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    confirmPayment({
      paymentKey,
      orderId,
      amount: Number(amount),
    });
  }, []);

  const state: SuccessState = (() => {
    if (isPending || (!isSuccess && !isError)) return { phase: 'confirming' };
    if (isSuccess && data) return { phase: 'success', data };
    const errMessage =
      (error as { message?: string })?.message ??
      '결제 확인 중 오류가 발생했습니다. 결제가 완료되지 않은 경우 고객센터에 문의해주세요.';
    return { phase: 'error', message: errMessage };
  })();

  return { state, orderId };
}
