import { adminSecurityLogSeeds, aiMetricLogSeeds, scrapingLogSeeds } from './logSeeds';
import { AUDIT_LOG_LEVEL, AUDIT_LOG_SOURCE } from '../api/auditLogApi';
import type { AuditLogLevel, AuditLogPreview } from '../api/auditLogApi';

const AUDIT_LOG_LEVEL_VALUES = new Set<AuditLogLevel>(Object.values(AUDIT_LOG_LEVEL));

const isValidAuditLogLevel = (value: string): value is AuditLogLevel =>
  AUDIT_LOG_LEVEL_VALUES.has(value as AuditLogLevel);

const toAuditLogLevel = (value: string): AuditLogLevel =>
  isValidAuditLogLevel(value) ? value : AUDIT_LOG_LEVEL.INFO;

export const auditLogPreviewSeeds: AuditLogPreview[] = [
  ...adminSecurityLogSeeds.map((log) => ({
    id: `ADMIN-${log.id}`,
    source: AUDIT_LOG_SOURCE.ADMIN,
    sourceLabel: '관리자 관리',
    timestamp: log.time,
    level: toAuditLogLevel(log.severity),
    summary: log.action,
    detail: `actor: ${log.actor} / target: ${log.target} / ip: ${log.ip}`,
  })),
  ...aiMetricLogSeeds.map((log, index) => ({
    id: `AI-${index + 1}`,
    source: AUDIT_LOG_SOURCE.AI,
    sourceLabel: 'AI 메트릭스',
    timestamp: `2026.05.25 ${log.time}`,
    level: toAuditLogLevel(log.severity),
    summary: log.message,
    detail: 'AI 토큰 사용량 및 리소스 모니터링 이벤트',
  })),
  ...scrapingLogSeeds.map((log) => ({
    id: `SCRAPING-${log.id}`,
    source: AUDIT_LOG_SOURCE.SCRAPING,
    sourceLabel: '스크래핑 관리',
    timestamp: `2026.05.25 ${log.time}`,
    level: toAuditLogLevel(log.level),
    summary: log.message,
    detail: log.detail ?? '스크래핑 파이프라인 상세 이벤트',
  })),
];
