import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authSession } from '../../../utils/user/member/authSession';
import { SOCIAL_SIGNUP_TOKEN_SESSION_KEY } from './RegisterVerifyPage';

function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const type = searchParams.get('type');

    if (type === 'login') {
      const accessToken = searchParams.get('accessToken');
      if (accessToken) {
        authSession.setTokens({ accessToken });
      }
      navigate('/', { replace: true });
    } else if (type === 'signup') {
      const token = searchParams.get('token');
      const provider = searchParams.get('provider');
      const email = searchParams.get('email');

      if (token) {
        sessionStorage.setItem(SOCIAL_SIGNUP_TOKEN_SESSION_KEY, token);
      }

      const params = new URLSearchParams();
      if (provider) params.set('provider', provider);
      if (email) params.set('email', email);
      navigate(`/auth/register/verify?${params.toString()}`, { replace: true });
    } else {
      navigate('/auth/login', { replace: true });
    }
  }, []);

  return <p style={{ textAlign: 'center', marginTop: '4rem' }}>소셜 로그인 처리 중...</p>;
}

export default OAuthCallbackPage;
