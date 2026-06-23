import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuthApi, adminSession } from '../../../api/admin/adminAuthApi';
import type { AdminDetailRole } from '../../../constants/admin/adminRoleConstants';
import '../../../styles/admin/admin-login.css';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
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
      setErrorMessage('아이디 또는 비밀번호가 올바르지 않습니다.');
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
