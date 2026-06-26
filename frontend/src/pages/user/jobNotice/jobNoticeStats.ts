import { Flame, FileText, type LucideIcon } from 'lucide-react';
import type { JobNoticeListStats } from '../../../types/user/jobNotice';

export interface BannerStat {
  label: string;
  value: string;
  description: string;
  Icon: LucideIcon;
  iconClassName: string;
  highlight?: string;
  valueClassName?: string;
}

function formatStatNumber(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString();
}

export function createBannerStats(stats: JobNoticeListStats): BannerStat[] {
  return [
    {
      label: '전체 공고',
      value: formatStatNumber(stats.totalOpenCount),
      description: `+${formatStatNumber(stats.todayNewCount)} 오늘`,
      Icon: FileText,
      iconClassName: 'jn-stat-card__icon--blue',
    },
    {
      label: '오늘 신규 공고',
      value: formatStatNumber(stats.todayNewCount),
      description: `(${formatStatNumber(stats.todayNewRate)}%)`,
      highlight: `+${formatStatNumber(stats.todayNewDelta)}`,
      Icon: Flame,
      iconClassName: 'jn-stat-card__icon--pink',
      valueClassName: 'jn-stat-card__value--pink',
    },
  ];
}
