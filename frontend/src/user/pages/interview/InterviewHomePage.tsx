import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InterviewHomePage.css';
import {
  MessageSquare, Video, ChevronRight, Lightbulb,
  FileText, User, Zap, ClipboardList, X,
} from 'lucide-react';
import type { PlanLimits, MockUser, HistoryItem } from '../../types/interview';

/* ── 멤버십별 월 이용 한도 ─────────────────────────
   FREE    : 서류 분석  1회 / 면접 1회
   PREMIUM : 서류 분석 20회 / 면접 10회
──────────────────────────────────────────────── */
const PLAN_LIMITS: PlanLimits = {
  FREE:    { document: 1,  interview: 1  },
  PREMIUM: { document: 20, interview: 10 },
};

/* ── Mock 유저 (백엔드 연동 전 임시 데이터) ──────── */
const MOCK_USER: MockUser = {
  name:          '김지원',
  membership:    'PREMIUM',
  documentUsed:  7,
  interviewUsed: 3,
};

const mockHistory: HistoryItem[] = [
  { date: '05-22', type: 'video', typeLabel: '비디오 면접', target: '토스 (백엔드)', score: 88 },
  { date: '05-20', type: 'text',  typeLabel: '텍스트 면접', target: '카카오 (백엔드)', score: 75 },
  { date: '05-18', type: 'text',  typeLabel: '텍스트 면접', target: '네이버 (인턴)',   score: 62 },
];

function scoreClass(s: number): string {
  return s >= 80 ? 'iv-score--high' : s >= 65 ? 'iv-score--mid' : 'iv-score--low';
}

interface ComingSoonModalProps {
  onClose: () => void;
  onTextStart: () => void;
}

function ComingSoonModal({ onClose, onTextStart }: ComingSoonModalProps) {
  return (
    <div className="iv-cs-overlay" onClick={onClose}>
      <div className="iv-cs-modal" onClick={e => e.stopPropagation()}>
        <button className="iv-cs-modal__close" onClick={onClose}><X size={18} /></button>
        <div className="iv-cs-modal__badge">COMING SOON</div>
        <h3 className="iv-cs-modal__title">AI 비디오 면접</h3>
        <p className="iv-cs-modal__desc">
          웹캠·마이크를 활용한 AI 화상 면접 기능을<br />
          현재 열심히 개발 중이에요!<br />
          그 전에 텍스트 면접으로 먼저 연습해보세요.
        </p>
        <button className="iv-cs-modal__cta" onClick={() => { onClose(); onTextStart(); }}>
          텍스트 면접 시작하기 →
        </button>
      </div>
    </div>
  );
}

