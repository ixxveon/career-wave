import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Bookmark, Send, ChevronLeft, Building2, Users, Wallet } from 'lucide-react';
import './styles/JobNoticeDetailPage.css';

const MOCK_JOB = {
  id:        1,
  company:   '토스',
  title:     '백엔드 개발자 (Server)',
  location:  '서울 강남구',
  exp:       '3~5년',
  deadline:  '2025-06-15',
  headcount: '0명 (추후 협의)',
  salary:    '연봉 협의',
  stacks:    ['Java', 'Spring Boot', 'AWS', 'PostgreSQL', 'Redis', 'Kafka'],
  duties: [
    '토스 핵심 서비스의 백엔드 API 설계 및 개발',
    '대규모 트래픽 처리를 위한 시스템 아키텍처 설계',
    '성능 최적화 및 안정성 개선',
    '코드 리뷰 및 팀 기술 문화 발전에 기여',
  ],
  required: [
    'Java 또는 Kotlin 기반 백엔드 개발 경력 3년 이상',
    'Spring Framework에 대한 깊은 이해',
    'RDBMS 및 NoSQL 설계/운영 경험',
    'REST API 설계 및 마이크로서비스 아키텍처 이해',
  ],
  preferred: [
    'AWS 클라우드 서비스 실무 경험',
    'Kafka 등 메시지 큐 활용 경험',
    '대용량 트래픽 처리 경험 (TPS 100 이상)',
    'TDD 및 클린 코드에 대한 이해',
  ],
  benefits: ['유연근무제', '재택근무', '식비 지원', '교육비 지원', '건강검진', '스톡옵션'],
};

export default function JobNoticeDetailPage() {
  const navigate = useNavigate();

  function dday(deadline) {
    const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
    if (diff < 0) return '마감';
    if (diff === 0) return 'D-day';
    return `D-${diff}`;
  }

  const d = dday(MOCK_JOB.deadline);

  return (
    <div className="jd">
      {/* 뒤로가기 */}
      <button className="jd-back" onClick={() => navigate('/jobs')}>
        <ChevronLeft size={16} /> 공고 목록으로
      </button>

      <div className="jd-layout">
        {/* 메인 콘텐츠 */}
        <div className="jd-main">
          {/* 헤더 */}
          <div className="jd-header">
            <div className="jd-header__logo">{MOCK_JOB.company[0]}</div>
            <div className="jd-header__info">
              <p className="jd-header__company">{MOCK_JOB.company}</p>
              <h1 className="jd-header__title">{MOCK_JOB.title}</h1>
              <div className="jd-header__meta">
                <span><MapPin size={12} /> {MOCK_JOB.location}</span>
                <span><Users size={12} /> {MOCK_JOB.exp}</span>
                <span><Wallet size={12} /> {MOCK_JOB.salary}</span>
                <span><Clock size={12} /> 마감 {MOCK_JOB.deadline} ({d})</span>
              </div>
            </div>
          </div>

          {/* 기술 스택 */}
          <div className="jd-card">
            <h2 className="jd-card__title">기술 스택</h2>
            <div className="jd-stacks">
              {MOCK_JOB.stacks.map(s => <span key={s} className="jd-stack">{s}</span>)}
            </div>
          </div>

          {/* 담당 업무 */}
          <div className="jd-card">
            <h2 className="jd-card__title">담당 업무</h2>
            <ul className="jd-list">
              {MOCK_JOB.duties.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>

          {/* 자격 요건 */}
          <div className="jd-card">
            <h2 className="jd-card__title">자격 요건</h2>
            <ul className="jd-list">
              {MOCK_JOB.required.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>

          {/* 우대 사항 */}
          <div className="jd-card">
            <h2 className="jd-card__title">우대 사항</h2>
            <ul className="jd-list jd-list--preferred">
              {MOCK_JOB.preferred.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>

          {/* 복지 */}
          <div className="jd-card">
            <h2 className="jd-card__title">복지 혜택</h2>
            <div className="jd-benefits">
              {MOCK_JOB.benefits.map(b => <span key={b} className="jd-benefit">{b}</span>)}
            </div>
          </div>
        </div>

        {/* 사이드 패널 */}
        <aside className="jd-aside">
          <div className="jd-aside__card">
            <div className="jd-aside__logo">{MOCK_JOB.company[0]}</div>
            <p className="jd-aside__company">{MOCK_JOB.company}</p>
            <p className="jd-aside__title">{MOCK_JOB.title}</p>
            <div className="jd-aside__dday">{d}</div>
            <button className="jd-apply-btn" onClick={() => navigate('/applications/apply')}>
              <Send size={15} /> 지원하기
            </button>
            <button className="jd-bookmark-btn">
              <Bookmark size={15} /> 북마크
            </button>
            <button className="jd-company-btn" onClick={() => navigate('/company/profile')}>
              <Building2 size={14} /> 기업 정보 보기
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
