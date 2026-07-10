import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './InterviewPaywall.css';

export default function InterviewPaywall(): React.ReactElement {
  const navigate = useNavigate();

  return (
    <div className="iv-paywall" role="region" aria-label="이용권 구매 안내">
      <span className="epw__icon-wrap">
        <Lock size={22} className="epw__icon" aria-hidden="true" />
      </span>
      <strong className="epw__title">AI 모의면접 이용권이 필요해요</strong>
      <p className="epw__desc">
        AI 모의면접은<br />
        이용권 구매 후 이용할 수 있어요.
      </p>
      <button
        type="button"
        className="epw__cta"
        onClick={() => navigate('/billing/checkout?product=interview')}
      >
        이용권 구매하기
      </button>
    </div>
  );
}
