import { Link } from 'react-router-dom';
import { useJobNoticeList } from '@/hooks/user/jobNotice/useJobNoticeList';
import {
  CAREER_LEVEL_LABELS,
  mapJobNoticeApiToViewModel,
} from '@/types/user/jobNotice';
import { authSession } from '@/utils/user/member/authSession';
import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  FileSearch,
  Filter,
  MapPin,
  Mic,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import '@/styles/user/dashboard/DashboardPage.css';

const featureCards = [
  {
    icon: FileSearch,
    title: 'AI 서류 분석',
    text: '이력서와 자기소개서를 분석해 합격 가능성과 개선 포인트를 알려드려요.',
    tone: 'blue',
    to: '/documents/resume',
  },
  {
    icon: Mic,
    title: '실시간 면접 코칭',
    text: 'AI가 예상 질문을 제시하고 실시간 피드백으로 완벽한 면접을 도와요.',
    tone: 'violet',
    to: '/interview',
  },
  {
    icon: Bell,
    title: '맞춤 공고 추천',
    text: '관심 키워드와 직무를 기반으로 새로운 공고를 실시간으로 추천해요.',
    tone: 'sky',
    to: '/jobs',
  },
];

const RECOMMENDED_JOB_QUERY_PARAMS = {
  page: 1,
  size: 3,
  sort: 'recommend',
  period: 'all',
};

function getCompanyLogo(job) {
  const source = job.source?.trim();
  if (source) {
    return source.slice(0, 1).toUpperCase();
  }
  return job.company?.trim().slice(0, 1).toUpperCase() || 'C';
}

function getLogoClass(source) {
  const normalizedSource = source?.trim().toLowerCase();
  if (normalizedSource === 'naver') return 'naver';
  if (normalizedSource === 'kakao') return 'kakao';
  if (normalizedSource === 'wanted') return 'wanted';
  if (normalizedSource === 'saramin') return 'saramin';
  return 'wave';
}

function getCareerLabel(careerLevel) {
  return CAREER_LEVEL_LABELS[careerLevel] ?? careerLevel ?? '경력무관';
}

function formatDeadline(deadline) {
  if (!deadline) {
    return '상시 채용';
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `~ ${year}. ${month}. ${day}.`;
  }

  const parsedDate = new Date(deadline);
  if (Number.isNaN(parsedDate.getTime())) {
    return deadline;
  }

  return `~ ${parsedDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Seoul',
  })}`;
}

function toRecommendedJobCard(job) {
  return {
    id: job.id,
    logo: getCompanyLogo(job),
    logoClass: getLogoClass(job.source),
    title: job.title,
    company: job.company,
    location: job.location || '지역 미정',
    career: getCareerLabel(job.careerLevel),
    date: formatDeadline(job.deadline),
    source: job.source,
    tags: (job.tags ?? []).slice(0, 4),
  };
}

const stats = [
  { icon: Sparkles, title: 'AI 기반 정밀 매칭', text: '정확도 높은 추천' },
  { icon: ShieldCheck, title: '데이터 보안', text: '안전한 개인정보 보호' },
  { icon: Users, title: '누적 사용자 20만+', text: '신뢰받는 커리어 플랫폼' },
  { icon: Building2, title: '기업 5,000+', text: '다양한 기업과 함께' },
];

