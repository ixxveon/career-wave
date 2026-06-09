import { ADMIN_DETAIL_ROLE, type AdminDetailRole } from './adminRoleConstants';

export const ADMIN_ROUTE_PATHS = {
  login: '/admin/login',
  dashboard: '/admin/dashboard',
  admins: '/admin/admins',
  members: '/admin/members',
  reports: '/admin/reports',
  cs: '/admin/cs',
  payments: '/admin/payments',
  stats: '/admin/stats',
  ai: '/admin/ai',
  scraping: '/admin/scraping',
  log: '/admin/log',
  companies: '/admin/companies',
  jobNotices: '/admin/job-notices',
  settlements: '/admin/settlements',
} as const;

export const ADMIN_NAVIGATION_PATH_SET = new Set<string>(Object.values(ADMIN_ROUTE_PATHS));
const PUBLIC_ADMIN_ROUTES = new Set<(typeof ADMIN_ROUTE_PATHS)[keyof typeof ADMIN_ROUTE_PATHS]>([
  ADMIN_ROUTE_PATHS.login,
]);

export const ADMIN_ROUTE_ALLOWED_ROLES: Partial<Record<(typeof ADMIN_ROUTE_PATHS)[keyof typeof ADMIN_ROUTE_PATHS], AdminDetailRole[]>> = {
  [ADMIN_ROUTE_PATHS.dashboard]: [
    ADMIN_DETAIL_ROLE.MASTER,
    ADMIN_DETAIL_ROLE.CS,
    ADMIN_DETAIL_ROLE.BACKEND,
  ],
  [ADMIN_ROUTE_PATHS.admins]: [ADMIN_DETAIL_ROLE.MASTER],
  [ADMIN_ROUTE_PATHS.members]: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.CS],
  [ADMIN_ROUTE_PATHS.reports]: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.CS],
  [ADMIN_ROUTE_PATHS.cs]: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.CS],
  [ADMIN_ROUTE_PATHS.payments]: [ADMIN_DETAIL_ROLE.MASTER],
  [ADMIN_ROUTE_PATHS.stats]: [ADMIN_DETAIL_ROLE.MASTER],
  [ADMIN_ROUTE_PATHS.ai]: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.BACKEND],
  [ADMIN_ROUTE_PATHS.scraping]: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.BACKEND],
  [ADMIN_ROUTE_PATHS.log]: [ADMIN_DETAIL_ROLE.MASTER, ADMIN_DETAIL_ROLE.BACKEND],
  [ADMIN_ROUTE_PATHS.companies]: [ADMIN_DETAIL_ROLE.MASTER],
  [ADMIN_ROUTE_PATHS.jobNotices]: [ADMIN_DETAIL_ROLE.MASTER],
  [ADMIN_ROUTE_PATHS.settlements]: [ADMIN_DETAIL_ROLE.MASTER],
};

export function isAdminNavigationPath(path: string): path is (typeof ADMIN_ROUTE_PATHS)[keyof typeof ADMIN_ROUTE_PATHS] {
  return ADMIN_NAVIGATION_PATH_SET.has(path);
}

export function hasAdminRouteAccess(
  currentAdminRole: AdminDetailRole | null,
  path: (typeof ADMIN_ROUTE_PATHS)[keyof typeof ADMIN_ROUTE_PATHS]
) {
  const allowedRoles = ADMIN_ROUTE_ALLOWED_ROLES[path];
  if (!allowedRoles || allowedRoles.length === 0) {
    return PUBLIC_ADMIN_ROUTES.has(path);
  }
  if (!currentAdminRole) return false;

  return allowedRoles.includes(currentAdminRole);
}