function InterviewHomePage() {
  const navigate = useNavigate();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const { membership, documentUsed, interviewUsed } = MOCK_USER;
  const limits      = PLAN_LIMITS[membership];
  const isPremium   = membership === 'PREMIUM';

  /* 사용량 퍼센트 (최대 100%) */
  const docPct  = Math.min((documentUsed  / limits.document)  * 100, 100);
  const ivPct   = Math.min((interviewUsed / limits.interview) * 100, 100);

  return (
    <div className="iv-home">
      {showComingSoon && (
        <ComingSoonModal
          onClose={() => setShowComingSoon(false)}
          onTextStart={() => navigate('/interview/text')}
        />
      )}

      {/* ── Hero ── */}
      <section className="iv-hero">
        <div className="iv-hero__deco iv-hero__deco--1" />
        <div className="iv-hero__deco iv-hero__deco--2" />

        <div className="iv-hero__left">
          <span className="iv-hero__eyebrow">AI INTERVIEW</span>
          <h1 className="iv-hero__title">
            안녕하세요, {MOCK_USER.name}님!<br />
            오늘 어떤 면접을 연습할까요?
          </h1>
          <p className="iv-hero__sub">
            AI가 이력서와 타겟 공고를 분석해 맞춤 질문을 실시간 생성합니다.
          </p>
        </div>

        <div className="iv-hero__stats">
          <div className="iv-stat">
            <span className="iv-stat__value">88점</span>
            <span className="iv-stat__label">최고 점수</span>
          </div>
          <div className="iv-stat">
            <span className="iv-stat__value">3회</span>
            <span className="iv-stat__label">총 연습</span>
          </div>
          <div className={`iv-stat${isPremium ? ' iv-stat--premium' : ''}`}>
            <span className="iv-stat__value">{membership}</span>
            <span className="iv-stat__label">멤버십</span>
          </div>
        </div>
      </section>

      {/* ── 준비 상태 + 퀵스타트 ── */}
      <div className="iv-grid-2">

        {/* 내 준비 상태 */}
        <div className="iv-card">
          <h2 className="iv-card__title">
            <span className="iv-card__icon-wrap iv-card__icon-wrap--blue"><User size={16} /></span>
            내 준비 상태
          </h2>
          <ul className="iv-status-list">
            <li className="iv-status-item">
              <span className="iv-status-item__label">연결된 이력서</span>
              <span className="iv-status-item__value iv-status-item__value--file">
                <FileText size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                이력서_최종본.pdf
              </span>
            </li>
            <li className="iv-status-item">
              <span className="iv-status-item__label">이력서 완성도</span>
              <div className="iv-progress-wrap">
                <div className="iv-progress">
                  <div className="iv-progress__bar" style={{ width: '75%' }} />
                </div>
                <span className="iv-status-item__value">75%</span>
              </div>
            </li>
            <li className="iv-status-item">
              <span className="iv-status-item__label">목표 직무</span>
              <span className="iv-status-item__value">백엔드 개발자</span>
            </li>
            <li className="iv-status-item">
              <span className="iv-status-item__label">멤버십</span>
              <span className={`iv-status-item__value iv-status-item__value--${isPremium ? 'premium' : 'free'}`}>
                {membership}
              </span>
            </li>

            {/* ── 이번 달 서류 분석 사용량 ── */}
            <li className="iv-status-item iv-status-item--usage">
              <span className="iv-status-item__label">이번 달 서류 분석</span>
              <div className="iv-quota-wrap">
                <div className="iv-quota-bar">
                  <div
                    className={`iv-quota-bar__fill${docPct >= 90 ? ' iv-quota-bar__fill--warn' : ''}`}
                    style={{ width: `${docPct}%` }}
                  />
                </div>
                <span className={`iv-quota-count${docPct >= 90 ? ' iv-quota-count--warn' : ''}`}>
                  {documentUsed} / {limits.document}회
                </span>
              </div>
            </li>

            {/* ── 이번 달 AI 면접 사용량 ── */}
            <li className="iv-status-item iv-status-item--usage">
              <span className="iv-status-item__label">이번 달 AI 면접</span>
              <div className="iv-quota-wrap">
                <div className="iv-quota-bar">
                  <div
                    className={`iv-quota-bar__fill${ivPct >= 90 ? ' iv-quota-bar__fill--warn' : ''}`}
                    style={{ width: `${ivPct}%` }}
                  />
                </div>
                <span className={`iv-quota-count${ivPct >= 90 ? ' iv-quota-count--warn' : ''}`}>
                  {interviewUsed} / {limits.interview}회
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* 퀵 스타트 */}
        <div className="iv-card iv-card--dark">
          <h2 className="iv-card__title iv-card__title--light">
            <span className="iv-card__icon-wrap iv-card__icon-wrap--glow"><Zap size={16} /></span>
            퀵 스타트
            <span className="iv-card__subtitle iv-card__subtitle--light">면접 바로 시작하기</span>
          </h2>
          <div className="iv-qs-list">
            <button className="iv-mode-card iv-mode-card--text" onClick={() => navigate('/interview/text')}>
              <div className="iv-mode-card__deco" />
              <div className="iv-mode-card__icon"><MessageSquare size={22} /></div>
              <div className="iv-mode-card__body">
                <p className="iv-mode-card__label">AI 텍스트 · 음성 면접</p>
                <p className="iv-mode-card__desc">타이핑 또는 마이크로 답변, 채팅 스타일</p>
              </div>
              <span className="iv-mode-card__cta">시작하기 <ChevronRight size={14} /></span>
            </button>
            <button className="iv-mode-card iv-mode-card--video" onClick={() => setShowComingSoon(true)}>
              <div className="iv-mode-card__deco" />
              <div className="iv-mode-card__icon"><Video size={22} /></div>
              <div className="iv-mode-card__body">
                <p className="iv-mode-card__label">AI 비디오 면접 시작</p>
                <p className="iv-mode-card__desc">웹캠/마이크 사용, 시선 및 태도 분석</p>
              </div>
              <span className="iv-mode-card__cta">시작하기 <ChevronRight size={14} /></span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 최근 히스토리 ── */}
      <div className="iv-card">
        <h2 className="iv-card__title">
          <span className="iv-card__icon-wrap iv-card__icon-wrap--green"><ClipboardList size={16} /></span>
          최근 연습 히스토리
          <span className="iv-card__subtitle">최신 3개</span>
        </h2>
        <div className="iv-table-wrap"><table className="iv-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>면접 종류</th>
              <th>타겟 기업/직무</th>
              <th>점수</th>
              <th>리포트 보기</th>
            </tr>
          </thead>
          <tbody>
            {mockHistory.map((row, i) => (
              <tr key={i}>
                <td className="iv-table__date">{row.date}</td>
                <td><span className={`iv-badge iv-badge--${row.type}`}>{row.typeLabel}</span></td>
                <td>{row.target}</td>
                <td><span className={`iv-score ${scoreClass(row.score)}`}>{row.score}점</span></td>
                <td><button className="iv-report-btn" onClick={() => navigate('/interview/report')}>결과 보기</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {/* ── AI 팁 ── */}
      <div className="iv-tip">
        <div className="iv-tip__icon"><Lightbulb size={20} /></div>
        <div className="iv-tip__body">
          <p className="iv-tip__label">오늘의 AI 추천 면접 팁</p>
          <p className="iv-tip__text">
            000님은 지난 면접에서 &apos;기술적 예외 처리&apos; 답변 시 목소리 떨림이 있었습니다.<br />
            오늘은 텍스트 모드로 답변 논리 구조를 먼저 배대 잡고 시작하는 걸 추천해요!
          </p>
          <button className="iv-tip__cta" onClick={() => navigate('/interview/text')}>추천 질문 연습하기 →</button>
        </div>
      </div>

    </div>
  );
}

export default InterviewHomePage;
