import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, Search, XCircle } from 'lucide-react';
import { applicationApi } from '../../api/applicationApi';
import './styles/ApplicantManagementPage.css';

const STATUS_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'APPLIED', label: '지원 접수' },
  { value: 'PASSED', label: '서류 합격' },
  { value: 'FAILED', label: '불합격' },
  { value: 'FINAL_PASSED', label: '최종 합격' },
];

const STATUS_META = {
  APPLIED: { label: '지원 접수', color: '#2563eb', bg: '#dbeafe' },
  PASSED: { label: '서류 합격', color: '#15803d', bg: '#dcfce7' },
  FAILED: { label: '불합격', color: '#dc2626', bg: '#fee2e2' },
  FINAL_PASSED: { label: '최종 합격', color: '#7c3aed', bg: '#ede9fe' },
};

export default function ApplicantManagementPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    applicationApi
      .getApplications({ keyword, status })
      .then((data) => {
        if (active) setApplicants(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [keyword, status]);

  const summary = useMemo(() => {
    const total = applicants.length;
    const averageScore = total
      ? Math.round(applicants.reduce((sum, applicant) => sum + applicant.interviewScore, 0) / total)
      : 0;
    return { total, averageScore };
  }, [applicants]);

  const updateStatus = async (applicationId, nextStatus) => {
    await applicationApi.updateApplicationStatus(applicationId, nextStatus);
    setApplicants((current) =>
      current.map((applicant) =>
        applicant.id === applicationId ? { ...applicant, status: nextStatus } : applicant,
      ),
    );
  };

  return (
    <div className="am-page">
      <div className="am-header">
        <span className="am-eyebrow">APPLICANT MANAGEMENT</span>
        <h1 className="am-header__title">지원자 관리</h1>
        <p className="am-header__desc">지원자 목록, 전형 상태, AI 진단 점수와 PDF 리포트 연결을 관리합니다.</p>
      </div>

      <div className="am-summary">
        <article>
          <span>지원자</span>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <span>평균 면접 점수</span>
          <strong>{summary.averageScore || '-'}</strong>
        </article>
      </div>

      <div className="am-toolbar">
        <div className="am-search">
          <Search size={15} />
          <input
            placeholder="이름, 직무 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <div className="am-stage-filters">
          {STATUS_OPTIONS.map((option) => (
            <button
              className={`am-stage-chip${status === option.value ? ' am-stage-chip--on' : ''}`}
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="am-card">
        <div className="am-table-wrap">
          <table className="am-table">
            <thead>
              <tr>
                <th>지원자</th>
                <th>지원 공고</th>
                <th>경력</th>
                <th>기술 스택</th>
                <th>서류</th>
                <th>면접</th>
                <th>지원일</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9}>지원자 목록을 불러오는 중입니다.</td>
                </tr>
              )}
              {!loading && applicants.map((applicant) => {
                const meta = STATUS_META[applicant.status] || STATUS_META.APPLIED;
                return (
                  <tr key={applicant.id}>
                    <td className="am-table__name">{applicant.applicantName}</td>
                    <td>{applicant.jobTitle}</td>
                    <td>{applicant.experience}</td>
                    <td>
                      <div className="am-stacks">
                        {applicant.stacks.map((stack) => <span className="am-stack" key={stack}>{stack}</span>)}
                      </div>
                    </td>
                    <td><span className="am-score am-score--mid">{applicant.documentScore}</span></td>
                    <td><span className="am-score am-score--high">{applicant.interviewScore}</span></td>
                    <td className="am-table__date">{applicant.appliedAt}</td>
                    <td>
                      <select
                        className="am-status-select"
                        style={{ color: meta.color, background: meta.bg }}
                        value={applicant.status}
                        onChange={(event) => updateStatus(applicant.id, event.target.value)}
                      >
                        {STATUS_OPTIONS.slice(1).map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="am-actions">
                        <button
                          className="am-action-btn"
                          title="진단 상세"
                          type="button"
                          onClick={() => navigate(`/applications/applicants/${applicant.id}`)}
                        >
                          <FileText size={13} />
                        </button>
                        <button
                          className="am-action-btn am-action-btn--pass"
                          title="합격 처리"
                          type="button"
                          onClick={() => updateStatus(applicant.id, 'PASSED')}
                        >
                          <CheckCircle2 size={13} />
                        </button>
                        <button
                          className="am-action-btn am-action-btn--fail"
                          title="불합격 처리"
                          type="button"
                          onClick={() => updateStatus(applicant.id, 'FAILED')}
                        >
                          <XCircle size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && applicants.length === 0 && (
                <tr>
                  <td colSpan={9}>조건에 맞는 지원자가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
