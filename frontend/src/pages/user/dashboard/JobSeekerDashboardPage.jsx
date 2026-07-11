import { useCallback, useEffect, useRef, useState } from 'react';
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
  ChevronLeft,
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
  size: 9,
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

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

// formatDeadline과 동일하게 KST 기준으로 날짜 경계를 계산한다 (사용자 시스템 타임존에 의존하지 않도록).
function getKstMidnightUtcMs(date) {
  const kstDateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const [year, month, day] = kstDateStr.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function getDday(deadline) {
  if (!deadline) return null;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
  const endMs = dateOnlyMatch
    ? Date.UTC(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : getKstMidnightUtcMs(new Date(deadline));
  if (Number.isNaN(endMs)) return null;

  const todayMs = getKstMidnightUtcMs(new Date());
  const diff = Math.round((endMs - todayMs) / ONE_DAY_MS);
  if (diff < 0) return null;
  if (diff === 0) return 'D-day';
  return `D-${diff}`;
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
    dday: getDday(job.deadline),
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
  const viewportRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncScrollState = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 2);
  }, []);

  function scrollCarousel(dir) {
    const el = viewportRef.current;
    if (!el) return;
    const card = el.querySelector('.cw-home-job');
    if (!card) return;
    const step = card.offsetWidth + 12;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  const {
    data: recommendedJobListApiResponse,
    isError: isRecommendedJobsError,
    isLoading: isRecommendedJobsLoading,
    refetch: refetchRecommendedJobs,
  } = useJobNoticeList(RECOMMENDED_JOB_QUERY_PARAMS);
  const recommendedJobs =
    recommendedJobListApiResponse?.pages?.[0]?.data?.content
      ?.map(mapJobNoticeApiToViewModel)
      .map(toRecommendedJobCard) ?? [];

  useEffect(() => {
    syncScrollState();
    window.addEventListener('resize', syncScrollState);
    return () => window.removeEventListener('resize', syncScrollState);
  }, [syncScrollState, recommendedJobs.length]);
  const recommendedJobsStatus = isRecommendedJobsLoading
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

          <div className="cw-home-job-lockup__header">
            <div>
              <span className="cw-home-job-lockup__badge">
                <Sparkles size={12} />
                오늘의 AI 추천
              </span>
              <p>AI가 지원 이력과 관심 활동을 반영해 선별했어요</p>
            </div>
            <Link to="/jobs">
              전체 공고 보기
              <ChevronRight size={14} />
            </Link>
          </div>

          {recommendedJobsStatus === 'success' && (
            <div className="cw-home-job-carousel" aria-hidden={!isLoggedIn}>
              {!atStart && (
                <button
                  type="button"
                  className="cw-home-job-carousel__arrow cw-home-job-carousel__arrow--prev"
                  aria-label="이전 공고"
                  tabIndex={isLoggedIn ? 0 : -1}
                  onClick={() => scrollCarousel(-1)}
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              <div
                className="cw-home-job-carousel__viewport"
                ref={viewportRef}
                onScroll={syncScrollState}
              >
                {recommendedJobs.map((job) => (
                  <Link
                    key={job.id}
                    className="cw-home-job"
                    tabIndex={isLoggedIn ? 0 : -1}
                    to={`/jobs?jobNoticeId=${job.id}`}
                  >
                    <div className="cw-home-job__title-row">
                      <h3>{job.title}</h3>
                    </div>
                    <p className="cw-home-job__company">
                      {job.company}
                      {job.dday && <em className="cw-home-job__dday">{job.dday}</em>}
                    </p>
                    <div className="cw-home-job__tags">
                      {job.tags.length > 0
                        ? job.tags.map((tag) => <span key={tag}>{tag}</span>)
                        : <span>{job.source}</span>}
                    </div>
                    <p className="cw-home-job__location">
                      <MapPin size={12} />
                      {job.location}
                    </p>
                  </Link>
                ))}
              </div>
              {!atEnd && (
                <button
                  type="button"
                  className="cw-home-job-carousel__arrow cw-home-job-carousel__arrow--next"
                  aria-label="다음 공고"
                  tabIndex={isLoggedIn ? 0 : -1}
                  onClick={() => scrollCarousel(1)}
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </div>
          )}

          {recommendedJobsStatus === 'loading' && (
            <div className="cw-home-job-state" role="status" aria-live="polite" aria-hidden={!isLoggedIn}>
              <Briefcase size={18} />
              <strong>추천 공고를 불러오는 중입니다.</strong>
              <span>실제 채용공고 데이터를 확인하고 있어요.</span>
            </div>
          )}

          {recommendedJobsStatus === 'empty' && (
            <div className="cw-home-job-state" role="status" aria-live="polite" aria-hidden={!isLoggedIn}>
              <Filter size={18} />
              <strong>표시할 추천 공고가 없습니다.</strong>
              <span>전체 공고 페이지에서 더 많은 채용 정보를 확인해보세요.</span>
            </div>
          )}

          {recommendedJobsStatus === 'error' && (
            <div className="cw-home-job-state" role="alert" aria-hidden={!isLoggedIn}>
              <Filter size={18} />
              <strong>추천 공고를 불러오지 못했습니다.</strong>
              <span>잠시 후 다시 시도해주세요.</span>
              <button type="button" tabIndex={isLoggedIn ? 0 : -1} onClick={() => refetchRecommendedJobs()}>
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
