import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ThumbsUp,
  Bookmark,
  MessageCircle,
  Flag,
  Send,
  Pencil,
  Trash2,
} from "lucide-react";
import "@/styles/user/community/PostDetailPage.css";
import {
  useCommunityBoard,
  useCommunityComments,
} from "@/hooks/user/community";
import type { CommunityBoard, CommunityComment } from "@/types/user/community";

const REPORT_TYPE = {
  BOARD: "BOARD",
  COMMENT: "COMMENT",
  MEMBER: "MEMBER",
} as const;

const REPORT_LABELS = {
  [REPORT_TYPE.BOARD]: "게시글",
  [REPORT_TYPE.COMMENT]: "댓글",
  [REPORT_TYPE.MEMBER]: "회원",
};

const REPORT_REASON_LABELS = {
  SPAM: "스팸/도배",
  ABUSE: "욕설/비방",
  AD: "광고/홍보성 콘텐츠",
  INAPPROPRIATE: "부적절한 내용",
  PRIVACY: "개인정보 노출",
  COPYRIGHT: "저작권 침해",
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
  author: string;
  createdAt: string;
  content: string;
  likes: number;
  reportCount: number;
};

type Comment = {
  id: number;
  author: string;
  createdAt: string;
  content: string;
  likes: number;
  reportCount: number;
  replies: Reply[];
};

type CommunityPost = {
  id: number;
  category: string;
  title: string;
  author: string;
  createdAt: string;
  views: number;
  likes: number;
  reportCount: number;
  content: string;
};
function toPost(board: CommunityBoard): CommunityPost {
  return {
    id: board.boardId,
    category: board.category,
    title: board.title,
    author: "익명",
    createdAt: board.createdAt?.slice(0, 10) ?? "",
    views: board.viewCount,
    likes: 0,
    reportCount: 0,
    content: board.content,
  };
}

function toComments(apiComments: CommunityComment[]): Comment[] {
  return apiComments
    .filter((item) => item.parentId === null)
    .map((item) => ({
      id: item.commentId,
      author: item.memberId,
      createdAt: item.createdAt?.slice(0, 10) ?? "",
      content: item.content,
      likes: 0,
      reportCount: 0,
      replies: apiComments
        .filter((reply) => reply.parentId === item.commentId)
        .map((reply) => ({
          id: reply.commentId,
          author: reply.memberId,
          createdAt: reply.createdAt?.slice(0, 10) ?? "",
          content: reply.content,
          likes: 0,
          reportCount: 0,
        })),
    }));
}

type CommentItemProps = {
  comment: Comment;
  onReply: (commentId: number, content: string) => void;
  onReport: (type: ReportType, id: number) => void;
};

