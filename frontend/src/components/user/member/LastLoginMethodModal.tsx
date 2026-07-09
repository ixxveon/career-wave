import { useEffect, useRef, useState } from 'react';
import { memberSocialAuthApi } from '../../../api/user/member/socialAuthApi';
import { SOCIAL_PROVIDERS, type SocialProviderId } from '../../../utils/user/member/socialAuth';

interface LastLoginMethodModalProps {
  provider: SocialProviderId;
  onClose: () => void;
}

// 지난번 로그인이 소셜이었을 때, 로그인 페이지 진입 시 같은 방식으로 이어서 로그인하도록 안내한다.
export function LastLoginMethodModal({ provider, onClose }: LastLoginMethodModalProps) {
  const [isStarting, setIsStarting] = useState(false);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const social = SOCIAL_PROVIDERS.find((item) => item.id === provider);

  // 초기 포커스를 기본 액션(소셜 아이콘 버튼)으로 이동하고, Escape로 닫을 수 있게 한다.
  useEffect(() => {
    continueButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!social) return null;

  const handleContinue = () => {
    setIsStarting(true);
    void memberSocialAuthApi
      .authorize(provider)
      .then(({ authorizationUrl }) => {
        window.location.href = authorizationUrl;
      })
      .catch(() => {
        setIsStarting(false);
        alert(`${social.label} 로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.`);
      });
  };

  return (
    <div className="cw-last-login-overlay" role="dialog" aria-modal="true" aria-labelledby="cw-last-login-title">
      <div className="cw-last-login-modal">
        <h2 id="cw-last-login-title" className="cw-last-login-modal__title">
          지난번에 {social.label}로 로그인했어요
        </h2>
        <p className="cw-last-login-modal__desc">아래 아이콘을 눌러 이어서 로그인하세요</p>

        <div className="cw-social-login cw-last-login-modal__action">
          <button
            type="button"
            ref={continueButtonRef}
            aria-label={`${social.label}로 로그인`}
            className={`cw-social-login__button cw-social-login__${social.id}`}
            onClick={handleContinue}
            disabled={isStarting}
          >
            {social.mark}
          </button>
        </div>

        <button type="button" className="cw-last-login-modal__other" onClick={onClose} disabled={isStarting}>
          다른 방법으로 로그인
        </button>
      </div>
    </div>
  );
}
