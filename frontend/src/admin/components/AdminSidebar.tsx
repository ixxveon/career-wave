import { NavLink, useNavigate } from 'react-router-dom';
import '../styles/admin.css';

const menuGroups = [
  {
    title: 'OVERVIEW',
    items: [{ label: '종합 대시보드', path: '/admin/dashboard' }],
  },
  {
    title: 'USER & CS',
    items: [
      { label: '관리자 관리', path: '/admin/admins' },
      { label: '회원 관리', path: '/admin/members' },
      { label: '신고 관리', path: '/admin/reports' },
      { label: '고객센터', path: '/admin/cs' },
    ],
  },
  {
    title: 'BUSINESS',
    items: [
      { label: '결제 · 정산', path: '/admin/payments' },
      { label: '서비스 통계', path: '/admin/matching' },
    ],
  },
  {
    title: 'AI SYSTEM',
    items: [
      { label: 'AI 메트릭스', path: '/admin/ai' },
      { label: '스크래핑 관리', path: '/admin/scraping' },
      { label: '감사 로그', path: '/admin/log' },
    ],
  },
];

export default function AdminSidebar() {
  const navigate = useNavigate();

  return (
    <aside className="admin-sidebar">
      <span
        className="admin-logo"
        onClick={() => navigate('/admin/dashboard')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/dashboard')}
      >
        Career Admin
      </span>

      <nav className="admin-menu">
        {menuGroups.map((group) => (
          <div className="admin-menuGroup" key={group.title}>
            <p>{group.title}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `admin-menuItem${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
