import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, HelpCircle } from 'lucide-react';
import './styles/FaqPage.css';

interface FaqItem {
  id: number;
  category: string;
  question: string;
  answer: string;
}

const MOCK_FAQS: FaqItem[] = [
  {
    id: 1, category: '구독/결제',
    question: '구독을 해지하면 남은 기간은 어떻게 되나요?',
    answer: '구독 해지 시, 해지 신청일로부터 현재 결제된 구독 기간이 만료되는 날까지 프리미엄 서비스를 계속 이용하실 수 있습니다. 구독 만료 이후에는 Free 플랜으로 자동 전환됩니다. 남은 기간에 대한 환불은 별도로 제공되지 않습니다.',
  },
  {
    id: 2, category: '구독/결제',
    question: '결제 수단을 변경하고 싶어요.',
    answer: '마이페이지 > 구독 관리 메뉴에서 결제 수단을 변경하실 수 있습니다. 현재 Toss Payments를 통한 카드 결제 및 간편결제를 지원합니다.',
  },
  {
    id: 3, category: 'AI 이력서 분석',
    question: 'AI 이력서 분석은 어떤 파일 형식을 지원하나요?',
    answer: 'PDF 및 DOCX 형식을 지원합니다. 파일 크기는 최대 10MB까지 업로드 가능합니다. 스캔된 이미지 파일의 경우 분석 정확도가 낮을 수 있으므로 텍스트 기반 파일 사용을 권장합니다.',
  },
  {
    id: 4, category: 'AI 이력서 분석',
    question: 'AI 분석 결과는 얼마나 신뢰할 수 있나요?',
    answer: 'Career-wave의 AI는 최신 LLM 모델을 기반으로 수천 건의 합격 이력서 데이터를 학습하였습니다. 다만, AI 분석은 보조 도구로서의 역할을 하며, 최종 판단은 사용자께서 직접 하시는 것을 권장드립니다.',
  },
  {
    id: 5, category: 'AI 면접',
    question: 'AI 면접 도중 네트워크가 끊기면 어떻게 되나요?',
    answer: '네트워크 재연결 시 면접을 이어서 진행할 수 있습니다. 최대 10분 이내에 재접속하면 이전 진행 상태가 복구됩니다. 10분이 초과된 경우 해당 면접 세션은 종료 처리되며, 마이페이지에서 중단된 기록을 확인하실 수 있습니다.',
  },
  {
    id: 6, category: 'AI 면접',
    question: '면접 결과 리포트는 언제 받을 수 있나요?',
    answer: '면접 종료 후 약 30초~1분 이내에 종합 평가 리포트가 생성됩니다. 마이페이지 > AI 면접 기록에서 과거 면접 리포트를 언제든지 조회하실 수 있습니다.',
  },
  {
    id: 7, category: '계정',
    question: '비밀번호를 잊어버렸어요.',
    answer: '로그인 페이지에서 "비밀번호 찾기"를 선택하면 가입 시 등록한 이메일로 재설정 링크가 발송됩니다. 이메일을 받지 못하셨다면 스팸 폴더를 확인해 주세요.',
  },
  {
    id: 8, category: '채용 공고',
    question: '채용 공고는 얼마나 자주 업데이트되나요?',
    answer: '채용 공고는 매일 자동으로 수집·업데이트됩니다. 각 공고의 최종 수집 시각은 상세 페이지에서 확인하실 수 있습니다. 원본 채용 사이트와 실시간 동기화는 지원하지 않으므로, 지원 전 원본 사이트에서 모집 여부를 최종 확인하시기 바랍니다.',
  },
];

const CATEGORIES = ['전체', '구독/결제', 'AI 이력서 분석', 'AI 면접', '계정', '채용 공고'];

export default function FaqPage() {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('전체');
  const [openId,   setOpenId]   = useState<number | null>(null);

  const filtered = MOCK_FAQS.filter(f => {
    if (category !== '전체' && f.category !== category) return false;
    if (search && !f.question.includes(search) && !f.answer.includes(search)) return false;
    return true;
  });

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
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`fq-cat${category === c ? ' fq-cat--on' : ''}`}
              onClick={() => { setCategory(c); setOpenId(null); }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="fq-search">
          <Search size={14} />
          <input
            placeholder="질문 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="fq-list">
        {filtered.length === 0 ? (
          <div className="fq-empty">검색 결과가 없습니다.</div>
        ) : (
          filtered.map(f => (
            <div key={f.id} className={`fq-item${openId === f.id ? ' fq-item--open' : ''}`}>
              <button className="fq-question" onClick={() => toggle(f.id)}>
                <div className="fq-question__left">
                  <HelpCircle size={16} className="fq-question__icon" />
                  <span className="fq-question__text">{f.question}</span>
                  <span className="fq-cat-badge">{f.category}</span>
                </div>
                {openId === f.id
                  ? <ChevronUp size={16} className="fq-chevron" />
                  : <ChevronDown size={16} className="fq-chevron" />
                }
              </button>
              {openId === f.id && (
                <div className="fq-answer">
                  <p>{f.answer}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
