import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { adminSession } from '../../api/admin/adminAuthApi';
import { ADMIN_ROUTE_PATHS, hasAdminRouteAccess } from '../../constants/admin/adminRouteConstants';
import { ADMIN_DETAIL_ROLE } from '../../constants/admin/adminRoleConstants';
import '../../styles/admin/admin.css';

const ROLE_LABEL: Record<string, string> = {
  [ADMIN_DETAIL_ROLE.MASTER]:  '전체 권한',
  [ADMIN_DETAIL_ROLE.CS]:      '고객센터',
  [ADMIN_DETAIL_ROLE.BACKEND]: '백엔드',
};

type AdminRoutePath = typeof ADMIN_ROUTE_PATHS[keyof typeof ADMIN_ROUTE_PATHS];

interface AdminMenuItem {
  label: string;
  path: AdminRoutePath;
  isComingSoon?: boolean;
}

const menuGroups: Array<{ title: string; items: AdminMenuItem[] }> = [
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
      { label: 'RAG 관리', path: ADMIN_ROUTE_PATHS.rag, isComingSoon: true },
      { label: '감사 로그', path: ADMIN_ROUTE_PATHS.log },
    ],
  },
];

interface AdminSidebarProps {
  drawerOpen: boolean;
  onDrawerClose: () => void;
  onLogout: () => void;
}

export default function AdminSidebar({ drawerOpen, onDrawerClose, onLogout }: AdminSidebarProps) {
  const navigate = useNavigate();
  const currentAdminRole = adminSession.getRole();
  const [accessNotice, setAccessNotice] = useState<string | null>(null);

  return (
    <aside className={`admin-sidebar${drawerOpen ? ' admin-sidebar--open' : ''}`}>
      <div className="admin-logoRow">
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
        <button className="admin-drawerClose" onClick={onDrawerClose} aria-label="메뉴 닫기">✕</button>
      </div>

      <nav className="admin-menu">
        {menuGroups.map((group) => (
          <div className="admin-menuGroup" key={group.title}>
            <p>{group.title}</p>
            {group.items.map((item) => {
              const hasAccess = hasAdminRouteAccess(currentAdminRole, item.path);
              const isDisabled = !hasAccess || item.isComingSoon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={(event) => {
                    if (!hasAccess) {
                      event.preventDefault();
                      setAccessNotice('해당 메뉴에 접근할 권한이 없습니다.');
                      return;
                    }
                    if (item.isComingSoon) {
                      event.preventDefault();
                      setAccessNotice('준비중인 서비스입니다.');
                      return;
                    }
                    setAccessNotice(null);
                  }}
                  className={({ isActive }) => `admin-menuItem${isActive ? ' active' : ''}${isDisabled ? ' disabled' : ''}`}
                  aria-disabled={isDisabled}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        ))}

        {accessNotice && (
          <p className="admin-menuNotice" role="alert">{accessNotice}</p>
        )}
      </nav>

      <div className="admin-sidebarProfile">
        <div className="admin-sidebarAvatar">{currentAdminRole?.slice(0, 2) ?? 'AD'}</div>
        <div className="admin-sidebarInfo">
          <strong>{currentAdminRole ?? 'ADMIN'}</strong>
          <span>{currentAdminRole ? ROLE_LABEL[currentAdminRole] : ''}</span>
        </div>
        <button type="button" className="admin-sidebarLogout" onClick={onLogout}>로그아웃</button>
      </div>
    </aside>
  );
}
