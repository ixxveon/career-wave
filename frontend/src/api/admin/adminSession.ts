import { ADMIN_DETAIL_ROLE, type AdminDetailRole } from '../../constants/admin/adminRoleConstants';

const ADMIN_TOKEN_KEY = 'career-wave.admin.accessToken';
const ADMIN_ROLE_KEY = 'career-wave.admin.role';
const ADMIN_ID_KEY = 'career-wave.admin.id';
const ADMIN_NAME_KEY = 'career-wave.admin.name';
const ADMIN_ROLE_SET = new Set<AdminDetailRole>(Object.values(ADMIN_DETAIL_ROLE));

export const adminSession = {
  setToken(token: string) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  },

  getToken() {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  },

  clearToken() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  setRole(role: AdminDetailRole) {
    sessionStorage.setItem(ADMIN_ROLE_KEY, role);
  },

  getRole() {
    const storedRole = sessionStorage.getItem(ADMIN_ROLE_KEY);
    if (!storedRole) return null;

    return ADMIN_ROLE_SET.has(storedRole as AdminDetailRole)
      ? (storedRole as AdminDetailRole)
      : null;
  },

  clearRole() {
    sessionStorage.removeItem(ADMIN_ROLE_KEY);
  },

  setId(id: string) {
    sessionStorage.setItem(ADMIN_ID_KEY, id);
  },

  getId() {
    return sessionStorage.getItem(ADMIN_ID_KEY);
  },

  clearId() {
    sessionStorage.removeItem(ADMIN_ID_KEY);
  },

  setName(name: string) {
    sessionStorage.setItem(ADMIN_NAME_KEY, name);
  },

  getName() {
    return sessionStorage.getItem(ADMIN_NAME_KEY);
  },

  clearName() {
    sessionStorage.removeItem(ADMIN_NAME_KEY);
  },
};
