import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { useProducts } from './useProducts';
import { useCreateOrder } from './useCreateOrder';
import { useSubscribedProductCodes } from './useSubscribedProductCodes';
import { PRODUCT_CODE } from '../../../types/user/subscription';
import type { ProductCode } from '../../../types/user/subscription';

const TOSS_CLIENT_KEY = import.meta.env.VITE_TOSS_CLIENT_KEY as string;
const KNOWN_PRODUCT_CODES: ProductCode[] = [PRODUCT_CODE.DOCUMENT_COACHING, PRODUCT_CODE.INTERVIEW];

export function useCheckoutStatus() {
  const [searchParams] = useSearchParams();
  const [agreed, setAgreed] = useState(false);
  const [warning, setWarning] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [isPaymentRequesting, setIsPaymentRequesting] = useState(false);
  const isPaymentRequestingRef = useRef(false);

  const requestedCode = searchParams.get('product');
  const isKnownProduct = requestedCode !== null && (KNOWN_PRODUCT_CODES as string[]).includes(requestedCode);
  const productCode = isKnownProduct ? (requestedCode as ProductCode) : null;

  const { data: products, isLoading: isProductsLoading } = useProducts();
  const product = products?.find((p) => p.productCode === productCode) ?? null;

  // URL 직접 접근 등으로 이미 구독 중인 상품의 결제 화면에 들어온 경우를 방어한다. (이슈 #1007)
  const { subscribedCodes, isLoading: isSubscriptionLoading } = useSubscribedProductCodes();
  const isAlreadySubscribed = productCode !== null && subscribedCodes.has(productCode);

  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateOrder();

  async function handleCheckout() {
    if (isAlreadySubscribed) {
      setCheckoutError('이미 구독 중인 상품입니다. 구독 현황을 확인해주세요.');
      return;
    }
    if (!agreed) {
      setWarning('자동 정기 결제 및 이용 조건에 동의해주세요.');
      return;
    }
    if (!productCode) return;
    if (isPaymentRequestingRef.current) return;

    setWarning('');
    setCheckoutError('');
    isPaymentRequestingRef.current = true;
    setIsPaymentRequesting(true);

    try {
      const order = await createOrder({
        productCode,
        successUrl: `${window.location.origin}/billing/success`,
        failUrl: `${window.location.origin}/billing/fail?productCode=${productCode}`,
      });

      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      const payment = tossPayments.payment({ customerKey: order.customerKey });

      // 자동결제(빌링) 계약이 없는 환경이므로 카드등록(requestBillingAuth) 대신
      // 토스페이 QR 단건결제(requestPayment)를 띄운다. (테스트키 → 실제 결제창, 실제 미결제)
      // 화면 문구는 월 자동결제이지만 실제 승인은 단건으로 처리되고, 서버가 orderId 의 실제 상품
      // 금액으로 confirm 한 뒤 1개월 이용권(구독)을 발급한다. (성공 시 /billing/success 로 리다이렉트)
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: order.currency, value: order.amount },
        orderId: order.orderId,
        orderName: order.productName,
        successUrl: `${window.location.origin}/billing/success`,
        failUrl: `${window.location.origin}/billing/fail?productCode=${productCode}&orderId=${order.orderId}`,
        card: {
          // DIRECT + easyPay=TOSSPAY → 카드 입력 없이 토스페이 자체창(QR)이 바로 열린다.
          flowMode: 'DIRECT',
          easyPay: 'TOSSPAY',
        },
      });
    } catch (err: unknown) {
      isPaymentRequestingRef.current = false;
      setIsPaymentRequesting(false);
      const error = err as { statusCode?: number };
      if (error.statusCode === 403) {
        setCheckoutError('결제가 제한된 계정입니다. 고객센터에 문의해주세요.');
      } else if (error.statusCode === 409) {
        setCheckoutError('이미 구독 중인 상품입니다. 구독 현황을 확인해주세요.');
      } else if (error.statusCode === 422) {
        setCheckoutError('결제를 위해 이메일 등록이 필요합니다. 마이페이지에서 이메일을 등록해주세요.');
      } else {
        setCheckoutError('결제 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  }

  function handleAgreeChange(checked: boolean) {
    setAgreed(checked);
    if (checked) setWarning('');
  }

  return {
    isKnownProduct,
    product,
    isProductsLoading,
    isSubscriptionLoading,
    isAlreadySubscribed,
    agreed,
    warning,
    checkoutError,
    isCreatingOrder,
    isPaymentRequesting,
    handleAgreeChange,
    handleCheckout,
  };
}
