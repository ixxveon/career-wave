import { Bot } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SubscriptionHero() {
  return (
    <div className="cw-subscription-hero">
      <div className="cw-subscription-hero__content">
        <div className="cw-subscription-hero__copy">
          <p className="cw-subscription-hero__eyebrow">AI 서비스</p>
          <p className="cw-subscription-hero__intro">
            서류 AI 코칭과 AI 모의면접이 처음이라면, 무료 체험으로 나에게 맞는 준비 루틴을 시작해보세요.
          </p>
          <h2>
            <span>무료 체험권,</span> 슬쩍 넣어드렸어요.
          </h2>
          <p className="cw-subscription-hero__body-copy">
            서류 AI 코칭과 AI 모의면접을 한 곳에서 비교하고, 지금 내 구독 상태와 사용 현황까지
            바로 관리할 수 있어요.
          </p>
          <small className="cw-subscription-hero__note">
            비구독 사용자도 각 상품별 1회 무료 체험 제공
          </small>
        </div>

        <div className="cw-subscription-hero__visual" aria-hidden="true">
          <div className="cw-subscription-hero__spark is-one" />
          <div className="cw-subscription-hero__spark is-two" />
          <div className="cw-subscription-hero__ticket">
            <span>FREE</span>
          </div>
          <div className="cw-subscription-hero__device">
            <Bot size={22} />
            <div>
              <span>AI CARE</span>
              <strong>Document + Interview</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="cw-subscription-hero__aside">
        <Link to="/documents/resume" className="cw-subscription-hero__cta">
          서류 AI 코칭 체험하기
        </Link>
        <Link to="/interview" className="cw-subscription-hero__cta">
          AI 모의면접 체험하기
        </Link>
      </div>
    </div>
  );
}