function JobSeekerDashboardPage() {
  const isLoggedIn = !!authSession.getAccessToken();
  const {
    data: recommendedJobListApiResponse,
    isError: isRecommendedJobsError,
    isLoading: isRecommendedJobsLoading,
    refetch: refetchRecommendedJobs,
  } = useJobNoticeList(RECOMMENDED_JOB_QUERY_PARAMS, { enabled: isLoggedIn });
  const recommendedJobs =
    recommendedJobListApiResponse?.data?.content
      ?.map(mapJobNoticeApiToViewModel)
      .map(toRecommendedJobCard) ?? [];
  const recommendedJobsStatus = !isLoggedIn
    ? 'guest'
    : isRecommendedJobsLoading
      ? 'loading'
      : isRecommendedJobsError
        ? 'error'
        : recommendedJobs.length > 0
          ? 'success'
          : 'empty';

  return (
    <div className="cw-page cw-home">
      <section className="cw-home-hero">
        <div className="cw-home-hero__copy">
          <span className="cw-home-hero__eyebrow">AI가 함께하는 커리어 여정</span>
          <h1>
            AI와 함께 더 나은
            <br />
            커리어 여정을 시작하세요
          </h1>
          <p>
            서류 분석부터 면접 코칭, 맞춤 공고 추천까지
            <br />
            당신의 성장을 위한 가장 스마트한 파트너, Career Wave
          </p>
        </div>

        <div className="cw-sea-scene" aria-hidden="true">
          <div className="cw-sun-glow" />
          <div className="cw-distant-clouds" />
          <div className="cw-mountain-line" />
          <div className="cw-water-shimmer" />
          <div className="cw-cloud cw-cloud--left" />
          <div className="cw-cloud cw-cloud--middle" />
          <div className="cw-cloud cw-cloud--right" />
          <div className="cw-sailboat">
            <span className="mast" />
            <span className="sail sail--main" />
            <span className="sail sail--small" />
            <span className="hull" />
          </div>
        </div>

        <article className="cw-home-profile-card">
          <FileSearch className="cw-profile-spark" size={18} />
          <h2>지금 바로<br />서류 분석 시작하기</h2>
          <p>이력서와 자기소개서를 AI로 분석해 합격 가능성과 개선 포인트를 확인해보세요.</p>
          <Link className="btn btn-primary" to={isLoggedIn ? '/documents/resume' : '/auth/login'}>
            서류 분석 시작하기
          </Link>
        </article>
      </section>

      <section className="cw-home-feature-grid" aria-label="주요 서비스">
        {featureCards.map(({ icon: Icon, title, text, tone, to }) => (
          <Link className="cw-home-feature" key={title} to={to}>
            <span className={`cw-home-feature__icon is-${tone}`}>
              <Icon size={30} />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
            <ChevronRight size={18} />
          </Link>
        ))}
      </section>

      <section className="cw-home-jobs" id="jobs">
        <header>
          <div>
            <h2>추천 공고</h2>
            <p>AI가 당신에게 추천하는 맞춤 공고예요.</p>
          </div>
          <Link to="/jobs">
            전체 공고 보기
            <ChevronRight size={15} />
          </Link>
        </header>

        <div className={`cw-home-job-lockup ${isLoggedIn ? '' : 'is-locked'}`}>
          {!isLoggedIn && (
            <div className="cw-home-job-lockup__overlay">
              <span>
                <Sparkles size={16} />
                로그인 전용 추천
              </span>
              <strong>나에게 맞는 공고는 로그인 후 확인할 수 있어요.</strong>
              <p>프로필과 지원 이력을 기반으로 AI가 더 정확한 추천을 보여드려요.</p>
              <Link className="btn btn-primary" to="/auth/login">
                로그인하고 추천 보기
              </Link>
            </div>
          )}

          {recommendedJobsStatus === 'success' && (
            <div className="cw-home-job-grid" aria-hidden={!isLoggedIn}>
              {recommendedJobs.map((job) => (
                <article className="cw-home-job" key={job.id}>
                  <div className="cw-home-job__head">
                    <span className={`cw-home-job__logo is-${job.logoClass}`}>{job.logo}</span>
                    <button type="button" aria-label={`${job.title} 저장 준비 중`} disabled>
                      <Bookmark size={20} />
                    </button>
                  </div>
                  <h3>{job.title}</h3>
                  <p>{job.company}</p>
                  <div className="cw-home-job__tags">
                    {job.tags.length > 0 ? (
                      job.tags.map((tag) => (
                        <em key={tag}>{tag}</em>
                      ))
                    ) : (
                      <em>{job.source}</em>
                    )}
                  </div>
                  <dl className="cw-home-job__meta">
                    <div>
                      <MapPin size={14} />
                      <dt>위치</dt>
                      <dd>{job.location}</dd>
                    </div>
                    <div>
                      <Briefcase size={14} />
                      <dt>경력</dt>
                      <dd>{job.career}</dd>
                    </div>
                    <div>
                      <CalendarDays size={14} />
                      <dt>마감</dt>
                      <dd>{job.date}</dd>
                    </div>
                  </dl>
                  <Link className="cw-home-job__detail" tabIndex={isLoggedIn ? 0 : -1} to={`/jobs?jobNoticeId=${job.id}`}>
                    상세보기
                    <ChevronRight size={15} />
                  </Link>
                </article>
              ))}
            </div>
          )}

          {recommendedJobsStatus === 'loading' && (
            <div className="cw-home-job-state" role="status" aria-live="polite">
              <Briefcase size={18} />
              <strong>추천 공고를 불러오는 중입니다.</strong>
              <span>실제 채용공고 데이터를 확인하고 있어요.</span>
            </div>
          )}

          {recommendedJobsStatus === 'empty' && (
            <div className="cw-home-job-state" role="status" aria-live="polite">
              <Filter size={18} />
              <strong>표시할 추천 공고가 없습니다.</strong>
              <span>전체 공고 페이지에서 더 많은 채용 정보를 확인해보세요.</span>
            </div>
          )}

          {recommendedJobsStatus === 'error' && (
            <div className="cw-home-job-state" role="alert">
              <Filter size={18} />
              <strong>추천 공고를 불러오지 못했습니다.</strong>
              <span>잠시 후 다시 시도해주세요.</span>
              <button type="button" onClick={() => refetchRecommendedJobs()}>
                다시 시도
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="cw-home-stats" aria-label="서비스 지표">
        {stats.map(({ icon: Icon, title, text }) => (
          <div className="cw-home-stat" key={title}>
            <span>
              <Icon size={18} />
            </span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </section>

    </div>
  );
}

export default JobSeekerDashboardPage;
