import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tossDemoApi, type TossDemoConfirmResult } from '../../../api/user/billing/tossDemoApi';

type ResultState =
  | { phase: 'confirming' }
  | { phase: 'success'; data: TossDemoConfirmResult }
  | { phase: 'fail'; message: string };

/**
 * 데모 결제 결과 페이지 훅. Toss 리다이렉트 쿼리를 읽어 승인(confirm)하거나 실패를 표시한다.
 * 성공: ?paymentType&amount&orderId&paymentKey / 실패: ?code&message&orderId
 */
export function useTossDemoResult() {
  const [searchParams] = useSearchParams();
  const confirmedRef = useRef(false);
  const [state, setState] = useState<ResultState>({ phase: 'confirming' });

  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const failCode = searchParams.get('code');
  const failMessage = searchParams.get('message');

  useEffect(() => {
    if (confirmedRef.current) return; // Strict Mode 이중 실행 방어
    confirmedRef.current = true;

    // Toss 실패 리다이렉트
    if (failCode) {
      setState({ phase: 'fail', message: failMessage ?? '결제가 취소되었거나 실패했습니다.' });
      return;
    }

    // 필수 파라미터 누락(직접 접근 등)
    if (!paymentKey || !orderId || !amount) {
      setState({ phase: 'fail', message: '잘못된 접근입니다.' });
      return;
    }

    tossDemoApi
      .confirm({ paymentKey, orderId, amount: Number(amount) })
      .then((data) => setState({ phase: 'success', data }))
      .catch(() =>
        setState({ phase: 'fail', message: '결제 승인 중 오류가 발생했습니다. 다시 시도해주세요.' }),
      );
  }, [failCode, failMessage, paymentKey, orderId, amount]);

  return { state };
}
