import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { adminAuthApi, adminSession } from '../api/adminAuthApi';
import { ACCESS_TOKEN_STORAGE_KEY } from '../constants/authConstants';
import { ADMIN_ROUTE_PATHS, hasAdminRouteAccess } from '../constants/adminRouteConstants';
import '../styles/admin.css';

const menuGroups = [
  {
    title: 'OVERVIEW',
    items: [{ label: '종합 대시보드', path: ADMIN_ROUTE_PATHS.dashboard }],
  },
  {
    title: 'USER & CS',
    items: [
      { label: '관리자 관리', path: ADMIN_ROUTE_PATHS.admins },
      { label: '회원 관리', path: ADMIN_ROUTE_PATHS.members },
      { label: '신고 관리', path: ADMIN_ROUTE_PATHS.reports },
      { label: '고객센터', path: ADMIN_ROUTE_PATHS.cs },
    ],
  },
  {
    title: 'BUSINESS',
    items: [
      { label: '결제 · 정산', path: ADMIN_ROUTE_PATHS.payments },
      { label: '서비스 통계', path: ADMIN_ROUTE_PATHS.stats },
    ],
  },
  {
    title: 'AI SYSTEM',
    items: [
      { label: 'AI 메트릭스', path: ADMIN_ROUTE_PATHS.ai },
      { label: '스크래핑 관리', path: ADMIN_ROUTE_PATHS.scraping },
      { label: '감사 로그', path: ADMIN_ROUTE_PATHS.log },
    ],
  },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const currentAdminRole = adminSession.getRole();
  const [accessNotice, setAccessNotice] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await adminAuthApi.logout();
    } finally {
      adminSession.clearToken();
      adminSession.clearRole();
      window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      navigate(ADMIN_ROUTE_PATHS.login, { replace: true });
    }
  };

  return (
    <aside className="admin-sidebar">
      <span
        className="admin-logo"
        onClick={() => navigate(ADMIN_ROUTE_PATHS.dashboard)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            navigate(ADMIN_ROUTE_PATHS.dashboard);
          }
        }}
      >
        Career Admin
      </span>

      <nav className="admin-menu">
        {menuGroups.map((group) => (
          <div className="admin-menuGroup" key={group.title}>
            <p>{group.title}</p>
            {group.items.map((item) => {
              const hasAccess = hasAdminRouteAccess(currentAdminRole, item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={(event) => {
                    if (hasAccess) {
                      setAccessNotice(null);
                      return;
                    }

                    event.preventDefault();
                    setAccessNotice('해당 메뉴에 접근할 권한이 없습니다.');
                  }}
                  className={({ isActive }) => `admin-menuItem${isActive ? ' active' : ''}${hasAccess ? '' : ' disabled'}`}
                  aria-disabled={!hasAccess}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        ))}

        {accessNotice ? (
          <p className="admin-menuNotice" role="alert">
            {accessNotice}
          </p>
        ) : null}
      </nav>

      <button type="button" className="admin-logoutBtn" onClick={handleLogout}>
        로그아웃
      </button>
    </aside>
  );
}
