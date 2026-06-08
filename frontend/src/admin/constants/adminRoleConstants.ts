export const ADMIN_DETAIL_ROLE = {
  MASTER: 'MASTER',
  CS: 'CS',
  BACKEND: 'BACKEND',
  OPS: 'OPS',
  BILLING: 'BILLING',
  AUDIT: 'AUDIT',
} as const;

export type AdminDetailRole = (typeof ADMIN_DETAIL_ROLE)[keyof typeof ADMIN_DETAIL_ROLE];
