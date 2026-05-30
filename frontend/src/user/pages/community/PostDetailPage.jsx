import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ThumbsUp, Bookmark, MessageCircle, Flag, Send, Pencil, Trash2 } from 'lucide-react';
import './styles/PostDetailPage.css';

const MOCK_POST = {
  id: 1,
  category: '면접 후기',
  title: '카카오 백엔드 1차 면접 후기',
  author: '개발자지망생',
  createdAt: '2026-05-20',
  views: 1240,
  likes: 87,
  reportCount: 1,
  content: `안녕하세요. 카카오 백엔드 1차 면접 후기를 공유합니다.

**면접 구성**
- 시간: 약 50분
- 방식: 화상 면접
- 면접관: 개발자 2명

**질문 리스트**
1. 자기소개
2. 자료구조와 해시테이블 동작 원리
3. OS 프로세스와 스레드 차이
4. TCP 3-way handshake
5. Spring Bean 생명주기와 @Transactional 동작
6. DB 인덱스 구조와 N+1 문제 해결

**후기**
CS 기본기를 충실히 준비하면 충분히 대응 가능한 수준이었습니다. 프로젝트 경험은 기술 선택 이유와 장애 대응 과정을 구체적으로 물어봤습니다.`,
};

const INITIAL_COMMENTS = [
  {
    id: 1,
    author: 'spring_master',
    createdAt: '2026-05-20',
    content: '정말 유익한 후기 감사합니다. N+1 문제 해결법도 구체적으로 물어보나요?',
    likes: 12,
    reportCount: 0,
    replies: [
      {
        id: 11,
        author: '개발자지망생',
        createdAt: '2026-05-20',
        content: '네. Fetch Join 적용 기준과 BatchSize 설정 경험을 함께 물어봤습니다.',
        likes: 4,
        reportCount: 0,
      },
    ],
  },
  {
    id: 2,
    author: '취준러',
    createdAt: '2026-05-21',
    content: '인성 질문도 있었나요? 기술 면접 비중이 궁금합니다.',
    likes: 5,
    reportCount: 0,
    replies: [],
  },
];

