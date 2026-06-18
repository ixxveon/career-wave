export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
}

export interface JobNoticeSummary {
  jobNoticeId: number;
  companyName: string;
  title: string;
  skillTags: string[] | null;
  viewCount: number;
  createdAt: string;
  noticeStatus?: string;
  jobCategory: string | string[];
  jobType: string;
  careerLevel: string;
  location: string;
  companySize: string;
  salary?: string | null;
  deadline?: string | null;
  source: string;
  bookmarked: boolean;
}

export interface JobNoticeDetail extends JobNoticeSummary {
  originalUrl?: string | null;
  industry?: string;
  responsibilities?: string[];
  requirements?: string[];
  preferredQualifications?: string[];
  process?: string[];
  workConditions?: string[];
  companyDescription?: string;
  description?: string | null;
  updatedAt?: string;
}

export interface JobNoticeBookmarkResponse {
  jobNoticeId: number;
  bookmarked: boolean;
}

export interface JobNotice {
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
  exp: string;
  employment: string;
  industry?: string;
  responsibilities?: string[];
  requirements?: string[];
  preferredQualifications?: string[];
  process?: string[];
  workConditions?: string[];
  companyDescription?: string;
  description?: string | null;
}

export type JobNoticeBookmarkMap = Record<JobNotice['id'], JobNotice['bookmarked']>;

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
  content: JobNoticeSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  stats?: JobNoticeListStats;
  filterOptions?: JobNoticeFilterOptions;
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

function getPrimaryJobCategory(jobCategory: JobNoticeSummary['jobCategory']) {
  return Array.isArray(jobCategory) ? (jobCategory[0] ?? '') : jobCategory;
}

export function mapJobNoticeApiToViewModel(jobNotice: JobNoticeSummary | JobNoticeDetail): JobNotice {
  const jobCategory = getPrimaryJobCategory(jobNotice.jobCategory);
  const tags = jobNotice.skillTags ?? [];

  return {
    id: jobNotice.jobNoticeId,
    company: jobNotice.companyName,
    title: jobNotice.title,
    jobType: jobNotice.jobType,
    jobCategory,
    careerLevel: jobNotice.careerLevel,
    location: jobNotice.location,
    companySize: jobNotice.companySize,
    salary: jobNotice.salary ?? undefined,
    deadline: jobNotice.deadline ?? '',
    postedAt: jobNotice.createdAt,
    tags,
    source: jobNotice.source,
    recommended: false,
    recommendScore: 0,
    views: jobNotice.viewCount,
    bookmarked: jobNotice.bookmarked,
    originalUrl: 'originalUrl' in jobNotice ? jobNotice.originalUrl ?? undefined : undefined,
    stacks: tags,
    exp: jobNotice.careerLevel,
    employment: jobNotice.jobType,
    industry: 'industry' in jobNotice ? jobNotice.industry : undefined,
    responsibilities: 'responsibilities' in jobNotice ? jobNotice.responsibilities : undefined,
    requirements: 'requirements' in jobNotice ? jobNotice.requirements : undefined,
    preferredQualifications: 'preferredQualifications' in jobNotice ? jobNotice.preferredQualifications : undefined,
    process: 'process' in jobNotice ? jobNotice.process : undefined,
    workConditions: 'workConditions' in jobNotice ? jobNotice.workConditions : undefined,
    companyDescription: 'companyDescription' in jobNotice ? jobNotice.companyDescription : undefined,
    description: 'description' in jobNotice ? jobNotice.description : undefined,
  };
}

export function mapJobNoticeViewToApiModel(jobNotice: JobNotice): JobNoticeDetail {
  return {
    jobNoticeId: jobNotice.id,
    companyName: jobNotice.company,
    title: jobNotice.title,
    skillTags: jobNotice.tags,
    jobType: jobNotice.employment,
    companySize: jobNotice.companySize,
    jobCategory: jobNotice.jobCategory,
    careerLevel: jobNotice.exp,
    location: jobNotice.location,
    salary: jobNotice.salary,
    source: jobNotice.source,
    viewCount: jobNotice.views,
    deadline: jobNotice.deadline,
    createdAt: jobNotice.postedAt,
    bookmarked: jobNotice.bookmarked,
    originalUrl: jobNotice.originalUrl,
    industry: jobNotice.industry,
    responsibilities: jobNotice.responsibilities,
    requirements: jobNotice.requirements,
    preferredQualifications: jobNotice.preferredQualifications,
    process: jobNotice.process,
    workConditions: jobNotice.workConditions,
    companyDescription: jobNotice.companyDescription,
    description: jobNotice.description,
  };
}
