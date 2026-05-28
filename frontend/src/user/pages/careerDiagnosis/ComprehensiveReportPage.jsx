import { Download, FileCheck2, History, LineChart as LineChartIcon, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { careerHistoryApi } from '../../api/careerHistoryApi';
import { reportExportApi } from '../../api/reportExportApi';
import './CareerDiagnosis.css';

const optionItems = [
  { key: 'document', label: '자기소개서 분석 결과' },
  { key: 'interview', label: '면접 분석 결과' },
  { key: 'history', label: '취업 준비 히스토리' },
  { key: 'roadmap', label: '추천 학습 로드맵' },
  { key: 'growth', label: '누적 성장 변화' },
];

const periodTabs = [
  { key: 'weekly', label: '주별' },
  { key: 'monthly', label: '월별' },
  { key: 'yearly', label: '연도별' },
];

const statusLabels = {
  REQUESTED: '생성 요청',
  MAPPED: '데이터 매핑',
  RENDERING: 'PDF 생성 중',
  COMPLETED: '다운로드 가능',
  FAILED: '생성 실패',
  DOWNLOADED: '다운로드 완료',
};

const fallback = (value) => value || '분석 데이터가 아직 없습니다.';

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

function ComprehensiveReportPage() {
  const queryRecord = new URLSearchParams(useLocation().search).get('record');
  const [selectedRecord, setSelectedRecord] = useState(queryRecord || '');
  const [period, setPeriod] = useState('weekly');
  const [records, setRecords] = useState([]);
  const [preview, setPreview] = useState(null);
  const [reportStatus, setReportStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState({
    document: true,
    interview: true,
    history: true,
    roadmap: true,
    growth: true,
  });

  useEffect(() => {
    let active = true;
    Promise.all([careerHistoryApi.getHistories(), reportExportApi.getPreview(queryRecord)])
      .then(([historyRecords, previewData]) => {
        if (!active) return;
        setRecords(historyRecords);
        setSelectedRecord(queryRecord || historyRecords[0]?.id || '');
        setPreview(previewData);
        setReportStatus(previewData.status);
      })
      .catch(() => {
        if (active) setError('종합 진단 리포트 미리보기를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [queryRecord]);

  const currentRecord = useMemo(
    () => records.find((record) => record.id === selectedRecord) || records[0] || null,
    [selectedRecord],
  );

  const selectedOptions = optionItems.filter((item) => options[item.key]).map((item) => item.label);
  const growthStats = useMemo(() => [
    { label: '서류 점수', value: `${preview?.documentAnalysisData?.documentScore ?? '-'}점` },
    { label: '면접 점수', value: `${preview?.interviewAnalysisData?.interviewScore ?? '-'}점` },
    { label: '평균 점수', value: `${preview?.careerHistoryData?.averageScore ?? '-'}점` },
    { label: '연습 기록', value: `${preview?.careerHistoryData?.totalPracticeCount ?? '-'}회` },
  ], [preview]);

  const toggleOption = (key) => {
    setOptions((current) => ({ ...current, [key]: !current[key] }));
    setReportStatus('MAPPED');
  };

  const changeRecord = (recordId) => {
    setSelectedRecord(recordId);
    setReportStatus('MAPPED');
  };

  const createReport = async () => {
    setWorking(true);
    setError('');
    setReportStatus('REQUESTED');

    try {
      const report = await reportExportApi.createReport({ recordId: selectedRecord, options });
      setPreview(report);
      setReportStatus(report.status);
    } catch {
      setReportStatus('FAILED');
      setError('PDF 리포트 생성에 실패했습니다. 다시 생성해 주세요.');
    } finally {
      setWorking(false);
    }
  };

  const downloadReport = async () => {
    if (reportStatus !== 'COMPLETED' && reportStatus !== 'DOWNLOADED') {
      setError('완료된 리포트만 다운로드할 수 있습니다. 먼저 리포트를 생성해 주세요.');
      return;
    }

    const printableReport = window.open('', '_blank', 'width=860,height=720');

    if (!printableReport) {
      setError('브라우저에서 다운로드 창이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.');
      return;
    }

    setWorking(true);
    setError('');
    try {
      await reportExportApi.downloadReport(preview.id);
      setReportStatus('DOWNLOADED');
    } catch {
      printableReport.close();
      setError('PDF 다운로드에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setWorking(false);
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
          <h1>${preview.reportTitle}</h1>
          <dl>
            <div><dt>생성일</dt><dd>${preview.createdAt}</dd></div>
            <div><dt>서류 분석 점수</dt><dd>${preview.documentAnalysisData?.documentScore ?? '-'}점</dd></div>
            <div><dt>면접 분석 점수</dt><dd>${preview.interviewAnalysisData?.interviewScore ?? '-'}점</dd></div>
            <div><dt>평균 점수</dt><dd>${preview.careerHistoryData?.averageScore ?? '-'}점</dd></div>
            <div><dt>강점</dt><dd>${preview.strengths?.join(', ') || '분석 데이터가 아직 없습니다.'}</dd></div>
            <div><dt>보완점</dt><dd>${preview.weaknesses?.join(', ') || '분석 데이터가 아직 없습니다.'}</dd></div>
            <div><dt>추천 학습</dt><dd>${preview.careerHistoryData?.priorityTargets?.join(', ') || '분석 데이터가 아직 없습니다.'}</dd></div>
            <div><dt>포함 항목</dt><dd>${selectedOptions.join(', ') || '선택 항목 없음'}</dd></div>
          </dl>
          <h2>누적 변화</h2>
          <p>${fallback(preview.careerHistoryData?.roadmapSummary)}</p>
        </body>
      </html>
    `);
    printableReport.document.close();
    printableReport.focus();
    printableReport.print();
    setWorking(false);
  };

  if (loading) return <section className="support-page"><div className="empty-state">리포트 미리보기를 불러오는 중입니다.</div></section>;

  return (
    <section className="support-page">
      <header className="support-hero">
        <div>
          <p className="support-eyebrow">REPORT EXPORT</p>
          <h1>종합 진단 리포트</h1>
          <p>서류 분석, 면접 분석, 취업 히스토리, 학습 로드맵을 한 장의 진단 리포트로 정리하세요.</p>
        </div>
        <div className="report-actions">
          <span className="report-status">{statusLabels[reportStatus] ?? '미생성'}</span>
          <button
            className="support-button support-button--secondary"
            type="button"
            onClick={createReport}
            disabled={working || reportStatus === 'COMPLETED' || reportStatus === 'DOWNLOADED'}
          >
            {working ? '처리 중...' : '리포트 생성'}
          </button>
          <button
            className="support-button support-button--primary"
            type="button"
            onClick={downloadReport}
            disabled={working || (reportStatus !== 'COMPLETED' && reportStatus !== 'DOWNLOADED')}
          >
            <Download size={16} />
            PDF 다운로드
          </button>
        </div>
      </header>

      {error && <div className="empty-state empty-state--error">{error}</div>}

      <div className="report-layout">
        <section className="report-panel">
          <div className="section-title">
            <Settings2 size={21} />
            <h2>리포트 생성 옵션</h2>
          </div>

          <label className="select-field">
            <span>기준 취업 준비 기록 선택</span>
            <select value={selectedRecord} onChange={(event) => changeRecord(event.target.value)}>
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.title} · {record.companyName} · {record.practiceDate}
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
          <div className="preview-title">{fallback(preview?.reportTitle)}</div>
          <dl>
            <div>
              <dt>생성일</dt>
              <dd>{fallback(preview?.createdAt)}</dd>
            </div>
            <div>
              <dt>대상 직무</dt>
              <dd>{fallback(preview?.userProfile?.targetRole)}</dd>
            </div>
            <div>
              <dt>최근 면접 총점</dt>
              <dd>{currentRecord ? `${currentRecord.score}점` : '기록 없음'}</dd>
            </div>
            <div>
              <dt>강점</dt>
              <dd>{fallback(preview?.strengths?.join(', '))}</dd>
            </div>
            <div>
              <dt>보완점</dt>
              <dd>{fallback(preview?.weaknesses?.join(', '))}</dd>
            </div>
            <div>
              <dt>추천 학습</dt>
              <dd>{fallback(preview?.careerHistoryData?.priorityTargets?.join(', '))}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="report-domain-grid" aria-label="통합 분석 결과">
        {options.document && (
          <article className="feedback-panel">
            <h2>자기소개서 분석</h2>
            <strong>{preview?.documentAnalysisData?.documentScore ?? '-'}점</strong>
            <p>{fallback(preview?.documentAnalysisData?.contentFeedback)}</p>
            <p>{fallback(preview?.documentAnalysisData?.keywordFeedback)}</p>
          </article>
        )}
        {options.interview && (
          <article className="feedback-panel">
            <h2>면접 분석</h2>
            <strong>{preview?.interviewAnalysisData?.interviewScore ?? '-'}점</strong>
            <p>{fallback(preview?.interviewAnalysisData?.attitudeFeedback)}</p>
            <p>{fallback(preview?.interviewAnalysisData?.answerFeedback)}</p>
          </article>
        )}
        {options.history && (
          <article className="feedback-panel">
            <h2>취업 히스토리</h2>
            <strong>{preview?.careerHistoryData?.totalPracticeCount ?? '-'}회</strong>
            <p>평균 점수: {preview?.careerHistoryData?.averageScore ?? '-'}점</p>
            <p>{fallback(preview?.careerHistoryData?.roadmapSummary)}</p>
          </article>
        )}
      </section>

      {options.roadmap && (
        <section className="feedback-panel">
          <div className="section-title">
            <Settings2 size={21} />
            <h2>맞춤형 로드맵 요약</h2>
          </div>
          <p>{fallback(preview?.careerHistoryData?.roadmapSummary)}</p>
          <div className="roadmap-list roadmap-list--report">
            {preview?.roadmap?.slice(0, 4).map((step) => (
              <article key={step.step}>
                <span>{step.label}</span>
                <strong>{step.title}</strong>
                <p>{step.targetSkill}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {options.growth && (
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
            <LineChart data={preview?.careerTrend?.[period] ?? []} margin={{ top: 10, right: 22, left: -18, bottom: 0 }}>
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
        <p>{fallback(preview?.careerHistoryData?.roadmapSummary)}</p>
        <div className="growth-summary__grid growth-summary__grid--compact">
          {growthStats.map((stat) => (
            <article key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </div>
        </section>
      )}

      <section className="generated-history">
        <div className="section-title">
          <History size={21} />
          <h2>생성 이력</h2>
        </div>
        <ul>
          <li>{preview?.createdAt ?? '-'} · {fallback(preview?.reportTitle)} · {statusLabels[reportStatus] ?? '미생성'}</li>
        </ul>
      </section>
    </section>
  );
}

export default ComprehensiveReportPage;