function CommentItem({ comment, onReply, onReport }) {
  const [replyText, setReplyText] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);

  function submitReply() {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText('');
    setReplyOpen(false);
  }

  return (
    <div className="pd-comment">
      <div className="pd-comment__avatar">{comment.author[0]}</div>
      <div className="pd-comment__body">
        <div className="pd-comment__top">
          <span className="pd-comment__author">{comment.author}</span>
          <span className="pd-comment__date">{comment.createdAt}</span>
          {comment.reportCount > 0 && <span className="pd-comment__reported">신고 {comment.reportCount}</span>}
        </div>
        <p className="pd-comment__text">{comment.content}</p>
        <div className="pd-comment__actions">
          <button className="pd-comment__like" type="button"><ThumbsUp size={11} /> {comment.likes}</button>
          <button className="pd-comment__link" type="button" onClick={() => setReplyOpen((open) => !open)}>답글</button>
          <button className="pd-comment__link is-report" type="button" onClick={() => onReport('댓글', comment.id)}>신고</button>
        </div>

        {!!comment.replies?.length && (
          <div className="pd-replies">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="pd-reply">
                <div className="pd-comment__avatar">{reply.author[0]}</div>
                <div className="pd-comment__body">
                  <div className="pd-comment__top">
                    <span className="pd-comment__author">{reply.author}</span>
                    <span className="pd-comment__date">{reply.createdAt}</span>
                  </div>
                  <p className="pd-comment__text">{reply.content}</p>
                  <div className="pd-comment__actions">
                    <button className="pd-comment__like" type="button"><ThumbsUp size={11} /> {reply.likes}</button>
                    <button className="pd-comment__link is-report" type="button" onClick={() => onReport('대댓글', reply.id)}>신고</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {replyOpen && (
          <div className="pd-reply-write">
            <textarea
              className="pd-comment-write__input"
              placeholder="답글을 작성하세요."
              rows={2}
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
            />
            <button className="pd-comment-write__btn" type="button" disabled={!replyText.trim()} onClick={submitReply}>
              <Send size={14} /> 답글 등록
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(MOCK_POST.likes);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('광고/홍보성 콘텐츠');
  const [postReportCount, setPostReportCount] = useState(MOCK_POST.reportCount);

  function handleLike() {
    setLiked((current) => !current);
    setLikeCount((count) => (liked ? count - 1 : count + 1));
  }

  function submitComment() {
    if (!comment.trim()) return;
    setComments((current) => [
      ...current,
      {
        id: Date.now(),
        author: '나',
        createdAt: '방금 전',
        content: comment.trim(),
        likes: 0,
        reportCount: 0,
        replies: [],
      },
    ]);
    setComment('');
  }

  function submitReply(commentId, content) {
    setComments((current) => current.map((item) => (
      item.id === commentId
        ? {
            ...item,
            replies: [
              ...(item.replies || []),
              { id: Date.now(), author: '나', createdAt: '방금 전', content, likes: 0, reportCount: 0 },
            ],
          }
        : item
    )));
  }

  function submitReport() {
    if (!reportTarget) return;
    if (reportTarget.type === '게시글') {
      setPostReportCount((count) => count + 1);
    } else {
      setComments((current) => current.map((item) => {
        if (item.id === reportTarget.id) return { ...item, reportCount: item.reportCount + 1 };
        return {
          ...item,
          replies: item.replies?.map((reply) => (
            reply.id === reportTarget.id ? { ...reply, reportCount: reply.reportCount + 1 } : reply
          )),
        };
      }));
    }

    window.alert(`${reportTarget.type} 신고가 접수되었습니다. 사유: ${reportReason}`);
    setReportTarget(null);
  }

  return (
    <div className="pd-page">
      <button className="pd-back" type="button" onClick={() => navigate('/community')}><ChevronLeft size={14} /> 커뮤니티로</button>

      <article className="pd-article">
        <div className="pd-article__header">
          <span className="pd-cat">{MOCK_POST.category}</span>
          <h1 className="pd-title">{MOCK_POST.title}</h1>
          <div className="pd-meta">
            <span className="pd-meta__author">by {MOCK_POST.author}</span>
            <span className="pd-meta__dot">·</span>
            <span>{MOCK_POST.createdAt}</span>
            <span className="pd-meta__dot">·</span>
            <span>조회 {MOCK_POST.views.toLocaleString()}</span>
            <span className="pd-meta__dot">·</span>
            <span>신고 {postReportCount}</span>
          </div>
        </div>

        <div className="pd-owner-actions">
          <button type="button"><Pencil size={14} /> 수정</button>
          <button type="button" onClick={() => window.alert('삭제 기능은 백엔드 연동 단계에서 연결됩니다.')}><Trash2 size={14} /> 삭제</button>
        </div>

        <div className="pd-body">
          {MOCK_POST.content.split('\n').map((line, index) => {
            if (!line.trim()) return <br key={index} />;
            if (line.startsWith('**') && line.endsWith('**')) {
              return <p key={index} className="pd-body__heading">{line.slice(2, -2)}</p>;
            }
            return <p key={index}>{line}</p>;
          })}
        </div>

        <div className="pd-actions">
          <button className={`pd-action-btn${liked ? ' pd-action-btn--liked' : ''}`} type="button" onClick={handleLike}>
            <ThumbsUp size={15} fill={liked ? 'currentColor' : 'none'} /> {likeCount}
          </button>
          <button className={`pd-action-btn${bookmarked ? ' pd-action-btn--saved' : ''}`} type="button" onClick={() => setBookmarked((current) => !current)}>
            <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} /> 저장
          </button>
          <button className="pd-action-btn pd-action-btn--report" type="button" onClick={() => setReportTarget({ type: '게시글', id: MOCK_POST.id })}>
            <Flag size={13} /> 신고
          </button>
        </div>
      </article>

      <div className="pd-comments">
        <p className="pd-comments__title"><MessageCircle size={15} /> 댓글 {comments.length}</p>

        <div className="pd-comment-list">
          {comments.map((item) => (
            <CommentItem key={item.id} comment={item} onReply={submitReply} onReport={(type, id) => setReportTarget({ type, id })} />
          ))}
        </div>

        <div className="pd-comment-write">
          <div className="pd-comment-write__avatar">나</div>
          <div className="pd-comment-write__input-wrap">
            <textarea
              className="pd-comment-write__input"
              placeholder="댓글을 작성하세요."
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <button className="pd-comment-write__btn" type="button" disabled={!comment.trim()} onClick={submitComment}>
              <Send size={14} /> 등록
            </button>
          </div>
        </div>
      </div>

      {reportTarget && (
        <div className="pd-report-modal" role="dialog" aria-modal="true">
          <div className="pd-report-modal__panel">
            <h2>{reportTarget.type} 신고</h2>
            <p>불량 콘텐츠 신고는 별도 신고 엔티티로 접수되고 운영 모니터링 대상이 됩니다.</p>
            <label>
              신고 사유
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                <option>광고/홍보성 콘텐츠</option>
                <option>욕설/비방</option>
                <option>저작권 침해</option>
                <option>개인정보 노출</option>
              </select>
            </label>
            <div className="pd-report-modal__actions">
              <button type="button" onClick={() => setReportTarget(null)}>취소</button>
              <button type="button" onClick={submitReport}>신고 접수</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
