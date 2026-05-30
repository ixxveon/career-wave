import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ThumbsUp, MessageCircle, Bookmark, ChevronRight, Flame, Star, Clock, Database } from 'lucide-react';
import './styles/CommunityPage.css';

const CATEGORIES = ['전체', '질문', '면접 후기', '이력서 팁', '합격 후기', '자유'];
const PAGE_SIZE = 4;

const MOCK_POSTS = [
  {
    id: 1,
    category: '면접 후기',
    title: '카카오 백엔드 1차 면접 후기',
    preview: '자료구조, OS, 네트워크, Spring 트랜잭션 질문이 이어졌고 프로젝트 장애 대응 경험을 깊게 물어봤습니다.',
    author: '개발자지망생',
    createdAt: '2026-05-20',
    views: 1240,
    likes: 87,
    comments: 23,
    bookmarked: false,
    hot: true,
    reportCount: 0,
  },
  {
    id: 2,
    category: '합격 후기',
    title: '토스 프론트엔드 최종 합격 후기와 준비 방법',
    preview: '과제 전형에서 상태 관리 선택 근거와 성능 측정 방식을 정리한 것이 가장 큰 도움이 됐습니다.',
    author: 'toss_fe_21',
    createdAt: '2026-05-19',
    views: 3560,
    likes: 215,
    comments: 61,
    bookmarked: true,
    hot: true,
    reportCount: 1,
  },
  {
    id: 3,
    category: '질문',
    title: 'Spring Boot에서 @Transactional 내부 호출 문제 해결법',
    preview: '같은 클래스 내부 메서드 호출에서는 프록시가 적용되지 않는다고 들었는데 실무에서는 어떻게 분리하시나요?',
    author: 'java_dev_kim',
    createdAt: '2026-05-18',
    views: 840,
    likes: 42,
    comments: 17,
    bookmarked: false,
    hot: false,
    reportCount: 0,
  },
  {
    id: 4,
    category: '이력서 팁',
    title: '신입 백엔드 이력서 통과율 높이는 5가지 방법',
    preview: '프로젝트 설명보다 성과 수치, 트러블슈팅 근거, 기술 선택 이유를 먼저 보이게 구성해보세요.',
    author: '취준컨설턴트',
    createdAt: '2026-05-17',
    views: 2100,
    likes: 130,
    comments: 38,
    bookmarked: false,
    hot: false,
    reportCount: 0,
  },
  {
    id: 5,
    category: '질문',
    title: '네이버 공채 코딩테스트 난이도 어느 정도인가요?',
    preview: '이번 공채를 처음 지원하는데 그래프와 DP 비중이 어느 정도인지 궁금합니다.',
    author: 'algo_beginner',
    createdAt: '2026-05-16',
    views: 580,
    likes: 21,
    comments: 14,
    bookmarked: false,
    hot: false,
    reportCount: 0,
  },
  {
    id: 6,
    category: '자유',
    title: '취준 6개월 차, 멘탈 관리하는 법 공유합니다',
    preview: '서류 탈락이 반복될 때 기록을 남기고 루틴을 작게 쪼개면서 버텼던 방법을 정리했습니다.',
    author: '버티는중',
    createdAt: '2026-05-15',
    views: 1890,
    likes: 178,
    comments: 54,
    bookmarked: false,
    hot: false,
    reportCount: 2,
  },
  {
    id: 7,
    category: '면접 후기',
    title: '대기업 인성 면접에서 STAR 답변 구조가 중요했던 이유',
    preview: '갈등 상황 질문에서 상황, 행동, 결과를 짧게 정리하니 꼬리 질문 대응이 훨씬 쉬웠습니다.',
    author: 'star_practice',
    createdAt: '2026-05-14',
    views: 960,
    likes: 64,
    comments: 19,
    bookmarked: false,
    hot: false,
    reportCount: 0,
  },
];

