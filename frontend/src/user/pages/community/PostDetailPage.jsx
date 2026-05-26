import { useState } from 'react';
import { ChevronLeft, ThumbsUp, Bookmark, MessageCircle, Flag, Send } from 'lucide-react';
import './styles/PostDetailPage.css';

const MOCK_POST = {
  id: 1, category: '면접 후기',
  title: '카카오 백엔드 1차 면접 후기 (기술 면접 위주)',
  author: '개발자지망생', createdAt: '2025-05-20', views: 1240, likes: 87,
  content: `안녕하세요, 이번에 카카오 2025 공채 백엔드 1차 면접을 다녀온 후기를 남깁니다.

**면접 구성**
- 시간: 약 50분
- 면접관: 2명 (개발자로 보임)
- 방식: 화상 면접 (Zoom)

**질문 리스트**
1. 자기소개 (2분)
2. 자료구조 - 해시테이블 내부 동작 원리 설명
3. OS - 프로세스와 스레드 차이, 컨텍스트 스위칭
4. 네트워크 - TCP 3-way handshake, HTTP와 HTTPS 차이
5. Spring - Bean 라이프사이클, @Transactional 동작 원리
6. DB - 인덱스 구조 (B+ Tree), N+1 문제 해결법
7. 프로젝트 경험 - 기술 선택 이유, 트러블슈팅 경험
8. 역질문 시간

**후기**
전반적으로 CS 기초에 충실하면 충분히 대응 가능한 수준이었습니다. 심화 질문은 프로젝트 경험과 연계해서 물어봤고, 모르면 모른다고 솔직하게 말했을 때 힌트를 주셨습니다. 면접 분위기는 생각보다 부드러웠어요.

다음 면접을 준비하시는 분들 모두 화이팅입니다!`,
};

const MOCK_COMMENTS = [
  { id: 1, author: 'spring_master', createdAt: '2025-05-20', content: '정말 유익한 후기 감사합니다! N+1 문제 해결법도 구체적으로 물어봤나요?', likes: 12 },
  { id: 2, author: '취준생A', createdAt: '2025-05-21', content: '@spring_master 저도 궁금해요. 혹시 Lazy Loading vs Fetch Join 중 어떤 답변을 하셨나요?', likes: 5 },
  { id: 3, author: '개발자지망생', createdAt: '2025-05-21', content: 'Fetch Join을 기본으로 설명하고, @EntityGraph도 언급했습니다. 면접관분이 BatchSize도 아시더라고요!', likes: 18 },
];

export default function PostDetailPage() {
  const [liked,      setLiked]      = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount,  setLikeCount]  = useState(MOCK_POST.likes);
  const [comment,    setComment]    = useState('');
  const [comments,   setComments]   = useState(MOCK_COMMENTS);

  function handleLike() {
    setLiked(l => !l);
    setLikeCount(c => liked ? c - 1 : c + 1);
  }

  function submitComment() {
    if (!comment.trim()) return;
    setComments(cs => [...cs, {
      id: Date.now(), author: '나', createdAt: '방금 전',
      content: comment.trim(), likes: 0,
    }]);
    setComment('');
  }

  return (
    <div className="pd-page">
      <button className="pd-back"><ChevronLeft size={14} /> 커뮤니티로</button>

      <article className="pd-article">
        {/* 헤더 */}
        <div className="pd-article__header">
          <span className="pd-cat">{MOCK_POST.category}</span>
          <h1 className="pd-title">{MOCK_POST.title}</h1>
          <div className="pd-meta">
            <span className="pd-meta__author">by {MOCK_POST.author}</span>
            <span className="pd-meta__dot">·</span>
            <span>{MOCK_POST.createdAt}</span>
            <span className="pd-meta__dot">·</span>
            <span>조회 {MOCK_POST.views.toLocaleString()}</span>
          </div>
        </div>

        {/* 본문 */}
        <div className="pd-body">
          {MOCK_POST.content.split('\n').map((line, i) => {
            if (!line.trim()) return <br key={i} />;
            if (line.startsWith('**') && line.endsWith('**'))
              return <p key={i} className="pd-body__heading">{line.slice(2, -2)}</p>;
            return <p key={i}>{line}</p>;
          })}
        </div>

        {/* 액션 */}
        <div className="pd-actions">
          <button className={`pd-action-btn${liked ? ' pd-action-btn--liked' : ''}`} onClick={handleLike}>
            <ThumbsUp size={15} fill={liked ? 'currentColor' : 'none'} /> {likeCount}
          </button>
          <button className={`pd-action-btn${bookmarked ? ' pd-action-btn--saved' : ''}`} onClick={() => setBookmarked(b => !b)}>
            <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} /> 저장
          </button>
          <button className="pd-action-btn pd-action-btn--report"><Flag size={13} /> 신고</button>
        </div>
      </article>

      {/* 댓글 */}
      <div className="pd-comments">
        <p className="pd-comments__title"><MessageCircle size={15} /> 댓글 {comments.length}</p>

        <div className="pd-comment-list">
          {comments.map(c => (
            <div key={c.id} className="pd-comment">
              <div className="pd-comment__avatar">{c.author[0]}</div>
              <div className="pd-comment__body">
                <div className="pd-comment__top">
                  <span className="pd-comment__author">{c.author}</span>
                  <span className="pd-comment__date">{c.createdAt}</span>
                </div>
                <p className="pd-comment__text">{c.content}</p>
                <button className="pd-comment__like"><ThumbsUp size={11} /> {c.likes}</button>
              </div>
            </div>
          ))}
        </div>

        <div className="pd-comment-write">
          <div className="pd-comment-write__avatar">나</div>
          <div className="pd-comment-write__input-wrap">
            <textarea
              className="pd-comment-write__input"
              placeholder="댓글을 작성하세요..."
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
            <button className="pd-comment-write__btn" disabled={!comment.trim()} onClick={submitComment}>
              <Send size={14} /> 등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
