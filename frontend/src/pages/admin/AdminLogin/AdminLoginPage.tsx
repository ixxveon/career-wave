import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { adminAuthApi, adminSession, type ApiResponse, type AdminLoginResponse } from '../../../api/admin/adminAuthApi';
import { ADMIN_MANAGEMENT_ADMINS_QUERY_KEY } from '../../../constants/admin/adminManagementQueryKeys';
import type { AdminDetailRole } from '../../../constants/admin/adminRoleConstants';
import { ADMIN_ROUTE_PATHS } from '../../../constants/admin/adminRouteConstants';
import '../../../styles/admin/admin-login.css';

function syncAdminToken(token: string, adminInfo?: { id?: string; name?: string; role?: AdminDetailRole }) {
  adminSession.setToken(token);
  if (adminInfo?.role) {
    adminSession.setRole(adminInfo.role);
  }
  if (adminInfo?.id) {
    adminSession.setId(adminInfo.id);
  }
  if (adminInfo?.name) {
    adminSession.setName(adminInfo.name);
  }
}

function clearAdminToken() {
  adminSession.clearAll();
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

      syncAdminToken(data.accessToken, data.adminInfo);
      void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_ADMINS_QUERY_KEY });
      navigate(ADMIN_ROUTE_PATHS.dashboard, { replace: true });
    } catch (err) {
      clearAdminToken();
      if (axios.isAxiosError(err) && err.response?.status === 423) {
        const body = err.response.data as ApiResponse<AdminLoginResponse> | undefined;
        setErrorMessage(body?.message || '로그인 시도 횟수를 초과하여 계정이 잠겼습니다. 관리자에게 문의해주세요.');
      } else {
        setErrorMessage('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
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
            placeholder="아이디 또는 이메일"
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
