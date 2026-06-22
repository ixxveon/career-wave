import { describe, expect, it } from 'vitest';
import { ACL_RISK_LEVEL, AUDIT_SEVERITY, getAclRiskLevel, toAdminAclRule, toAdminAuditLog } from './adminManagementApi';

describe('adminManagementApi ACL mapper', () => {
  it('normalizes raw backend ACL DTO fields to the frontend public type', () => {
    const aclRule = toAdminAclRule({
      ipAclId: 7,
      label: 'Office Network',
      ipRange: '10.20.0.0/24',
      isEnabled: true,
      description: 'Office allowlist',
      createdAt: '2026-06-11T09:00:00+09:00',
      updatedAt: '2026-06-11T09:10:00+09:00',
    });

    expect(aclRule).toEqual({
      id: '7',
      label: 'Office Network',
      cidr: '10.20.0.0/24',
      note: 'Office allowlist',
      enabled: true,
      riskLevel: ACL_RISK_LEVEL.MEDIUM,
      updatedAt: '2026-06-11T09:10:00+09:00',
    });
  });

  it('falls back safely when a backend ACL range is malformed', () => {
    const aclRule = toAdminAclRule({
      ipAclId: 8,
      label: 'Malformed Network',
      ipRange: undefined as unknown as string,
      isEnabled: false,
      description: null,
      createdAt: '2026-06-11T09:00:00+09:00',
      updatedAt: '2026-06-11T09:10:00+09:00',
    });

    expect(aclRule.cidr).toBe('');
    expect(aclRule.riskLevel).toBe(ACL_RISK_LEVEL.HIGH);
  });

  it.each([
    [undefined, ACL_RISK_LEVEL.HIGH],
    ['', ACL_RISK_LEVEL.HIGH],
    ['10.20.0.0', ACL_RISK_LEVEL.HIGH],
    ['10.20.0.0/not-a-number', ACL_RISK_LEVEL.HIGH],
    ['203.0.113.24/32', ACL_RISK_LEVEL.LOW],
    ['10.20.0.0/24', ACL_RISK_LEVEL.MEDIUM],
    ['10.20.0.0/16', ACL_RISK_LEVEL.HIGH],
  ])('maps CIDR %s to %s risk', (cidr, expectedRiskLevel) => {
    expect(getAclRiskLevel(cidr)).toBe(expectedRiskLevel);
  });
});

describe('adminManagementApi audit log mapper', () => {
  it('normalizes raw backend audit log DTO fields to the frontend public type', () => {
    const auditLog = toAdminAuditLog({
      auditLogId: 12,
      adminId: 101,
      logType: 'ADMIN_MANAGEMENT',
      action: 'UPDATE_ADMIN_ROLE',
      targetType: 'member',
      targetId: 'U-1007',
      ipAddress: '10.20.0.10',
      severity: AUDIT_SEVERITY.SUCCESS,
      detail: 'changed role to CS',
      createdAt: '2026-06-11T09:10:00+09:00',
    });

    expect(auditLog).toEqual({
      id: '12',
      occurredAt: '2026-06-11T09:10:00+09:00',
      actor: 'admin:101',
      ip: '10.20.0.10',
      action: 'UPDATE_ADMIN_ROLE',
      target: 'member:U-1007',
      severity: AUDIT_SEVERITY.SUCCESS,
    });
  });

  it('falls back safely when backend audit log target or actor data is missing', () => {
    const auditLog = toAdminAuditLog({
      auditLogId: 13,
      adminId: null,
      logType: 'ADMIN_MANAGEMENT',
      action: 'DELETE_ADMIN',
      targetType: null,
      targetId: '',
      ipAddress: null,
      severity: AUDIT_SEVERITY.WARN,
      detail: null,
      createdAt: '2026-06-11T09:10:00+09:00',
    });

    expect(auditLog).toEqual({
      id: '13',
      occurredAt: '2026-06-11T09:10:00+09:00',
      actor: '-',
      ip: '',
      action: 'DELETE_ADMIN',
      target: '-',
      severity: AUDIT_SEVERITY.WARN,
    });
  });

  it.each([
    [{ targetType: 'member', targetId: null }, 'member'],
    [{ targetType: null, targetId: 'U-1007' }, 'U-1007'],
    [{ targetType: ' member ', targetId: ' U-1007 ' }, 'member:U-1007'],
  ])('handles partial and trimmed target fields: %o -> %s', ({ targetType, targetId }, expectedTarget) => {
    const auditLog = toAdminAuditLog({
      auditLogId: 14,
      adminId: 1,
      logType: 'ADMIN_MANAGEMENT',
      action: 'UPDATE_ADMIN',
      targetType,
      targetId,
      ipAddress: '127.0.0.1',
      severity: AUDIT_SEVERITY.INFO,
      detail: null,
      createdAt: '2026-06-11T09:10:00+09:00',
    });

    expect(auditLog.target).toBe(expectedTarget);
  });
});
