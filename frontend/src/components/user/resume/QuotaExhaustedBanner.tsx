import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './QuotaExhaustedBanner.css';

export default function QuotaExhaustedBanner(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div className="qeb">
      <Zap size={18} className="qeb__icon" />
      <div className="qeb__body">
        <strong>이번 달 분석 한도를 모두 사용했어요</strong>
        <p>요금제를 업그레이드하면 더 많은 서류를 분석할 수 있어요.</p>
      </div>
      <button
        type="button"
        className="qeb__cta"
        onClick={() => navigate('/billing/checkout?product=document-coaching')}
      >
        업그레이드
      </button>
    </div>
  );
}
