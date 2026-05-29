import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink, FileCheck2, Save } from 'lucide-react';
import { applicationApi } from '../../api/applicationApi';
import { careerHistoryApi } from '../../api/careerHistoryApi';
import { reportExportApi } from '../../api/reportExportApi';
import './styles/ApplicantDetailPage.css';

const statusLabels = {
  APPLIED: '지원 접수',
  PASSED: '서류 합격',
  FAILED: '불합격',
  FINAL_PASSED: '최종 합격',
};

export default function ApplicantDetailPage() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const [applicant, setApplicant] = useState(null);
  const [historyDetail, setHistoryDetail] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    applicationApi.getApplicationDetail(applicationId).then(async (data) => {
      if (!active) return;
      setApplicant(data);

      if (data?.careerHistoryId) {
        const detail = await careerHistoryApi.getHistoryDetail(data.careerHistoryId);
        if (active) setHistoryDetail(detail);
      }
    });

    return () => {
      active = false;
    };
  }, [applicationId]);

  const changeStatus = async (status) => {
    await applicationApi.updateApplicationStatus(applicationId, status);
    setApplicant((current) => ({ ...current, status }));
  };

  const downloadReport = async () => {
    await reportExportApi.downloadReport(applicant?.careerHistoryId || applicationId);
    window.print();
  };

  const savePdf = async () => {
    const result = await applicationApi.saveDiagnosisPdf(applicationId, {
      pdfUrl: applicant?.pdfUrl || `mock://career-wave/${applicationId}.pdf`,
    });
    setApplicant((current) => ({ ...current, pdfUrl: result.pdfUrl }));
    setMessage('PDF 보관 URL이 저장되었습니다.');
  };

  if (!applicant) {
    return <div className="ad-page"><div className="ad-empty">지원자 상세 정보를 불러오는 중입니다.</div></div>;
  }

  const scores = historyDetail?.scores || [
    { label: '서류 점수', value: applicant.documentScore, note: 'AI 서류 분석' },
    { label: '면접 점수', value: applicant.interviewScore, note: 'AI 모의면접' },
  ];

  return (
    <div className="ad-page">
      <button className="ad-back" type="button" onClick={() => navigate('/applications/applicants')}>
        <ArrowLeft size={15} /> 지원자 목록
      </button>

      <header className="ad-header">
        <div>
          <span className="ad-eyebrow">DIAGNOSIS DETAIL</span>
          <h1>{applicant.applicantName}</h1>
          <p>{applicant.jobTitle} · {applicant.companyName} · {applicant.appliedAt}</p>
        </div>
        <div className="ad-actions">
          <select value={applicant.status} onChange={(event) => changeStatus(event.target.value)}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="button" onClick={downloadReport}><Download size={15} /> PDF 다운로드</button>
          <button type="button" onClick={savePdf}><Save size={15} /> PDF 보관</button>
        </div>
      </header>

      {message && <div className="ad-message">{message}</div>}

      <section className="ad-score-grid">
        {scores.map((score) => (
          <article key={score.label}>
            <span>{score.label}</span>
            <strong>{score.value}</strong>
            <p>{score.note}</p>
          </article>
        ))}
      </section>

      <section className="ad-layout">
        <article className="ad-panel">
          <div className="ad-panel__title">
            <FileCheck2 size={18} />
            <h2>AI 종합 피드백</h2>
          </div>
          <p>{historyDetail?.overallFeedback || applicant.aiFeedback}</p>
          <dl>
            <div>
              <dt>기술 스택</dt>
              <dd>{applicant.stacks.join(', ')}</dd>
            </div>
            <div>
              <dt>PDF 보관 URL</dt>
              <dd>{applicant.pdfUrl || '아직 저장된 PDF가 없습니다.'}</dd>
            </div>
          </dl>
        </article>

        <article className="ad-panel">
          <div className="ad-panel__title">
            <FileCheck2 size={18} />
            <h2>면접 답변 기록</h2>
          </div>
          <pre>{historyDetail?.script || '연결된 면접 기록이 없습니다.'}</pre>
          <Link className="ad-link" to="/career-history">
            진단 원본 보기 <ExternalLink size={14} />
          </Link>
        </article>
      </section>
    </div>
  );
}
