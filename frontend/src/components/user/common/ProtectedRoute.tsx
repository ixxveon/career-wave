import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authSession } from '../../../utils/user/member/authSession';
import { probeAuth } from '../../../api/user/member/memberApiClient';

type SessionStatus = 'checking' | 'ok' | 'redirect';

function getInitialStatus(): SessionStatus {
  // 메모리에 토큰이 있으면 바로 통과 (새로고침이 아닌 일반 내비게이션)
  return authSession.getAccessToken() ? 'ok' : 'checking';
}

function ProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState<SessionStatus>(getInitialStatus);

  useEffect(() => {
    if (status !== 'checking') return;

    // Phase 3: accessToken이 없으면 HttpOnly cookie로 refresh를 시도한다.
    probeAuth().then((ok) => setStatus(ok ? 'ok' : 'redirect'));
  }, [status]);

  if (status === 'checking') return null;

  if (status === 'redirect') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/login?next=${next}`} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