const MOCK_POSTS: CommunityPost[] = [
  {
    id: 1,
    category: "면접 후기",
    title: "카카오 백엔드 1차 면접 후기",
    author: "개발자지망생",
    createdAt: "2026-05-20",
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
  },
  {
    id: 2,
    category: "합격 후기",
    title: "토스 프론트엔드 최종 합격 후기와 준비 방법",
    author: "toss_fe_21",
    createdAt: "2026-05-19",
    views: 3560,
    likes: 215,
    reportCount: 1,
    content: `3개월 준비 끝에 토스 프론트엔드 최종 합격 후기를 공유합니다.

**준비 과정**
- JavaScript 기본기 정리
- React 상태 관리 패턴 학습
- 과제 전형 대비 프로젝트 리팩토링
- 컬처핏 예상 질문 정리

**후기**
과제 전형에서는 상태 관리 선택 근거와 성능 측정 방식을 설명한 것이 가장 도움이 됐습니다.`,
  },
  {
    id: 3,
    category: "질문",
    title: "Spring Boot에서 @Transactional 내부 호출 문제 해결법",
    author: "java_dev_kim",
    createdAt: "2026-05-18",
    views: 840,
    likes: 42,
    reportCount: 0,
    content: `Spring Boot에서 @Transactional 내부 호출 문제를 어떻게 해결하는지 궁금합니다.

같은 클래스 내부 메서드 호출에서는 프록시가 적용되지 않는다고 들었는데, 실무에서는 서비스 분리나 자기 주입 방식 중 어떤 방식을 주로 사용하시나요?`,
  },
  {
    id: 4,
    category: "이력서 팁",
    title: "신입 백엔드 이력서 통과율 높이는 5가지 방법",
    author: "취준컨설턴트",
    createdAt: "2026-05-17",
    views: 2100,
    likes: 130,
    reportCount: 0,
    content: `신입 백엔드 이력서에서 중요한 것은 기술 나열보다 문제 해결 과정입니다.

**추천 구성**
1. 프로젝트 목적
2. 맡은 역할
3. 사용 기술
4. 기술 선택 이유
5. 문제 상황과 해결 방법
6. 결과와 개선점

프로젝트 설명보다 성과 수치, 트러블슈팅 근거, 기술 선택 이유를 먼저 보이게 구성해보세요.`,
  },
  {
    id: 5,
    category: "질문",
    title: "네이버 공채 코딩테스트 난이도 어느 정도인가요?",
    author: "algo_beginner",
    createdAt: "2026-05-16",
    views: 580,
    likes: 21,
    reportCount: 0,
    content: `네이버 공채 코딩테스트를 처음 준비하고 있습니다.

그래프, DP, 구현 문제 비중이 어느 정도인지 궁금합니다. 최근 응시하신 분들이 있다면 준비 방향 조언 부탁드립니다.`,
  },
  {
    id: 6,
    category: "자유",
    title: "취준 6개월 차, 멘탈 관리하는 법 공유합니다",
    author: "버티는중",
    createdAt: "2026-05-15",
    views: 1890,
    likes: 178,
    reportCount: 2,
    content: `취준 6개월 차에 멘탈 관리했던 방법을 공유합니다.

서류 탈락이 반복될 때마다 감정적으로 무너지기 쉬웠는데, 저는 지원 기록을 남기고 하루 루틴을 작게 쪼개면서 버텼습니다.

결과보다 오늘 한 행동을 체크하는 방식이 생각보다 도움이 됐습니다.`,
  },
  {
    id: 7,
    category: "면접 후기",
    title: "대기업 인성 면접에서 STAR 답변 구조가 중요했던 이유",
    author: "star_practice",
    createdAt: "2026-05-14",
    views: 960,
    likes: 64,
    reportCount: 0,
    content: `대기업 인성 면접에서 STAR 답변 구조를 사용했던 후기를 공유합니다.

**STAR 구조**
- Situation: 상황
- Task: 과제
- Action: 행동
- Result: 결과

갈등 상황 질문에서 상황, 행동, 결과를 짧게 정리하니 꼬리 질문 대응이 훨씬 쉬웠습니다.`,
  },
];

const INITIAL_COMMENTS: Comment[] = [
  {
    id: 1,
    author: "spring_master",
    createdAt: "2026-05-20",
    content:
      "정말 유익한 후기 감사합니다. N+1 문제 해결법도 구체적으로 물어보나요?",
    likes: 12,
    reportCount: 0,
    replies: [
      {
        id: 11,
        author: "개발자지망생",
        createdAt: "2026-05-20",
        content:
          "네. Fetch Join 적용 기준과 BatchSize 설정 경험을 함께 물어봤습니다.",
        likes: 4,
        reportCount: 0,
      },
    ],
  },
  {
    id: 2,
    author: "취준러",
    createdAt: "2026-05-21",
    content: "인성 질문도 있었나요? 기술 면접 비중이 궁금합니다.",
    likes: 5,
    reportCount: 0,
    replies: [],
  },
];

