import { describe, expect, it } from 'vitest';
import {
  BACKEND_AUDIT_LOG_TYPE,
  mapBackendAuditLogDetail,
  mapBackendAuditLogItem,
  mapBackendAuditLogSummary,
  type BackendAuditLogItem,
} from './auditLogApi';

const backendAuditLog: BackendAuditLogItem = {
  auditLogId: 42,
  adminId: 7,
  logType: BACKEND_AUDIT_LOG_TYPE.ADMIN_MANAGEMENT,
  action: 'UPDATE_ADMIN_ROLE',
  targetType: 'ADMIN',
  targetId: '10',
  ipAddress: '10.20.30.40',
  severity: 'INFO',
  detail: 'changed role to BACKEND',
  createdAt: '2026-06-26T12:30:00+09:00',
};

describe('auditLogApi mapper', () => {
  it('maps backend summary fields to the audit log dashboard summary model', () => {
    expect(
      mapBackendAuditLogSummary({
        totalCount: 12,
        adminActivityCount: 2,
        adminManagementCount: 3,
        aiMetricsSystemCount: 4,
        scrapingSystemCount: 5,
        infoCount: 6,
        warnCount: 7,
        errorCount: 8,
        successCount: 9,
      }),
    ).toEqual({
      totalCount: 12,
      adminCount: 5,
      aiCount: 4,
      scrapingCount: 5,
      warningCount: 7,
      errorCount: 8,
      lastSyncedAt: '-',
    });
  });

  it('maps backend audit log row fields to the frontend list item model', () => {
    expect(mapBackendAuditLogItem(backendAuditLog)).toEqual({
      id: '42',
      logType: BACKEND_AUDIT_LOG_TYPE.ADMIN_MANAGEMENT,
      logTypeLabel: '관리자 관리',
      severity: 'INFO',
      summary: '관리자 역할 변경',
      detailSummary: 'changed role to BACKEND',
      actorId: 'admin-7',
      targetType: 'ADMIN',
      targetId: '10',
      ipAddressMasked: '10.20.30.*',
      occurredAt: '2026-06-26 12:30:00',
    });
  });

  it('uses safe fallbacks for missing backend audit log detail fields', () => {
    expect(
      mapBackendAuditLogDetail({
        ...backendAuditLog,
        adminId: null,
        targetType: null,
        targetId: null,
        ipAddress: null,
        detail: null,
      }),
    ).toEqual({
      id: '42',
      logType: BACKEND_AUDIT_LOG_TYPE.ADMIN_MANAGEMENT,
      logTypeLabel: '관리자 관리',
      severity: 'INFO',
      summary: '관리자 역할 변경',
      detailSummary: '관리자 역할 변경',
      actorId: '-',
      targetType: '-',
      targetId: '-',
      ipAddressMasked: '-',
      occurredAt: '2026-06-26 12:30:00',
    });
  });

  it('masks compressed and IPv4-mapped IPv6 addresses safely', () => {
    expect(mapBackendAuditLogItem({ ...backendAuditLog, ipAddress: 'fe80::' }).ipAddressMasked).toBe('fe80:*');
    expect(mapBackendAuditLogItem({ ...backendAuditLog, ipAddress: '::ffff:10.20.30.40' }).ipAddressMasked).toBe('::ffff:10.20.30.*');
  });
});
