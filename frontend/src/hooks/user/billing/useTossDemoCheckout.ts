import { useEffect, useRef, useState } from 'react';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import { tossDemoApi, type TossDemoOrder } from '../../../api/user/billing/tossDemoApi';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY as string;

/**
 * 데모 전용 일반결제(토스페이 QR) 체크아웃 훅.
 *
 * 진입 시 서버에서 주문(orderId·금액·상품명)을 받아오고, 결제 버튼은 그 주문을 그대로 사용한다.
 * → 화면에 표시되는 금액과 실제 Toss 결제창 금액이 항상 일치한다. (금액 하드코딩 방지)
 *
 * 기존 자동결제(빌링) 훅 useCheckoutStatus 와 달리 requestBillingAuth(카드등록)가 아니라
 * requestPayment(단건결제) 를 호출한다. card.flowMode='DIRECT' + easyPay='TOSSPAY' 로
 * 토스페이 자체창(QR)을 바로 띄운다. (Toss 테스트 키 → 실제 화면, 실제 미결제)
 */
export function useTossDemoCheckout(): {
  order: TossDemoOrder | null;
  isLoadingOrder: boolean;
  isRequesting: boolean;
  error: string;
  handlePay: () => Promise<void>;
} {
  const [order, setOrder] = useState<TossDemoOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState('');
  const requestingRef = useRef(false);
  const orderRequestedRef = useRef(false);

  // 진입 시 주문 정보를 1회 조회해 실제 결제 금액을 화면에 표시한다. (Strict Mode 이중 실행 방어)
  useEffect(() => {
    if (orderRequestedRef.current) return;
    orderRequestedRef.current = true;

    tossDemoApi
      .createOrder()
      .then((o) => setOrder(o))
      .catch(() => setError('주문 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'))
      .finally(() => setIsLoadingOrder(false));
  }, []);

  async function handlePay(): Promise<void> {
    if (requestingRef.current) return;

    // 설정 누락은 결제 실패(catch)와 원인이 다르므로 별도 메시지로 분기한다.
    if (!TOSS_CLIENT_KEY) {
      setError('Toss 클라이언트 키가 설정되지 않았습니다.');
      return;
    }
    if (!order) return;

    requestingRef.current = true;
    setIsRequesting(true);
    setError('');

    try {
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

  return { order, isLoadingOrder, isRequesting, error, handlePay };
}
