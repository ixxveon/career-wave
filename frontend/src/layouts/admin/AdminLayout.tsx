import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { adminAuthApi, adminSession } from '../../api/admin/adminAuthApi';
import { ADMIN_ROUTE_PATHS } from '../../constants/admin/adminRouteConstants';
import '../../styles/admin/admin.css';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  if (!adminSession.getToken()) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await adminAuthApi.logout();
    } finally {
      adminSession.clearToken();
      adminSession.clearRole();
      navigate(ADMIN_ROUTE_PATHS.login, { replace: true });
    }
  };

  return (
    <div className="admin-root">
      {/* 모바일 topbar — 1100px 이하에서만 표시 */}
      <div className="admin-topbar">
        <button className="admin-hamburger" onClick={() => setDrawerOpen(v => !v)} aria-label="메뉴 열기/닫기">
          <span /><span /><span />
        </button>
        <span className="admin-topbar-title">Career Admin</span>
      </div>

      <div className="admin-body">
        {/* 오버레이 */}
        {drawerOpen && <div className="admin-drawerOverlay" onClick={() => setDrawerOpen(false)} />}

        <AdminSidebar drawerOpen={drawerOpen} onDrawerClose={() => setDrawerOpen(false)} onLogout={handleLogout} />

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
