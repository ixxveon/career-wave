import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { memberApiClient } from "@/api/user/member/memberApiClient";
import { useAuth } from "@/hooks/user/useAuth";
import {
  Search,
  ThumbsUp,
  MessageCircle,
  Flame,
  Star,
  Clock,
  Database,
} from "lucide-react";
import "@/styles/user/community/CommunityPage.css";

const CATEGORIES = [
  "전체",
  "질문",
  "면접 후기",
  "이력서 팁",
  "합격 후기",
  "자유",
];
const PAGE_SIZE = 10;

type CommunityPost = {
  id: number;
  category: string;
  title: string;
  preview: string;
  author: string;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  hot: boolean;
  reportCount: number;
};

type BoardResponse = {
  boardId: number;
  memberId: string;
  category: string;
  title: string;
  contentPreview: string;
  viewCount: number;
  isBlind: boolean;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
};

type PaginationResponse<T> = {
  content?: T[];
  items?: T[];
  data?: T[];
  list?: T[];
  totalElements?: number;
  totalCount?: number;
  page?: number;
  size?: number;
  totalPages?: number;
};

function toPosts(response: BoardResponse[]): CommunityPost[] {
  return response.map((board) => ({
    id: board.boardId,
    category: board.category,
    title: board.title,
    preview: board.contentPreview,
    author: "익명",
    createdAt: board.createdAt?.slice(0, 10) ?? "",
    views: board.viewCount,
    likes: 0,
    comments: board.commentCount,
    hot: board.viewCount >= 100,
    reportCount: 0,
  }));
}

function getBoardList(payload?: PaginationResponse<BoardResponse>) {
  return (
    payload?.content ?? payload?.items ?? payload?.data ?? payload?.list ?? []
  );
}

function getVisiblePages(
  current: number,
  total: number,
  windowSize = 5,
): (number | "ellipsis")[] {
  if (total <= windowSize + 2) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const half = Math.floor(windowSize / 2);

  let start = Math.max(0, current - half);
  let end = Math.min(total - 1, start + windowSize - 1);

  start = Math.max(0, end - windowSize + 1);

  const pages: (number | "ellipsis")[] = [];

  if (start > 0) {
    pages.push(0);

    if (start > 1) {
      pages.push("ellipsis");
    }
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total - 1) {
    if (end < total - 2) {
      pages.push("ellipsis");
    }

    pages.push(total - 1);
  }

  return pages;
}

function PostCard({
  post,
  onClick,
}: {
  post: CommunityPost;
  onClick: () => void;
}) {

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  }

  return (
    <div
      className="cm-post"
      onClick={onClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="cm-post__top">
        <span className="cm-post__cat">{post.category}</span>

        {post.hot && (
          <span className="cm-post__hot">
            <Flame size={11} /> HOT
          </span>
        )}

        {post.reportCount > 0 && (
          <span className="cm-post__report">신고 {post.reportCount}</span>
        )}

      </div>

      <p className="cm-post__title">{post.title}</p>
      <p className="cm-post__preview">{post.preview}</p>

      <div className="cm-post__footer">
        <span className="cm-post__author">by {post.author}</span>
        <div className="cm-post__meta">
          <span>
            <Clock size={11} /> {post.createdAt}
          </span>
          <span>
            <ThumbsUp size={11} /> {post.likes}
          </span>
          <span>
            <MessageCircle size={11} /> {post.comments}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const { isLoggedIn, isChecking } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [page, setPage] = useState(0);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isChecking || !isLoggedIn) {
      setPosts([]);
      setTotalPages(1);
      setLoading(false);
      setError(null);
      return;
    }
    let ignore = false;

    async function fetchBoards() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page + 1),
          size: String(PAGE_SIZE),
        });

        if (category !== "전체") {
          params.append("category", category);
        }

        const payload = await memberApiClient<
          PaginationResponse<BoardResponse>
        >(`/api/v1/user/community/boards?${params.toString()}`, {
          method: "GET",
          auth: true,
        });

        const boards = getBoardList(payload);

        const total =
          payload?.totalElements ?? payload?.totalCount ?? boards.length;

        if (!ignore) {
          setPosts(toPosts(boards));
          setTotalPages(
            Math.max(1, payload?.totalPages ?? Math.ceil(total / PAGE_SIZE)),
          );
        }
      } catch {
        if (!ignore) {
          setError("게시글을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchBoards();

    return () => {
      ignore = true;
    };
  }, [category, page, isChecking, isLoggedIn]);

  const filteredPosts = useMemo(() => {
    if (!search) return posts;

    return posts.filter(
      (post) => post.title.includes(search) || post.preview.includes(search),
    );
  }, [posts, search]);

  const popularPosts = useMemo(() => posts.slice(0, 3), [posts]);

  return (
    <div className="cm-page">
      <div className="cm-header">
        <span className="cm-eyebrow">COMMUNITY</span>
        <h1 className="cm-header__title">커뮤니티</h1>
        <p className="cm-header__desc">
          취업 고민, 면접 후기, 이력서 팁, 합격 후기를 카테고리별로 나누어
          공유합니다.
        </p>
      </div>

      <div className="cm-ops-panel">
        <div>
          <Database size={18} />
          <strong>
            궁금한 점을 질문하고, 면접 후기와 이력서 팁을 함께 나눠보세요.
          </strong>
        </div>
      </div>

      <div className="cm-toolbar">
        <div className="cm-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="게시글 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {isLoggedIn && (
          <button
            className="cm-write"
            type="button"
            onClick={() => navigate("/community/posts/create")}
          >
            글쓰기
          </button>
        )}
      </div>
      <div className="cm-categories">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            className={category === item ? "is-active" : ""}
            type="button"
            onClick={() => {
              setCategory(item);
              setSearch("");
              setPage(0);
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="cm-highlight">
        {popularPosts.map((post) => (
          <article key={post.id}>
            <Star size={14} />
            <strong>{post.title}</strong>
            <span>조회수 {post.views}</span>
          </article>
        ))}
      </section>

      <div className="cm-list">
        {isChecking && (
          <div className="cm-empty">로그인 상태를 확인하는 중입니다.</div>
        )}

        {!isChecking && !isLoggedIn && (
          <div className="cm-empty">
            커뮤니티 게시글은 로그인 후 열람할 수 있습니다.
            <button
              type="button"
              onClick={() =>
                navigate(`/auth/login?next=${encodeURIComponent("/community")}`)
              }
            >
              로그인하러 가기
            </button>
          </div>
        )}

        {isLoggedIn && loading && (
          <div className="cm-empty">게시글을 불러오는 중입니다.</div>
        )}

        {isLoggedIn && !loading && error && (
          <div className="cm-empty">{error}</div>
        )}

        {isLoggedIn && !loading && !error && filteredPosts.length === 0 && (
          <div className="cm-empty">검색 결과가 없습니다.</div>
        )}

        {isLoggedIn &&
          !loading &&
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => navigate(`/community/posts/${post.id}`)}
            />
          ))}
      </div>

      <div className="cm-pagination">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
        >
          이전
        </button>

        {getVisiblePages(page, totalPages).map((item, index) => {
          if (item === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="cm-pagination__ellipsis"
              >
                ...
              </span>
            );
          }

          return (
            <button
              key={item}
              type="button"
              className={page === item ? "is-active" : ""}
              onClick={() => setPage(item)}
            >
              {item + 1}
            </button>
          );
        })}

        <button
          type="button"
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((current) => current + 1)}
        >
          다음
        </button>
      </div>
    </div>
  );
}
