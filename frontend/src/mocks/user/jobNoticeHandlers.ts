import { http, HttpResponse } from 'msw';
import type {
  ApiResponse,
  JobNoticeBookmarkResponse,
  JobNoticeDetail,
  JobNoticeListResponse,
  JobNoticeSummary,
} from '../../types/user/jobNotice';

const BASE = '/api/v1/user/job-notices';

const COMPANY_SIZE_LABEL_BY_QUERY_VALUE = {
  STARTUP: '스타트업',
  SME: '중견',
  LARGE: '대기업',
} as const;

const jobNotices: JobNoticeDetail[] = [
  {
    jobNoticeId: 1001,
    companyName: 'Career Wave Labs',
    title: 'Backend Engineer',
    skillTags: ['Java', 'Spring Boot', 'MySQL', 'AWS'],
    jobType: 'FULLTIME',
    companySize: '스타트업',
    jobCategory: 'BACKEND',
    careerLevel: 'JUNIOR',
    location: '서울',
    salary: '협의',
    noticeStatus: 'OPEN',
    source: 'Wanted',
    viewCount: 1284,
    deadline: '상시채용',
    createdAt: '2026-06-10T09:00:00',
    bookmarked: false,
    originalUrl: 'https://www.wanted.co.kr/search?query=Backend%20Engineer',
    industry: 'IT 서비스',
    responsibilities: ['REST API 개발', '채용공고 수집 파이프라인 운영', '서비스 성능 개선'],
    requirements: ['Java 또는 Kotlin 기반 API 개발 경험', 'RDBMS 설계 경험'],
    preferredQualifications: ['Spring Boot 운영 경험', 'AWS 배포 경험'],
    process: ['서류 검토', '기술 면접', '최종 면접'],
    workConditions: ['주 5일 근무', '유연근무제'],
    companyDescription: '개발자 채용 경험을 개선하는 HR 테크 팀입니다.',
  },
  {
    jobNoticeId: 1002,
    companyName: 'Frontend Studio',
    title: 'Frontend Developer',
    skillTags: ['React', 'TypeScript', 'Vite'],
    jobType: 'FULLTIME',
    companySize: '중견',
    jobCategory: 'FRONTEND',
    careerLevel: 'ANY',
    location: '경기',
    salary: '면접 후 결정',
    noticeStatus: 'OPEN',
    source: 'Saramin',
    viewCount: 842,
    deadline: '2026-07-15',
    createdAt: '2026-06-12T10:30:00',
    bookmarked: true,
    originalUrl: 'https://www.saramin.co.kr',
    responsibilities: ['사용자 페이지 개발', '디자인 시스템 컴포넌트 개선'],
    requirements: ['React 실무 경험', 'TypeScript 사용 경험'],
    preferredQualifications: ['접근성 개선 경험'],
    process: ['서류 검토', '과제 전형', '인터뷰'],
    workConditions: ['하이브리드 근무'],
    companyDescription: '프론트엔드 플랫폼을 만드는 제품 조직입니다.',
  },
  {
    jobNoticeId: 1003,
    companyName: 'Data Bridge',
    title: 'Data Engineer Intern',
    skillTags: ['Python', 'SQL', 'Airflow'],
    jobType: 'INTERN',
    companySize: '대기업',
    jobCategory: 'DATA',
    careerLevel: 'JUNIOR',
    location: '서울',
    salary: null,
    noticeStatus: 'OPEN',
    source: 'JobKorea',
    viewCount: 516,
    deadline: null,
    createdAt: '2026-06-13T14:20:00',
    bookmarked: false,
    responsibilities: ['데이터 파이프라인 보조', '대시보드 데이터 검증'],
    requirements: ['SQL 기본 이해', 'Python 사용 경험'],
    preferredQualifications: ['Airflow 경험'],
    process: ['서류 검토', '실무 면접'],
    workConditions: ['인턴 3개월'],
    companyDescription: '데이터 기반 의사결정 플랫폼을 운영합니다.',
  },
];

function toListItem(jobNotice: JobNoticeDetail): JobNoticeSummary {
  return {
    jobNoticeId: jobNotice.jobNoticeId,
    companyName: jobNotice.companyName,
    title: jobNotice.title,
    skillTags: jobNotice.skillTags,
    jobType: jobNotice.jobType,
    companySize: jobNotice.companySize,
    jobCategory: jobNotice.jobCategory,
    careerLevel: jobNotice.careerLevel,
    location: jobNotice.location,
    salary: jobNotice.salary,
    noticeStatus: jobNotice.noticeStatus,
    source: jobNotice.source,
    viewCount: jobNotice.viewCount,
    deadline: jobNotice.deadline,
    createdAt: jobNotice.createdAt,
    bookmarked: jobNotice.bookmarked,
  };
}

function ok<T>(data: T, message = 'ok'): ApiResponse<T> {
  return {
    success: true,
    statusCode: 200,
    message,
    data,
  };
}

