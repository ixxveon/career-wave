import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './QuotaExhaustedBanner.css';

interface QuotaExhaustedBannerProps {
  noEntitlement?: boolean;
}

export default function QuotaExhaustedBanner({ noEntitlement = false }: QuotaExhaustedBannerProps): React.ReactElement {
  const navigate = useNavigate();

  const title = noEntitlement
    ? '서류 AI 코칭 이용권이 없어요'
    : '이번 달 분석 한도를 모두 사용했어요';
  const desc = noEntitlement
    ? '요금제를 구매하면 이력서·자기소개서 AI 분석을 이용할 수 있어요.'
    : '요금제를 업그레이드하면 더 많은 서류를 분석할 수 있어요.';
  const cta = noEntitlement ? '구매하기' : '업그레이드';

  return (
    <div className="qeb">
      <Zap size={18} className="qeb__icon" />
      <div className="qeb__body">
        <strong>{title}</strong>
        <p>{desc}</p>
      </div>
      <button
        type="button"
        className="qeb__cta"
        onClick={() => navigate('/billing/checkout?product=document-coaching')}
      >
        {cta}
      </button>
    </div>
  );
}
