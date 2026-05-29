import { useState } from 'react';
import {
  Plus, X, Send,
  AlertCircle, Loader2, Building2, Briefcase,
} from 'lucide-react';
import { documentApi } from '../../api/documentApi';
import DocumentResultView from './DocumentResultView';
import type { DocumentResult, FeedbackDetail } from '../../types/document';
import './styles/CoverLetterAnalysisPage.css';
import './styles/ResumeAnalysisPage.css'; /* ra-quota-bar 공용 스타일 */

/* ── 멤버십 한도 (서류 분석 이력서+자소서 통합 카운트) ── */
const PLAN_LIMITS = { FREE: { document: 1 }, PREMIUM: { document: 20 } };

/* ── Mock 사용량 ─────────────────────────────────────── */
const MOCK_QUOTA = { membership: 'PREMIUM' as const, documentUsed: 7 };

/* ── Mock (백엔드 미완성 시 폴백) ────────────────────── */
const MOCK_RESULT: DocumentResult = {
  documentId: 1,
  evaluation: {
    totalScore: 78,
    jobFitnessScore: 85,
    techStackScore: 75,
    quantifiedScore: 60,
    logicalScore: 82,
    overallReview:
      '직무 연관성과 논리 구조는 양호하나, 성과의 정량적 수치화가 전반적으로 부족합니다. 구체적인 숫자와 기술 스택을 명시하면 서류 경쟁력이 크게 올라갈 것입니다.',
  },
  feedbackDetails: [
    {
      sectionNumber: 1,
      question: '지원 동기 및 입사 후 포부를 서술하시오.',
      originalText:
        '저는 카카오의 기술력과 문화에 매력을 느껴 지원하였습니다. 입사 후에는 열심히 노력하겠습니다.',
      goodPoint:
        '개발에 대한 열정과 팀원들과 소통하려는 태도가 본문에 잘 드러나 있습니다.',
      badPoint:
        '"열심히", "성공적"이라는 표현이 너무 추상적입니다. 어떤 성과(수치)를 냈는지 알 수 없습니다.',
      improvedText:
        '카카오의 대규모 트래픽 처리 아키텍처(Kakao Pub/Sub, Krane)를 기술 블로그로 꾸준히 학습해왔습니다. 입사 후 3년 내 핵심 API 서버 개발을 담당하고, 이후 아키텍처 설계까지 성장하는 것을 목표로 합니다.',
      starAnalysis: {
        s: { ok: true,  comment: '카카오 기술력과 문화에 매력을 느낀 배경이 제시되어 상황 설명이 존재합니다.' },
        t: { ok: false, comment: '지원 목적(과제)이 "매력을 느꼈다"는 수준에 머뭅니다. 본인이 해결하고 싶은 문제나 목표를 구체적으로 명시하세요.' },
        a: { ok: false, comment: '입사 전·후 어떤 구체적인 행동을 취할지 전혀 서술되지 않았습니다. 학습 경험이나 준비 과정을 추가하세요.' },
        r: { ok: false, comment: '"열심히 노력하겠습니다"는 결과·성과가 아닙니다. 3년 내 달성할 구체적인 커리어 마일스톤을 수치로 제시하세요.' },
      },
      quantAnalysis: {
        numbers:   { ok: false, comment: '수치(%, 횟수, 금액 등)가 전혀 사용되지 않았습니다. 구체적인 숫자가 신뢰도를 높입니다.' },
        timeframe: { ok: false, comment: '기간·빈도 표현이 없습니다. "매주", "6개월간" 같은 시간 기반 맥락을 추가하세요.' },
        scale:     { ok: false, comment: '규모·범위 언급이 없습니다. 팀 크기, 사용자 수, 트래픽 규모 등을 제시해보세요.' },
        impact:    { ok: false, comment: '행동의 결과가 수치로 측정되지 않았습니다. 성과 지표(속도 개선율, 비용 절감액 등)를 명시하세요.' },
      },
    },
    {
      sectionNumber: 2,
      question: '본인의 강점을 바탕으로 팀에 기여한 경험을 서술하시오.',
      originalText:
        '저는 꼼꼼한 성격으로 코드 리뷰를 꼼꼼하게 하였으며, 팀 분위기를 좋게 만들었습니다.',
      goodPoint:
        'STAR 구조와 수치 기반 성과 서술이 잘 작성되어 있습니다. 역할과 기여가 명확히 드러납니다.',
      badPoint:
        '강점(코드 리뷰)과 결과(팀 분위기)의 인과관계가 불명확합니다. 성과를 수치로 표현하면 신뢰도가 높아집니다.',
      improvedText:
        '코드 리뷰 문화 정착을 주도하여 PR 사이클을 2일 → 6시간으로 단축, 릴리즈 주기 30% 개선에 기여하였습니다.',
      starAnalysis: {
        s: { ok: true,  comment: '팀 내 코드 리뷰 상황이 배경으로 설정되어 있어 상황 설명이 적절합니다.' },
        t: { ok: false, comment: '본인이 맡은 과제(역할)가 "꼼꼼한 리뷰"로만 표현되어 구체적인 목표가 드러나지 않습니다.' },
        a: { ok: true,  comment: '코드 리뷰라는 구체적인 행동이 언급되었습니다. 어떤 기준으로 리뷰했는지 추가하면 더 좋습니다.' },
        r: { ok: false, comment: '"팀 분위기를 좋게 만들었다"는 결과가 매우 추상적입니다. PR 사이클 단축, 결함률 감소 등 수치로 표현하세요.' },
      },
      quantAnalysis: {
        numbers:   { ok: false, comment: '성과를 뒷받침하는 수치가 없습니다. "PR 사이클 X% 단축" 같은 정량 표현을 추가하세요.' },
        timeframe: { ok: false, comment: '언제, 얼마나 오랫동안 코드 리뷰를 주도했는지 기간 정보가 빠져 있습니다.' },
        scale:     { ok: true,  comment: '팀 내 활동임을 언급하여 기여 범위가 어느 정도 드러납니다.' },
        impact:    { ok: false, comment: '"팀 분위기 개선"은 측정 불가한 표현입니다. 릴리즈 빈도, 버그율 등 정량 지표로 교체하세요.' },
      },
    },
  ],
};

