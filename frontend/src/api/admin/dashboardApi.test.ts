import { describe, expect, it } from 'vitest';
import { DASHBOARD_KPI_KEY } from './dashboardApi';
import { ADMIN_ROUTE_PATHS, isAdminNavigationPath } from '../../constants/admin/adminRouteConstants';

describe('admin dashboard API contract', () => {
  it('exposes backend KPI keys used by the dashboard page', () => {
    expect(Object.values(DASHBOARD_KPI_KEY)).toHaveLength(4);
    expect(Object.values(DASHBOARD_KPI_KEY)).toEqual(
      expect.arrayContaining([
        'TODAY_NEW_ADMINS',
        'REALTIME_ACTIVE_ADMINS',
        'AI_INTERVIEW_SESSIONS',
        'TODAY_REVENUE',
      ])
    );
  });

  it('uses frontend admin routes for dashboard target paths', () => {
    const dashboardTargetPaths = [
      ADMIN_ROUTE_PATHS.admins,
      ADMIN_ROUTE_PATHS.ai,
      ADMIN_ROUTE_PATHS.payments,
      ADMIN_ROUTE_PATHS.scraping,
      ADMIN_ROUTE_PATHS.log,
    ];

    expect(dashboardTargetPaths.every(isAdminNavigationPath)).toBe(true);
    expect(dashboardTargetPaths.every((path) => path.startsWith('/cw-manage-2026/'))).toBe(true);
  });
});
