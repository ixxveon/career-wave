import { Link } from 'react-router-dom';
import { authSession } from '@/utils/user/member/authSession';
import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronRight,
  FileSearch,
  MapPin,
  Mic,
  ShieldCheck,
  Sparkles,
  Users,
  ClipboardList,
  FilePenLine,
  UsersRound,
  Github,
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

const jobs = [
  {
    logo: 'N',
    logoClass: 'naver',
    title: '백엔드 개발자 (신입/경력)',
    company: '네이버',
    location: '경기 성남시 분당구',
    career: '신입/경력',
    date: '상시 채용',
    tags: ['Backend', 'Java', 'Spring', 'MySQL'],
  },
  {
    logo: 'kakao',
    logoClass: 'kakao',
    title: 'AI 서비스 개발자',
    company: '카카오',
    location: '경기 성남시 판교',
    career: '경력 3년 이상',
    date: '~ 2026.05.20',
    tags: ['AI/ML', 'Python', 'PyTorch', 'Docker'],
  },
  {
    logo: 'S',
    logoClass: 'wave',
    title: 'Server Engineer',
    company: '토스',
    location: '서울 강남구',
    career: '경력 2년 이상',
    date: '상시 채용',
    tags: ['Server', 'Go', 'Kubernetes', 'AWS'],
  },
];

const stats = [
  { icon: Sparkles, title: 'AI 기반 정밀 매칭', text: '정확도 높은 추천' },
  { icon: ShieldCheck, title: '데이터 보안', text: '안전한 개인정보 보호' },
  { icon: Users, title: '누적 사용자 20만+', text: '신뢰받는 커리어 플랫폼' },
  { icon: Building2, title: '기업 5,000+', text: '다양한 기업과 함께' },
];

function JobSeekerDashboardPage() {
  const isLoggedIn = !!(authSession.getAccessToken() || authSession.getRefreshToken());

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

          <div className="cw-home-job-grid" aria-hidden={!isLoggedIn}>
            {jobs.map((job) => (
              <article className="cw-home-job" key={job.title}>
                <div className="cw-home-job__head">
                  <span className={`cw-home-job__logo is-${job.logoClass}`}>{job.logo}</span>
                  <button type="button" aria-label={`${job.title} 저장`} tabIndex={isLoggedIn ? 0 : -1}>
                    <Bookmark size={20} />
                  </button>
                </div>
                <h3>{job.title}</h3>
                <p>{job.company}</p>
                <div className="cw-home-job__tags">
                  {job.tags.map((tag) => (
                    <em key={tag}>{tag}</em>
                  ))}
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
                <Link className="cw-home-job__detail" tabIndex={isLoggedIn ? 0 : -1} to="/jobs">
                  상세보기
                  <ChevronRight size={15} />
                </Link>
              </article>
            ))}
          </div>
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
