import type { JobNotice, JobNoticeBookmarkMap, JobNoticeQueryParams } from '../../../types/user/jobNotice';
import {
  CAREER_LEVEL_LABELS,
  JOB_CATEGORY_LABELS,
  JOB_NOTICE_ALL_FILTER_VALUE,
  JOB_NOTICE_COMPANY_SIZE_QUERY_VALUES,
  JOB_NOTICE_FILTER_OPTIONS,
  JOB_TYPE_LABELS,
} from '../../../types/user/jobNotice';

export const PERIODS = ['오늘', '7일', '30일', '기간 전체'] as const;
export const SORT_OPTIONS = ['추천순', '최신순', '조회수'] as const;
export const DEFAULT_FILTER_VALUE = JOB_NOTICE_ALL_FILTER_VALUE;
export const POPULAR_SEARCH_TAGS = ['백엔드', '프론트엔드', 'Java', 'React', 'Spring Boot', 'AWS', 'Python'];

export const API_FILTER_PARAM_BY_LABEL = {
  직무: 'jobCategory',
  경력: 'careerLevel',
  '채용 유형': 'jobType',
  지역: 'location',
  '기업 규모': 'companySize',
} as const;

export const API_PERIOD_BY_LABEL = {
  오늘: 'today',
  '7일': '7d',
  '30일': '30d',
  '기간 전체': 'all',
} as const;

export const API_SORT_BY_LABEL = {
  추천순: 'recommend',
  최신순: 'latest',
  조회수: 'views',
} as const;

export type FilterLabel = keyof typeof API_FILTER_PARAM_BY_LABEL;
export type Filters = Record<FilterLabel, string>;
export type Bookmarks = JobNoticeBookmarkMap;
export type Period = (typeof PERIODS)[number];
export type SortOption = (typeof SORT_OPTIONS)[number];
export type JobNoticeListStatus = 'loading' | 'success' | 'empty' | 'error';
type JobNoticeFilterParamKey = 'jobCategory' | 'careerLevel' | 'jobType' | 'location' | 'companySize';

const COMPANY_SIZE_FILTER_PARAM_KEY = 'companySize' satisfies JobNoticeFilterParamKey;

export const FILTER_GROUPS = [
  { label: '직무', options: JOB_NOTICE_FILTER_OPTIONS.jobCategory },
  { label: '경력', options: JOB_NOTICE_FILTER_OPTIONS.careerLevel },
  { label: '채용 유형', options: JOB_NOTICE_FILTER_OPTIONS.jobType },
  { label: '지역', options: JOB_NOTICE_FILTER_OPTIONS.location },
  { label: '기업 규모', options: JOB_NOTICE_FILTER_OPTIONS.companySize },
] as const;

const FILTER_OPTION_LABELS = {
  ...JOB_TYPE_LABELS,
  ...JOB_CATEGORY_LABELS,
  ...CAREER_LEVEL_LABELS,
} as const;

export interface FilterGroup {
  label: FilterLabel;
  options: readonly string[];
}

export function createInitialFilters(): Filters {
  return Object.fromEntries(FILTER_GROUPS.map((group) => [group.label, DEFAULT_FILTER_VALUE])) as Filters;
}

export function getJobBookmark(bookmarks: Bookmarks, job: JobNotice): boolean {
  return bookmarks[job.id] ?? job.bookmarked;
}

export function getFilterOptionLabel(value: string) {
  return FILTER_OPTION_LABELS[value as keyof typeof FILTER_OPTION_LABELS] ?? value;
}

export function createJobNoticeQueryParams({
  filters,
  period,
  searchQuery,
  sort,
}: {
  filters: Filters;
  period: Period;
  searchQuery: string;
  sort: SortOption;
}): JobNoticeQueryParams {
  const params: JobNoticeQueryParams = {
    period: API_PERIOD_BY_LABEL[period],
    sort: API_SORT_BY_LABEL[sort],
  };

  const keyword = searchQuery.trim();
  if (keyword) {
    params.keyword = keyword;
  }

  (Object.entries(API_FILTER_PARAM_BY_LABEL) as Array<[FilterLabel, JobNoticeFilterParamKey]>).forEach(([label, paramKey]) => {
    const value = filters[label];
    if (value !== DEFAULT_FILTER_VALUE) {
      params[paramKey] =
        paramKey === COMPANY_SIZE_FILTER_PARAM_KEY && value in JOB_NOTICE_COMPANY_SIZE_QUERY_VALUES
          ? JOB_NOTICE_COMPANY_SIZE_QUERY_VALUES[value as keyof typeof JOB_NOTICE_COMPANY_SIZE_QUERY_VALUES]
          : value;
    }
  });

  return params;
}
