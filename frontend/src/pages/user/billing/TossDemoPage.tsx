import { AlertTriangle, Loader2, QrCode } from 'lucide-react';
import '@/styles/user/billing/Billing.css';
import { useTossDemoCheckout } from '../../../hooks/user/billing/useTossDemoCheckout';

/**
 * 데모 전용 일반결제(토스페이 QR) 페이지.
 * Toss 테스트 키로 실제 결제창을 띄워 QR 결제 흐름을 시연한다. (구독/entitlement 발급 없음, 실제 미결제)
 */
function TossDemoPage() {
  const { isRequesting, error, handlePay } = useTossDemoCheckout();

  return (
    <div className="cw-billing-flow-page">
      <div className="cw-billing-flow-shell">
        <div className="cw-billing-card cw-billing-state-card">
          <div className="cw-billing-state-icon" aria-hidden="true">
            <QrCode size={34} />
          </div>
          <h2>토스페이 QR 결제 데모</h2>
          <p>
            토스페이먼츠 테스트 환경에서 실제 결제창과 QR 코드를 띄웁니다.
            <br />
            실제로 돈이 빠져나가지 않는 테스트 결제입니다.
          </p>

          <div className="cw-billing-summary-card" style={{ margin: '20px 0' }}>
            <div className="cw-billing-summary-row">
              <span>상품</span>
              <span>커리어웨이브 데모 결제</span>
            </div>
            <div className="cw-billing-summary-row">
              <span>결제 금액</span>
              <span>1,000원</span>
            </div>
            <div className="cw-billing-summary-row">
              <span>결제 수단</span>
              <span>토스페이 (QR)</span>
            </div>
          </div>

          {error ? (
            <p className="cw-billing-summary-note" style={{ color: '#d92d20' }}>
              <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              {error}
            </p>
          ) : null}

          <div className="cw-billing-state-actions">
            <button
              type="button"
              className="cw-billing-primary-button"
              onClick={handlePay}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <>
                  <Loader2 size={18} className="cw-billing-spinner" style={{ verticalAlign: '-3px', marginRight: 6 }} />
                  결제창을 여는 중…
                </>
              ) : (
                '토스페이로 결제하기 (데모)'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TossDemoPage;