/* ── 문항 입력 타입 ─────────────────────────────────── */
interface QuestionItem {
  q: string;
  a: string;
}

/* ── 서브 컴포넌트 ─────────────────────────────────── */
function LoadingOverlay() {
  return (
    <div className="cl-overlay">
      <div className="cl-overlay__box">
        <Loader2 className="cl-overlay__spinner" size={52} />
        <p className="cl-overlay__msg">AI 면접관이 서류의 문맥과 직무 적합도를 꼼꼼히 분석하고 있습니다.</p>
        <p className="cl-overlay__sub">잠시만 기다려주세요! (약 30초 소요)</p>
      </div>
    </div>
  );
}

/* ── 메인 컴포넌트 ─────────────────────────────────── */
export default function CoverLetterAnalysisPage() {
  const [phase, setPhase]         = useState<'input' | 'result'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError]   = useState<string | null>(null);

  const [company,   setCompany]   = useState('');
  const [job,       setJob]       = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([{ q: '', a: '' }]);
  const [result,    setResult]    = useState<DocumentResult | null>(null);

  function addQuestion() {
    if (questions.length >= 5) return;
    setQuestions(qs => [...qs, { q: '', a: '' }]);
  }

  function removeQuestion(i: number) {
    setQuestions(qs => qs.filter((_, idx) => idx !== i));
  }

  function updateQuestion(i: number, field: keyof QuestionItem, val: string) {
    setQuestions(qs => qs.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  async function handleSubmit() {
    setApiError(null);
    setIsLoading(true);
    try {
      const data = await documentApi.analyzeCoverLetter({
        title: company,
        jobCategory: job,
        items: questions.map(q => ({ question: q.q, answer: q.a })),
      });
      setResult(data);
      setPhase('result');
    } catch (err) {
      if (import.meta.env.DEV) {
        setResult(MOCK_RESULT);
        setPhase('result');
      } else {
        setApiError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setPhase('input');
    setResult(null);
    setApiError(null);
    setCompany('');
    setJob('');
    setQuestions([{ q: '', a: '' }]);
  }

  /* AI 수정안을 입력 폼에 자동 적용 후 재분석 */
  function handleRevise(feedbackDetails: FeedbackDetail[]) {
    setQuestions(feedbackDetails.map(item => ({
      q: item.question,
      a: item.improvedText,
    })));
    setResult(null);
    setApiError(null);
    setPhase('input');
  }

  const canSubmit = company.trim() && job.trim() && questions.every(q => q.q.trim() && q.a.trim());

  /* ── 결과 화면 ── */
  if (phase === 'result' && result) {
    return (
      <DocumentResultView
        result={result}
        onReset={handleReset}
        onRevise={handleRevise}
        label="COVER LETTER AI"
        subtitle={`${company} · ${job}`}
      />
    );
  }

  /* ── 입력 화면 ── */
  const { membership, documentUsed } = MOCK_QUOTA;
  const docLimit    = PLAN_LIMITS[membership].document;
  const docLeft     = docLimit - documentUsed;
  const pct         = Math.min((documentUsed / docLimit) * 100, 100);
  const isExhausted = docLeft <= 0;

  return (
    <div className="cl" style={{ position: 'relative' }}>
      {isLoading && <LoadingOverlay />}

      <div className="cl-input-wrap">
        {/* ── 할당량 표시 ── */}
        <div className="ra-quota-bar">
          <div className="ra-quota-bar__info">
            <span className="ra-quota-bar__label">이번 달 서류 분석</span>
            <span className={`ra-quota-bar__count${isExhausted ? ' ra-quota-bar__count--full' : docLeft <= 3 ? ' ra-quota-bar__count--warn' : ''}`}>
              {documentUsed} / {docLimit}회 사용
              {isExhausted && <span className="ra-quota-bar__tag">한도 초과</span>}
              {!isExhausted && docLeft <= 3 && <span className="ra-quota-bar__tag ra-quota-bar__tag--warn">잔여 {docLeft}회</span>}
            </span>
          </div>
          <div className="ra-quota-bar__track">
            <div
              className={`ra-quota-bar__fill${isExhausted ? ' ra-quota-bar__fill--full' : pct >= 70 ? ' ra-quota-bar__fill--warn' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <span className="cl-eyebrow">COVER LETTER AI</span>
        <h1 className="cl-input__title">자기소개서 AI 분석</h1>
        <p className="cl-input__desc">
          문항과 답변을 입력하면 AI가 논리 구조, 표현 교정, 수정안을 제시합니다.<br />
          최대 5개 문항까지 한 번에 분석할 수 있습니다.
        </p>

        <div className="cl-form">
          {/* 회사명 / 직무 */}
          <div className="cl-meta-row">
            <div className="cl-meta-field">
              <label className="cl-meta-label"><Building2 size={13} /> 지원 회사</label>
              <input
                className="cl-field"
                placeholder="ex) 카카오, 네이버, 토스"
                value={company}
                onChange={e => setCompany(e.target.value)}
              />
            </div>
            <div className="cl-meta-field">
              <label className="cl-meta-label"><Briefcase size={13} /> 지원 직무</label>
              <input
                className="cl-field"
                placeholder="ex) 백엔드 개발자, 데이터 분석가"
                value={job}
                onChange={e => setJob(e.target.value)}
              />
            </div>
          </div>

          {/* 문항 블록 */}
          {questions.map((item, i) => (
            <div key={i} className="cl-qblock">
              <div className="cl-qblock__header">
                <span className="cl-qblock__num">문항 {i + 1}</span>
                {questions.length > 1 && (
                  <button className="cl-qblock__remove" onClick={() => removeQuestion(i)}>
                    <X size={12} /> 삭제
                  </button>
                )}
              </div>
              <input
                className="cl-field"
                placeholder="문항을 입력하세요. ex) 지원 동기 및 입사 후 포부를 서술하시오."
                value={item.q}
                onChange={e => updateQuestion(i, 'q', e.target.value)}
              />
              <div className="cl-textarea-wrap">
                <textarea
                  className="cl-field cl-field--textarea"
                  placeholder="답변을 입력하세요."
                  rows={5}
                  maxLength={1000}
                  value={item.a}
                  onChange={e => updateQuestion(i, 'a', e.target.value)}
                />
                <span className={`cl-char-count${item.a.length >= 900 ? ' cl-char-count--warn' : ''}`}>
                  {item.a.length} / 1000자
                </span>
              </div>
            </div>
          ))}

          <button className="cl-add-btn" onClick={addQuestion} disabled={questions.length >= 5}>
            <Plus size={15} /> 문항 추가 ({questions.length}/5)
          </button>

          {apiError && (
            <p className="cl-api-error"><AlertCircle size={13} /> {apiError}</p>
          )}

          <button className="cl-btn cl-btn--primary" disabled={!canSubmit || isLoading} onClick={handleSubmit}>
            {isLoading ? <Loader2 size={15} className="cl-btn__spinner" /> : <Send size={15} />}
            AI 분석 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
