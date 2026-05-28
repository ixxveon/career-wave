import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, Search, Pin } from 'lucide-react';
import './styles/NoticePage.css';

interface Notice {
  id: number;
  title: string;
  createdAt: string;
  pinned: boolean;
  category: string;
  views: number;
}

const MOCK_NOTICES: Notice[] = [
  { id: 1, title: '[필독] Career-wave 서비스 이용약관 개정 안내', createdAt: '2025-05-25', pinned: true,  category: '공지', views: 4820 },
  { id: 2, title: 'AI 면접 서비스 개선 안내 (v2.3 업데이트)',    createdAt: '2025-05-22', pinned: true,  category: '업데이트', views: 2310 },
  { id: 3, title: '5월 정기 점검 일정 안내 (5/28 02:00~04:00)', createdAt: '2025-05-20', pinned: false, category: '점검', views: 1540 },
  { id: 4, title: 'AI 이력서 분석 신규 항목 추가 안내',          createdAt: '2025-05-18', pinned: false, category: '업데이트', views: 980 },
  { id: 5, title: '채용 공고 스크래핑 범위 확대 안내',            createdAt: '2025-05-15', pinned: false, category: '공지', views: 760 },
  { id: 6, title: '개인정보처리방침 변경 안내 (2025-05-01)',      createdAt: '2025-05-01', pinned: false, category: '공지', views: 3200 },
];

const CATEGORIES = ['전체', '공지', '업데이트', '점검'];

export default function NoticePage() {
  const navigate = useNavigate();
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('전체');

  const filtered = MOCK_NOTICES.filter(n => {
    if (category !== '전체' && n.category !== category) return false;
    if (search && !n.title.includes(search)) return false;
    return true;
  });

  const pinned    = filtered.filter(n => n.pinned);
  const regular   = filtered.filter(n => !n.pinned);
  const displayed = [...pinned, ...regular];

  return (
    <div className="nt-page">
      <div className="nt-header">
        <span className="nt-eyebrow">NOTICE</span>
        <h1 className="nt-header__title">공지사항</h1>
        <p className="nt-header__desc">Career-wave의 새로운 소식과 서비스 업데이트를 확인하세요.</p>
      </div>

      <div className="nt-toolbar">
        <div className="nt-cats">
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`nt-cat${category === c ? ' nt-cat--on' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="nt-search">
          <Search size={14} />
          <input
            placeholder="공지사항 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="nt-list">
        {displayed.length === 0 ? (
          <div className="nt-empty">검색 결과가 없습니다.</div>
        ) : (
          displayed.map(n => (
            <div
              key={n.id}
              className={`nt-item${n.pinned ? ' nt-item--pinned' : ''}`}
              onClick={() => navigate(`/support/notices/${n.id}`)}
            >
              <div className="nt-item__left">
                {n.pinned && (
                  <span className="nt-pin"><Pin size={11} /> 고정</span>
                )}
                <span className="nt-cat-badge">{n.category}</span>
                <Bell size={14} className="nt-item__icon" />
                <span className="nt-item__title">{n.title}</span>
              </div>
              <div className="nt-item__right">
                <span className="nt-item__views">조회 {n.views.toLocaleString()}</span>
                <span className="nt-item__date">{n.createdAt}</span>
                <ChevronRight size={14} className="nt-item__arrow" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
