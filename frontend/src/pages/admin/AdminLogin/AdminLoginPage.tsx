import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuthApi, adminSession } from '../../../api/admin/adminAuthApi';
import { ADMIN_ROLE } from '../../../constants/admin/authConstants';
import { ADMIN_DETAIL_ROLE, type AdminDetailRole } from '../../../constants/admin/adminRoleConstants';
import '../../../styles/admin/admin-login.css';

function toBase64Url(value: object) {
  return window
    .btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function createMockAdminAccessToken() {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: 'career-wave-admin',
    accountType: 'ADMIN',
    role: ADMIN_ROLE,
    roles: [ADMIN_ROLE],
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };
  const dummySignature = 'dev-mock-signature';

  return `${toBase64Url(header)}.${toBase64Url(payload)}.${dummySignature}`;
}

function syncAdminToken(token: string, role?: AdminDetailRole) {
  adminSession.setToken(token);
  if (role) {
    adminSession.setRole(role);
  }
}

function clearAdminToken() {
  adminSession.clearToken();
  adminSession.clearRole();
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [useMockAdminLogin, setUseMockAdminLogin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (import.meta.env.DEV && useMockAdminLogin) {
        syncAdminToken(createMockAdminAccessToken(), ADMIN_DETAIL_ROLE.MASTER);
        navigate('/admin/dashboard', { replace: true });
        return;
      }

      const response = await adminAuthApi.login({ loginId, password });
      const { success, data } = response.data;
      if (!success || !data?.accessToken) {
        clearAdminToken();
        throw new Error('INVALID_LOGIN_RESPONSE');
      }

      syncAdminToken(data.accessToken, data.adminInfo.role);
      navigate('/admin/dashboard', { replace: true });
    } catch {
      clearAdminToken();
      setErrorMessage(
        import.meta.env.DEV && useMockAdminLogin
          ? '개발용 mock 로그인 토큰을 생성하지 못했습니다.'
          : '아이디 또는 비밀번호가 올바르지 않습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginLogo">CAREER WAVE ADMIN</div>

        <h1>관리자 로그인</h1>

        <p className="loginDesc">관리자 계정으로 로그인하세요.</p>

        <form onSubmit={handleLogin} style={{ display: 'contents' }}>
          <input
            type="text"
            placeholder="아이디"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {import.meta.env.DEV && (
            <label className="loginMockControl">
              <input
                type="checkbox"
                checked={useMockAdminLogin}
                onChange={(event) => {
                  setUseMockAdminLogin(event.target.checked);
                  setErrorMessage(null);
                }}
              />
              <span>개발용 mock 로그인</span>
            </label>
          )}
          {errorMessage ? (
            <p className="loginError" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <button type="submit" className="loginSubmitBtn" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="loginLinks">
          <button type="button">비밀번호 찾기</button>
        </div>
      </div>
    </div>
  );
}
