import { useState } from 'react';
import '../../styles/admin.css';

type ReportStatus = '처리 대기' | '블라인드' | '기각';
type ReportType   = '게시글' | '댓글' | '회원';

interface Report {
  id: string;
  type: ReportType;
  targetName: string;
  reporterName: string;
  reason: string;
  content: string;
  reportedAt: string;
  status: ReportStatus;
}

const initial: Report[] = [
  { id: 'R-2001', type: '게시글', targetName: '박서연', reporterName: '김민지', reason: '욕설/비방',  content: '이 플랫폼 진짜 쓸모없고 여기 사람들 다 가짜임...', reportedAt: '2026.05.22', status: '처리 대기' },
  { id: 'R-2002', type: '댓글',   targetName: '이준호', reporterName: '최도윤', reason: '스팸/광고',  content: '카카오톡 오픈채팅 1234 들어오시면 취업 100% 보장!',  reportedAt: '2026.05.22', status: '처리 대기' },
  { id: 'R-2003', type: '회원',   targetName: '홍길동', reporterName: '박서연', reason: '허위 정보',  content: '경력 10년이라 써놨지만 실제로는 신입으로 확인됨',  reportedAt: '2026.05.21', status: '블라인드' },
  { id: 'R-2004', type: '게시글', targetName: '이영희', reporterName: '김민지', reason: '욕설/비방',  content: '취업도 못하는 주제에 여기서 뭘 가르치려고...',     reportedAt: '2026.05.20', status: '기각' },
  { id: 'R-2005', type: '댓글',   targetName: '최지수', reporterName: '이준호', reason: '도배/스팸',  content: '동일 내용 댓글을 30분 간격으로 반복 게시 중',      reportedAt: '2026.05.19', status: '처리 대기' },
];

const statusCls: Record<ReportStatus, string> = {
  '처리 대기': 'pending',
  '블라인드':  'blinded',
  '기각':      'dismissed',
};

export default function ReportPage() {
  const [reports, setReports]       = useState<Report[]>(initial);
  const [selected, setSelected]     = useState<Report | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [keyword, setKeyword]       = useState('');
  const [typeFilter, setTypeFilter]     = useState('전체');
  const [statusFilter, setStatusFilter] = useState('전체');

  const filtered = reports.filter(
    (r) =>
      (typeFilter   === '전체' || r.type   === typeFilter) &&
      (statusFilter === '전체' || r.status === statusFilter) &&
      (r.id.includes(keyword) || r.targetName.includes(keyword) || r.reporterName.includes(keyword)),
  );

  const toggleAll = (checked: boolean) =>
    setCheckedIds(checked ? filtered.map((r) => r.id) : []);

  const toggleOne = (id: string, checked: boolean) =>
    setCheckedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));

  const applyStatus = (ids: string[], status: ReportStatus) => {
    setReports((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, status } : r)));
    setCheckedIds([]);
    setSelected(null);
  };

  const deleteItems = (ids: string[]) => {
    setReports((prev) => prev.filter((r) => !ids.includes(r.id)));
    setCheckedIds([]);
  };

  const pendingCount = reports.filter((r) => r.status === '처리 대기').length;
  const blindedCount = reports.filter((r) => r.status === '블라인드').length;

  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>신고 관리</h2>
          <p>신고 게시글 및 댓글을 관리합니다.</p>
        </div>
      </header>

      <div className="memberPage">

        {/* KPI */}
        <section className="memberSummaryGrid">
          <article className="memberSummaryCard">
            <p>전체 신고</p><h3>{reports.length}</h3><span>누적 접수</span>
          </article>
          <article className="memberSummaryCard">
            <p>처리 대기</p><h3>{pendingCount}</h3><span>즉시 검토 필요</span>
          </article>
          <article className="memberSummaryCard">
            <p>블라인드 처리</p><h3>{blindedCount}</h3><span>처리 완료</span>
          </article>
          <article className="memberSummaryCard">
            <p>자동 감지</p><h3>3</h3><span>AI 욕설 필터</span>
          </article>
        </section>

        {/* Filter */}
        <section className="admin-card memberFilter">
          <input
            type="text"
            placeholder="신고 ID, 대상, 신고자 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option>전체</option>
            <option>게시글</option>
            <option>댓글</option>
            <option>회원</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>전체</option>
            <option>처리 대기</option>
            <option>블라인드</option>
            <option>기각</option>
          </select>
        </section>

        {/* Table */}
        <section className="admin-card memberTableCard">
          <div className="memberTableHeader">
            <h3>신고 목록</h3>
          </div>

          {checkedIds.length > 0 && (
            <div className="bulkBar">
              <span>{checkedIds.length}건 선택됨</span>
              <button onClick={() => applyStatus(checkedIds, '블라인드')}>일괄 블라인드</button>
              <button onClick={() => applyStatus(checkedIds, '기각')}>일괄 기각</button>
              <button className="danger" onClick={() => deleteItems(checkedIds)}>일괄 삭제</button>
            </div>
          )}

          <table className="memberTable">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && checkedIds.length === filtered.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th>신고 ID</th>
                <th>유형</th>
                <th>신고 대상</th>
                <th>신고자</th>
                <th>신고 사유</th>
                <th>접수일</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={checkedIds.includes(r.id)}
                      onChange={(e) => toggleOne(r.id, e.target.checked)}
                    />
                  </td>
                  <td>{r.id}</td>
                  <td>{r.type}</td>
                  <td>{r.targetName}</td>
                  <td>{r.reporterName}</td>
                  <td>{r.reason}</td>
                  <td>{r.reportedAt}</td>
                  <td>
                    <span className={`statusBadge ${statusCls[r.status]}`}>{r.status}</span>
                  </td>
                  <td>
                    <button className="tableBtn" onClick={() => setSelected(r)}>상세보기</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button>{'<'}</button>
            <button className="activePage">1</button>
            <button>2</button>
            <button>{'>'}</button>
          </div>
        </section>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modalOverlay" onClick={() => setSelected(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modalHeader">
              <div>
                <h3>신고 상세 · {selected.id}</h3>
                <p>{selected.type} · {selected.reportedAt}</p>
              </div>
              <button onClick={() => setSelected(null)}>닫기</button>
            </div>

            <div className="modalInfoGrid">
              <div><span>유형</span><strong>{selected.type}</strong></div>
              <div><span>신고 사유</span><strong>{selected.reason}</strong></div>
              <div><span>신고 대상</span><strong>{selected.targetName}</strong></div>
              <div><span>신고자</span><strong>{selected.reporterName}</strong></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span>신고 대상 본문</span>
                <strong style={{ display: 'block', marginTop: 8, lineHeight: 1.7, wordBreak: 'break-all' }}>
                  {selected.content}
                </strong>
              </div>
              <div><span>현재 상태</span><strong>{selected.status}</strong></div>
            </div>

            <div className="modalAction">
              {selected.status === '처리 대기' && (
                <>
                  <button onClick={() => applyStatus([selected.id], '블라인드')}>블라인드 처리</button>
                  <button onClick={() => applyStatus([selected.id], '기각')}>기각</button>
                </>
              )}
              <button onClick={() => setSelected(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
