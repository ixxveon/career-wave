import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useConfirmPayment } from './useConfirmPayment';
import type { ConfirmPaymentResponse } from '../../../types/user/subscription';

const CONFIRM_ERROR_MESSAGE = '결제 확인 중 오류가 발생했습니다. 결제가 완료되지 않은 경우 고객센터에 문의해주세요.';

type SuccessState =
  | { phase: 'confirming' }
  | { phase: 'success'; data: ConfirmPaymentResponse }
  | { phase: 'error'; message: string };

export function usePaymentSuccessStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const confirmedRef = useRef(false);

  // billingKey 흐름: Toss가 redirect 시 authKey·customerKey·orderId 전달
  const authKey = searchParams.get('authKey');
  const customerKey = searchParams.get('customerKey');
  const orderId = searchParams.get('orderId');

  const isDirectAccess = !authKey || !customerKey || !orderId;

  const { mutate: confirmPayment, isPending, isSuccess, isError, data } = useConfirmPayment();

  useEffect(() => {
    if (isDirectAccess) {
      navigate('/mypage/subscription', { replace: true });
      return;
    }

    // React Strict Mode double-invoke 방어
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    confirmPayment({
      authKey: authKey!,
      customerKey: customerKey!,
      orderId: orderId!,
    });
  }, [isDirectAccess, navigate, authKey, customerKey, orderId, confirmPayment]);

  // confirm 완료 후 paymentKey·orderId·amount를 URL 히스토리에서 제거
  useEffect(() => {
    if (isSuccess || isError) {
      navigate(location.pathname, { replace: true });
    }
  }, [isSuccess, isError, navigate, location.pathname]);

  const state: SuccessState = (() => {
    if (isPending || (!isSuccess && !isError)) return { phase: 'confirming' };
    if (isSuccess && data) return { phase: 'success', data };
    return { phase: 'error', message: CONFIRM_ERROR_MESSAGE };
  })();

  return { state, orderId };
}
