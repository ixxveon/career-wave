import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, X } from 'lucide-react';
import { getServiceMenus } from '../../../utils/serviceMenus';
import { useAuth } from '../../../hooks/user/useAuth';
import { useIsCompanyMember } from '../../../hooks/user/useIsCompanyMember';
import logo from '../../../assets/logo.svg';
import './Header.css';

function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpandedMenu, setMobileExpandedMenu] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isLoggedIn, isChecking, logout } = useAuth();
  const isCompanyMember = useIsCompanyMember();
  const serviceMenus = getServiceMenus(isCompanyMember);

  const handleMenuEnter = useCallback((label: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenMenu(label);
  }, []);

  const handleMenuLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setOpenMenu(null), 150);
  }, []);

  // 라우트 변경 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // 모바일 메뉴 열릴 때 body 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  function handleLogout(): void {
    logout();
    queryClient.clear();
    navigate('/');
  }

  const activeMenuLabel = serviceMenus
    .flatMap((item) => [
      { label: item.label, href: item.href },
      ...(item.children ?? []).map((child) => ({ label: item.label, href: child.href })),
    ])
    .filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.label;

  return (
    <header className="cw-header">
      <div className="cw-header__inner">
        <Link className="cw-header__brand" to="/" aria-label="Career Wave 홈">
          <img src={logo} alt="" />
          <span>Career Wave</span>
        </Link>

        {/* 데스크톱 GNB */}
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
                <div
                  className={`cw-header__submenu${openMenu === item.label ? ' cw-header__submenu--open' : ''}`}
                  role="menu"
                >
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

        {/* 데스크톱 계정 메뉴 */}
        <nav className="cw-header__account" aria-label="계정 메뉴">
          {!isChecking &&
            (isLoggedIn ? (
              <>
                <NavLink to="/mypage">마이페이지</NavLink>
                <button type="button" onClick={handleLogout}>
                  로그아웃
                </button>
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

        {/* 햄버거 버튼 (모바일 전용) */}
        <button
          className="cw-header__hamburger"
          type="button"
          aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* 모바일 드로어 */}
      {mobileOpen && (
        <div
          className="cw-header__overlay"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className={`cw-mobile-nav${mobileOpen ? ' cw-mobile-nav--open' : ''}`} aria-label="모바일 메뉴">
        <div className="cw-mobile-nav__header">
          <Link className="cw-mobile-nav__brand" to="/" aria-label="Career Wave 홈">
            <img src={logo} alt="" />
            <span>Career Wave</span>
          </Link>
          <button
            type="button"
            className="cw-mobile-nav__close"
            aria-label="메뉴 닫기"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav>
          {serviceMenus.map((item) => (
            <div className="cw-mobile-nav__group" key={item.label}>
              {item.children && item.children.length > 1 ? (
                <>
                  <button
                    type="button"
                    className={`cw-mobile-nav__label cw-mobile-nav__label--toggle${activeMenuLabel === item.label ? ' is-active' : ''}${mobileExpandedMenu === item.label ? ' is-open' : ''}`}
                    onClick={() =>
                      setMobileExpandedMenu((prev) => (prev === item.label ? null : item.label))
                    }
                  >
                    {item.label}
                    <span className="cw-mobile-nav__chevron" aria-hidden="true">›</span>
                  </button>
                  {mobileExpandedMenu === item.label && (
                    <div className="cw-mobile-nav__children">
                      {item.children.map((child) => (
                        <NavLink
                          className={({ isActive }) =>
                            `cw-mobile-nav__child${isActive ? ' is-active' : ''}`
                          }
                          end
                          key={child.label}
                          to={child.href}
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  className={({ isActive }) =>
                    `cw-mobile-nav__label${isActive || activeMenuLabel === item.label ? ' is-active' : ''}`
                  }
                  to={item.href}
                >
                  {item.label}
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        <div className="cw-mobile-nav__account">
          {!isChecking &&
            (isLoggedIn ? (
              <>
                <NavLink className="cw-mobile-nav__account-btn" to="/mypage">
                  마이페이지
                </NavLink>
                <button
                  className="cw-mobile-nav__account-btn"
                  type="button"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <NavLink className="cw-mobile-nav__account-btn" to="/auth/login">
                  로그인
                </NavLink>
                <NavLink
                  className="cw-mobile-nav__account-btn cw-mobile-nav__account-btn--primary"
                  to="/auth/register"
                >
                  회원가입
                </NavLink>
              </>
            ))}
        </div>
      </div>
    </header>
  );
}

export default Header;
