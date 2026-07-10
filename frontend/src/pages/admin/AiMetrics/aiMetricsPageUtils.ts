import { AI_DOMAIN, AI_EVENT_SEVERITY, AI_HEALTH_STATUS, AI_USAGE_RISK_LEVEL, DOMAIN_LABELS } from '../../../api/admin/aiMetricsApi';
import type { AiDomain, AiEventSeverity, AiHealthStatus, AiHeavyUser, AiUsageRiskLevel } from '../../../api/admin/aiMetricsApi';

export type Tone = 'normal' | 'warning' | 'danger';
export type EventSeverity = AiEventSeverity;

export const SUMMARY_QUERY_KEY = ['admin', 'aiMetrics', 'summary'] as const;
export const DOMAIN_USAGE_QUERY_KEY = ['admin', 'aiMetrics', 'domainUsage'] as const;
export const TOKEN_TREND_QUERY_KEY = ['admin', 'aiMetrics', 'tokenTrend'] as const;
export const BUDGET_QUERY_KEY = ['admin', 'aiMetrics', 'budget'] as const;
export const HEAVY_USERS_QUERY_KEY = ['admin', 'aiMetrics', 'heavyUsers'] as const;
export const LOGS_QUERY_KEY = ['admin', 'aiMetrics', 'logs'] as const;

export const DOMAIN_CARD_ORDER: AiDomain[] = [AI_DOMAIN.DOCUMENT, AI_DOMAIN.INTERVIEW, AI_DOMAIN.ADMIN_CS, AI_DOMAIN.ADMIN_REPORT];
export const DOMAIN_FILTER_OPTIONS: Array<{ value: 'ALL' | AiDomain; label: string }> = [
  { value: 'ALL', label: '전체 도메인' },
  { value: AI_DOMAIN.DOCUMENT, label: DOMAIN_LABELS[AI_DOMAIN.DOCUMENT] },
  { value: AI_DOMAIN.INTERVIEW, label: DOMAIN_LABELS[AI_DOMAIN.INTERVIEW] },
  { value: AI_DOMAIN.ADMIN_CS, label: DOMAIN_LABELS[AI_DOMAIN.ADMIN_CS] },
  { value: AI_DOMAIN.ADMIN_REPORT, label: DOMAIN_LABELS[AI_DOMAIN.ADMIN_REPORT] },
];

export const formatNumber = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '-');
export const formatPercent = (value?: number) => (typeof value === 'number' ? `${value.toFixed(1)}%` : '-');
export const formatLatency = (value?: number) => (typeof value === 'number' ? `${Math.round(value).toLocaleString()}ms` : '-');
export const formatCost = (value?: number | null) => (
  typeof value === 'number'
    ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 6 })}`
    : '-'
);
export const formatBudgetPercent = (value: number) => `${Math.min(100, Math.max(0, Math.round(value))).toLocaleString()}%`;

export function formatCompactToken(value: number) {
  if (value >= 1000) return `${Math.round(value / 100) / 10}K`;
  return value.toLocaleString();
}

export function formatTrendBucket(bucket: string) {
  const date = new Date(bucket);
  if (!Number.isNaN(date.getTime())) return `${String(date.getHours()).padStart(2, '0')}h`;
  return bucket;
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatLastSyncedLabel(value?: string) {
  if (!value?.trim() || value === '-') return '동기화 정보 없음';
  return `${formatDateTime(value)} 동기화`;
}

export function getMaskedHeavyUserLabel(user: AiHeavyUser) {
  const label = user.maskedUserLabel.trim();
  if (label) return label;
  return `USER-${user.userId.slice(-4).padStart(4, '*')}`;
}

function getApiErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  return (error as { response?: { status?: number } }).response?.status;
}

function getApiErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
}

export function getApiStateMessage(error: unknown, fallback: string) {
  const status = getApiErrorStatus(error);
  if (status === 401) return '로그인이 만료되어 데이터를 처리할 수 없습니다. 다시 로그인해 주세요.';
  if (status === 403) return '관리자 권한이 없어 데이터를 처리할 수 없습니다.';
  const message = getApiErrorMessage(error);
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

export function getHealthStatusLabel(status?: AiHealthStatus) {
  if (status === AI_HEALTH_STATUS.CRITICAL) return 'OpenAI API 위험';
  if (status === AI_HEALTH_STATUS.WARNING) return 'OpenAI API 주의';
  if (status === AI_HEALTH_STATUS.NORMAL) return 'OpenAI API 정상';
  return 'OpenAI API 상태 확인 중';
}

export function getRiskTone(riskLevel?: AiUsageRiskLevel) {
  if (riskLevel === AI_USAGE_RISK_LEVEL.CRITICAL) return 'danger';
  if (riskLevel === AI_USAGE_RISK_LEVEL.WARNING) return 'warning';
  if (riskLevel === AI_USAGE_RISK_LEVEL.NORMAL) return 'normal';
  return 'muted';
}

export function toneForStatus(value: EventSeverity): Tone {
  if (value === AI_EVENT_SEVERITY.ERROR) return 'danger';
  if (value === AI_EVENT_SEVERITY.WARN) return 'warning';
  return 'normal';
}
