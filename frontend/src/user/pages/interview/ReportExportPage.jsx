import { Download, FileCheck2, History, LineChart as LineChartIcon, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
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

const records = [
  { id: 'backend-20260522', label: '백엔드 개발자 모의면접 · 사람인 · 2026.05.22', score: 82 },
  { id: 'frontend-20260520', label: '프론트엔드 개발자 모의면접 · 원티드 · 2026.05.20', score: 76 },
  { id: 'personality-20260518', label: '백엔드 개발자 인성면접 · 카카오페이 · 2026.05.18', score: 79 },
];

const reportTypes = ['면접 결과 리포트', '종합 취업 진단 리포트'];

const optionItems = [
  { key: 'interview', label: '면접 결과' },
  { key: 'feedback', label: 'AI 피드백' },
  { key: 'scores', label: '세부 점수' },
  { key: 'questions', label: '질문/답변 요약' },
  { key: 'improvement', label: '개선 방향' },
  { key: 'roadmap', label: '추천 학습 로드맵' },
  { key: 'growth', label: '누적 성장 변화' },
];

const periodTabs = [
  { key: 'weekly', label: '주별' },
  { key: 'monthly', label: '월별' },
  { key: 'yearly', label: '연도별' },
];

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

function ReportExportPage() {
  const queryRecord = new URLSearchParams(useLocation().search).get('record');
  const [selectedRecord, setSelectedRecord] = useState(queryRecord || records[0].id);
  const [reportType, setReportType] = useState(reportTypes[1]);
  const [period, setPeriod] = useState('weekly');
  const [options, setOptions] = useState({
    interview: true,
    feedback: true,
    scores: true,
    questions: true,
    improvement: true,
    roadmap: true,
    growth: true,
  });

  const currentRecord = useMemo(
    () => records.find((record) => record.id === selectedRecord) || records[0],
    [selectedRecord],
  );

  const selectedOptions = optionItems.filter((item) => options[item.key]).map((item) => item.label);

  const toggleOption = (key) => {
    setOptions((current) => ({ ...current, [key]: !current[key] }));
  };

  const downloadReport = () => {
    const printableReport = window.open('', '_blank', 'width=860,height=720');

    if (!printableReport) {
      return;
    }

    printableReport.document.write(`
      <html lang="ko">
        <head>
          <title>Career Wave 종합 진단 리포트</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1f2937; padding: 40px; line-height: 1.7; }
            h1 { color: #1e3a5f; }
            h2 { margin-top: 28px; color: #1e3a5f; }
            dl { display: grid; gap: 12px; }
            div { display: grid; grid-template-columns: 150px 1fr; gap: 16px; }
            dt { color: #6b7280; font-weight: 700; }
            dd { margin: 0; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>고은별님의 백엔드 개발자 면접 준비 리포트</h1>
          <dl>
            <div><dt>리포트 유형</dt><dd>${reportType}</dd></div>
            <div><dt>최근 기록</dt><dd>${currentRecord.label}</dd></div>
            <div><dt>최근 면접 총점</dt><dd>${currentRecord.score}점</dd></div>
            <div><dt>강점</dt><dd>기본 개념 이해도</dd></div>
            <div><dt>보완점</dt><dd>프로젝트 적용 사례 설명</dd></div>
            <div><dt>추천 학습</dt><dd>JPA, Spring Security, 배포 경험 정리</dd></div>
            <div><dt>포함 항목</dt><dd>${selectedOptions.join(', ') || '선택 항목 없음'}</dd></div>
          </dl>
          <h2>누적 변화</h2>
          <p>최근 3회 점수는 79점, 76점, 82점으로 회복세입니다. 반복 약점은 답변 구체성과 프로젝트 결과 지표 설명입니다.</p>
        </body>
      </html>
    `);
    printableReport.document.close();
    printableReport.focus();
    printableReport.print();
  };

  return (
    <section className="support-page">
      <header className="support-hero">
        <div>
          <p className="support-eyebrow">REPORT EXPORT</p>
          <h1>종합 진단 리포트</h1>
          <p>면접 결과, AI 피드백, 개선 방향, 학습 로드맵을 한 장의 진단 리포트로 정리하세요.</p>
        </div>
        <button className="support-button support-button--primary" type="button" onClick={downloadReport}>
          <Download size={16} />
          PDF 다운로드
        </button>
      </header>

      <div className="report-layout">
        <section className="report-panel">
          <div className="section-title">
            <Settings2 size={21} />
            <h2>리포트 생성 옵션</h2>
          </div>

          <div className="segment-control" aria-label="리포트 유형 선택">
            {reportTypes.map((type) => (
              <button className={reportType === type ? 'is-active' : ''} key={type} type="button" onClick={() => setReportType(type)}>
                {type}
              </button>
            ))}
          </div>

          <label className="select-field">
            <span>최근 기록 선택</span>
            <select value={selectedRecord} onChange={(event) => setSelectedRecord(event.target.value)}>
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.label}
                </option>
              ))}
            </select>
          </label>

          <div className="option-list">
            {optionItems.map((item) => (
              <label className="check-row" key={item.key}>
                <input checked={options[item.key]} type="checkbox" onChange={() => toggleOption(item.key)} />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="report-panel report-preview">
          <div className="section-title">
            <FileCheck2 size={21} />
            <h2>리포트 미리보기</h2>
          </div>
          <div className="preview-title">고은별님의 백엔드 개발자 면접 준비 리포트</div>
          <dl>
            <div>
              <dt>리포트 유형</dt>
              <dd>{reportType}</dd>
            </div>
            <div>
              <dt>준비 기업</dt>
              <dd>사람인, 원티드, 카카오페이</dd>
            </div>
            <div>
              <dt>최근 면접 총점</dt>
              <dd>{currentRecord.score}점</dd>
            </div>
            <div>
              <dt>강점</dt>
              <dd>기본 개념 이해도</dd>
            </div>
            <div>
              <dt>보완점</dt>
              <dd>프로젝트 적용 사례 설명</dd>
            </div>
            <div>
              <dt>추천 학습</dt>
              <dd>JPA, Spring Security, 배포 경험 정리</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="generated-history">
        <div className="growth-summary__header">
          <div className="section-title">
            <LineChartIcon size={21} />
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

        <div className="growth-chart" aria-label="진단 리포트 누적 성장 변화 선 그래프">
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
        <p>최근 기록 기준으로 점수는 회복세이며, 반복 약점은 답변 구체성과 프로젝트 적용 사례 설명입니다.</p>
        <div className="growth-summary__grid growth-summary__grid--compact">
          {growthStats.map((stat) => (
            <article key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="generated-history">
        <div className="section-title">
          <History size={21} />
          <h2>생성 이력</h2>
        </div>
        <ul>
          <li>2026.05.22 · 백엔드 개발자 모의면접 종합 진단 리포트</li>
          <li>2026.05.20 · 프론트엔드 개발자 면접 결과 리포트</li>
        </ul>
      </section>
    </section>
  );
}

export default ReportExportPage;
