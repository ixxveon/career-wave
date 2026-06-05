import { useEffect, useMemo, useState } from 'react';
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
import { careerHistoryApi } from '../../api/careerHistoryApi';
import './CareerDiagnosis.css';

const filters = ['전체', '기술면접', '인성면접', '프로젝트면접'];
const jobOptions = ['전체 직무', '백엔드 개발자', '프론트엔드 개발자', '풀스택 개발자', '서비스 기획자'];

const periodTabs = [
  { key: 'weekly', label: '주별' },
  { key: 'monthly', label: '월별' },
  { key: 'yearly', label: '연도별' },
];

const statusLabels = {
  CREATED: '기록 생성',
  ANALYZED: '분석 완료',
  COMPLETED: '로드맵 완료',
  ARCHIVED: '보관됨',
};

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

function DiagnosisHistoryPage() {
  const [period, setPeriod] = useState('weekly');
  const [activeFilter, setActiveFilter] = useState('전체');
  const [companyName, setCompanyName] = useState('');
  const [practiceDate, setPracticeDate] = useState('');
  const [jobTitle, setJobTitle] = useState('전체 직무');
  const [records, setRecords] = useState([]);
  const [competency, setCompetency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      careerHistoryApi.getHistories({
        activityType: activeFilter,
        companyName,
        practiceDate,
        jobTitle,
      }),
      careerHistoryApi.getCompetencyReport(),
    ])
      .then(([historyRecords, competencyReport]) => {
        if (!active) return;
        setRecords(historyRecords);
        setCompetency(competencyReport);
      })
      .catch(() => {
        if (active) setError('취업 준비 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeFilter, companyName, jobTitle, practiceDate]);

  const latestScore = records[0]?.score ?? competency?.interviewScore;
  const growthStats = useMemo(() => {
    const scores = records.map((record) => record.score);
    if (!scores.length) return [];
    const latestDifference = records[0].score - records[0].previousScore;
    return [
      { label: '최고 점수', value: `${Math.max(...scores)}점` },
      { label: '최저 점수', value: `${Math.min(...scores)}점` },
      { label: '최근 변화', value: `${latestDifference >= 0 ? '+' : ''}${latestDifference}점` },
      { label: '종합 점수', value: `${competency?.totalScore ?? '-'}점` },
    ];
  }, [competency, records]);

  return (
    <section className="support-page">
      <header className="support-hero">
        <div>
          <p className="support-eyebrow">CAREER HISTORY</p>
          <h1>취업 준비 기록</h1>
          <p>날짜, 기업, 직무별로 취업 준비 기록을 찾고 AI 피드백과 성장 변화를 복습하세요.</p>
        </div>
        <div className="support-hero__summary">
          <span>최근 면접 총점</span>
          <strong>{latestScore ? `${latestScore}점` : '-'}</strong>
        </div>
      </header>

      <section className="insight-grid" aria-label="누적 성장 요약">
        <article>
          <span>최근 성장</span>
          <strong>{records[0] ? `${records[0].score - records[0].previousScore >= 0 ? '+' : ''}${records[0].score - records[0].previousScore}점` : '-'}</strong>
          <p>{records[0] ? `직전 면접 ${records[0].previousScore}점 -> 최근 면접 ${records[0].score}점` : '분석할 기록이 없습니다.'}</p>
        </article>
        <article>
          <span>반복 약점</span>
          <strong>{competency?.weaknesses?.[0] ?? '-'}</strong>
          <p>{competency?.weaknesses?.[1] ?? '분석 데이터가 필요합니다.'}</p>
        </article>
        <article>
          <span>다음 학습</span>
          <strong>{competency?.priorityTargets?.[0] ?? '-'}</strong>
          <p>{competency?.priorityTargets?.[1] ?? '추천 학습 데이터가 필요합니다.'}</p>
        </article>
      </section>

      <div className="history-toolbar history-toolbar--stacked">
        <div className="history-filters" aria-label="면접 유형 필터">
          {filters.map((filter) => (
            <button className={filter === activeFilter ? 'is-active' : ''} key={filter} type="button" onClick={() => setActiveFilter(filter)}>
              {filter}
            </button>
          ))}
        </div>

        <div className="search-controls">
          <label className="date-filter">
            <CalendarDays size={18} />
            <input aria-label="날짜 선택" type="date" value={practiceDate} onChange={(event) => setPracticeDate(event.target.value)} />
          </label>
          <label className="date-filter">
            <Building2 size={18} />
            <input aria-label="기업명 검색" placeholder="기업명 검색" type="search" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
          </label>
          <label className="date-filter">
            <SlidersHorizontal size={18} />
            <select aria-label="직무 선택" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)}>
              {jobOptions.map((job) => (
                <option key={job}>{job}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="record-list">
        {loading && <div className="empty-state">기록을 불러오는 중입니다.</div>}
        {!loading && error && <div className="empty-state empty-state--error">{error}</div>}
        {!loading && !error && records.length === 0 && <div className="empty-state">조건에 맞는 취업 준비 기록이 없습니다.</div>}
        {!loading && !error && records.map((record) => {
          const scoreDiff = record.score - record.previousScore;

          return (
            <article className="record-card" key={record.id}>
              <div className="record-card__main">
                <div className="record-tags">
                  <span className="record-type">{record.activityType}</span>
                  <span className="record-type record-type--muted">{record.jobTitle}</span>
                  <span className="record-type record-type--muted">{statusLabels[record.status] ?? record.status}</span>
                </div>
                <h2>{record.title} · {record.companyName}</h2>
                <p className="record-meta">
                  {record.practiceDate} · {record.companyName} · 총점 {record.score}점
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
                  <Link className="support-button support-button--primary" to={`/career-diagnosis/detail/${record.id}`}>
                    <Search size={16} />
                    결과 상세보기
                  </Link>
                  <Link className="support-button support-button--secondary" to={`/career-diagnosis/report?record=${record.id}`}>
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
            <LineChart data={competency?.growthTrend?.[period] ?? []} margin={{ top: 10, right: 22, left: -18, bottom: 0 }}>
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
          {competency ? `서류 ${competency.documentScore}점, 면접 ${competency.interviewScore}점 기준 종합 역량은 ${competency.totalScore}점입니다.` : '역량 평가 데이터가 없습니다.'}
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

export default DiagnosisHistoryPage;
