import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ThumbsUp, Bookmark, MessageCircle, Flag, Send } from 'lucide-react';
import { getCommunityPost } from './communityStorage';
import './styles/PostDetailPage.css';

const MOCK_COMMENTS = [
  {
    id: 1,
    author: 'spring_master',
    createdAt: '2025-05-20',
    content: '정말 유익한 후기 감사합니다! N+1 문제 해결법도 구체적으로 물어봤나요?',
    likes: 12,
  },
  {
    id: 2,
    author: '취준생A',
    createdAt: '2025-05-21',
    content: '@spring_master 저도 궁금해요. 혹시 Lazy Loading vs Fetch Join 중 어떤 답변을 하셨나요?',
    likes: 5,
  },
  {
    id: 3,
    author: '개발자지망생',
    createdAt: '2025-05-21',
    content: 'Fetch Join을 기본으로 설명하고, @EntityGraph도 언급했습니다. 면접관분이 BatchSize도 아시더라고요!',
    likes: 18,
  },
];

export default function PostDetailPage() {
  const navigate = useNavigate();
  const { postId, id } = useParams();
  const post = getCommunityPost(postId || id);

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(post?.likes ?? 0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(MOCK_COMMENTS);

  function handleLike() {
    setLiked((currentLiked) => !currentLiked);
    setLikeCount((currentCount) => (liked ? currentCount - 1 : currentCount + 1));
  }

  function submitComment() {
    if (!comment.trim()) return;

    setComments((currentComments) => [
      ...currentComments,
      {
        id: Date.now(),
        author: '나',
        createdAt: '방금 전',
        content: comment.trim(),
        likes: 0,
      },
    ]);

    setComment('');
  }

  if (!post) {
    return (
        <div className="pd-page">
          <button className="pd-back" type="button" onClick={() => navigate('/community')}>
            <ChevronLeft size={14} /> 커뮤니티로
          </button>

          <div className="empty-state empty-state--error">
            존재하지 않는 게시글입니다.
          </div>
        </div>
    );
  }

  return (
      <div className="pd-page">
        <button className="pd-back" type="button" onClick={() => navigate('/community')}>
          <ChevronLeft size={14} /> 커뮤니티로
        </button>

        <article className="pd-article">
          <div className="pd-article__header">
            <span className="pd-cat">{post.category}</span>
            <h1 className="pd-title">{post.title}</h1>

            <div className="pd-meta">
              <span className="pd-meta__author">by {post.author}</span>
              <span className="pd-meta__dot">·</span>
              <span>{post.createdAt}</span>
              <span className="pd-meta__dot">·</span>
              <span>조회 {(post.views ?? 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="pd-body">
            {(post.content || '').split('\n').map((line, index) => {
              if (!line.trim()) return <br key={index} />;

              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                    <p key={index} className="pd-body__heading">
                      {line.slice(2, -2)}
                    </p>
                );
              }

              return <p key={index}>{line}</p>;
            })}
          </div>

          <div className="pd-actions">
            <button
                className={`pd-action-btn${liked ? ' pd-action-btn--liked' : ''}`}
                type="button"
                onClick={handleLike}
            >
              <ThumbsUp size={15} fill={liked ? 'currentColor' : 'none'} /> {likeCount}
            </button>

            <button
                className={`pd-action-btn${bookmarked ? ' pd-action-btn--saved' : ''}`}
                type="button"
                onClick={() => setBookmarked((currentBookmarked) => !currentBookmarked)}
            >
              <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} /> 저장
            </button>

            <button className="pd-action-btn pd-action-btn--report" type="button">
              <Flag size={13} /> 신고
            </button>
          </div>
        </article>

        <div className="pd-comments">
          <p className="pd-comments__title">
            <MessageCircle size={15} /> 댓글 {comments.length}
          </p>

          <div className="pd-comment-list">
            {comments.map((item) => (
                <div key={item.id} className="pd-comment">
                  <div className="pd-comment__avatar">{item.author[0]}</div>

                  <div className="pd-comment__body">
                    <div className="pd-comment__top">
                      <span className="pd-comment__author">{item.author}</span>
                      <span className="pd-comment__date">{item.createdAt}</span>
                    </div>

                    <p className="pd-comment__text">{item.content}</p>

                    <button className="pd-comment__like" type="button">
                      <ThumbsUp size={11} /> {item.likes}
                    </button>
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
                onChange={(event) => setComment(event.target.value)}
            />

              <button
                  className="pd-comment-write__btn"
                  type="button"
                  disabled={!comment.trim()}
                  onClick={submitComment}
              >
                <Send size={14} /> 등록
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}
