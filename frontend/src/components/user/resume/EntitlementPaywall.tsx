import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './EntitlementPaywall.css';

interface EntitlementPaywallProps {
  children: React.ReactNode;
}

export default function EntitlementPaywall({ children }: EntitlementPaywallProps): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div className="epw">
      <div className="epw__blur" aria-hidden="true">
        {children}
      </div>
      <div className="epw__card" role="region" aria-label="이용권 구매 안내">
        <span className="epw__icon-wrap">
          <Lock size={22} className="epw__icon" aria-hidden="true" />
        </span>
        <strong className="epw__title">서류 AI 코칭 이용권이 필요해요</strong>
        <p className="epw__desc">
          이력서·자기소개서 AI 분석은<br />
          이용권 구매 후 이용할 수 있어요.
        </p>
        <button
          type="button"
          className="epw__cta"
          onClick={() => navigate('/billing/checkout?product=document-coaching')}
        >
          이용권 구매하기
        </button>
      </div>
    </div>
  );
}
