import { Link } from 'react-router-dom';
import type { PaymentFailureReason } from '../../types/subscription';

interface Props {
  displayMessage: string;
  reasonCode: PaymentFailureReason;
  checkoutUrl: string;
}

function PaymentFailDetail({ displayMessage, checkoutUrl }: Props) {
  return (
    <>
      <div className="cw-billing-state-detail">
        <div className="cw-billing-fail-detail">
          <span>결제 상태</span>
          <strong>결제 실패</strong>
        </div>
        <div className="cw-billing-fail-detail">
          <span>실패 사유</span>
          <strong>{displayMessage}</strong>
        </div>
      </div>

      <div className="cw-billing-state-guide">
        <strong>다시 확인해주세요.</strong>
        <ul>
          <li>결제 수단 정보를 다시 확인해주세요.</li>
          <li>네트워크 상태를 확인한 뒤 다시 시도해주세요.</li>
          <li>문제가 반복되면 고객센터에 문의해주세요.</li>
          <li>결제가 완료되지 않은 경우 구독은 시작되지 않습니다.</li>
        </ul>
      </div>

      <div className="cw-billing-state-actions">
        <Link className="cw-billing-secondary-button" to={checkoutUrl}>
          다시 결제하기
        </Link>
        <Link className="cw-billing-outline-button" to="/mypage/subscription">
          AI 서비스로 돌아가기
        </Link>
      </div>
    </>
  );
}

export default PaymentFailDetail;
