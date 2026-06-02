import { Apple } from 'lucide-react';

type SocialProvider = {
  id: 'kakao' | 'naver' | 'google' | 'apple';
  label: string;
  mark?: string;
};

const socialProviders: SocialProvider[] = [
  { id: 'kakao', label: '카카오', mark: 'K' },
  { id: 'naver', label: '네이버', mark: 'N' },
  { id: 'google', label: 'Google', mark: 'G' },
  { id: 'apple', label: 'Apple' },
];

export function SocialLoginButtons() {
  return (
    <>
      <div className="cw-auth-divider">소셜 계정으로 간편 로그인</div>

      <div className="cw-social-login" aria-label="소셜 로그인">
        {socialProviders.map((provider) => (
          <button
            aria-label={`${provider.label} 로그인`}
            className={`cw-social-login__button cw-social-login__${provider.id}`}
            type="button"
            key={provider.id}
          >
            {provider.id === 'apple' ? <Apple size={24} /> : provider.mark}
          </button>
        ))}
      </div>
    </>
  );
}
