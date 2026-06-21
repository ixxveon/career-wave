import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { serviceMenus } from '../../../utils/serviceMenus';
import { useAuth } from '../../../hooks/user/useAuth';
import logo from '../../../assets/logo.svg';
import './Header.css';

interface ComingSoonModalProps {
  onClose: () => void;
}

function ComingSoonModal({ onClose }: ComingSoonModalProps) {
  const navigate = useNavigate();

  function handleCta() {
    onClose();
    navigate('/interview/text');
  }

  return (
    <div className="cw-modal-overlay" onClick={onClose}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>
        <button className="cw-modal__close" onClick={onClose}>
          <X size={18} />
        </button>
        <p className="cw-modal__emoji">🎙️</p>
        <h2 className="cw-modal__title">AI 화상 면접 준비 중</h2>
        <p className="cw-modal__desc">
          더욱 정교한 피드백을 위한 AI 화상 면접 기능이<br />
          열심히 준비 중입니다!<br /><br />
          지금은 <strong>[AI 음성/텍스트 면접]</strong>을 통해<br />
          먼저 연습해 보세요!
        </p>
        <button className="cw-modal__cta" onClick={handleCta}>
          텍스트 면접 시작하기 →
        </button>
      </div>
    </div>
  );
}

function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isLoggedIn, isChecking, logout } = useAuth();

  const handleMenuEnter = useCallback((label: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenMenu(label);
  }, []);

  const handleMenuLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setOpenMenu(null), 150);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  function handleLogout() {
    logout();
    queryClient.clear();
    navigate('/');
  }

  const activeMenuLabel = serviceMenus
    .flatMap((item) => [
      { label: item.label, href: item.href },
      ...(item.children || []).map((child) => ({ label: item.label, href: child.href })),
    ])
    .filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.label;

  return (
    <>
      <header className="cw-header">
        <div className="cw-header__inner">
          <Link className="cw-header__brand" to="/" aria-label="Career Wave 홈">
            <img src={logo} alt="" />
            <span>Career Wave</span>
          </Link>

          <form className="cw-header__search" role="search">
            <input aria-label="검색어" placeholder="원하는 직무, 기업, 키워드를 검색해 보세요" />
            <button type="submit" aria-label="검색">
              <Search size={19} />
            </button>
          </form>

          <nav className="cw-header__nav" aria-label="주요 메뉴">
            {serviceMenus.map((item) => (
              <div
                className={`cw-header__nav-item ${activeMenuLabel === item.label ? 'is-active' : ''}`}
                key={item.label}
                onMouseEnter={() => item.children && handleMenuEnter(item.label)}
                onMouseLeave={handleMenuLeave}
              >
                <NavLink className="cw-header__nav-link" to={item.href}>
                  {item.label}
                </NavLink>
                {item.children && (
                  <div className={`cw-header__submenu${openMenu === item.label ? ' cw-header__submenu--open' : ''}`} role="menu">
                    {item.children.map((child) =>
                      child.comingSoon ? (
                        <button
                          key={child.label}
                          className="cw-submenu__coming-soon"
                          onClick={() => setComingSoonOpen(true)}
                        >
                          {child.label}
                          <span className="cw-submenu__badge">준비 중</span>
                        </button>
                      ) : (
                        <NavLink
                          className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                          end
                          key={child.label}
                          role="menuitem"
                          to={child.href}
                        >
                          {child.label}
                        </NavLink>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <nav className="cw-header__account" aria-label="계정 메뉴">
            {!isChecking && (isLoggedIn ? (
              <>
                <NavLink to="/mypage">마이페이지</NavLink>
                <button type="button" onClick={handleLogout}>로그아웃</button>
              </>
            ) : (
              <>
                <NavLink to="/auth/login">로그인</NavLink>
                <NavLink className="is-primary" to="/auth/register">
                  회원가입
                </NavLink>
              </>
            ))}
          </nav>
        </div>
      </header>

      {comingSoonOpen && <ComingSoonModal onClose={() => setComingSoonOpen(false)} />}
    </>
  );
}

export default Header;
