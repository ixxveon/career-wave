import { BookOpenCheck, Crown, FileCheck2, FileText, Lock, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { careerHistoryApi } from '../../api/careerHistoryApi';
import { reportExportApi } from '../../api/reportExportApi';
import './CareerDiagnosis.css';

const reportOptions = [
  { key: 'document', label: '서류 분석 결과' },
  { key: 'interview', label: '면접 분석 결과' },
  { key: 'history', label: '취업 준비 기록' },
  { key: 'roadmap', label: '학습 로드맵' },
  { key: 'growth', label: '성장 추이' },
];

const fallback = (value) => value || '아직 연결된 분석 데이터가 없습니다.';

function getCurrentMembership() {
  const storedMembership =
    localStorage.getItem('membership') ||
    localStorage.getItem('userMembership') ||
    localStorage.getItem('plan') ||
    'FREE';

  return storedMembership.toUpperCase();
}

function ComprehensiveReportPage() {
  const navigate = useNavigate();
  const { id: routeRecordId } = useParams();
  const queryRecord = new URLSearchParams(useLocation().search).get('record');
  const initialRecordId = queryRecord || routeRecordId || '';
  const [selectedRecord, setSelectedRecord] = useState(initialRecordId);
  const [records, setRecords] = useState([]);
  const [detail, setDetail] = useState(null);
  const [preview, setPreview] = useState(null);
  const [membership, setMembership] = useState('FREE');
  const [options, setOptions] = useState({
    document: true,
    interview: true,
    history: true,
    roadmap: true,
    growth: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMembership(getCurrentMembership());

    careerHistoryApi
      .getHistories()
      .then(async (historyRecords) => {
        if (!active) return;
        const initialRecord = queryRecord || routeRecordId || historyRecords[0]?.id || '';
        setRecords(historyRecords);
        setSelectedRecord(initialRecord);

        const [detailData, previewData] = await Promise.all([
          initialRecord ? careerHistoryApi.getHistoryDetail(initialRecord) : Promise.resolve(null),
          reportExportApi.getPreview(initialRecord),
        ]);

        if (!active) return;
        setDetail(detailData);
        setPreview(previewData);
      })
      .catch(() => {
        if (active) setError('종합 진단 리포트를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [queryRecord, routeRecordId]);

  const currentRecord = useMemo(
    () => records.find((record) => record.id === selectedRecord) || records[0] || null,
    [records, selectedRecord],
  );

  const scoreCards = detail?.scores?.length
    ? detail.scores
    : [
        { label: '서류 점수', value: preview?.documentAnalysisData?.documentScore ?? '-', note: 'AI 서류 분석' },
        { label: '면접 점수', value: preview?.interviewAnalysisData?.interviewScore ?? '-', note: 'AI 면접 분석' },
        { label: '평균 점수', value: preview?.careerHistoryData?.averageScore ?? '-', note: '취업 준비 기록' },
      ];

  const changeRecord = async (recordId) => {
    setSelectedRecord(recordId);
    setLoading(true);
    setError('');

    try {
      const [detailData, previewData] = await Promise.all([
        careerHistoryApi.getHistoryDetail(recordId),
        reportExportApi.getPreview(recordId),
      ]);
      setDetail(detailData);
      setPreview(previewData);
      navigate(`/career-diagnosis/report?record=${recordId}`, { replace: true });
    } catch {
      setError('선택한 진단 기록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleOption = (key) => {
    setOptions((current) => ({ ...current, [key]: !current[key] }));
  };

  const isPremium = membership === 'PREMIUM';

  const openPdfFile = async () => {
    if (!isPremium) return;

    await reportExportApi.downloadReport(preview?.id || selectedRecord);

    if (preview?.pdfUrl) {
      window.open(preview.pdfUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const pdfWindow = window.open('', '_blank', 'width=860,height=720');
    if (!pdfWindow) return;

    pdfWindow.document.write(`
      <html lang="ko">
        <head>
          <title>${preview?.fileName || 'career-wave-diagnosis-report.pdf'}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1f2937; padding: 40px; line-height: 1.7; }
            h1, h2 { color: #1e3a5f; }
            dl { display: grid; gap: 12px; }
            div { display: grid; grid-template-columns: 150px 1fr; gap: 16px; }
            dt { color: #6b7280; font-weight: 700; }
            dd { margin: 0; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${preview?.reportTitle || 'Career Wave 종합 진단 리포트'}</h1>
          <dl>
            <div><dt>지원 직무</dt><dd>${preview?.userProfile?.targetRole || currentRecord?.jobTitle || '-'}</dd></div>
            <div><dt>서류 점수</dt><dd>${preview?.documentAnalysisData?.documentScore ?? '-'}</dd></div>
            <div><dt>면접 점수</dt><dd>${preview?.interviewAnalysisData?.interviewScore ?? currentRecord?.score ?? '-'}</dd></div>
            <div><dt>강점</dt><dd>${preview?.strengths?.join(', ') || '-'}</dd></div>
            <div><dt>보완점</dt><dd>${preview?.weaknesses?.join(', ') || currentRecord?.weakness || '-'}</dd></div>
          </dl>
          <h2>AI 종합 피드백</h2>
          <p>${detail?.overallFeedback || currentRecord?.summary || '-'}</p>
        </body>
      </html>
    `);
    pdfWindow.document.close();
    pdfWindow.focus();
  };

  if (loading) {
    return <section className="support-page"><div className="empty-state">종합 진단 리포트를 불러오는 중입니다.</div></section>;
  }

  if (error) {
    return <section className="support-page"><div className="empty-state empty-state--error">{error}</div></section>;
  }

  return (
    <section className="support-page">
      <header className="support-hero">
        <div>
          <p className="support-eyebrow">CAREER DIAGNOSIS</p>
          <h1>진단 상세 · 종합 진단 리포트</h1>
          <p>서류 분석, AI 면접 결과, 취업 준비 기록과 학습 로드맵을 한 화면에서 확인합니다.</p>
        </div>
        <div className="support-hero__summary">
          <span>선택 기록</span>
          <strong>{currentRecord?.practiceDate || '-'}</strong>
        </div>
      </header>

      <section className="feedback-panel premium-report-panel">
        <div className="section-title">
          <Crown size={21} />
          <h2>PDF 리포트 저장</h2>
        </div>
        <p>PDF 다운로드와 보관은 유료 서비스입니다. 프리미엄 구독 후 종합 진단 리포트를 PDF 파일로 저장할 수 있습니다.</p>
        <div className="premium-report-actions">
          <button
            className="support-button support-button--primary"
            type="button"
            disabled={!isPremium}
            onClick={openPdfFile}
          >
            {isPremium ? <FileText size={16} /> : <Lock size={16} />}
            PDF 파일
          </button>
          {!isPremium && <span className="premium-report-lock">유료 회원 전용</span>}
        </div>
      </section>

      <div className="report-layout">
        <section className="report-panel">
          <div className="section-title">
            <Settings2 size={21} />
            <h2>리포트 구성</h2>
          </div>

          <label className="select-field">
            <span>취업 준비 기록 선택</span>
            <select value={selectedRecord} onChange={(event) => changeRecord(event.target.value)}>
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.title} · {record.companyName} · {record.practiceDate}
                </option>
              ))}
            </select>
          </label>

          <div className="option-list">
            {reportOptions.map((item) => (
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
            <h2>종합 요약</h2>
          </div>
          <div className="preview-title">{fallback(preview?.reportTitle)}</div>
          <dl>
            <div>
              <dt>지원 직무</dt>
              <dd>{fallback(preview?.userProfile?.targetRole || currentRecord?.jobTitle)}</dd>
            </div>
            <div>
              <dt>최근 면접 점수</dt>
              <dd>{currentRecord?.score ?? '-'}</dd>
            </div>
            <div>
              <dt>핵심 강점</dt>
              <dd>{fallback(preview?.strengths?.join(', '))}</dd>
            </div>
            <div>
              <dt>보완 포인트</dt>
              <dd>{fallback(preview?.weaknesses?.join(', ') || currentRecord?.weakness)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="score-grid score-grid--five">
        {scoreCards.map((score) => (
          <article className="score-card" key={score.label}>
            <span>{score.label}</span>
            <strong>{score.value}</strong>
            <p>{score.note}</p>
          </article>
        ))}
      </section>

      <section className="feedback-panel">
        <div className="section-title">
          <FileText size={21} />
          <h2>AI 종합 피드백</h2>
        </div>
        <p>{fallback(detail?.overallFeedback || currentRecord?.summary)}</p>
      </section>

      {options.interview && (
        <section className="feedback-panel">
          <div className="section-title">
            <FileText size={21} />
            <h2>면접 답변 상세</h2>
          </div>
          <pre className="script-preview">{fallback(detail?.script)}</pre>
        </section>
      )}

      {options.interview && (
        <div className="question-list">
          {!detail?.questions?.length && <div className="empty-state">저장된 질문-답변 상세가 없습니다.</div>}
          {detail?.questions?.map((item, index) => (
            <article className="question-card" key={item.id || item.question}>
              <h2>질문 {index + 1}. {item.question}</h2>
              <div className="answer-grid">
                <div className={`answer-box ${item.needsImprovement ? 'answer-box--issue' : ''}`}>
                  <span>내 답변</span>
                  <p>{item.answer}</p>
                  {item.highlightedIssue && <small>개선 필요 표현: {item.highlightedIssue}</small>}
                </div>
                <div className="answer-box answer-box--highlight">
                  <span>AI 피드백</span>
                  <p>{fallback(item.feedback)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="report-domain-grid">
        {options.document && (
          <article className="feedback-panel">
            <h2>서류 분석</h2>
            <strong>{preview?.documentAnalysisData?.documentScore ?? '-'}</strong>
            <p>{fallback(preview?.documentAnalysisData?.contentFeedback)}</p>
            <p>{fallback(preview?.documentAnalysisData?.keywordFeedback)}</p>
          </article>
        )}
        {options.history && (
          <article className="feedback-panel">
            <h2>취업 준비 기록</h2>
            <strong>{preview?.careerHistoryData?.totalPracticeCount ?? '-'}</strong>
            <p>평균 점수: {preview?.careerHistoryData?.averageScore ?? '-'}</p>
            <p>{fallback(preview?.careerHistoryData?.roadmapSummary)}</p>
          </article>
        )}
        {options.growth && (
          <article className="feedback-panel">
            <h2>성장 지표</h2>
            <strong>{preview?.careerHistoryData?.averageScore ?? '-'}</strong>
            <p>서류, 면접, 취업 준비 기록을 통합해 산출한 현재 준비도입니다.</p>
          </article>
        )}
      </section>

      {options.roadmap && (
        <section className="feedback-panel">
          <div className="section-title">
            <BookOpenCheck size={21} />
            <h2>추천 학습 로드맵</h2>
          </div>
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

    </section>
  );
}

export default ComprehensiveReportPage;
