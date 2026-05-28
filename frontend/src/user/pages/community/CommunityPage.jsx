import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Pencil, Search, ThumbsUp } from 'lucide-react';
import { communityApi } from '../../api/communityApi';
import './styles/CommunityPage.css';

const CATEGORIES = ['전체', '질문', '면접 후기', '이력서 고민', '합격 후기', '자유'];

function PostCard({ post, onClick }) {
  return (
    <button className="cm-post" type="button" onClick={onClick}>
      <div className="cm-post__top">
        <span className="cm-post__cat">{post.category}</span>
        <span className="cm-post__author">by {post.author}</span>
      </div>
      <strong className="cm-post__title">{post.title}</strong>
      <p className="cm-post__preview">{post.preview}</p>
      <div className="cm-post__footer">
        <span>{post.createdAt}</span>
        <span><ThumbsUp size={12} /> {post.likes}</span>
        <span><MessageCircle size={12} /> {post.comments}</span>
      </div>
    </button>
  );
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('전체');
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    let active = true;
    communityApi.getBoards({ keyword, category }).then((data) => {
      if (active) setPosts(data);
    });

    return () => {
      active = false;
    };
  }, [keyword, category]);

  const popularPosts = useMemo(
    () => [...posts].sort((a, b) => b.likes - a.likes).slice(0, 3),
    [posts],
  );

  return (
    <div className="cm-page">
      <div className="cm-header">
        <span className="cm-eyebrow">COMMUNITY</span>
        <h1 className="cm-header__title">커뮤니티 게시판</h1>
        <p className="cm-header__desc">취업 고민, 면접 후기, 합격 경험을 게시글과 댓글로 공유합니다.</p>
      </div>

      <div className="cm-popular-card">
        <p className="cm-popular-card__title">인기 게시글</p>
        <div className="cm-popular-list">
          {popularPosts.map((post, index) => (
            <button className="cm-popular-item" key={post.id} type="button" onClick={() => navigate(`/community/posts/${post.id}`)}>
              <span className="cm-popular-rank">{index + 1}</span>
              <span className="cm-popular-title">{post.title}</span>
              <span className="cm-popular-likes"><ThumbsUp size={11} /> {post.likes}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="cm-toolbar">
        <div className="cm-cats">
          {CATEGORIES.map((item) => (
            <button
              className={`cm-cat${category === item ? ' cm-cat--on' : ''}`}
              key={item}
              type="button"
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="cm-right">
          <div className="cm-search">
            <Search size={14} />
            <input
              placeholder="게시글 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <button className="cm-write-btn" type="button" onClick={() => navigate('/community/posts/create')}>
            <Pencil size={14} /> 글 작성
          </button>
        </div>
      </div>

      <div className="cm-list">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onClick={() => navigate(`/community/posts/${post.id}`)} />
        ))}
        {posts.length === 0 && <div className="cm-empty">조건에 맞는 게시글이 없습니다.</div>}
      </div>
    </div>
  );
}
