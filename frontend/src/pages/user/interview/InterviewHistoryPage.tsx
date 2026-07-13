import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ClipboardList, FileText } from 'lucide-react';
import { useInterviewHistory } from '../../../hooks/user/interview/useInterviewReport';
import { SESSION_STATUS } from '../../../types/user/interview';
import type { HistoryItem } from '../../../types/user/interview';
import { SESSION_TYPE_LABEL } from '../../../constants/user/interview';
import '@/styles/user/interview/InterviewHistoryPage.css';

const PAGE_SIZE = 10;

export default function InterviewHistoryPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, refetch } = useInterviewHistory(page, PAGE_SIZE);

  const totalPages = data?.totalPages ?? 0;

  function renderRow(row: HistoryItem) {
    return (
      <tr key={row.sessionId}>
        <td className="ih-table__date">
          {new Date(row.createdAt).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })}
        </td>
        <td>
          <span className={`ih-badge ih-badge--${row.sessionType.toLowerCase()}`}>
            {SESSION_TYPE_LABEL[row.sessionType] ?? row.sessionType}
          </span>
        </td>
        <td>{row.targetCompany ?? '—'}</td>
        <td>{row.totalScore != null ? `${row.totalScore}점` : '—'}</td>
        <td>
          {row.reportStatus === 'COMPLETED' ? (
            <button
              className="ih-report-btn"
              onClick={() => navigate(`/interview/report?sessionId=${row.sessionId}`)}
            >
              <FileText size={14} /> 보기
            </button>
          ) : row.reportStatus === 'PENDING' ? (
            <span className="ih-status ih-status--analyzing">분석 중</span>
          ) : row.reportStatus === 'FAILED' ? (
            <span className="ih-status ih-status--failed">생성 실패</span>
          ) : (
            <span className="ih-status">{row.sessionStatus}</span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="ih-page">
      <div className="ih-header">
        <span className="ih-header__icon"><ClipboardList size={20} /></span>
        <h1 className="ih-header__title">면접 이력</h1>
      </div>

      <div className="ih-card">
        {isLoading ? (
          <div className="ih-state">
            <Loader2 size={20} className="ih-state__spinner" /> 불러오는 중…
          </div>
        ) : isError ? (
          <div className="ih-state">
            <p>이력을 불러오지 못했어요.</p>
            <button className="ih-cta" onClick={() => refetch()}>다시 시도 →</button>
          </div>
        ) : !data?.items.length ? (
          <div className="ih-state">
            <p>아직 면접 이력이 없어요.</p>
            <button className="ih-cta" onClick={() => navigate('/interview/text')}>첫 면접 시작하기 →</button>
          </div>
        ) : (
          <>
            <div className="ih-table-wrap">
              <table className="ih-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>면접 종류</th>
                    <th>타겟 기업</th>
                    <th>점수</th>
                    <th>리포트</th>
                  </tr>
                </thead>
                <tbody>{data.items.map(renderRow)}</tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="ih-pagination">
                <button
                  className="ih-pagination__btn"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  이전
                </button>
                <span className="ih-pagination__info">{page + 1} / {totalPages}</span>
                <button
                  className="ih-pagination__btn"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
