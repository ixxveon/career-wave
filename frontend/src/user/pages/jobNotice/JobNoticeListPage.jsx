import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bookmark, BookmarkCheck, MapPin, Clock, Zap, SlidersHorizontal } from 'lucide-react';
import './styles/JobNoticeListPage.css';

const JOB_FILTERS   = ['전체', '백엔드', '프론트엔드', '풀스택', '데이터', 'DevOps', 'iOS/Android'];
const EXP_FILTERS   = ['전체', '신입', '1~3년', '3~5년', '5년 이상'];
const STACK_FILTERS = ['전체', 'Java', 'Python', 'React', 'Node.js', 'Spring', 'AWS', 'Docker'];

const MOCK_JOBS = [
  { id: 1, company: '토스',   title: '백엔드 개발자 (Server)',        location: '서울 강남', exp: '3~5년',    deadline: '2025-06-15', stacks: ['Java','Spring','AWS'],       premium: true,  bookmarked: false },
  { id: 2, company: '카카오', title: '프론트엔드 개발자',              location: '서울 성남', exp: '신입/경력', deadline: '2025-06-20', stacks: ['React','TypeScript'],        premium: true,  bookmarked: true  },
  { id: 3, company: '네이버', title: '클라우드 인프라 엔지니어',       location: '경기 성남', exp: '3년 이상', deadline: '2025-06-30', stacks: ['AWS','Docker','K8s'],        premium: false, bookmarked: false },
  { id: 4, company: '라인',   title: '데이터 엔지니어',               location: '서울 신촌', exp: '1~3년',    deadline: '2025-07-01', stacks: ['Python','Spark','Airflow'],  premium: false, bookmarked: false },
  { id: 5, company: '쿠팡',   title: '백엔드 개발자 (물류플랫폼)',    location: '서울 송파', exp: '3~5년',    deadline: '2025-06-25', stacks: ['Java','MSA','Kafka'],        premium: false, bookmarked: true  },
  { id: 6, company: '당근',   title: 'iOS 개발자',                    location: '서울 마포', exp: '신입',     deadline: '2025-07-10', stacks: ['Swift','UIKit'],             premium: false, bookmarked: false },
];

function dday(deadline) {
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  if (diff < 0)  return '마감';
  if (diff === 0) return 'D-day';
  return `D-${diff}`;
}

function JobCard({ job: j, bookmarks, onBookmark, onClick }) {
  const d = dday(j.deadline);
  const urgent = d === 'D-day' || (d.startsWith('D-') && parseInt(d.slice(2)) <= 3);
  return (
    <div className={`jn-card${j.premium ? ' jn-card--premium' : ''}`} onClick={onClick}>
      {j.premium && <span className="jn-card__premium-badge"><Zap size={10} /> 프리미엄</span>}
      <div className="jn-card__logo">{j.company[0]}</div>
      <div className="jn-card__body">
        <p className="jn-card__company">{j.company}</p>
        <p className="jn-card__title">{j.title}</p>
        <div className="jn-card__meta">
          <span><MapPin size={11} /> {j.location}</span>
          <span>{j.exp}</span>
        </div>
        <div className="jn-card__stacks">
          {j.stacks.map(s => <span key={s} className="jn-stack">{s}</span>)}
        </div>
      </div>
      <div className="jn-card__right">
        <span className={`jn-dday${urgent ? ' jn-dday--urgent' : ''}`}>
          <Clock size={10} /> {d}
        </span>
        <button
          className={`jn-bookmark${bookmarks[j.id] ? ' jn-bookmark--active' : ''}`}
          onClick={e => onBookmark(e, j.id)}
        >
          {bookmarks[j.id] ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function JobNoticeListPage() {
  const navigate = useNavigate();
  const [search,    setSearch]    = useState('');
  const [job,       setJob]       = useState('전체');
  const [exp,       setExp]       = useState('전체');
  const [stack,     setStack]     = useState('전체');
  const [bookmarks, setBookmarks] = useState(
    Object.fromEntries(MOCK_JOBS.map(j => [j.id, j.bookmarked]))
  );

  function toggleBookmark(e, id) {
    e.stopPropagation();
    setBookmarks(b => ({ ...b, [id]: !b[id] }));
  }

  const filtered = MOCK_JOBS.filter(j => {
    if (search && !j.title.includes(search) && !j.company.includes(search)) return false;
    if (job   !== '전체' && !j.title.includes(job))   return false;
    if (exp   !== '전체' && j.exp !== exp)             return false;
    if (stack !== '전체' && !j.stacks.includes(stack)) return false;
    return true;
  });

  const premium = filtered.filter(j => j.premium);
  const normal  = filtered.filter(j => !j.premium);

  return (
    <div className="jn">
      {/* 검색 */}
      <div className="jn-search-bar">
        <Search size={16} className="jn-search-bar__icon" />
        <input
          className="jn-search-bar__input"
          placeholder="직무, 기업, 키워드로 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* 필터 */}
      <div className="jn-filters">
        {[
          { label: '직무', options: JOB_FILTERS,   val: job,   set: setJob   },
          { label: '경력', options: EXP_FILTERS,   val: exp,   set: setExp   },
          { label: '기술', options: STACK_FILTERS,  val: stack, set: setStack },
        ].map(({ label, options, val, set }) => (
          <div key={label} className="jn-filter-group">
            <span className="jn-filter-group__label">{label}</span>
            <div className="jn-chips">
              {options.map(f => (
                <button key={f} className={`jn-chip${val === f ? ' jn-chip--on' : ''}`} onClick={() => set(f)}>{f}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 프리미엄 */}
      {premium.length > 0 && (
        <section>
          <p className="jn-section-label"><Zap size={12} /> 프리미엄 공고</p>
          <div className="jn-list">
            {premium.map(j => (
              <JobCard key={j.id} job={j} bookmarks={bookmarks} onBookmark={toggleBookmark} onClick={() => navigate(`/jobs/${j.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* 일반 */}
      <section>
        <p className="jn-section-label">전체 공고 <span>{normal.length}건</span></p>
        {normal.length > 0
          ? <div className="jn-list">{normal.map(j => (
              <JobCard key={j.id} job={j} bookmarks={bookmarks} onBookmark={toggleBookmark} onClick={() => navigate(`/jobs/${j.id}`)} />
            ))}</div>
          : <div className="jn-empty">검색 결과가 없습니다.</div>}
      </section>
    </div>
  );
}