function getPageParam(url: URL, name: string, defaultValue: number) {
  const value = Number(url.searchParams.get(name));
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
}

export const jobNoticeHandlers = [
  http.get(BASE, ({ request }) => {
    const url = new URL(request.url);
    const page = getPageParam(url, 'page', 1);
    const size = getPageParam(url, 'size', 18);
    const keyword = url.searchParams.get('keyword')?.trim().toLowerCase();
    const jobType = url.searchParams.get('jobType');
    const jobCategory = url.searchParams.get('jobCategory');
    const careerLevel = url.searchParams.get('careerLevel');
    const location = url.searchParams.get('location');
    const companySize = url.searchParams.get('companySize');
    const companySizeLabel = companySize
      ? COMPANY_SIZE_LABEL_BY_QUERY_VALUE[
        companySize as keyof typeof COMPANY_SIZE_LABEL_BY_QUERY_VALUE
      ] ?? companySize
      : null;

    const filtered = jobNotices.filter((jobNotice) => {
      const matchesKeyword = !keyword
        || jobNotice.title.toLowerCase().includes(keyword)
        || jobNotice.companyName.toLowerCase().includes(keyword)
        || (jobNotice.skillTags ?? []).some((tag) => tag.toLowerCase().includes(keyword));
      const matchesJobType = !jobType || jobNotice.jobType === jobType;
      const matchesJobCategory = !jobCategory || jobNotice.jobCategory === jobCategory;
      const matchesCareerLevel = !careerLevel || jobNotice.careerLevel === careerLevel;
      const matchesLocation = !location || jobNotice.location.includes(location);
      const matchesCompanySize = !companySizeLabel || jobNotice.companySize === companySizeLabel;

      return matchesKeyword
        && matchesJobType
        && matchesJobCategory
        && matchesCareerLevel
        && matchesLocation
        && matchesCompanySize;
    });

    const start = (page - 1) * size;
    const content = filtered.slice(start, start + size).map(toListItem);
    const totalElements = filtered.length;
    const today = new Date().toISOString().slice(0, 10);
    const todayNewCount = filtered.filter((jobNotice) => jobNotice.createdAt.startsWith(today)).length;

    const data: JobNoticeListResponse = {
      content,
      page,
      size,
      totalElements,
      totalPages: Math.max(1, Math.ceil(totalElements / size)),
      stats: {
        totalOpenCount: jobNotices.length,
        todayNewCount,
        todayNewDelta: todayNewCount,
        todayNewRate: totalElements ? Math.round((todayNewCount / totalElements) * 100) : 0,
      },
      filterOptions: {
        jobType: ['FULLTIME', 'INTERN', 'CONTRACT'],
        jobCategory: ['BACKEND', 'FRONTEND', 'DATA', 'DEVOPS'],
        careerLevel: ['JUNIOR', 'SENIOR', 'ANY'],
        location: ['서울', '경기', '원격'],
        companySize: ['스타트업', '중견', '대기업'],
      },
    };

    return HttpResponse.json(ok(data));
  }),

  http.get(`${BASE}/:jobNoticeId`, ({ params }) => {
    const jobNoticeId = Number(params.jobNoticeId);
    const jobNotice = jobNotices.find((item) => item.jobNoticeId === jobNoticeId);

    if (!jobNotice) {
      return HttpResponse.json(
        { success: false, statusCode: 404, message: '채용공고를 찾을 수 없습니다.', data: null },
        { status: 404 },
      );
    }

    return HttpResponse.json(ok(jobNotice));
  }),

  http.post(`${BASE}/:jobNoticeId/bookmarks`, ({ params }) => {
    const jobNoticeId = Number(params.jobNoticeId);
    const jobNotice = jobNotices.find((item) => item.jobNoticeId === jobNoticeId);

    if (!jobNotice) {
      return HttpResponse.json(
        { success: false, statusCode: 404, message: '채용공고를 찾을 수 없습니다.', data: null },
        { status: 404 },
      );
    }

    jobNotice.bookmarked = true;

    const data: JobNoticeBookmarkResponse = {
      jobNoticeId,
      bookmarked: true,
    };

    return HttpResponse.json(ok(data));
  }),

  http.delete(`${BASE}/:jobNoticeId/bookmarks`, ({ params }) => {
    const jobNoticeId = Number(params.jobNoticeId);
    const jobNotice = jobNotices.find((item) => item.jobNoticeId === jobNoticeId);

    if (!jobNotice) {
      return HttpResponse.json(
        { success: false, statusCode: 404, message: '채용공고를 찾을 수 없습니다.', data: null },
        { status: 404 },
      );
    }

    jobNotice.bookmarked = false;

    const data: JobNoticeBookmarkResponse = {
      jobNoticeId,
      bookmarked: false,
    };

    return HttpResponse.json(ok(data));
  }),
];
