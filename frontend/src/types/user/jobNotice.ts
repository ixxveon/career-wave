export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  status: number;
  message: string;
  data: null;
}

export type JobNoticeApiResponse<T> = ApiResponse<T> | ApiErrorResponse;

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
  companySize: string | null;
  salary?: string | null;
  deadline?: string | null;
  source: string;
  bookmarked: boolean;
  companyLogoUrl?: string | null;
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
  companyLogoUrl?: string;
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
  todayNewDelta: number | null;
  todayNewRate: number;
}

export interface JobNoticeFilterOptions {
  jobType: string[];
  jobCategory: string[];
  careerLevel: string[];
  location: string[];
  companySize: string[];
  careerRange?: string[];
  deadlineType?: string[];
  source?: string[];
}

export interface JobNoticeFilterCount {
  totalElements: number;
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

export const JOB_NOTICE_COMPANY_SIZE_API_VALUES = {
  스타트업: 'STARTUP',
  중소: 'SME',
  중견: 'MID_MARKET',
  대기업: 'LARGE',
} as const;

export const JOB_TYPE_LABELS = {
  FULL_TIME: '정규직',
  FULLTIME: '정규직',
  INTERN: '인턴',
  CONTRACT: '계약직',
  FREELANCE: '프리랜서',
  DAILY: '일용직',
} as const;

export const JOB_CATEGORY_LABELS = {
  BACKEND: '백엔드',
  FRONTEND: '프론트엔드',
  MOBILE: '모바일',
  FULLSTACK: '풀스택',
  IOS: 'iOS',
  ANDROID: 'Android',
  SERVER: '서버',
  WEB_DEVELOPMENT: '웹개발',
  SOFTWARE_ENGINEER: '소프트웨어 엔지니어',
  SYSTEM_ENGINEER: '시스템 엔지니어',
  DATA_ANALYST: '데이터 분석가',
  DATA_ENGINEER: '데이터 엔지니어',
  DATA_SCIENTIST: '데이터 사이언티스트',
  ML_ENGINEER: '머신러닝 엔지니어',
  AI_ENGINEER: 'AI 엔지니어',
  MLOPS: 'MLOps',
  BI: 'BI',
  DBA: 'DBA',
} as const;

export const CAREER_LEVEL_LABELS = {
  JUNIOR: '신입',
  SENIOR: '경력',
  ANY: '경력무관',
  FRESHER: '신입',
  ANY_EXPERIENCE: '경력무관',
  INTERN: '인턴',
  UNDER_1: '1년 이하',
  OVER_1: '1년 이상',
  OVER_2: '2년 이상',
  OVER_3: '3년 이상',
  OVER_5: '5년 이상',
  OVER_7: '7년 이상',
  OVER_10: '10년 이상',
} as const;

export const COMPANY_SIZE_LABELS = {
  STARTUP: '스타트업',
  SME: '중소',
  MID_MARKET: '중견',
  LARGE: '대기업',
  PUBLIC: '공기업',
  UNICORN: '유니콘',
  FOREIGN: '외국계',
} as const;

export const DEADLINE_TYPE_LABELS = {
  TODAY: '오늘 마감',
  WITHIN_7_DAYS: '7일 이내 마감',
  OPEN_ENDED: '상시 채용',
} as const;

export const JOB_NOTICE_SOURCE_LABELS = {
  WANTED: '원티드',
  JUMPIT: '점핏',
  SARAMIN: '사람인',
  GROUPBY: '그룹바이',
  DIRECT: '직접 등록',
} as const;

export const LOCATION_LABELS = {
  SEOUL: '서울', GYEONGGI: '경기', INCHEON: '인천', BUSAN: '부산', DAEGU: '대구',
  GWANGJU: '광주', DAEJEON: '대전', ULSAN: '울산', SEJONG: '세종', GANGWON: '강원',
  CHUNGBUK: '충북', CHUNGNAM: '충남', JEONBUK: '전북', JEONNAM: '전남',
  GYEONGBUK: '경북', GYEONGNAM: '경남', JEJU: '제주', OVERSEAS: '해외',
} as const;

const ALL_FILTER_LABELS: Record<string, string> = {
  ...JOB_TYPE_LABELS,
  ...JOB_CATEGORY_LABELS,
  ...CAREER_LEVEL_LABELS,
  ...COMPANY_SIZE_LABELS,
  ...LOCATION_LABELS,
  ...DEADLINE_TYPE_LABELS,
  ...JOB_NOTICE_SOURCE_LABELS,
};

export function getJobNoticeFilterLabel(value: string) {
  return ALL_FILTER_LABELS[value] ?? value;
}

export const JOB_NOTICE_PERIOD_OPTIONS = ['today', '7d', '30d', 'all'] as const;
export const JOB_NOTICE_SORT_OPTIONS = ['recommend', 'latest', 'views'] as const;

export const JOB_NOTICE_SORT_LABELS = {
  recommend: '추천순',
  latest: '최신순',
  views: '조회순',
} as const satisfies Record<JobNoticeSort, string>;

export type JobNoticePeriod = (typeof JOB_NOTICE_PERIOD_OPTIONS)[number];
export type JobNoticeSort = (typeof JOB_NOTICE_SORT_OPTIONS)[number];

export interface JobNoticeQueryParams {
  keyword?: string;
  jobType?: string | string[];
  jobCategory?: string | string[];
  careerLevel?: string | string[];
  location?: string | string[];
  companySize?: string | string[];
  careerRange?: string | string[];
  deadlineType?: string | string[];
  source?: string | string[];
  period?: JobNoticePeriod;
  sort?: JobNoticeSort;
  page?: number;
  size?: number;
}

export type JobNoticeListApiResponse = JobNoticeApiResponse<JobNoticeListResponse>;
export type JobNoticeFilterCountApiResponse = JobNoticeApiResponse<JobNoticeFilterCount>;
export type JobNoticeDetailApiResponse = JobNoticeApiResponse<JobNoticeDetail>;
export type JobNoticeBookmarkApiResponse = JobNoticeApiResponse<JobNoticeBookmarkResponse>;
export const JOB_NOTICE_DEADLINE_FALLBACK = '\uB9C8\uAC10\uC77C \uBBF8\uC815';

export const JOB_NOTICE_VIEW_FIELD_MAP = {
  careerLevel: 'exp',
  jobType: 'employment',
} as const;

function getPrimaryJobCategory(jobCategory: JobNoticeSummary['jobCategory']) {
  return Array.isArray(jobCategory) ? (jobCategory[0] ?? '') : jobCategory;
}

export function formatJobNoticeDeadline(deadline?: string | null): string {
  const normalizedDeadline = deadline?.trim();
  return normalizedDeadline || JOB_NOTICE_DEADLINE_FALLBACK;
}

export function formatJobNoticeDeadlineBadge(deadline?: string | null): string {
  const normalizedDeadline = deadline?.trim();
  return normalizedDeadline ? `\uB9C8\uAC10\uC77C ${normalizedDeadline}` : JOB_NOTICE_DEADLINE_FALLBACK;
}

export function mapJobNoticeApiToViewModel(jobNotice: JobNoticeSummary | JobNoticeDetail): JobNotice {
  const jobCategory = getPrimaryJobCategory(jobNotice.jobCategory);
  const tags = jobNotice.skillTags ?? [];
  const companySize =
    jobNotice.companySize && jobNotice.companySize in COMPANY_SIZE_LABELS
      ? COMPANY_SIZE_LABELS[jobNotice.companySize as keyof typeof COMPANY_SIZE_LABELS]
      : jobNotice.companySize ?? '미정';

  return {
    id: jobNotice.jobNoticeId,
    company: jobNotice.companyName,
    title: jobNotice.title,
    jobType: jobNotice.jobType,
    jobCategory,
    careerLevel: jobNotice.careerLevel,
    location: jobNotice.location,
    companySize,
    salary: jobNotice.salary ?? undefined,
    deadline: jobNotice.deadline?.trim() ?? '',
    postedAt: jobNotice.createdAt,
    tags,
    source: jobNotice.source,
    recommended: false,
    recommendScore: 0,
    views: jobNotice.viewCount,
    bookmarked: jobNotice.bookmarked,
    companyLogoUrl: jobNotice.companyLogoUrl ?? undefined,
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
  const companySize = jobNotice.companySize in JOB_NOTICE_COMPANY_SIZE_API_VALUES
    ? JOB_NOTICE_COMPANY_SIZE_API_VALUES[
      jobNotice.companySize as keyof typeof JOB_NOTICE_COMPANY_SIZE_API_VALUES
    ]
    : jobNotice.companySize;

  return {
    jobNoticeId: jobNotice.id,
    companyName: jobNotice.company,
    title: jobNotice.title,
    skillTags: jobNotice.tags,
    jobType: jobNotice.employment,
    companySize,
    jobCategory: jobNotice.jobCategory,
    careerLevel: jobNotice.exp,
    location: jobNotice.location,
    salary: jobNotice.salary,
    source: jobNotice.source,
    viewCount: jobNotice.views,
    deadline: jobNotice.deadline,
    createdAt: jobNotice.postedAt,
    bookmarked: jobNotice.bookmarked,
    companyLogoUrl: jobNotice.companyLogoUrl,
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
