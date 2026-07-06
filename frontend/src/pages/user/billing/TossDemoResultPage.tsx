import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import '@/styles/user/billing/Billing.css';
import { useTossDemoResult } from '../../../hooks/user/billing/useTossDemoResult';

/**
 * 데모 결제 결과 페이지 — Toss 리다이렉트 후 승인 결과를 표시한다.
 * 기존 PaymentSuccessPage(빌링 흐름)와 독립적이다.
 */
function TossDemoResultPage() {
  const { state } = useTossDemoResult();

  if (state.phase === 'confirming') {
    return (
      <div className="cw-billing-flow-page">
        <div className="cw-billing-flow-shell">
          <div className="cw-billing-card cw-billing-state-card">
            <div className="cw-billing-state-icon" aria-hidden="true">
              <Loader2 size={34} className="cw-billing-spinner" />
            </div>
            <h2>결제를 확인하고 있습니다.</h2>
            <p>잠시만 기다려주세요. 페이지를 닫거나 새로고침하지 마세요.</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'fail') {
    return (
      <div className="cw-billing-flow-page">
        <div className="cw-billing-flow-shell">
          <div className="cw-billing-card cw-billing-state-card">
            <div className="cw-billing-state-icon is-fail" aria-hidden="true">
              <AlertTriangle size={34} />
            </div>
            <h2>결제가 완료되지 않았습니다.</h2>
            <p>{state.message}</p>
            <div className="cw-billing-state-actions">
              <Link className="cw-billing-primary-button" to="/billing/demo">
                다시 시도하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { data } = state;
  return (
    <div className="cw-billing-flow-page">
      <div className="cw-billing-flow-shell">
        <div className="cw-billing-card cw-billing-state-card">
          <div className="cw-billing-state-icon" aria-hidden="true">
            <CheckCircle2 size={34} />
          </div>
          <h2>결제가 완료되었습니다.</h2>
          <p>토스페이 테스트 결제가 정상적으로 승인되었습니다.</p>

          <div className="cw-billing-summary-card" style={{ margin: '20px 0' }}>
            <div className="cw-billing-summary-row">
              <span>주문번호</span>
              <span>{data.orderId}</span>
            </div>
            <div className="cw-billing-summary-row">
              <span>결제 금액</span>
              <span>{data.totalAmount.toLocaleString('ko-KR')}원</span>
            </div>
            <div className="cw-billing-summary-row">
              <span>결제 수단</span>
              <span>
                {data.method}
                {data.easyPayProvider ? ` (${data.easyPayProvider})` : ''}
              </span>
            </div>
            {data.approvedAt ? (
              <div className="cw-billing-summary-row">
                <span>승인 시각</span>
                <span>{new Date(data.approvedAt).toLocaleString('ko-KR')}</span>
              </div>
            ) : null}
          </div>

          <div className="cw-billing-state-actions">
            <Link className="cw-billing-primary-button" to="/billing/demo">
              데모 다시 하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TossDemoResultPage;
