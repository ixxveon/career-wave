import { describe, expect, it } from 'vitest';
import { ACL_RISK_LEVEL, getAclRiskLevel, toAdminAclRule } from './adminManagementApi';

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
