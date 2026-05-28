import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Edit3, Flag, MessageCircle, Send, Trash2 } from 'lucide-react';
import { communityApi } from '../../api/communityApi';
import './styles/PostDetailPage.css';

export default function PostDetailPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    communityApi.getBoardDetail(postId).then(setPost);
  }, [postId]);

  const submitComment = async () => {
    if (!comment.trim()) return;
    const nextComment = await communityApi.createComment(postId, {
      content: comment.trim(),
      parentId: replyTarget,
    });
    setPost((current) => ({
      ...current,
      comments: [...(current.comments || []), { ...nextComment, author: 'me', createdAt: '방금' }],
    }));
    setComment('');
    setReplyTarget(null);
  };

  const reportPost = async () => {
    await communityApi.reportTarget({ targetType: 'BOARD', targetId: postId });
    setNotice('신고가 접수되었습니다.');
  };

  const deletePost = async () => {
    await communityApi.deleteBoard(postId);
    navigate('/community');
  };

  if (!post) {
    return <div className="pd-page"><div className="pd-empty">게시글을 불러오는 중입니다.</div></div>;
  }

  return (
    <div className="pd-page">
      <button className="pd-back" type="button" onClick={() => navigate('/community')}>
        <ChevronLeft size={14} /> 커뮤니티
      </button>

      {notice && <div className="pd-notice">{notice}</div>}

      <article className="pd-article">
        <div className="pd-article__header">
          <span className="pd-cat">{post.category}</span>
          <h1 className="pd-title">{post.title}</h1>
          <div className="pd-meta">
            <span className="pd-meta__author">by {post.author}</span>
            <span>{post.createdAt}</span>
            <span>조회 {Number(post.views || 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="pd-body">
          {(post.content || '').split('\n').map((line, index) => (
            line.trim() ? <p key={index}>{line}</p> : <br key={index} />
          ))}
        </div>

        <div className="pd-actions">
          <button className="pd-action-btn" type="button" onClick={() => navigate(`/community/posts/${postId}/edit`)}>
            <Edit3 size={14} /> 수정
          </button>
          <button className="pd-action-btn" type="button" onClick={deletePost}>
            <Trash2 size={14} /> 삭제
          </button>
          <button className="pd-action-btn pd-action-btn--report" type="button" onClick={reportPost}>
            <Flag size={13} /> 신고
          </button>
        </div>
      </article>

      <section className="pd-comments">
        <p className="pd-comments__title"><MessageCircle size={15} /> 댓글 {post.comments?.length || 0}</p>

        <div className="pd-comment-list">
          {(post.comments || []).map((item) => (
            <div className={`pd-comment${item.parentId ? ' pd-comment--reply' : ''}`} key={item.id}>
              <div className="pd-comment__avatar">{item.author?.[0] || 'U'}</div>
              <div className="pd-comment__body">
                <div className="pd-comment__top">
                  <span className="pd-comment__author">{item.author}</span>
                  <span className="pd-comment__date">{item.createdAt}</span>
                </div>
                <p className="pd-comment__text">{item.content}</p>
                <button className="pd-comment__like" type="button" onClick={() => setReplyTarget(item.id)}>
                  답글
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pd-comment-write">
          <div className="pd-comment-write__avatar">나</div>
          <div className="pd-comment-write__input-wrap">
            {replyTarget && <span className="pd-reply-target">답글 작성 중</span>}
            <textarea
              className="pd-comment-write__input"
              placeholder="댓글을 작성하세요"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <button className="pd-comment-write__btn" disabled={!comment.trim()} type="button" onClick={submitComment}>
              <Send size={14} /> 등록
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
