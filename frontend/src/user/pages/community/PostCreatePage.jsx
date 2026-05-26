import { useState } from 'react';
import { ChevronLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './styles/PostCreatePage.css';

const CATEGORIES = ['질문', '면접 후기', '이력서 팁', '합격 후기', '자유'];

export default function PostCreatePage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [title,    setTitle]    = useState('');
  const [content,  setContent]  = useState('');

  const canSubmit = category && title.trim() && content.trim();

  function handleSubmit() {
    if (!canSubmit) return;
    // TODO: API 연동
    navigate('/community');
  }

  return (
    <div className="pc-page">
      <div className="pc-wrap">
        <button className="pc-back" onClick={() => navigate('/community')}>
          <ChevronLeft size={14} /> 커뮤니티로
        </button>

        <div className="pc-header">
          <span className="pc-eyebrow">COMMUNITY</span>
          <h1 className="pc-header__title">글 작성하기</h1>
          <p className="pc-header__desc">취업 준비 경험과 노하우를 커뮤니티와 나눠주세요.</p>
        </div>

      <div className="pc-card">
        {/* 카테고리 */}
        <div className="pc-field">
          <label className="pc-field__label">카테고리 <span>*</span></label>
          <div className="pc-cats">
            {CATEGORIES.map(c => (
              <button
                key={c}
                className={`pc-cat${category === c ? ' pc-cat--on' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div className="pc-field">
          <label className="pc-field__label">제목 <span>*</span></label>
          <input
            className="pc-input"
            placeholder="제목을 입력하세요"
            maxLength={100}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <span className="pc-field__count">{title.length} / 100</span>
        </div>

        {/* 내용 */}
        <div className="pc-field">
          <label className="pc-field__label">내용 <span>*</span></label>
          <textarea
            className="pc-textarea"
            placeholder="내용을 작성하세요. 경험과 노하우를 구체적으로 공유해 주세요."
            rows={14}
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        </div>

        {/* 액션 */}
        <div className="pc-actions">
          <button className="pc-btn pc-btn--outline" onClick={() => navigate('/community')}>취소</button>
          <button className="pc-btn pc-btn--primary" disabled={!canSubmit} onClick={handleSubmit}>
            <Send size={14} /> 게시하기
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
