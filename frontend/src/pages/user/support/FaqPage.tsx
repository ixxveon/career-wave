import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search, HelpCircle } from 'lucide-react';
import { supportApi, FAQ_CATEGORY_LABEL, type FaqCategory, type FaqItem } from '../../../api/user/supportApi';
import { useDebounce } from '../../../hooks/user/common/useDebounce';
import '@/styles/user/support/FaqPage.css';

const CATEGORY_FILTERS: { label: string; value: FaqCategory | '' }[] = [
  { label: '전체',      value: '' },
  { label: '계정',      value: 'ACCOUNT' },
  { label: '구독/결제', value: 'PAYMENT' },
  { label: 'AI 서비스', value: 'SERVICE' },
  { label: '기타',      value: 'ETC' },
];

export default function FaqPage() {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState<FaqCategory | ''>('');
  const [faqs,     setFaqs]     = useState<FaqItem[]>([]);
  const [openId,   setOpenId]   = useState<number | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setLoading(true);
    setError('');
    supportApi.getFaqs({ category: category || undefined, keyword: debouncedSearch || undefined })
      .then(res => setFaqs(res))
      .catch(() => setError('FAQ를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [category, debouncedSearch]);

  function handleCategoryChange(val: FaqCategory | '') {
    setCategory(val);
    setOpenId(null);
  }

  function toggle(id: number) {
    setOpenId(prev => prev === id ? null : id);
  }

  return (
    <div className="fq-page">
      <div className="fq-header">
        <span className="fq-eyebrow">FAQ</span>
        <h1 className="fq-header__title">자주 묻는 질문</h1>
        <p className="fq-header__desc">궁금한 점을 빠르게 해결하세요. 해결되지 않으면 1:1 문의를 이용해 주세요.</p>
      </div>

      <div className="fq-toolbar">
        <div className="fq-cats">
          {CATEGORY_FILTERS.map(({ label, value }) => (
            <button
              key={label}
              className={`fq-cat${category === value ? ' fq-cat--on' : ''}`}
              onClick={() => handleCategoryChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="fq-search">
          <Search size={14} />
          <input
            aria-label="FAQ 검색"
            placeholder="질문 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className="fq-empty">로딩 중...</div>}
      {error   && <div className="fq-empty">{error}</div>}
      {!loading && !error && (
        <div className="fq-list">
          {faqs.length === 0 ? (
            <div className="fq-empty">검색 결과가 없습니다.</div>
          ) : (
            faqs.map(f => (
              <div key={f.faqId} className={`fq-item${openId === f.faqId ? ' fq-item--open' : ''}`}>
                <button
                  className="fq-question"
                  aria-expanded={openId === f.faqId}
                  aria-controls={`faq-answer-${f.faqId}`}
                  onClick={() => toggle(f.faqId)}
                >
                  <div className="fq-question__left">
                    <HelpCircle size={16} className="fq-question__icon" />
                    <span className="fq-question__text">{f.question}</span>
                    <span className="fq-cat-badge">{FAQ_CATEGORY_LABEL[f.category]}</span>
                  </div>
                  {openId === f.faqId
                    ? <ChevronUp size={16} className="fq-chevron" />
                    : <ChevronDown size={16} className="fq-chevron" />
                  }
                </button>
                {openId === f.faqId && (
                  <div id={`faq-answer-${f.faqId}`} className="fq-answer">
                    <p>{f.answer}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
