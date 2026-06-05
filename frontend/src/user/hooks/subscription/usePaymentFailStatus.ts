import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { billingApi } from '../../api/subscription/billingApi';
import { PAYMENT_FAILURE_REASON, PRODUCT_CODE } from '../../types/subscription';
import type { PaymentFailureReason } from '../../types/subscription';

const FAILURE_MESSAGES: Record<PaymentFailureReason, string> = {
  [PAYMENT_FAILURE_REASON.USER_CANCELED]: '결제를 취소하셨습니다.',
  [PAYMENT_FAILURE_REASON.CARD_DECLINED]: '카드 승인이 거절되었습니다. 카드 정보를 확인해주세요.',
  [PAYMENT_FAILURE_REASON.TIMEOUT]: '결제 요청 시간이 초과되었습니다. 다시 시도해주세요.',
  [PAYMENT_FAILURE_REASON.DUPLICATE_ORDER]: '이미 처리된 주문입니다. 결제 내역을 확인해주세요.',
  [PAYMENT_FAILURE_REASON.CONFIRM_FAILED]: '결제 승인에 실패했습니다. 고객센터에 문의해주세요.',
  [PAYMENT_FAILURE_REASON.FORBIDDEN]: '결제가 제한된 계정입니다. 고객센터에 문의해주세요.',
  [PAYMENT_FAILURE_REASON.UNKNOWN]: '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

function resolveFailureReason(code: string | null): PaymentFailureReason {
  if (code === 'PAY_PROCESS_CANCELED') return PAYMENT_FAILURE_REASON.USER_CANCELED;
  if (code === 'CARD_PROCESSING_ERROR') return PAYMENT_FAILURE_REASON.CARD_DECLINED;
  if (code === 'EXCEED_MAX_DAILY_PAYMENT_COUNT') return PAYMENT_FAILURE_REASON.UNKNOWN;
  const values = Object.values(PAYMENT_FAILURE_REASON) as string[];
  if (code && values.includes(code)) return code as PaymentFailureReason;
  return PAYMENT_FAILURE_REASON.UNKNOWN;
}

export function usePaymentFailStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const recordedRef = useRef(false);

  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const orderId = searchParams.get('orderId');

  const isDirectAccess = !orderId;

  const reasonCode = resolveFailureReason(code);
  const displayMessage = FAILURE_MESSAGES[reasonCode];
  const isUserCanceled = reasonCode === PAYMENT_FAILURE_REASON.USER_CANCELED;

  useEffect(() => {
    if (isDirectAccess) {
      navigate('/mypage/subscription', { replace: true });
      return;
    }

    if (recordedRef.current) return;
    recordedRef.current = true;

    billingApi.recordPaymentFail({
      orderId,
      productCode: PRODUCT_CODE.DOCUMENT_COACHING, // 서버에서 orderId로 상품 특정 가능하므로 placeholder
      reasonCode,
      message: message ?? reasonCode,
    });
  }, []);

  return {
    reasonCode,
    displayMessage,
    isUserCanceled,
    orderId,
  };
}
