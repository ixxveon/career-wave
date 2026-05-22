import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, RotateCcw, BarChart2,
  CheckCircle2, AlertCircle, Clock, Calendar,
} from 'lucide-react';
import './InterviewReportPage.css';

/* ── Mock 데이터 ── */
const MOCK_REPORT = {
  job:       '카카오 · 백엔드 개발자',
  type:      'text',
  date:      '2026.05.22',
  duration:  '12분',
  score:     78,
  categories: [
    { label: '기술력',    score: 76, desc: '기술 용어 사용은 정확하나 깊이가 부족해요.' },
    { label: '답변력',    score: 82, desc: 'STAR 구조가 잘 활용됐어요.' },
    { label: '태도/전달', score: 74, desc: '답변 속도를 조금 낮추면 더 좋을 것 같아요.' },
  ],
  good: [
    'STAR 구조를 활용해 답변이 명확했어요.',
    '기술 용어를 정확하게 사용했어요.',
    '지원 동기가 구체적이고 설득력 있었어요.',
  ],
  improve: [
    '답변 속도가 다소 빠른 편이에요. 호흡을 조절해보세요.',
    'Q3 꼬리질문에 대한 대응이 약했어요.',
    '구체적인 수치나 성과를 더 언급하면 좋아요.',
  ],
  qna: [
    { q: '간단한 자기소개와 지원 동기를 말씀해주세요.', a: '안녕하세요, 저는 3년간 스타트업에서 백엔드 개발을 경험한 이가연입니다. 대규모 트래픽 처리 경험을 쌓고 싶어 카카오에 지원했습니다.', score: 82, feedback: 'STAR 구조가 잘 활용되었으며 지원 동기가 명확해요.' },
    { q: '가장 어려웠던 기술적 문제와 해결 과정을 말씀해주세요.', a: 'DB 쿼리 병목 문제가 있었는데, 인덱스 최적화와 캐싱 레이어 추가로 응답시간을 80% 개선했습니다.', score: 85, feedback: '구체적인 수치 제시가 인상적이에요. 시도했다가 실패한 방법도 언급하면 더 풍부해져요.' },
    { q: '본인의 기술적 강점과 약점은 무엇인가요?', a: '강점은 문제 해결 능력이고 약점은 프론트엔드 경험이 부족하다는 점입니다.', score: 65, feedback: '약점 언급 시 보완 노력을 함께 이야기하면 훨씬 좋아요. 조금 더 구체성이 필요해요.' },
    { q: '협업 중 갈등 상황이 생겼을 때 어떻게 해결하셨나요?', a: '팀원과 코드 스타일 충돌이 있었을 때 팀 컨벤션을 문서화하여 해결했습니다.', score: 80, feedback: '해결 과정이 구체적이고 좋아요.' },
    { q: '입사 후 커리어 목표는 어떻게 되시나요?', a: '3년 내에 카카오의 핵심 서비스 아키텍처를 담당하는 개발자가 되고 싶습니다.', score: 78, feedback: '목표가 명확해요. 단기/중기/장기 목표를 나눠 얘기하면 더 인상적이에요.' },
  ],
};

function scoreGrade(score) {
  if (score >= 85) return { label: '우수', cls: 'A' };
  if (score >= 75) return { label: '양호', cls: 'B' };
  if (score >= 60) return { label: '보통', cls: 'C' };
  return               { label: '노력 필요', cls: 'D' };
}

function ScoreBar({ score }) {
  const g = scoreGrade(score);
  return (
    <div className="ir-bar">
      <div className="ir-bar__track">
        <div className={`ir-bar__fill is-${g.cls}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`ir-bar__num is-${g.cls}`}>{score}점</span>
    </div>
  );
}

function QnaItem({ item, index }) {
  const [open, setOpen] = useState(false);
  const g = scoreGrade(item.score);

  return (
    <div className={`ir-qna ${open ? 'is-open' : ''}`}>
      <button className="ir-qna__head" onClick={() => setOpen(v => !v)} type="button">
        <span className={`ir-qna__score is-${g.cls}`}>{item.score}점</span>
        <span className="ir-qna__q">Q{index + 1}. {item.q}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="ir-qna__body">
          <div className="ir-qna__answer">
            <span>내 답변</span>
            <p>{item.a}</p>
          </div>
          <div className="ir-qna__feedback">
            <span>AI 피드백</span>
            <p>{item.feedback}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InterviewReportPage() {
  const navigate = useNavigate();
  const r = MOCK_REPORT;
  const g = scoreGrade(r.score);

  return (
    <div className="ir-page page">

      {/* ── 헤더 ── */}
      <div className="ir-header">
        <div className="ir-header__info">
          <span className="eyebrow">INTERVIEW REPORT</span>
          <h1>{r.job}</h1>
          <div className="ir-header__meta">
            <span><Calendar size={13} /> {r.date}</span>
            <span><Clock size={13} /> {r.duration}</span>
            <span className={`ir-type is-${r.type}`}>
              {r.type === 'text' ? '텍스트 면접' : '영상 면접'}
            </span>
          </div>
        </div>
        <div className="ir-header__actions">
          <button className="ir-btn ir-btn--ghost" onClick={() => navigate('/interview')} type="button">
            <BarChart2 size={14} /> 히스토리
          </button>
          <button className="ir-btn ir-btn--primary" onClick={() => navigate('/interview/text')} type="button">
            <RotateCcw size={14} /> 다시 면접
          </button>
        </div>
      </div>

      {/* ── 점수 + 카테고리 ── */}
      <div className="ir-score-section">

        {/* 종합 점수 */}
        <div className="ir-total">
          <div className={`ir-circle is-${g.cls}`}>
            <strong>{r.score}</strong>
            <span>{g.label}</span>
          </div>
          <div className="ir-total__label">종합 점수</div>
        </div>

        {/* 카테고리별 */}
        <div className="ir-categories">
          {r.categories.map(({ label, score, desc }) => (
            <div key={label} className="ir-category">
              <div className="ir-category__top">
                <span className="ir-category__label">{label}</span>
              </div>
              <ScoreBar score={score} />
              <p className="ir-category__desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 잘한 점 / 개선할 점 ── */}
      <div className="ir-feedback-grid">
        <div className="ir-feedback ir-feedback--good">
          <h3><CheckCircle2 size={15} /> 잘한 점</h3>
          <ul>
            {r.good.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
        <div className="ir-feedback ir-feedback--improve">
          <h3><AlertCircle size={15} /> 개선할 점</h3>
          <ul>
            {r.improve.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      </div>

      {/* ── Q&A 상세 ── */}
      <div className="ir-section">
        <h2 className="ir-section__title">Q&A 상세 피드백</h2>
        <div className="ir-qna-list">
          {r.qna.map((item, i) => (
            <QnaItem key={i} item={item} index={i} />
          ))}
        </div>
      </div>

    </div>
  );
}
