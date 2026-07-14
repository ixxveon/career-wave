import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight, Search, Pin } from 'lucide-react';
import { supportApi, NOTICE_CATEGORY_LABEL, type NoticeCategory, type NoticeItem } from '../../../api/user/supportApi';
import { useDebounce } from '../../../hooks/user/common/useDebounce';
import '@/styles/user/support/NoticePage.css';

const CATEGORY_FILTERS: { label: string; value: NoticeCategory | '' }[] = [
  { label: '전체',    value: '' },
  { label: '공지',    value: 'NOTICE' },
  { label: '업데이트', value: 'UPDATE' },
  { label: '이벤트',  value: 'EVENT' },
  { label: '점검',    value: 'MAINTENANCE' },
];

const PAGE_SIZE = 10;

export default function NoticePage() {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState<NoticeCategory | ''>('');
  const [notices,  setNotices]  = useState<NoticeItem[]>([]);
  const [page,     setPage]     = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setLoading(true);
    setError('');
    supportApi.getNotices({ category: category || undefined, keyword: debouncedSearch || undefined, page, size: PAGE_SIZE })
      .then(res => {
        setNotices(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(() => setError('공지사항을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [category, debouncedSearch, page]);

  function handleCategoryChange(val: NoticeCategory | '') {
    setCategory(val);
    setPage(1);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  const pinned  = notices.filter(n => n.isPinned);
  const regular = notices.filter(n => !n.isPinned);
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
          {CATEGORY_FILTERS.map(({ label, value }) => (
            <button
              key={label}
              className={`nt-cat${category === value ? ' nt-cat--on' : ''}`}
              onClick={() => handleCategoryChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="nt-search">
          <Search size={14} />
          <input
            placeholder="공지사항 검색"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className="nt-empty">로딩 중...</div>}
      {error   && <div className="nt-empty">{error}</div>}
      {!loading && !error && (
        <>
          <div className="nt-list">
            {displayed.length === 0 ? (
              <div className="nt-empty">검색 결과가 없습니다.</div>
            ) : (
              displayed.map(n => (
                <Link
                  key={n.noticeId}
                  className={`nt-item${n.isPinned ? ' nt-item--pinned' : ''}`}
                  to={`/support/notices/${n.noticeId}`}
                >
                  <div className="nt-item__left">
                    {n.isPinned && <span className="nt-pin"><Pin size={11} /> 고정</span>}
                    <span className="nt-cat-badge">{NOTICE_CATEGORY_LABEL[n.category]}</span>
                    <Bell size={14} className="nt-item__icon" />
                    <span className="nt-item__title">{n.title}</span>
                  </div>
                  <div className="nt-item__right">
                    <span className="nt-item__views">조회 {n.viewCount.toLocaleString()}</span>
                    <span className="nt-item__date">{new Date(n.createdAt).toLocaleDateString('ko-KR')}</span>
                    <ChevronRight size={14} className="nt-item__arrow" />
                  </div>
                </Link>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="nt-pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`nt-page-btn${page === p ? ' nt-page-btn--on' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
