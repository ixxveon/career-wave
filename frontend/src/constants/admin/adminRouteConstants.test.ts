import { describe, it, expect } from 'vitest';
import { hasAdminRouteAccess, ADMIN_ROUTE_PATHS } from './adminRouteConstants';
import { ADMIN_DETAIL_ROLE } from './adminRoleConstants';

const DASHBOARD_BACKEND_TARGET_PATHS = [
  ADMIN_ROUTE_PATHS.admins,
  ADMIN_ROUTE_PATHS.ai,
  ADMIN_ROUTE_PATHS.payments,
  ADMIN_ROUTE_PATHS.scraping,
  ADMIN_ROUTE_PATHS.log,
] as const;

describe('hasAdminRouteAccess', () => {
  // ── MASTER: 모든 경로 접근 가능 ────────────────────────────
  describe('MASTER role', () => {
    it.each(Object.values(ADMIN_ROUTE_PATHS).filter(p => p !== ADMIN_ROUTE_PATHS.login))(
      '%s 경로에 접근 가능하다',
      (path) => {
        expect(hasAdminRouteAccess(ADMIN_DETAIL_ROLE.MASTER, path as never)).toBe(true);
      }
    );
  });

  // ── CS role ────────────────────────────────────────────────
  describe('CS role', () => {
    it.each([
      ADMIN_ROUTE_PATHS.dashboard,
      ADMIN_ROUTE_PATHS.members,
      ADMIN_ROUTE_PATHS.reports,
      ADMIN_ROUTE_PATHS.cs,
      ADMIN_ROUTE_PATHS.payments,
    ])('%s 경로에 접근 가능하다', (path) => {
      expect(hasAdminRouteAccess(ADMIN_DETAIL_ROLE.CS, path as never)).toBe(true);
    });

    it.each([
      ADMIN_ROUTE_PATHS.admins,
      ADMIN_ROUTE_PATHS.stats,
      ADMIN_ROUTE_PATHS.ai,
      ADMIN_ROUTE_PATHS.scraping,
      ADMIN_ROUTE_PATHS.log,
      ADMIN_ROUTE_PATHS.companies,
      ADMIN_ROUTE_PATHS.settlements,
    ])('%s 경로에 접근 불가하다', (path) => {
      expect(hasAdminRouteAccess(ADMIN_DETAIL_ROLE.CS, path as never)).toBe(false);
    });
  });

  // ── BACKEND role ───────────────────────────────────────────
  describe('BACKEND role', () => {
    it.each([
      ADMIN_ROUTE_PATHS.dashboard,
      ADMIN_ROUTE_PATHS.ai,
      ADMIN_ROUTE_PATHS.scraping,
      ADMIN_ROUTE_PATHS.log,
    ])('%s 경로에 접근 가능하다', (path) => {
      expect(hasAdminRouteAccess(ADMIN_DETAIL_ROLE.BACKEND, path as never)).toBe(true);
    });

    it.each([
      ADMIN_ROUTE_PATHS.admins,
      ADMIN_ROUTE_PATHS.members,
      ADMIN_ROUTE_PATHS.reports,
      ADMIN_ROUTE_PATHS.cs,
      ADMIN_ROUTE_PATHS.payments,
      ADMIN_ROUTE_PATHS.stats,
      ADMIN_ROUTE_PATHS.companies,
      ADMIN_ROUTE_PATHS.settlements,
    ])('%s 경로에 접근 불가하다', (path) => {
      expect(hasAdminRouteAccess(ADMIN_DETAIL_ROLE.BACKEND, path as never)).toBe(false);
    });
  });

  // ── role null (비로그인) ────────────────────────────────────
  describe('role이 null인 경우', () => {
    it.each(Object.values(ADMIN_ROUTE_PATHS).filter(p => p !== ADMIN_ROUTE_PATHS.login))(
      '%s 경로에 접근 불가하다',
      (path) => {
        expect(hasAdminRouteAccess(null, path as never)).toBe(false);
      }
    );
  });
});

describe('admin dashboard backend targetPath contract', () => {
  it.each(DASHBOARD_BACKEND_TARGET_PATHS)('%s 경로는 관리자 라우트 세트에 포함된다', (path) => {
    expect(Object.values(ADMIN_ROUTE_PATHS)).toContain(path);
  });

  it('MASTER는 대시보드 targetPath 전체에 접근 가능하다', () => {
    DASHBOARD_BACKEND_TARGET_PATHS.forEach((path) => {
      expect(hasAdminRouteAccess(ADMIN_DETAIL_ROLE.MASTER, path)).toBe(true);
    });
  });

  it('BACKEND는 AI, 스크래핑, 감사 로그 targetPath에 접근 가능하다', () => {
    [
      ADMIN_ROUTE_PATHS.ai,
      ADMIN_ROUTE_PATHS.scraping,
      ADMIN_ROUTE_PATHS.log,
    ].forEach((path) => {
      expect(hasAdminRouteAccess(ADMIN_DETAIL_ROLE.BACKEND, path)).toBe(true);
    });
  });

  it('BACKEND는 관리자/결제 targetPath에 접근할 수 없다', () => {
    [
      ADMIN_ROUTE_PATHS.admins,
      ADMIN_ROUTE_PATHS.payments,
    ].forEach((path) => {
      expect(hasAdminRouteAccess(ADMIN_DETAIL_ROLE.BACKEND, path)).toBe(false);
    });
  });
});
