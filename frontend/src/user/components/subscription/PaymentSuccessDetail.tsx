import { Link } from 'react-router-dom';
import type { ConfirmPaymentResponse } from '../../types/subscription';
import { formatPrice } from '../../utils/subscription/subscriptionView';

interface Props {
  data: ConfirmPaymentResponse;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function PaymentSuccessDetail({ data }: Props) {
  return (
    <>
      <div className="cw-billing-state-detail">
        <div className="cw-billing-success-detail">
          <span>상품명</span>
          <strong>{data.productName}</strong>
        </div>
        <div className="cw-billing-success-detail">
          <span>결제 금액</span>
          <strong>{formatPrice(data.amount)}</strong>
        </div>
        <div className="cw-billing-success-detail">
          <span>결제일</span>
          <strong>{formatDate(data.paidAt)}</strong>
        </div>
        <div className="cw-billing-success-detail">
          <span>다음 결제 예정일</span>
          <strong>{formatDate(data.nextBillingAt)}</strong>
        </div>
        <div className="cw-billing-success-detail">
          <span>결제 상태</span>
          <strong>결제 완료</strong>
        </div>
        <div className="cw-billing-success-detail">
          <span>결제 유형</span>
          <strong>월 자동 정기 결제</strong>
        </div>
      </div>

      <div className="cw-billing-state-guide">
        <strong>안내</strong>
        <ul>
          <li>다음 결제일부터 매월 자동으로 결제됩니다.</li>
          <li>구독 해지는 마이페이지 &gt; 구독/결제 내역에서 신청할 수 있습니다.</li>
        </ul>
      </div>

      <div className="cw-billing-state-actions">
        <Link className="cw-billing-secondary-button" to="/mypage/subscription">
          AI 서비스로 이동
        </Link>
        <Link className="cw-billing-outline-button" to="/mypage/payment-history">
          구독/결제 내역 보기
        </Link>
      </div>
    </>
  );
}

export default PaymentSuccessDetail;
