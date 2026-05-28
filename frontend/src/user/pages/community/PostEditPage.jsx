import { useEffect, useState } from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { communityApi } from '../../api/communityApi';
import './styles/PostCreatePage.css';

const CATEGORIES = ['질문', '면접 후기', '이력서 고민', '합격 후기', '자유'];

export default function PostEditPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const [category, setCategory] = useState('질문');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    communityApi.getBoardDetail(postId).then((post) => {
      if (!post) return;
      setCategory(post.category || '질문');
      setTitle(post.title || '');
      setContent(post.content || '');
    });
  }, [postId]);

  const canSubmit = category && title.trim() && content.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await communityApi.updateBoard(postId, { category, title: title.trim(), content: content.trim() });
    navigate(`/community/posts/${postId}`);
  };

  return (
    <div className="pc-page">
      <div className="pc-wrap">
        <button className="pc-back" type="button" onClick={() => navigate(`/community/posts/${postId}`)}>
          <ChevronLeft size={14} /> 게시글 상세
        </button>

        <div className="pc-header">
          <span className="pc-eyebrow">COMMUNITY</span>
          <h1 className="pc-header__title">게시글 수정</h1>
          <p className="pc-header__desc">작성한 게시글의 제목, 내용, 카테고리를 수정합니다.</p>
        </div>

        <div className="pc-card">
          <div className="pc-field">
            <label className="pc-field__label">카테고리 <span>*</span></label>
            <div className="pc-cats">
              {CATEGORIES.map((item) => (
                <button className={`pc-cat${category === item ? ' pc-cat--on' : ''}`} key={item} type="button" onClick={() => setCategory(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="pc-field">
            <label className="pc-field__label">제목 <span>*</span></label>
            <input className="pc-input" maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} />
            <span className="pc-field__count">{title.length} / 100</span>
          </div>

          <div className="pc-field">
            <label className="pc-field__label">내용 <span>*</span></label>
            <textarea className="pc-textarea" rows={14} value={content} onChange={(event) => setContent(event.target.value)} />
          </div>

          <div className="pc-actions">
            <button className="pc-btn pc-btn--outline" type="button" onClick={() => navigate(`/community/posts/${postId}`)}>취소</button>
            <button className="pc-btn pc-btn--primary" disabled={!canSubmit} type="button" onClick={handleSubmit}>
              <Save size={14} /> 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
