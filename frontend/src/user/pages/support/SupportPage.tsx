import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Bell, HelpCircle, MessageSquare } from 'lucide-react';
import './styles/SupportPage.css';

const TABS = [
  { to: '/support/notices',  label: '공지사항',  icon: <Bell size={15} /> },
  { to: '/support/faq',      label: 'FAQ',        icon: <HelpCircle size={15} /> },
  { to: '/support/inquiry',  label: '1:1 문의',   icon: <MessageSquare size={15} /> },
];

export default function SupportPage() {
  const { pathname } = useLocation();

  if (pathname === '/support' || pathname === '/support/') {
    return <Navigate to="/support/notices" replace />;
  }

  const isInquiryCreate = pathname === '/support/inquiry/create';

  return (
    <div className="sp-page">
      <div className="sp-header">
        <span className="sp-eyebrow">HELP CENTER</span>
        <h1 className="sp-header__title">고객센터</h1>
        <p className="sp-header__desc">공지사항, 자주 묻는 질문, 1:1 문의를 통해 도움을 받으세요.</p>
      </div>

      {!isInquiryCreate && (
        <nav className="sp-tabs">
          {TABS.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `sp-tab${isActive ? ' sp-tab--on' : ''}`
              }
              end={false}
            >
              {t.icon}
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}

      <Outlet />
    </div>
  );
}
