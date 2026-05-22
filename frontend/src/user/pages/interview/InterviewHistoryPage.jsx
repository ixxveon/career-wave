import { useState } from 'react';
import { BarChart3, Building2, CalendarDays, Download, Search, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './InterviewManagement.css';

const filters = ['전체', '기술면접', '인성면접', '프로젝트면접'];
const jobOptions = ['전체 직무', '백엔드 개발자', '프론트엔드 개발자', '풀스택 개발자', '서비스 기획자'];

const chartData = {
  weekly: [
    { label: '05.18', score: 79, company: '카카오페이', type: '인성면접' },
    { label: '05.20', score: 76, company: '원티드', type: '프로젝트면접' },
    { label: '05.22', score: 82, company: '사람인', type: '기술면접' },
  ],
  monthly: [
    { label: '3월', score: 72, company: '월간 평균', type: '면접 평균' },
    { label: '4월', score: 76, company: '월간 평균', type: '면접 평균' },
    { label: '5월', score: 82, company: '월간 평균', type: '면접 평균' },
  ],
  yearly: [
    { label: '2024', score: 68, company: '연간 평균', type: '취업 준비 진단' },
    { label: '2025', score: 75, company: '연간 평균', type: '취업 준비 진단' },
    { label: '2026', score: 82, company: '연간 평균', type: '취업 준비 진단' },
  ],
};

const periodTabs = [
  { key: 'weekly', label: '주별' },
  { key: 'monthly', label: '월별' },
  { key: 'yearly', label: '연도별' },
];

const interviewRecords = [
  {
    id: 'backend-20260522',
    type: '기술면접',
    job: '백엔드 개발자',
    company: '사람인',
    date: '2026.05.22',
    score: 82,
    previousScore: 76,
    summary: '기술 개념은 이해하고 있지만 구체적인 프로젝트 사례가 부족합니다.',
    weakness: 'JPA 영속성 컨텍스트, Spring Security 인증 흐름',
  },
  {
    id: 'frontend-20260520',
    type: '프로젝트면접',
    job: '프론트엔드 개발자',
    company: '원티드',
    date: '2026.05.20',
    score: 76,
    previousScore: 74,
    summary: 'React 상태관리 설명은 가능하지만 선택 이유와 성능 개선 경험 보완이 필요합니다.',
    weakness: '상태관리 선택 기준, 렌더링 최적화',
  },
  {
    id: 'personality-20260518',
    type: '인성면접',
    job: '백엔드 개발자',
    company: '카카오페이',
    date: '2026.05.18',
    score: 79,
    previousScore: 81,
    summary: '협업 경험은 좋지만 갈등 상황에서의 행동과 결과가 조금 더 필요합니다.',
    weakness: 'STAR 답변 구조, 협업 사례 정리',
  },
];

const growthStats = [
  { label: '최고 점수', value: '82점' },
  { label: '최저 점수', value: '76점' },
  { label: '최근 변화', value: '+6점' },
  { label: '평균 점수', value: '79점' },
];

function GrowthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="growth-tooltip">
      <strong>{label}</strong>
      <span>{data.company}</span>
      <span>{data.type}</span>
      <b>{data.score}점</b>
    </div>
  );
}

