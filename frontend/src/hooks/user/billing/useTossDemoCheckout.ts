import { useRef, useState } from 'react';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import { tossDemoApi } from '../../../api/user/billing/tossDemoApi';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY as string;

/**
 * 데모 전용 일반결제(토스페이 QR) 체크아웃 훅.
 *
 * 기존 자동결제(빌링) 훅 useCheckoutStatus 와 달리 requestBillingAuth(카드등록)가 아니라
 * requestPayment(단건결제) 를 호출한다. card.flowMode='DIRECT' + easyPay='TOSSPAY' 로
 * 토스페이 자체창(QR)을 바로 띄운다. (Toss 테스트 키 → 실제 화면, 실제 미결제)
 */
export function useTossDemoCheckout() {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState('');
  const requestingRef = useRef(false);

  async function handlePay() {
    if (requestingRef.current) return;
    requestingRef.current = true;
    setIsRequesting(true);
    setError('');

    try {
      if (!TOSS_CLIENT_KEY) {
        // 설정 누락을 SDK의 모호한 에러 대신 명확한 메시지로 조기 실패시킨다.
        throw new Error('VITE_TOSS_CLIENT_KEY is not configured.');
      }

      const order = await tossDemoApi.createOrder();

      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: ANONYMOUS });

      // 성공/실패 모두 결과 페이지로 리다이렉트한다. (Toss 가 쿼리 파라미터 부착)
      const resultUrl = `${window.location.origin}/billing/demo/result`;

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: order.currency, value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: resultUrl,
        failUrl: resultUrl,
        card: {
          // DIRECT + easyPay=TOSSPAY → 카드 입력 없이 토스페이 자체창(QR)이 바로 열린다.
          flowMode: 'DIRECT',
          easyPay: 'TOSSPAY',
        },
      });
    } catch (err: unknown) {
      // 사용자가 결제창을 닫으면 SDK가 에러를 던진다 — requesting 상태만 해제한다.
      requestingRef.current = false;
      setIsRequesting(false);
      const code = (err as { code?: string })?.code;
      if (code === 'USER_CANCEL') {
        return; // 사용자가 취소한 경우 별도 에러 메시지를 표시하지 않는다.
      }
      setError('결제 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  }

  return { isRequesting, error, handlePay };
}
