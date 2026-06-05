import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authSession } from '../../user/utils/member/authSession';

function ProtectedRoute() {
  const location = useLocation();
  const hasSession = !!(authSession.getAccessToken() || authSession.getRefreshToken());

  if (!hasSession) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/login?next=${next}`} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
