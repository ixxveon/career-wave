import { Download, FileText, ListChecks, PieChart, ShieldCheck } from 'lucide-react';
import { careerHistoryRecords, reportExportSummary } from '../../data/careerWorkflowMockData';
import './ReportExportPage.css';

const authTokenKeys = ['careerWaveToken', 'careerWaveUser'];
const paidMemberships = ['PREMIUM', 'PAID', 'SUBSCRIBED', 'PRO'];

function hasAuthToken() {
  if (typeof window === 'undefined') {
    return false;
  }

  return authTokenKeys.some((key) => localStorage.getItem(key) || sessionStorage.getItem(key));
}

function hasPaidSubscription() {
  if (typeof window === 'undefined') {
    return false;
  }

  const membership = (
    localStorage.getItem('membership') ||
    localStorage.getItem('userMembership') ||
    localStorage.getItem('plan') ||
    sessionStorage.getItem('membership') ||
    sessionStorage.getItem('userMembership') ||
    sessionStorage.getItem('plan') ||
    ''
  ).toUpperCase();

  return paidMemberships.includes(membership);
}

function ReportExportPage() {
  const isLoggedIn = hasAuthToken();
  const isSubscribed = hasPaidSubscription();
  const canDownload = isLoggedIn && isSubscribed;
  const downloadGuide = !isLoggedIn
    ? '로그인 후 정기 결제를 완료하면 PDF 다운로드를 이용할 수 있습니다.'
    : !isSubscribed
      ? '정기 결제 이용권을 구독하면 PDF 다운로드를 이용할 수 있습니다.'
      : '정기 결제 이용자 전용 PDF 다운로드가 준비되었습니다.';

  const handleDownload = () => {
    if (!canDownload) {
      return;
    }

    window.alert('PDF 다운로드 기능은 추후 연결 예정입니다.');
  };

  return (
    <section className="report-export-page">
      <header className="report-export-hero">
        <div>
          <p>REPORT EXPORT</p>
          <h1>종합 진단 PDF 리포트</h1>
          <span>서류 분석, 면접 분석, 누적 Career History 데이터를 하나의 리포트 형태로 미리 확인합니다.</span>
        </div>
        <button type="button" disabled={!canDownload} title={downloadGuide} onClick={handleDownload}>
          <Download size={18} />
          PDF 다운로드
        </button>
      </header>

      <section className="report-export-score-grid">
        <article>
          <FileText size={22} />
          <span>서류 분석 점수</span>
          <strong>{reportExportSummary.documentAnalysis.score}점</strong>
          <p>{reportExportSummary.documentAnalysis.headline}</p>
        </article>
        <article>
          <ShieldCheck size={22} />
          <span>면접 분석 결과</span>
          <strong>{reportExportSummary.interviewAnalysis.score}점</strong>
          <p>{reportExportSummary.interviewAnalysis.headline}</p>
        </article>
        <article>
          <PieChart size={22} />
          <span>Career History 누적</span>
          <strong>{reportExportSummary.history.averageScore}점</strong>
          <p>총 {reportExportSummary.history.totalCount}회 기록, 최고 반응 기업은 {reportExportSummary.history.bestCompany}입니다.</p>
        </article>
      </section>

      <div className="report-export-layout">
        <main className="report-export-preview" aria-label="PDF 미리보기">
          <div className="report-paper">
            <header>
              <span>Career Wave PDF Preview</span>
              <h2>{reportExportSummary.profile.name}님의 종합 취업 진단 리포트</h2>
              <p>{reportExportSummary.profile.targetRole} · {reportExportSummary.profile.period}</p>
            </header>

            <section>
              <h3>1. 서류 분석 요약</h3>
              <ul>
                {reportExportSummary.documentAnalysis.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </section>

            <section>
              <h3>2. 면접 분석 요약</h3>
              <ul>
                {reportExportSummary.interviewAnalysis.points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </section>

            <section>
              <h3>3. Career History 누적 데이터</h3>
              <div className="report-history-table">
                {careerHistoryRecords.map((record) => (
                  <div key={record.id}>
                    <span>{record.date}</span>
                    <strong>{record.company}</strong>
                    <em>{record.score}점</em>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>

        <aside className="report-export-side">
          <section>
            <div className="report-export-section-title">
              <ListChecks size={20} />
              <h2>약점 / 개선 액션 플랜</h2>
            </div>
            <div className="weakness-list">
              {reportExportSummary.history.repeatedWeaknesses.map((weakness) => <span key={weakness}>{weakness}</span>)}
            </div>
            <div className="action-plan-list">
              {reportExportSummary.actionPlan.map((item) => (
                <article key={item.week}>
                  <span>{item.week}</span>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="download-panel">
            <h2>PDF 산출 상태</h2>
            <p>{downloadGuide}</p>
            <button type="button" disabled={!canDownload} title={downloadGuide} onClick={handleDownload}>
              <Download size={18} />
              {canDownload ? 'PDF 다운로드' : !isLoggedIn ? '로그인 필요' : '정기 결제 필요'}
            </button>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default ReportExportPage;
