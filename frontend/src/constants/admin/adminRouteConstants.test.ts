import { describe, it, expect } from 'vitest';
import { hasAdminRouteAccess, ADMIN_ROUTE_PATHS } from './adminRouteConstants';
import { ADMIN_DETAIL_ROLE } from './adminRoleConstants';

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
    ])('%s 경로에 접근 가능하다', (path) => {
      expect(hasAdminRouteAccess(ADMIN_DETAIL_ROLE.CS, path as never)).toBe(true);
    });

    it.each([
      ADMIN_ROUTE_PATHS.admins,
      ADMIN_ROUTE_PATHS.payments,
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
