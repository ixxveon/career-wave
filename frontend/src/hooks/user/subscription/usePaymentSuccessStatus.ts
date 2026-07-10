import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useConfirmOneTimePayment } from './useConfirmPayment';
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

  // 일반결제(단건) 흐름: Toss가 requestPayment 성공 redirect 시 paymentKey·orderId·amount 전달
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amountParam = searchParams.get('amount');
  const amount = amountParam !== null ? Number(amountParam) : NaN;

  const isDirectAccess = !paymentKey || !orderId || !Number.isFinite(amount);

  const { mutate: confirmPayment, isPending, isSuccess, isError, data, error } = useConfirmOneTimePayment();

  // 결산 실패 시 실제 원인(백엔드 메시지/코드)을 콘솔에 남겨 진단을 돕는다.
  useEffect(() => {
    if (isError && error) {
      // eslint-disable-next-line no-console
      console.error('[billing] 단건결제 승인 실패:', error);
    }
  }, [isError, error]);

  useEffect(() => {
    if (isDirectAccess) {
      navigate('/mypage/subscription', { replace: true });
      return;
    }

    // React Strict Mode double-invoke 방어
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    confirmPayment({
      paymentKey: paymentKey!,
      orderId: orderId!,
      amount,
    });
  }, [isDirectAccess, navigate, paymentKey, orderId, amount, confirmPayment]);

  // confirm 완료 후 paymentKey·orderId·amount를 URL 히스토리에서 제거
  useEffect(() => {
    if (isSuccess || isError) {
      navigate(location.pathname, { replace: true });
    }
  }, [isSuccess, isError, navigate, location.pathname]);

  const state: SuccessState = (() => {
    if (isPending || (!isSuccess && !isError)) return { phase: 'confirming' };
    if (isSuccess && data) return { phase: 'success', data };
    // 백엔드가 내려준 실제 사유(메시지/코드)를 그대로 노출해 원인 파악을 돕는다.
    const apiError = error as { message?: string; serverCode?: string } | null;
    const detail = apiError?.serverCode
      ? `${apiError.message ?? CONFIRM_ERROR_MESSAGE} (${apiError.serverCode})`
      : apiError?.message;
    return { phase: 'error', message: detail || CONFIRM_ERROR_MESSAGE };
  })();

  return { state, orderId };
}
