import type { JobNotice, JobNoticeBookmarkMap, JobNoticeFilterOptions, JobNoticeQueryParams } from '../../../types/user/jobNotice';
import {
  CAREER_LEVEL_LABELS,
  COMPANY_SIZE_LABELS,
  JOB_CATEGORY_LABELS,
  JOB_NOTICE_ALL_FILTER_VALUE,
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
export type Filters = Record<FilterLabel, string[]>;
export type Bookmarks = JobNoticeBookmarkMap;
export type Period = (typeof PERIODS)[number];
export type SortOption = (typeof SORT_OPTIONS)[number];
export type JobNoticeListStatus = 'loading' | 'success' | 'empty' | 'error';
type JobNoticeFilterParamKey = 'jobCategory' | 'careerLevel' | 'jobType' | 'location' | 'companySize';

export const FILTER_GROUPS = [
  { label: '직무', optionKey: 'jobCategory' },
  { label: '경력', optionKey: 'careerLevel' },
  { label: '채용 유형', optionKey: 'jobType' },
  { label: '지역', optionKey: 'location' },
  { label: '기업 규모', optionKey: 'companySize' },
] as const;

const JOB_CATEGORY_OPTION_GROUPS = [
  { label: '개발', options: ['BACKEND', 'FRONTEND', 'MOBILE', 'EMBEDDED'] },
  { label: '데이터·인프라', options: ['DATA', 'DEVOPS'] },
  { label: '품질·보안', options: ['QA', 'SECURITY'] },
  { label: '특화', options: ['GAME'] },
] as const;

const FILTER_OPTION_LABELS = {
  ...JOB_TYPE_LABELS,
  ...JOB_CATEGORY_LABELS,
  ...CAREER_LEVEL_LABELS,
  ...COMPANY_SIZE_LABELS,
} as const;

export interface FilterGroup {
  label: FilterLabel;
  options: string[];
  optionGroups?: Array<{ label: string; options: string[] }>;
}

export function createInitialFilters(): Filters {
  return Object.fromEntries(FILTER_GROUPS.map((group) => [group.label, []])) as unknown as Filters;
}

export function createFilterGroups(filterOptions?: JobNoticeFilterOptions): FilterGroup[] {
  return FILTER_GROUPS.map((group) => {
    const options = filterOptions?.[group.optionKey] ?? [];
    const optionGroups = group.optionKey === 'jobCategory'
      ? JOB_CATEGORY_OPTION_GROUPS
        .map((optionGroup) => ({
          label: optionGroup.label,
          options: optionGroup.options.filter((option) => options.includes(option)),
        }))
        .filter((optionGroup) => optionGroup.options.length > 0)
      : undefined;

    return { label: group.label, options, optionGroups };
  });
}

export function normalizeFilters(filters: Filters, filterGroups: FilterGroup[]): Filters {
  const nextFilters = { ...filters };

  filterGroups.forEach((group) => {
    nextFilters[group.label] = nextFilters[group.label].filter((value) => group.options.includes(value));
  });

  return nextFilters;
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
    const values = filters[label];
    if (values.length > 0) {
      params[paramKey] = values;
    }
  });

  return params;
}
