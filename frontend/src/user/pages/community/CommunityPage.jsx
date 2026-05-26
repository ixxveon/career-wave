import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ThumbsUp, MessageCircle, Bookmark, ChevronRight, Flame, Star, Clock } from 'lucide-react';
import './styles/CommunityPage.css';

const CATEGORIES = ['전체', '질문', '면접 후기', '이력서 팁', '합격 후기', '자유'];

const MOCK_POSTS = [
  {
    id: 1, category: '면접 후기', title: '카카오 백엔드 1차 면접 후기 (기술 면접 위주)',
    preview: 'CS 기초 위주로 질문이 나왔고, 자료구조 + OS + 네트워크 순서로 진행됐습니다. Spring 관련 심화 질문도...',
    author: '개발자지망생', createdAt: '2025-05-20', views: 1240, likes: 87, comments: 23, bookmarked: false, hot: true,
  },
  {
    id: 2, category: '합격 후기', title: '토스 프론트엔드 최종 합격 후기 + 준비 방법',
    preview: '3개월 준비 끝에 최종 합격했습니다! 코딩테스트부터 컬처핏까지 전 과정을 공유합니다.',
    author: 'toss_fe_21', createdAt: '2025-05-19', views: 3560, likes: 215, comments: 61, bookmarked: true, hot: true,
  },
  {
    id: 3, category: '질문', title: 'Spring Boot에서 @Transactional 내부 호출 문제 해결법',
    preview: '셀프 인보케이션 이슈로 트랜잭션이 적용 안 되는 상황인데 어떻게 해결하셨나요?',
    author: 'java_dev_kim', createdAt: '2025-05-18', views: 840, likes: 42, comments: 17, bookmarked: false, hot: false,
  },
  {
    id: 4, category: '이력서 팁', title: '신입 백엔드 이력서 통과율 높이는 5가지 방법',
    preview: '서류 합격률을 3배 높인 경험을 공유합니다. 프로젝트 성과 수치화가 핵심입니다.',
    author: '취준컨설턴트', createdAt: '2025-05-17', views: 2100, likes: 130, comments: 38, bookmarked: false, hot: false,
  },
  {
    id: 5, category: '질문', title: '네이버 공채 코딩테스트 난이도 어느 정도인가요?',
    preview: '이번 공채를 처음 지원하는데 어느 정도 수준으로 준비해야 할지 감이 안 잡혀서요.',
    author: 'algo_beginner', createdAt: '2025-05-16', views: 580, likes: 21, comments: 14, bookmarked: false, hot: false,
  },
  {
    id: 6, category: '자유', title: '취준 6개월 차, 멘탈 관리하는 법 공유합니다',
    preview: '서류 탈락이 반복될 때마다 무너졌는데 이렇게 버텼습니다. 같이 힘냅시다!',
    author: '버티는중', createdAt: '2025-05-15', views: 1890, likes: 178, comments: 54, bookmarked: false, hot: false,
  },
];

const POPULAR = MOCK_POSTS.slice(0, 3).sort((a, b) => b.likes - a.likes);

function PostCard({ post }) {
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  return (
    <div className="cm-post">
      <div className="cm-post__top">
        <span className="cm-post__cat">{post.category}</span>
        {post.hot && <span className="cm-post__hot"><Flame size={11} /> HOT</span>}
        <button
          className={`cm-post__bookmark${bookmarked ? ' cm-post__bookmark--on' : ''}`}
          onClick={e => { e.stopPropagation(); setBookmarked(b => !b); }}
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
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('전체');

  const filtered = MOCK_POSTS.filter(p => {
    if (category !== '전체' && p.category !== category) return false;
    if (search && !p.title.includes(search) && !p.preview.includes(search)) return false;
    return true;
  });

  return (
    <div className="cm-page">
      <div className="cm-header">
        <span className="cm-eyebrow">COMMUNITY</span>
        <h1 className="cm-header__title">커뮤니티</h1>
        <p className="cm-header__desc">취업 준비생들과 면접 후기, 이력서 팁, 합격 노하우를 나눕니다.</p>
      </div>

      {/* 인기 게시글 */}
      <div className="cm-popular-card">
        <p className="cm-popular-card__title"><Star size={15} /> 이번 주 인기 글</p>
        <div className="cm-popular-list">
          {POPULAR.map((p, i) => (
            <div key={p.id} className="cm-popular-item">
              <span className="cm-popular-rank">{i + 1}</span>
              <span className="cm-popular-title">{p.title}</span>
              <span className="cm-popular-likes"><ThumbsUp size={11} /> {p.likes}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 툴바 */}
      <div className="cm-toolbar">
        <div className="cm-cats">
          {CATEGORIES.map(c => (
            <button key={c} className={`cm-cat${category === c ? ' cm-cat--on' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <div className="cm-right">
          <div className="cm-search">
            <Search size={14} />
            <input placeholder="게시글 검색" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="cm-write-btn" onClick={() => navigate('/community/posts/create')}>글 작성하기 <ChevronRight size={14} /></button>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="cm-list">
        {filtered.map(p => <PostCard key={p.id} post={p} />)}
        {filtered.length === 0 && (
          <div className="cm-empty">검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