const POPULAR = MOCK_POSTS.slice(0, 3).sort((a, b) => b.likes - a.likes);

function PostCard({ post, onClick }) {
  const [bookmarked, setBookmarked] = useState(post.bookmarked);

  return (
    <div className="cm-post" onClick={onClick} role="button" tabIndex={0}>
      <div className="cm-post__top">
        <span className="cm-post__cat">{post.category}</span>
        {post.hot && <span className="cm-post__hot"><Flame size={11} /> HOT</span>}
        {post.reportCount > 0 && <span className="cm-post__report">신고 {post.reportCount}</span>}
        <button
          aria-label="게시글 북마크"
          className={`cm-post__bookmark${bookmarked ? ' cm-post__bookmark--on' : ''}`}
          type="button"
          onClick={(event) => { event.stopPropagation(); setBookmarked((current) => !current); }}
        >
          <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
      <p className="cm-post__title">{post.title}</p>
      <p className="cm-post__preview">{post.preview}</p>
      <div className="cm-post__footer">
        <span className="cm-post__author">by {post.author}</span>
        <div className="cm-post__meta">
          <span><Clock size={11} /> {post.createdAt}</span>
          <span><ThumbsUp size={11} /> {post.likes}</span>
          <span><MessageCircle size={11} /> {post.comments}</span>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('전체');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    return MOCK_POSTS.filter((post) => {
      if (category !== '전체' && post.category !== category) return false;
      if (search && !post.title.includes(search) && !post.preview.includes(search)) return false;
      return true;
    });
  }, [category, search]);

  const visiblePosts = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const nextCursor = hasMore ? `cursor-${visiblePosts.at(-1)?.id}` : 'end';

  return (
    <div className="cm-page">
      <div className="cm-header">
        <span className="cm-eyebrow">COMMUNITY</span>
        <h1 className="cm-header__title">커뮤니티</h1>
        <p className="cm-header__desc">취업 고민, 면접 후기, 이력서 팁, 합격 후기를 카테고리별로 나누어 공유합니다.</p>
      </div>

      <div className="cm-ops-panel">
        <div>
          <Database size={18} />
          <strong>커서 기반 게시글 목록</strong>
          <span>다음 커서: {nextCursor}</span>
        </div>
        <p>인기 게시글과 카테고리 목록은 캐시 대상 데이터로 분리하고, 목록은 커서 기반 더보기 UI로 표현합니다.</p>
      </div>

      <div className="cm-popular-card">
        <p className="cm-popular-card__title"><Star size={15} /> 이번 주 인기 글</p>
        <div className="cm-popular-list">
          {POPULAR.map((post, index) => (
            <div key={post.id} className="cm-popular-item">
              <span className="cm-popular-rank">{index + 1}</span>
              <span className="cm-popular-title">{post.title}</span>
              <span className="cm-popular-likes"><ThumbsUp size={11} /> {post.likes}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cm-toolbar">
        <div className="cm-cats" aria-label="게시글 카테고리">
          {CATEGORIES.map((item) => (
            <button
              key={item}
              className={`cm-cat${category === item ? ' cm-cat--on' : ''}`}
              type="button"
              onClick={() => { setCategory(item); setVisibleCount(PAGE_SIZE); }}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="cm-right">
          <div className="cm-search">
            <Search size={14} />
            <input placeholder="게시글 검색" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <button className="cm-write-btn" type="button" onClick={() => navigate('/community/posts/create')}>
            글 작성하기 <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="cm-list">
        {visiblePosts.map((post) => (
          <PostCard key={post.id} post={post} onClick={() => navigate(`/community/posts/${post.id}`)} />
        ))}
        {filtered.length === 0 && <div className="cm-empty">검색 결과가 없습니다.</div>}
      </div>

      {hasMore && (
        <button className="cm-load-more" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
          더 보기 <span>{nextCursor}</span>
        </button>
      )}
    </div>
  );
}
