import { useState } from 'react';
import {
  Plus, X, Send, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Lightbulb, TrendingUp,
} from 'lucide-react';
import './styles/CoverLetterAnalysisPage.css';

/* ── Mock ────────────────────────────────────── */
const MOCK_RESULTS = [
  {
    question: '지원 동기 및 입사 후 포부를 서술하시오.',
    answer:   '저는 카카오의 기술력과 문화에 매력을 느껴 지원하였습니다. 입사 후에는 열심히 노력하겠습니다.',
    score:    62,
    intent:   '회사 선택 이유와 본인의 구체적 성장 계획을 묻는 문항입니다.',
    issues: [
      { type: 'logic',  text: '지원 이유가 추상적입니다. 카카오의 어떤 기술/서비스에 끌렸는지 구체화하세요.' },
      { type: 'vague',  text: '"열심히 노력"은 무의미한 표현입니다. 구체적 목표와 계획으로 대체하세요.' },
    ],
    revised: '카카오의 대규모 트래픽 처리 아키텍처(Kakao Pub/Sub, Krane)에 관심을 가지고 기술 블로그를 꾸준히 학습해왔습니다. 입사 후 3년 내 핵심 API 서버 개발을 담당하고, 이후 아키텍처 설계까지 성장하는 것을 목표로 합니다.',
  },
  {
    question: '본인의 강점을 바탕으로 팀에 기여한 경험을 서술하시오.',
    answer:   '저는 꼼꼼한 성격으로 코드 리뷰를 꼼꼼하게 하였으며, 팀 분위기를 좋게 만들었습니다.',
    score:    70,
    intent:   '강점이 실제 팀 성과로 이어진 사례를 STAR 구조로 묻는 문항입니다.',
    issues: [
      { type: 'logic', text: '강점(코드 리뷰)과 결과(팀 분위기)의 인과관계가 불명확합니다.' },
      { type: 'kpi',   text: '성과를 수치로 표현하면 신뢰도가 높아집니다.' },
    ],
    revised: '코드 리뷰 문화 정착을 주도한 경험이 있습니다. 팀 내 리뷰 기준이 없어 병목이 발생하자, 체크리스트 기반 PR 템플릿을 제안하고 정착시켰습니다. 그 결과 리뷰 사이클이 평균 2일 → 6시간으로 단축되어 릴리즈 주기가 30% 개선되었습니다.',
  },
];

const ISSUE_META = {
  logic: { label: '논리 구조', color: '#f59e0b', bg: '#fef3c7' },
  vague: { label: '모호한 표현', color: '#a78bfa', bg: '#ede9fe' },
  kpi:   { label: 'KPI 부족',   color: '#60a5fa', bg: '#dbeafe' },
};

const SCORE_GRADE = s => s >= 80 ? 'A' : s >= 65 ? 'B' : 'C';

function ResultCard({ item }) {
  const [open, setOpen] = useState(true);
  const grade = SCORE_GRADE(item.score);

  return (
    <div className={`cl-result${open ? ' cl-result--open' : ''}`}>
      <button className="cl-result__head" onClick={() => setOpen(v => !v)}>
        <span className={`cl-result__grade cl-result__grade--${grade}`}>{item.score}점</span>
        <span className="cl-result__q">{item.question}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {open && (
        <div className="cl-result__body">
          {/* 내 답변 */}
          <div className="cl-result__section cl-result__section--answer">
            <p className="cl-result__section-label">내 답변</p>
            <p className="cl-result__text">{item.answer}</p>
          </div>

          {/* 문항 의도 */}
          <div className="cl-result__section cl-result__section--intent">
            <p className="cl-result__section-label"><Lightbulb size={12} /> 문항 의도</p>
            <p className="cl-result__text">{item.intent}</p>
          </div>

          {/* 개선 포인트 */}
          <div className="cl-result__section">
            <p className="cl-result__section-label"><AlertCircle size={12} /> 개선 포인트</p>
            <ul className="cl-issue-list">
              {item.issues.map((issue, i) => {
                const meta = ISSUE_META[issue.type];
                return (
                  <li key={i} className="cl-issue">
                    <span className="cl-issue__tag" style={{ color: meta.color, background: meta.bg }}>
                      {meta.label}
                    </span>
                    <span className="cl-issue__text">{issue.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* AI 수정안 */}
          <div className="cl-result__section cl-result__section--revised">
            <p className="cl-result__section-label"><TrendingUp size={12} /> AI 수정 제안</p>
            <p className="cl-result__text cl-result__text--revised">{item.revised}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CoverLetterAnalysisPage() {
  const [phase,     setPhase]     = useState('input'); // 'input' | 'result'
  const [questions, setQuestions] = useState([{ q: '', a: '' }]);

  function addQuestion() {
    if (questions.length >= 5) return;
    setQuestions(qs => [...qs, { q: '', a: '' }]);
  }

  function removeQuestion(i) {
    setQuestions(qs => qs.filter((_, idx) => idx !== i));
  }

  function updateQuestion(i, field, val) {
    setQuestions(qs => qs.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  const canSubmit = questions.every(q => q.q.trim() && q.a.trim());

  if (phase === 'result') {
    return (
      <div className="cl">
        <div className="cl-result-banner">
          <div>
            <span className="cl-eyebrow">COVER LETTER AI</span>
            <h1 className="cl-result-banner__title">첨삭 결과</h1>
            <p className="cl-result-banner__sub">{MOCK_RESULTS.length}개 문항 분석 완료</p>
          </div>
          <button className="cl-btn cl-btn--outline" onClick={() => setPhase('input')}>
            다시 작성하기
          </button>
        </div>

        <div className="cl-result-list">
          {MOCK_RESULTS.map((item, i) => (
            <ResultCard key={i} item={item} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cl">
      <div className="cl-input-wrap">
        <span className="cl-eyebrow">COVER LETTER AI</span>
        <h1 className="cl-input__title">자기소개서 AI 첨삭</h1>
        <p className="cl-input__desc">
          문항과 답변을 입력하면 AI가 논리 구조, 표현 교정, 수정안을 제시합니다.<br />
          최대 5개 문항까지 한 번에 분석할 수 있습니다.
        </p>

        <div className="cl-form">
          {questions.map((item, i) => (
            <div key={i} className="cl-qblock">
              <div className="cl-qblock__header">
                <span className="cl-qblock__num">문항 {i + 1}</span>
                {questions.length > 1 && (
                  <button className="cl-qblock__remove" onClick={() => removeQuestion(i)}>
                    <X size={13} />
                  </button>
                )}
              </div>
              <input
                className="cl-field"
                placeholder="문항을 입력하세요. ex) 지원 동기 및 입사 후 포부를 서술하시오."
                value={item.q}
                onChange={e => updateQuestion(i, 'q', e.target.value)}
              />
              <textarea
                className="cl-field cl-field--textarea"
                placeholder="답변을 입력하세요."
                rows={5}
                value={item.a}
                onChange={e => updateQuestion(i, 'a', e.target.value)}
              />
            </div>
          ))}

          {questions.length < 5 && (
            <button className="cl-add-btn" onClick={addQuestion}>
              <Plus size={15} /> 문항 추가 ({questions.length}/5)
            </button>
          )}

          <button
            className="cl-btn cl-btn--primary"
            disabled={!canSubmit}
            onClick={() => setPhase('result')}
          >
            <Send size={15} /> AI 첨삭 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
