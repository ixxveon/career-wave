import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send } from 'lucide-react';
import './styles/InquiryCreatePage.css';

const CATEGORIES = ['AI 이력서 분석', 'AI 면접', '구독/결제', '계정', '채용 공고', '기타'];

export default function InquiryCreatePage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [title,    setTitle]    = useState('');
  const [content,  setContent]  = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = category && title.trim() && content.trim().length >= 10;

  function handleSubmit() {
    if (!canSubmit) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="ic-page">
        <div className="ic-success">
          <div className="ic-success__icon">
            <Send size={28} />
          </div>
          <h2 className="ic-success__title">문의가 접수되었습니다</h2>
          <p className="ic-success__desc">
            담당 팀에서 검토 후 빠르게 답변드리겠습니다.<br />
            평균 답변 시간은 영업일 기준 1~2일입니다.
          </p>
          <div className="ic-success__actions">
            <button className="ic-btn ic-btn--outline" onClick={() => navigate('/support/inquiry')}>
              문의 내역 보기
            </button>
            <button className="ic-btn ic-btn--primary" onClick={() => navigate('/support/faq')}>
              FAQ 확인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ic-page">
      <div className="ic-wrap">
        <button className="ic-back" onClick={() => navigate('/support/inquiry')}>
          <ChevronLeft size={14} /> 문의 내역
        </button>

        <div className="ic-header">
          <span className="ic-eyebrow">1:1 문의</span>
          <h1 className="ic-header__title">문의하기</h1>
          <p className="ic-header__desc">궁금한 점이나 불편 사항을 남겨주세요. 빠르게 답변드리겠습니다.</p>
        </div>

        <div className="ic-card">
          <div className="ic-field">
            <label className="ic-field__label">문의 유형 <span>*</span></label>
            <div className="ic-cats">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  className={`ic-cat${category === c ? ' ic-cat--on' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="ic-field">
            <label className="ic-field__label">제목 <span>*</span></label>
            <input
              className="ic-input"
              placeholder="문의 내용을 한 줄로 요약해 주세요"
              maxLength={100}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <span className="ic-field__count">{title.length} / 100</span>
          </div>

          <div className="ic-field">
            <label className="ic-field__label">문의 내용 <span>*</span></label>
            <textarea
              className="ic-textarea"
              placeholder="문의 내용을 자세히 작성해 주세요. (최소 10자)"
              rows={10}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            <span className="ic-field__count ic-field__count--bottom">
              {content.length}자 {content.trim().length < 10 && <span className="ic-field__hint">(최소 10자 이상)</span>}
            </span>
          </div>

          <div className="ic-notice">
            <p>· 문의 답변은 등록하신 이메일로도 발송됩니다.</p>
            <p>· 답변까지 영업일 기준 평균 1~2일이 소요됩니다.</p>
            <p>· 긴급한 서비스 장애는 공지사항을 먼저 확인해 주세요.</p>
          </div>

          <div className="ic-actions">
            <button className="ic-btn ic-btn--outline" onClick={() => navigate('/support/inquiry')}>취소</button>
            <button
              className="ic-btn ic-btn--primary"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              <Send size={14} /> 문의 접수
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