function CommentItem({ comment, onReply, onReport }: CommentItemProps) {
  const [replyText, setReplyText] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);

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
        </div>

        {!!comment.replies.length && (
          <div className="pd-replies">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="pd-reply">
                <div className="pd-comment__avatar">{reply.author[0]}</div>

                <div className="pd-comment__body">
                  <div className="pd-comment__top">
                    <span className="pd-comment__author">{reply.author}</span>
                    <span className="pd-comment__date">{reply.createdAt}</span>
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

  const boardId = postId ? Number(postId) : NaN;
  const validBoardId = Number.isFinite(boardId) ? boardId : null;

  const {
    data: board,
    isLoading: isBoardLoading,
    isError: isBoardError,
  } = useCommunityBoard(validBoardId);

  const { data: apiComments = [] } = useCommunityComments(validBoardId);

  const post = useMemo(() => {
    if (!board) return null;

    return toPost(board);
  }, [board]);

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(post?.likes ?? 0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("AD");
  const [postReportCount, setPostReportCount] = useState(
    post?.reportCount ?? 0,
  );

  useEffect(() => {
    setLiked(false);
    setBookmarked(false);
    setLikeCount(post?.likes ?? 0);
    setPostReportCount(post?.reportCount ?? 0);
    setReportTarget(null);
    setReportReason("AD");
  }, [post?.id, post?.likes, post?.reportCount]);

  useEffect(() => {
    setComments(toComments(apiComments));
  }, [apiComments]);

  function handleLike() {
    setLiked((current) => {
      setLikeCount((count) => (current ? count - 1 : count + 1));
      return !current;
    });
  }

  function submitComment() {
    if (!comment.trim()) return;

    setComments((current) => [
      ...current,
      {
        id: Date.now(),
        author: "나",
        createdAt: "방금 전",
        content: comment.trim(),
        likes: 0,
        reportCount: 0,
        replies: [],
      },
    ]);

    setComment("");
  }

  function submitReply(commentId: number, content: string) {
    setComments((current) =>
      current.map((item) =>
        item.id === commentId
          ? {
              ...item,
              replies: [
                ...item.replies,
                {
                  id: Date.now(),
                  author: "나",
                  createdAt: "방금 전",
                  content,
                  likes: 0,
                  reportCount: 0,
                },
              ],
            }
          : item,
      ),
    );
  }

  function submitReport() {
    if (!reportTarget) return;

    if (reportTarget.type === REPORT_TYPE.BOARD) {
      setPostReportCount((count) => count + 1);
    }

    if (reportTarget.type === REPORT_TYPE.COMMENT) {
      setComments((current) =>
        current.map((item) => {
          if (item.id === reportTarget.id) {
            return {
              ...item,
              reportCount: item.reportCount + 1,
            };
          }

          if (!item.replies.some((reply) => reply.id === reportTarget.id)) {
            return item;
          }

          return {
            ...item,
            replies: item.replies.map((reply) =>
              reply.id === reportTarget.id
                ? {
                    ...reply,
                    reportCount: reply.reportCount + 1,
                  }
                : reply,
            ),
          };
        }),
      );
    }

    const targetLabel = REPORT_LABELS[reportTarget.type] || "대상";
    const reasonLabel = REPORT_REASON_LABELS[reportReason] || "기타";

    window.alert(`${targetLabel} 신고가 접수되었습니다. 사유: ${reasonLabel}`);
    setReportTarget(null);
    setReportReason("AD");
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
            <span>신고 {postReportCount}</span>
          </div>
        </div>

        <div className="pd-owner-actions">
          <button type="button">
            <Pencil size={14} /> 수정
          </button>

          <button
            type="button"
            onClick={() =>
              window.alert("삭제 기능은 백엔드 연동 단계에서 연결됩니다.")
            }
          >
            <Trash2 size={14} /> 삭제
          </button>
        </div>

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
            className={`pd-action-btn${bookmarked ? " pd-action-btn--saved" : ""}`}
            type="button"
            onClick={() => setBookmarked((current) => !current)}
          >
            <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} />{" "}
            저장
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
              disabled={!comment.trim()}
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

              <button type="button" onClick={submitReport}>
                신고 접수
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
