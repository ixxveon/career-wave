import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { serviceMenus } from '../../../utils/serviceMenus';
import { useAuth } from '../../../hooks/user/useAuth';
import logo from '../../../assets/logo.svg';
import './Header.css';


function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
                onFocus={() => item.children && handleMenuEnter(item.label)}
                onBlur={handleMenuLeave}
              >
                <NavLink className="cw-header__nav-link" to={item.href}>
                  {item.label}
                </NavLink>
                {item.children && (
                  <div className={`cw-header__submenu${openMenu === item.label ? ' cw-header__submenu--open' : ''}`} role="menu">
                    {item.children.map((child) => (
                      <NavLink
                        className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                        end
                        key={child.label}
                        role="menuitem"
                        to={child.href}
                      >
                        {child.label}
                      </NavLink>
                    ))}
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

    </>
  );
}

export default Header;
