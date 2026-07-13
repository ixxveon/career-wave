import { useEffect, useState } from 'react';
import { ACL_RISK_LEVEL, getAclRiskLevel, type AdminAccount as AdminAccountResponse, type AdminAclRule as AdminAclRuleResponse, type AdminAuditLog as AdminAuditLogResponse, type AdminRole, type AuditSeverity } from '../../../api/admin/adminManagementApi';

export type AdminStatus = 'ACTIVE' | 'LOCKED';

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  scope: string;
  ip: string | null;
  createdAt: string;
  lastLogin: string;
  status: AdminStatus;
}

export interface AclRule {
  id: string;
  label: string;
  cidr: string;
  note: string;
  enabled: boolean;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  time: string;
  actor: string;
  ip: string;
  action: string;
  target: string;
  severity: AuditSeverity;
}

export interface AclDraft {
  label: string;
  cidr: string;
  note: string;
}

export interface AdminDraft {
  loginId: string;
  email: string;
  password: string;
  name: string;
  role: AdminRole;
}

export const ROLE_META: Record<AdminRole, { label: string; scope: string }> = {
  MASTER: { label: '마스터 관리자', scope: '전체 권한 통제 및 보안 확인' },
  CS: { label: 'CS 담당', scope: '회원 문의, 공고, 1차 조치' },
  BACKEND: { label: '백엔드 개발', scope: 'API, DB, 배포, 운영 대응' },
};

export const roleColumns: AdminRole[] = ['MASTER', 'CS', 'BACKEND'];
export const MAX_SECURITY_LOGS = 5;
export const ADMIN_PAGE_SIZE = 20;
export const ACL_PAGE_SIZE = 3;
export const ADMIN_SEARCH_DEBOUNCE_MS = 400;
export const ADMIN_MANAGEMENT_QUERY_KEY = ['adminManagement'] as const;
export const ADMIN_MANAGEMENT_SUMMARY_QUERY_KEY = [...ADMIN_MANAGEMENT_QUERY_KEY, 'summary'] as const;
export const ADMIN_MANAGEMENT_ADMINS_QUERY_KEY = [...ADMIN_MANAGEMENT_QUERY_KEY, 'admins'] as const;
export const ADMIN_MANAGEMENT_ACLS_QUERY_KEY = [...ADMIN_MANAGEMENT_QUERY_KEY, 'acls'] as const;
export const ADMIN_MANAGEMENT_AUDIT_LOGS_QUERY_KEY = [...ADMIN_MANAGEMENT_QUERY_KEY, 'auditLogs'] as const;

export const initialAclRules: AclRule[] = [
  { id: 'ACL-001', label: '본사 사내망', cidr: '10.20.0.0/16', note: '사내 네트워크 전체 허용', enabled: true, updatedAt: '2026.05.25 08:30:00' },
  { id: 'ACL-002', label: '운영 VPN', cidr: '172.16.5.0/24', note: '원격 운영자 접속 허용', enabled: true, updatedAt: '2026.05.25 08:32:00' },
  { id: 'ACL-003', label: '배포 서버', cidr: '203.0.113.24/32', note: '배포 및 운영 작업용 고정 IP', enabled: true, updatedAt: '2026.05.25 08:34:00' },
];

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debouncedValue;
}

export function splitDateTime(value: string) {
  const [date = '', time = ''] = value.split(' ');
  return { date, time };
}

export function formatAdminLastLogin(value: string): string {
  if (!value) return '-';
  if (value.includes(' ')) return value;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;

  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parsedDate);
  const lookup = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day} ${lookup.hour}:${lookup.minute}`;
}

export function isValidCidr(value: string) {
  const match = value.match(/^(\d{1,3})(?:\.(\d{1,3})){3}\/(\d{1,2})$/);
  if (!match) return false;

  const [ip, prefix] = value.split('/');
  const prefixNumber = Number(prefix);
  if (!Number.isInteger(prefixNumber) || prefixNumber < 0 || prefixNumber > 32) return false;

  return ip.split('.').every((octet) => {
    const octetNumber = Number(octet);
    return Number.isInteger(octetNumber) && octetNumber >= 0 && octetNumber <= 255;
  });
}

export function getAclRiskMeta(cidr?: string | null) {
  const riskLevel = getAclRiskLevel(cidr);
  if (riskLevel === ACL_RISK_LEVEL.LOW) return { label: '고정 IP', tone: 'low' as const };
  if (riskLevel === ACL_RISK_LEVEL.MEDIUM) return { label: '제한 대역', tone: 'medium' as const };
  return { label: '넓은 대역', tone: 'high' as const };
}

export function createEmptyAdminDraft(): AdminDraft {
  return { loginId: '', email: '', password: '', name: '', role: 'CS' };
}

export function toAdminAccountRow(admin: AdminAccountResponse): AdminAccount {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    scope: admin.scope,
    ip: admin.ip,
    createdAt: admin.createdAt,
    lastLogin: formatAdminLastLogin(admin.lastLoginAt),
    status: admin.status,
  };
}

export function toAclRuleRow(aclRule: AdminAclRuleResponse): AclRule {
  return {
    id: aclRule.id,
    label: aclRule.label,
    cidr: aclRule.cidr,
    note: aclRule.note,
    enabled: aclRule.enabled,
    updatedAt: aclRule.updatedAt,
  };
}

export function toAuditLogRow(auditLog: AdminAuditLogResponse): AuditLog {
  return {
    id: auditLog.id,
    time: auditLog.occurredAt,
    actor: auditLog.actor,
    ip: auditLog.ip,
    action: auditLog.action,
    target: auditLog.target,
    severity: auditLog.severity,
  };
}
