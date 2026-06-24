import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { useProducts } from './useProducts';
import { useCreateOrder } from './useCreateOrder';
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

  const { mutateAsync: createOrder, isPending: isCreatingOrder } = useCreateOrder();

  async function handleCheckout() {
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

      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${window.location.origin}/billing/success?orderId=${order.orderId}`,
        failUrl: `${window.location.origin}/billing/fail?productCode=${productCode}&orderId=${order.orderId}`,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
      });
    } catch (err: unknown) {
      isPaymentRequestingRef.current = false;
      setIsPaymentRequesting(false);
      const error = err as { status?: number };
      if (error.status === 403) {
        setCheckoutError('결제가 제한된 계정입니다. 고객센터에 문의해주세요.');
      } else if (error.status === 409) {
        setCheckoutError('이미 구독 중인 상품입니다. 구독 현황을 확인해주세요.');
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
    agreed,
    warning,
    checkoutError,
    isCreatingOrder,
    isPaymentRequesting,
    handleAgreeChange,
    handleCheckout,
  };
}
