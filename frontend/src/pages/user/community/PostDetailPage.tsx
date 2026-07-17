import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDashboardProfile } from "@/hooks/user/dashboard";
import {
  ChevronLeft,
  ThumbsUp,
  MessageCircle,
  Flag,
  Send,
  Trash2,
} from "lucide-react";
import "@/styles/user/community/PostDetailPage.css";
import {
  useCommunityBoard,
  useCommunityComments,
  useCreateCommunityComment,
  useCreateCommunityReport,
  useDeleteCommunityBoard,
  useDeleteCommunityComment,
} from "@/hooks/user/community";
import type { CommunityBoard, CommunityComment } from "@/types/user/community";

const REPORT_TYPE = {
  BOARD: "BOARD",
  COMMENT: "COMMENT",
} as const;

const REPORT_LABELS = {
  [REPORT_TYPE.BOARD]: "게시글",
  [REPORT_TYPE.COMMENT]: "댓글",
};

const REPORT_REASON_LABELS = {
  SPAM: "스팸/도배",
  ABUSE: "욕설/비방",
  AD: "광고/홍보성 콘텐츠",
  INAPPROPRIATE: "부적절한 내용",
  OTHER: "기타",
};

type ReportType = (typeof REPORT_TYPE)[keyof typeof REPORT_TYPE];
type ReportReason = keyof typeof REPORT_REASON_LABELS;

type ReportTarget = {
  type: ReportType;
  id: number;
};

type Reply = {
  id: number;
  memberId: string;
  author: string;
  createdAt: string;
  content: string;
  likes: number;
  reportCount: number;
};

type Comment = {
  id: number;
  memberId: string;
  author: string;
  createdAt: string;
  content: string;
  likes: number;
  reportCount: number;
  replies: Reply[];
};

type CommunityPost = {
  id: number;
  memberId: string;
  category: string;
  title: string;
  author: string;
  createdAt: string;
  views: number;
  likes: number;
  reportCount: number;
  content: string;
};
const DEFAULT_AUTHOR_NAME = "커뮤니티 회원";

function toPost(board: CommunityBoard): CommunityPost {
  return {
    id: board.boardId,
    memberId: board.memberId,
    category: board.category,
    title: board.title,
    author: DEFAULT_AUTHOR_NAME,
    createdAt: board.createdAt?.slice(0, 10) ?? "",
    views: board.viewCount,
    likes: 0,
    reportCount: board.reportCount,
    content: board.content,
  };
}

function toComments(apiComments: CommunityComment[]): Comment[] {
  return apiComments
    .filter((item) => item.parentId === null)
    .map((item) => ({
      id: item.commentId,
      memberId: item.memberId,
      author: DEFAULT_AUTHOR_NAME,
      createdAt: item.createdAt?.slice(0, 10) ?? "",
      content: item.content,
      likes: 0,
      reportCount: item.reportCount,
      replies: apiComments
        .filter((reply) => reply.parentId === item.commentId)
        .map((reply) => ({
          id: reply.commentId,
          memberId: reply.memberId,
          author: DEFAULT_AUTHOR_NAME,
          createdAt: reply.createdAt?.slice(0, 10) ?? "",
          content: reply.content,
          likes: 0,
          reportCount: reply.reportCount,
        })),
    }));
}

type CommentItemProps = {
  comment: Comment;
  onReply: (commentId: number, content: string) => void;
  onReport: (type: ReportType, id: number) => void;
  onDelete: (commentId: number) => void;
  currentMemberId: string | null;
};

