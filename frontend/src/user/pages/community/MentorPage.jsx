import { useState } from 'react';
import { Search, Star, Clock, MessageSquareHeart, ChevronRight, Briefcase, MapPin } from 'lucide-react';
import './styles/MentorPage.css';

const FIELDS = ['전체', '백엔드', '프론트엔드', '데이터', 'DevOps', 'PM/기획', 'AI/ML'];

const MOCK_MENTORS = [
  {
    id: 1, name: '김서준', field: '백엔드', company: '카카오', exp: '7년', rating: 4.9, reviews: 34,
    responseTime: '평균 2시간', stacks: ['Java', 'Spring', 'Kafka', 'AWS'],
    bio: '대기업 백엔드 개발 7년 경력. MSA 설계 및 성능 최적화 전문. 이직/신입 멘토링 경험 다수.',
    tags: ['이직', '이력서 리뷰', '기술 면접'],
  },
  {
    id: 2, name: '이하은', field: '프론트엔드', company: '토스', exp: '5년', rating: 4.8, reviews: 28,
    responseTime: '평균 4시간', stacks: ['React', 'TypeScript', 'Next.js'],
    bio: '핀테크 프론트엔드 5년. 성능 최적화 및 UI 컴포넌트 설계 전문. 포트폴리오 리뷰 강점.',
    tags: ['포트폴리오', '프론트 면접', '커리어 상담'],
  },
  {
    id: 3, name: '박준혁', field: 'DevOps', company: '네이버', exp: '9년', rating: 4.7, reviews: 19,
    responseTime: '평균 6시간', stacks: ['Kubernetes', 'Terraform', 'AWS', 'Docker'],
    bio: 'DevOps/인프라 엔지니어 9년. 클라우드 마이그레이션 및 CI/CD 구축 전문.',
    tags: ['인프라', '클라우드', '취업 상담'],
  },
  {
    id: 4, name: '최수아', field: 'AI/ML', company: '삼성 리서치', exp: '4년', rating: 4.9, reviews: 11,
    responseTime: '평균 12시간', stacks: ['Python', 'PyTorch', 'HuggingFace'],
    bio: 'AI 연구원 4년. NLP 및 멀티모달 모델 연구. 대학원 진학 및 연구직 멘토링 전문.',
    tags: ['연구직', 'AI 면접', '논문 리뷰'],
  },
  {
    id: 5, name: '정민호', field: '데이터', company: '쿠팡', exp: '6년', rating: 4.6, reviews: 23,
    responseTime: '평균 8시간', stacks: ['Python', 'Spark', 'SQL', 'Airflow'],
    bio: '이커머스 데이터 엔지니어 6년. 대용량 파이프라인 설계 및 BI 대시보드 구축 경험.',
    tags: ['데이터 분석', 'SQL 코테', '이직'],
  },
  {
    id: 6, name: '윤지현', field: 'PM/기획', company: '라인', exp: '5년', rating: 4.8, reviews: 16,
    responseTime: '평균 3시간', stacks: ['Figma', 'SQL', 'Jira'],
    bio: '글로벌 IT PM 5년. 프로덕트 전략 및 스펙 작성, IT 기획 직군 취업 멘토링.',
    tags: ['PM 면접', '기획서 리뷰', '커리어 전환'],
  },
];

export default function MentorPage() {
  const [search, setSearch]   = useState('');
  const [field,  setField]    = useState('전체');

  const filtered = MOCK_MENTORS.filter(m => {
    if (field !== '전체' && m.field !== field) return false;
    if (search && !m.name.includes(search) && !m.company.includes(search) && !m.field.includes(search)) return false;
    return true;
  });

  return (
    <div className="mt-page">
      <div className="mt-header">
        <span className="mt-eyebrow">MENTOR</span>
        <h1 className="mt-header__title">멘토 찾기</h1>
        <p className="mt-header__desc">현직 개발자·기획자와 1:1 멘토링으로 취업 및 이직을 빠르게 준비합니다.</p>
      </div>

      {/* 통계 배너 */}
      <div className="mt-banner">
        <div className="mt-stat"><span className="mt-stat__value">120명+</span><span className="mt-stat__label">활동 멘토</span></div>
        <div className="mt-stat__divider" />
        <div className="mt-stat"><span className="mt-stat__value">4.8</span><span className="mt-stat__label">평균 평점</span></div>
        <div className="mt-stat__divider" />
        <div className="mt-stat"><span className="mt-stat__value">24h</span><span className="mt-stat__label">평균 응답</span></div>
      </div>

      {/* 툴바 */}
      <div className="mt-toolbar">
        <div className="mt-fields">
          {FIELDS.map(f => (
            <button key={f} className={`mt-field${field === f ? ' mt-field--on' : ''}`} onClick={() => setField(f)}>{f}</button>
          ))}
        </div>
        <div className="mt-search">
          <Search size={14} />
          <input placeholder="이름, 회사, 직무 검색" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* 멘토 카드 그리드 */}
      <div className="mt-grid">
        {filtered.map(m => (
          <div key={m.id} className="mt-card">
            <div className="mt-card__header">
              <div className="mt-card__avatar">{m.name[0]}</div>
              <div className="mt-card__info">
                <p className="mt-card__name">{m.name}</p>
                <p className="mt-card__company"><Briefcase size={11} /> {m.company} · {m.exp} 경력</p>
              </div>
              <div className="mt-card__rating"><Star size={13} fill="currentColor" /> {m.rating}</div>
            </div>

            <p className="mt-card__bio">{m.bio}</p>

            <div className="mt-card__stacks">
              {m.stacks.map(s => <span key={s} className="mt-stack">{s}</span>)}
            </div>

            <div className="mt-card__tags">
              {m.tags.map(t => <span key={t} className="mt-tag">#{t}</span>)}
            </div>

            <div className="mt-card__footer">
              <span className="mt-card__response"><Clock size={11} /> {m.responseTime}</span>
              <span className="mt-card__reviews">{m.reviews}개 후기</span>
            </div>

            <button className="mt-card__btn">
              <MessageSquareHeart size={14} /> 상담 신청 <ChevronRight size={13} />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="mt-empty">조건에 맞는 멘토가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