function InterviewHistoryPage() {
  const [period, setPeriod] = useState('weekly');

  return (
    <section className="support-page">
      <header className="support-hero">
        <div>
          <p className="support-eyebrow">CAREER HISTORY</p>
          <h1>취업 준비 기록</h1>
          <p>날짜, 기업, 직무별로 모의면접 기록을 찾고 AI 피드백과 성장 변화를 복습하세요.</p>
        </div>
        <div className="support-hero__summary">
          <span>최근 면접 총점</span>
          <strong>82점</strong>
        </div>
      </header>

      <section className="insight-grid" aria-label="누적 성장 요약">
        <article>
          <span>최근 성장</span>
          <strong>+6점</strong>
          <p>직전 면접 76점 → 최근 면접 82점</p>
        </article>
        <article>
          <span>반복 약점</span>
          <strong>답변 구체성</strong>
          <p>프로젝트 적용 사례 설명 보완 필요</p>
        </article>
        <article>
          <span>다음 학습</span>
          <strong>JPA</strong>
          <p>최근 면접에서 영속성 컨텍스트 설명 부족</p>
        </article>
      </section>

      <div className="history-toolbar history-toolbar--stacked">
        <div className="history-filters" aria-label="면접 유형 필터">
          {filters.map((filter) => (
            <button className={filter === '전체' ? 'is-active' : ''} key={filter} type="button">
              {filter}
            </button>
          ))}
        </div>

        <div className="search-controls">
          <label className="date-filter">
            <CalendarDays size={18} />
            <input aria-label="날짜 선택" type="date" />
          </label>
          <label className="date-filter">
            <Building2 size={18} />
            <input aria-label="기업명 검색" placeholder="기업명 검색" type="search" />
          </label>
          <label className="date-filter">
            <SlidersHorizontal size={18} />
            <select aria-label="직무 선택" defaultValue="전체 직무">
              {jobOptions.map((job) => (
                <option key={job}>{job}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="record-list">
        {interviewRecords.map((record) => {
          const scoreDiff = record.score - record.previousScore;

          return (
            <article className="record-card" key={record.id}>
              <div className="record-card__main">
                <div className="record-tags">
                  <span className="record-type">{record.type}</span>
                  <span className="record-type record-type--muted">{record.job}</span>
                </div>
                <h2>{record.job} 모의면접 · {record.company}</h2>
                <p className="record-meta">
                  {record.date} · {record.company} · 총점 {record.score}점
                </p>
                <p className="record-summary">{record.summary}</p>
                <p className="record-weakness">추천 복습: {record.weakness}</p>
              </div>

              <div className="record-card__side">
                <div className={`score-change ${scoreDiff >= 0 ? 'is-up' : 'is-down'}`}>
                  <BarChart3 size={18} />
                  <span>이전 대비 {scoreDiff >= 0 ? `+${scoreDiff}` : scoreDiff}점</span>
                </div>
                <div className="record-card__actions">
                  <Link className="support-button support-button--primary" to={`/interview/detail/${record.id}`}>
                    <Search size={16} />
                    결과 상세보기
                  </Link>
                  <Link className="support-button support-button--secondary" to={`/interview/report-export?record=${record.id}`}>
                    <Download size={16} />
                    PDF 리포트
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="growth-summary">
        <div className="growth-summary__header">
          <div>
            <p className="support-eyebrow">AI GROWTH SUMMARY</p>
            <h2>누적 성장 변화</h2>
          </div>
          <div className="period-tabs" aria-label="그래프 기간 선택">
            {periodTabs.map((tab) => (
              <button
                className={period === tab.key ? 'is-active' : ''}
                key={tab.key}
                type="button"
                onClick={() => setPeriod(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="growth-chart" aria-label="기간별 면접 점수 선 그래프">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={chartData[period]} margin={{ top: 10, right: 22, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#e5edf7" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} />
              <YAxis domain={[60, 100]} tickLine={false} width={42} />
              <Tooltip content={<GrowthTooltip />} />
              <Line
                activeDot={{ fill: '#1E3A5F', r: 7, stroke: '#ffffff', strokeWidth: 3 }}
                dataKey="score"
                dot={{ fill: '#1E3A5F', r: 5, stroke: '#ffffff', strokeWidth: 2 }}
                stroke="#5B8DEF"
                strokeWidth={3}
                type="monotone"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="growth-summary__note">
          최근 기록 기준으로 점수는 회복세이며, 반복 약점은 답변 구체성과 프로젝트 적용 사례 설명입니다.
        </p>

        <div className="growth-summary__grid">
          {growthStats.map((stat) => (
            <article key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default InterviewHistoryPage;