function CommentItem({
  comment,
  onReply,
  onReport,
  onDelete,
  currentMemberId,
}: CommentItemProps) {
  const [replyText, setReplyText] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const isCommentOwner = comment.memberId === currentMemberId;

  function submitReply() {
    if (!replyText.trim()) return;

    onReply(comment.id, replyText.trim());
    setReplyText("");
    setReplyOpen(false);
  }

  return (
    <div className="pd-comment">
      <div className="pd-comment__avatar">{comment.author[0]}</div>

      <div className="pd-comment__body">
        <div className="pd-comment__top">
          <span className="pd-comment__author">{comment.author}</span>
          <span className="pd-comment__date">{comment.createdAt}</span>
          {comment.reportCount > 0 && (
            <span className="pd-comment__reported">
              신고 {comment.reportCount}
            </span>
          )}
        </div>

        <p className="pd-comment__text">{comment.content}</p>

        <div className="pd-comment__actions">
          <button className="pd-comment__like" type="button">
            <ThumbsUp size={11} /> {comment.likes}
          </button>

          <button
            className="pd-comment__link"
            type="button"
            onClick={() => setReplyOpen((open) => !open)}
          >
            답글
          </button>

          <button
            className="pd-comment__link is-report"
            type="button"
            onClick={() => onReport(REPORT_TYPE.COMMENT, comment.id)}
          >
            신고
          </button>
          {isCommentOwner && (
            <button
              className="pd-comment__link"
              type="button"
              onClick={() => onDelete(comment.id)}
            >
              삭제
            </button>
          )}
        </div>

        {!!comment.replies.length && (
          <div className="pd-replies">
            {comment.replies.map((reply) => {
              const isReplyOwner = reply.memberId === currentMemberId;

              return (
                <div key={reply.id} className="pd-reply">
                  <div className="pd-comment__avatar">{reply.author[0]}</div>

                  <div className="pd-comment__body">
                    <div className="pd-comment__top">
                      <span className="pd-comment__author">{reply.author}</span>
                      <span className="pd-comment__date">
                        {reply.createdAt}
                      </span>
                      {reply.reportCount > 0 && (
                        <span className="pd-comment__reported">
                          신고 {reply.reportCount}
                        </span>
                      )}
                    </div>

                    <p className="pd-comment__text">{reply.content}</p>

                    <div className="pd-comment__actions">
                      <button className="pd-comment__like" type="button">
                        <ThumbsUp size={11} /> {reply.likes}
                      </button>

                      <button
                        className="pd-comment__link is-report"
                        type="button"
                        onClick={() => onReport(REPORT_TYPE.COMMENT, reply.id)}
                      >
                        신고
                      </button>

                      {isReplyOwner && (
                        <button
                          className="pd-comment__link"
                          type="button"
                          onClick={() => onDelete(reply.id)}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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

            <button
              className="pd-comment-write__btn"
              type="button"
              disabled={!replyText.trim()}
              onClick={submitReply}
            >
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
  const { postId } = useParams();
  const { data: profile } = useDashboardProfile();
  const currentMemberId = profile?.memberId ?? null;
  const boardId = postId ? Number(postId) : NaN;
  const validBoardId = Number.isFinite(boardId) ? boardId : null;

  const {
    data: board,
    isLoading: isBoardLoading,
    isError: isBoardError,
  } = useCommunityBoard(validBoardId);

  const { data: apiComments } = useCommunityComments(validBoardId);

  const { mutate: createComment, isPending: isCreatingComment } =
    useCreateCommunityComment(validBoardId ?? 0);

  const { mutate: createReport, isPending: isCreatingReport } =
    useCreateCommunityReport(validBoardId ?? 0);

  const { mutate: deleteBoard, isPending: isDeletingBoard } =
    useDeleteCommunityBoard();

  const { mutate: deleteComment } = useDeleteCommunityComment(
    validBoardId ?? 0,
  );

  const post = useMemo(() => {
    if (!board) return null;

    return toPost(board);
  }, [board]);

  const isPostOwner = post?.memberId === currentMemberId;

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post?.likes ?? 0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("AD");

  useEffect(() => {
    setLiked(false);
    setLikeCount(post?.likes ?? 0);
    setReportTarget(null);
    setReportReason("AD");
  }, [post?.id, post?.likes]);

  useEffect(() => {
    setComments(toComments(apiComments ?? []));
  }, [apiComments]);

  function handleLike() {
    setLiked((current) => {
      setLikeCount((count) => (current ? count - 1 : count + 1));
      return !current;
    });
  }

  function submitComment() {
    const trimmedComment = comment.trim();

    if (!trimmedComment || validBoardId === null) return;

    createComment(
      {
        parentId: null,
        content: trimmedComment,
      },
      {
        onSuccess: () => {
          setComment("");
        },
      },
    );
  }

  function submitReply(commentId: number, content: string) {
    const trimmedContent = content.trim();

    if (!trimmedContent || validBoardId === null) return;

    createComment({
      parentId: commentId,
      content: trimmedContent,
    });
  }

  function handleDeleteBoard() {
    if (validBoardId === null) return;

    if (!window.confirm("게시글을 삭제하시겠습니까?")) return;

    deleteBoard(validBoardId, {
      onSuccess: () => {
        navigate("/community");
      },
    });
  }

  function handleDeleteComment(commentId: number) {
    if (validBoardId === null) return;

    if (!window.confirm("댓글을 삭제하시겠습니까?")) return;

    deleteComment(commentId);
  }

  function submitReport() {
    if (!reportTarget || isCreatingReport) return;

    const targetLabel = REPORT_LABELS[reportTarget.type];
    const reasonLabel = REPORT_REASON_LABELS[reportReason];

    createReport(
      {
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason: reportReason,
      },
      {
        onSuccess: () => {
          window.alert(
            `${targetLabel} 신고가 접수되었습니다. 사유: ${reasonLabel}`,
          );
          setReportTarget(null);
          setReportReason("AD");
        },
        onError: (error) => {
          if (error.serverCode === "DUPLICATE_REPORT") {
            window.alert("이미 신고한 대상입니다.");
            return;
          }

          if (error.serverCode === "INVALID_REPORT_TARGET") {
            window.alert("본인이 작성한 콘텐츠는 신고할 수 없습니다.");
            return;
          }

          window.alert(
            error.message ||
              "신고 접수에 실패했습니다. 잠시 후 다시 시도해주세요.",
          );
        },
      },
    );
  }
  if (isBoardLoading) {
    return (
      <div className="pd-page">
        <div className="pd-empty">게시글을 불러오는 중입니다.</div>
      </div>
    );
  }
  if (isBoardError) {
    return (
      <div className="pd-page">
        <div className="pd-empty">게시글을 불러오지 못했습니다.</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pd-page">
        <button
          className="pd-back"
          type="button"
          onClick={() => navigate("/community")}
        >
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
      <button
        className="pd-back"
        type="button"
        onClick={() => navigate("/community")}
      >
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
            <span>조회 {post.views.toLocaleString()}</span>
            <span className="pd-meta__dot">·</span>
            <span>신고 {post.reportCount}</span>
          </div>
        </div>

        {isPostOwner && (
          <div className="pd-owner-actions">
            <button
              type="button"
              onClick={handleDeleteBoard}
              disabled={isDeletingBoard}
            >
              <Trash2 size={14} /> 삭제
            </button>
          </div>
        )}

        <div className="pd-body">
          {post.content.split("\n").map((line, index) => {
            if (!line.trim()) return <br key={index} />;

            if (line.startsWith("**") && line.endsWith("**")) {
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
            className={`pd-action-btn${liked ? " pd-action-btn--liked" : ""}`}
            type="button"
            onClick={handleLike}
          >
            <ThumbsUp size={15} fill={liked ? "currentColor" : "none"} />{" "}
            {likeCount}
          </button>

          <button
            className="pd-action-btn pd-action-btn--report"
            type="button"
            onClick={() =>
              setReportTarget({ type: REPORT_TYPE.BOARD, id: post.id })
            }
          >
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
            <CommentItem
              key={item.id}
              comment={item}
              onReply={submitReply}
              onReport={(type, id) => setReportTarget({ type, id })}
              onDelete={handleDeleteComment}
              currentMemberId={currentMemberId}
            />
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

            <button
              className="pd-comment-write__btn"
              type="button"
              disabled={!comment.trim() || isCreatingComment}
              onClick={submitComment}
            >
              <Send size={14} /> 등록
            </button>
          </div>
        </div>
      </div>

      {reportTarget && (
        <div className="pd-report-modal" role="dialog" aria-modal="true">
          <div className="pd-report-modal__panel">
            <h2>{REPORT_LABELS[reportTarget.type] || "대상"} 신고</h2>
            <p>
              불량 콘텐츠 신고는 별도 신고 엔티티로 접수되고 운영 모니터링
              대상이 됩니다.
            </p>

            <label>
              신고 사유
              <select
                value={reportReason}
                onChange={(event) =>
                  setReportReason(event.target.value as ReportReason)
                }
              >
                {Object.entries(REPORT_REASON_LABELS).map(
                  ([reasonKey, label]) => (
                    <option key={reasonKey} value={reasonKey}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <div className="pd-report-modal__actions">
              <button type="button" onClick={() => setReportTarget(null)}>
                취소
              </button>

              <button
                type="button"
                onClick={submitReport}
                disabled={isCreatingReport}
              >
                {isCreatingReport ? "접수 중..." : "신고 접수"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
