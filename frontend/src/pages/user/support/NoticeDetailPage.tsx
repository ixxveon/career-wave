import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Bell, Eye, ChevronRight } from 'lucide-react';
import { supportApi, NOTICE_CATEGORY_LABEL, type NoticeDetail } from '../../../api/user/supportApi';
import './styles/NoticeDetailPage.css';

export default function NoticeDetailPage() {
  const navigate = useNavigate();
  const { id }   = useParams<{ id: string }>();
  const [notice,  setNotice]  = useState<NoticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const parsedId = Number(id);
    if (!id || isNaN(parsedId)) {
      setError('유효하지 않은 공지사항입니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    supportApi.getNoticeDetail(parsedId)
      .then(res => setNotice(res))
      .catch(() => setError('공지사항을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="nd-page"><div className="nd-empty">로딩 중...</div></div>;
  if (error)   return <div className="nd-page"><div className="nd-empty">{error}</div></div>;
  if (!notice) return <div className="nd-page"><div className="nd-empty">공지사항을 찾을 수 없습니다.</div></div>;

  return (
    <div className="nd-page">
      <button className="nd-back" onClick={() => navigate('/support/notices')}>
        <ChevronLeft size={14} /> 공지사항 목록
      </button>

      <article className="nd-article">
        <div className="nd-article__header">
          <span className="nd-cat-badge">{NOTICE_CATEGORY_LABEL[notice.category]}</span>
          <h1 className="nd-title">{notice.title}</h1>
          <div className="nd-meta">
            <span className="nd-meta__item"><Bell size={12} /> 운영팀</span>
            <span className="nd-meta__dot">·</span>
            <span className="nd-meta__item">{notice.createdAt}</span>
            <span className="nd-meta__dot">·</span>
            <span className="nd-meta__item"><Eye size={12} /> 조회 {notice.viewCount.toLocaleString()}</span>
          </div>
        </div>

        <div className="nd-body">
          {notice.content.split('\n').map((line, i) => {
            if (!line.trim()) return <br key={i} />;
            if (line.startsWith('**') && line.endsWith('**'))
              return <p key={i} className="nd-body__heading">{line.slice(2, -2)}</p>;
            return <p key={i}>{line}</p>;
          })}
        </div>
      </article>

      <div className="nd-nav">
        {notice.nextNotice ? (
          <button type="button" className="nd-nav__item nd-nav__item--next" onClick={() => navigate(`/support/notices/${notice.nextNotice!.noticeId}`)}>
            <span className="nd-nav__label"><ChevronLeft size={13} /> 다음 공지</span>
            <span className="nd-nav__title">{notice.nextNotice.title}</span>
          </button>
        ) : <div className="nd-nav__item nd-nav__item--empty" />}

        {notice.prevNotice ? (
          <button type="button" className="nd-nav__item nd-nav__item--prev" onClick={() => navigate(`/support/notices/${notice.prevNotice!.noticeId}`)}>
            <span className="nd-nav__label">이전 공지 <ChevronRight size={13} /></span>
            <span className="nd-nav__title">{notice.prevNotice.title}</span>
          </button>
        ) : <div className="nd-nav__item nd-nav__item--empty" />}
      </div>

      <button className="nd-list-btn" onClick={() => navigate('/support/notices')}>
        목록으로
      </button>
    </div>
  );
}
