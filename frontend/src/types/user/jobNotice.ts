export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
}

export interface JobNoticeSummary {
  id: number;
  company: string;
  title: string;
  jobType: string;
  jobCategory: string;
  careerLevel: string;
  location: string;
  companySize: string;
  salary?: string;
  deadline: string;
  postedAt: string;
  tags: string[];
  source: string;
  recommended: boolean;
  recommendScore: number;
  views: number;
  bookmarked: boolean;
  originalUrl?: string;
  stacks?: string[];
}

export interface JobNoticeDetail extends JobNoticeSummary {
  industry?: string;
  responsibilities?: string[];
  requirements?: string[];
  preferredQualifications?: string[];
  process?: string[];
  workConditions?: string[];
  companyDescription?: string;
}

export interface JobNoticeBookmarkResponse {
  id: number;
  bookmarked: boolean;
  scrapCount: number;
}

export type JobNoticeBookmarkMap = Record<JobNoticeSummary['id'], JobNoticeSummary['bookmarked']>;

export interface JobNoticeListStats {
  totalOpenCount: number;
  todayNewCount: number;
  todayNewDelta: number;
  todayNewRate: number;
}

export interface JobNoticeFilterOptions {
  jobType: string[];
  jobCategory: string[];
  careerLevel: string[];
  location: string[];
  companySize: string[];
}

export interface JobNoticeListResponse {
  items: JobNoticeSummary[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  stats: JobNoticeListStats;
  filterOptions: JobNoticeFilterOptions;
}

export const JOB_NOTICE_ALL_FILTER_VALUE = '전체';

export const JOB_NOTICE_FILTER_OPTIONS = {
  jobType: [JOB_NOTICE_ALL_FILTER_VALUE, 'FULLTIME', 'INTERN', 'CONTRACT'],
  jobCategory: [JOB_NOTICE_ALL_FILTER_VALUE, 'BACKEND', 'FRONTEND', 'DATA', 'DEVOPS'],
  careerLevel: [JOB_NOTICE_ALL_FILTER_VALUE, 'JUNIOR', 'SENIOR', 'ANY'],
  location: [JOB_NOTICE_ALL_FILTER_VALUE, '서울', '경기', '원격'],
  companySize: [JOB_NOTICE_ALL_FILTER_VALUE, '스타트업', '중견', '대기업'],
} as const;

export const JOB_TYPE_LABELS = {
  FULLTIME: '정규직',
  INTERN: '인턴',
  CONTRACT: '계약직',
} as const;

export const JOB_CATEGORY_LABELS = {
  BACKEND: '백엔드',
  FRONTEND: '프론트엔드',
  DATA: '데이터',
  DEVOPS: 'DevOps',
} as const;

export const CAREER_LEVEL_LABELS = {
  JUNIOR: '신입',
  SENIOR: '경력',
  ANY: '경력무관',
} as const;

export const JOB_NOTICE_PERIOD_OPTIONS = ['today', '7d', '30d', 'all'] as const;
export const JOB_NOTICE_SORT_OPTIONS = ['recommend', 'latest', 'views'] as const;

export const JOB_NOTICE_SORT_LABELS = {
  recommend: '추천순',
  latest: '최신순',
  views: '조회순',
} as const satisfies Record<JobNoticeSort, string>;

export type JobNoticeFilterKey = keyof typeof JOB_NOTICE_FILTER_OPTIONS;
export type JobNoticeFilterValue = (typeof JOB_NOTICE_FILTER_OPTIONS)[JobNoticeFilterKey][number];
export type JobNoticePeriod = (typeof JOB_NOTICE_PERIOD_OPTIONS)[number];
export type JobNoticeSort = (typeof JOB_NOTICE_SORT_OPTIONS)[number];

export interface JobNoticeQueryParams {
  keyword?: string;
  jobType?: string;
  jobCategory?: string;
  careerLevel?: string;
  location?: string;
  companySize?: string;
  period?: JobNoticePeriod;
  sort?: JobNoticeSort;
  page?: number;
  size?: number;
}

export type JobNoticeListApiResponse = ApiResponse<JobNoticeListResponse>;
export type JobNoticeDetailApiResponse = ApiResponse<JobNoticeDetail>;
export type JobNoticeBookmarkApiResponse = ApiResponse<JobNoticeBookmarkResponse>;

export const JOB_NOTICE_VIEW_FIELD_MAP = {
  careerLevel: 'exp',
  jobType: 'employment',
} as const;

export type JobNotice = Omit<JobNoticeDetail, 'careerLevel' | 'jobType'> & {
  exp: string;
  employment: string;
};

export function mapJobNoticeApiToViewModel(jobNotice: JobNoticeDetail): JobNotice {
  const { careerLevel, jobType, ...viewJobNotice } = jobNotice;

  return {
    ...viewJobNotice,
    exp: careerLevel,
    employment: jobType,
  };
}

export function mapJobNoticeViewToApiModel(jobNotice: JobNotice): JobNoticeDetail {
  const { exp, employment, ...viewJobNotice } = jobNotice;

  return {
    ...viewJobNotice,
    careerLevel: exp,
    jobType: employment,
  };
}
