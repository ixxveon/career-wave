import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Bot, Clock, EyeOff, Flag, UserX } from 'lucide-react';
import { reportApi, REPORT_STATUS, type ReportItem, type ReportSummary, type ReportStatus, type TargetType, type ReportReason, type ReportDetail, type AiSuggestion } from '../../../api/admin/reportApi';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/Report.css';

// ── 로컬 전용 타입 ───────────────────────────────────────────
type ReportType     = TargetType;
type Severity       = '낮음' | '중간' | '높음';
type SuspendType    = 'WARNING' | 'SUSPEND' | 'BLACKLIST';
type SuspendDuration = 'THREE_DAYS' | 'SEVEN_DAYS' | 'THIRTY_DAYS' | 'PERMANENT';
type SanctionRec    = 'NONE' | 'WARNING' | 'SUSPEND' | 'BLACKLIST';

const WARN_THRESHOLD = 3;

// ── 표시용 레이블 맵 ─────────────────────────────────────────
const typeLabel: Record<ReportType, string> = {
  BOARD: '게시글', COMMENT: '댓글', MEMBER: '회원',
};
const statusLabel: Record<ReportStatus, string> = {
  PENDING: '처리 대기', BLINDED: '블라인드', DISMISSED: '기각',
};
const reasonLabel: Record<ReportReason, string> = {
  SPAM: '스팸/광고', ABUSE: '욕설/비방', AD: '광고성',
  INAPPROPRIATE: '부적절한 내용', OTHER: '기타',
};
const durationLabel: Record<SuspendDuration, string> = {
  THREE_DAYS: '3일', SEVEN_DAYS: '7일', THIRTY_DAYS: '30일', PERMANENT: '영구',
};
const suspendTypeLabel: Record<SuspendType, string> = {
  WARNING: '경고', SUSPEND: '활동정지', BLACKLIST: '블랙리스트',
};
const sanctionRecLabel: Record<SanctionRec, string> = {
  NONE: '정상', WARNING: '경고', SUSPEND: '활동정지', BLACKLIST: '블랙리스트',
};

// ── CSS 클래스 맵 ────────────────────────────────────────────
const statusCls: Record<ReportStatus, string> = {
  PENDING: 'pending', BLINDED: 'blinded', DISMISSED: 'dismissed',
};
const typeCls: Record<ReportType, string> = {
  BOARD: 'post', COMMENT: 'comment', MEMBER: 'member',
};
const severityCls: Record<Severity, string> = {
  '낮음': 'low', '중간': 'medium', '높음': 'high',
};
const sanctionRecCls: Record<SanctionRec, string> = {
  NONE: 'normal', WARNING: 'warn', SUSPEND: 'suspend', BLACKLIST: 'blacklist',
};
const sanctionActiveCls: Record<SuspendType, string> = {
  WARNING: 'active-warn', SUSPEND: 'active-suspend', BLACKLIST: 'active-blacklist',
};

// ── 인터페이스 ───────────────────────────────────────────────
interface UserAiReview {
  reportCount: number;
  warningCount: number;
  riskLevel: Severity;
  recommendation: SanctionRec;
  summary: string;
}

interface ReportWithAi extends ReportItem {
  aiSuggestion?: AiSuggestion | null;
  userAiReview?: UserAiReview;
  contentTitle?: ReportDetail['contentTitle'];
  contentBody?: ReportDetail['contentBody'];
  targetId?: ReportDetail['targetId'];
  processedAt?: ReportDetail['processedAt'];
  processedBy?: ReportDetail['processedBy'];
}

export default function ReportPage() {
  // ── API 상태 ───────────────────────────────────────────────
  const [reports, setReports]       = useState<ReportWithAi[]>([]);
  const [summary, setSummary]       = useState<ReportSummary>({ totalCount: 0, pendingCount: 0, blindedCount: 0, highRiskCount: 0 });
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError]   = useState('');

  const [selected, setSelected]     = useState<ReportWithAi | null>(null);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [keyword, setKeyword]       = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [userAiLoading, setUserAiLoading] = useState<number | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<ReportWithAi | null>(null);
  const [suspendType, setSuspendType]     = useState<SuspendType>('WARNING');
  const [suspendDuration, setSuspendDuration] = useState<SuspendDuration>('THREE_DAYS');
  const [suspendReason, setSuspendReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // ── 적용 필터 ref (검색 버튼/Enter 시에만 갱신) ───────────
  const appliedFilters = useRef({ status: '', targetType: '', keyword: '' });
  const reportReqId = useRef(0);

  // ── KPI 조회 ───────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const res = await reportApi.getSummary();
      setSummary(res.data.data);
    } catch (err) {
      console.error('fetchSummary failed:', err);
    }
  }, []);

  // ── 목록 조회 ──────────────────────────────────────────────
  const fetchReports = useCallback(async (page = 1) => {
    const reqId = ++reportReqId.current;
    const f = appliedFilters.current;
    setListLoading(true);
    setListError('');
    try {
      const res = await reportApi.getReports({
        ...(f.status && { status: f.status as ReportStatus }),
        ...(f.targetType && { targetType: f.targetType as TargetType }),
        ...(f.keyword && { keyword: f.keyword }),
        page,
        size: 20,
      });
      if (reqId !== reportReqId.current) return;
      const { items, totalItems, totalPages } = res.data.data;
      setReports(items);
      setTotalItems(totalItems);
      setTotalPages(totalPages);
      setCurrentPage(page);
    } catch (err: any) {
      if (reqId !== reportReqId.current) return;
      const status = err.response?.status;
      setListError(err.response?.data?.message || (status ? `신고 목록을 불러오지 못했습니다. (${status})` : '네트워크 연결을 확인해주세요.'));
    } finally {
      if (reqId === reportReqId.current) setListLoading(false);
    }
  }, []);

  // ── 검색 적용 핸들러 ───────────────────────────────────────
  const applySearch = () => {
    appliedFilters.current = { status: statusFilter, targetType: typeFilter, keyword };
    fetchReports(1);
  };

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchReports(1); }, [fetchReports]);

  // ── 체크박스 ───────────────────────────────────────────────
  const toggleAll = (checked: boolean) =>
    setCheckedIds(checked ? reports.map((r) => r.reportId) : []);
  const toggleOne = (id: number, checked: boolean) =>
    setCheckedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));


  const requestUserAiReview = (reportId: number) => {
    setUserAiLoading(reportId);
    setTimeout(() => {
      const mockReview: UserAiReview = {
        reportCount: 3, warningCount: 1, riskLevel: '중간', recommendation: 'WARNING',
        summary: 'AI 분석 결과 최근 활동에서 반복적인 가이드라인 위반 패턴이 감지되었습니다. 경고 조치를 권고합니다.',
      };
      setReports((prev) => prev.map((r) => (r.reportId === reportId ? { ...r, userAiReview: mockReview } : r)));
      setSelected((prev) => (prev && prev.reportId === reportId ? { ...prev, userAiReview: mockReview } : prev));
      setUserAiLoading(null);
    }, 1500);
  };

  const applySuspend = () => {
    setSuspendTarget(null);
    setSuspendReason('');
    setSuspendType('WARNING');
    setSuspendDuration('THREE_DAYS');
  };

  // ── 신고 상세 조회 ─────────────────────────────────────────
  const openDetail = async (item: ReportWithAi) => {
    try {
      const res = await reportApi.getReportDetail(item.reportId);
      setSelected({ ...item, ...res.data.data });
    } catch {
      setSelected(item);
    }
  };

  // ── 블라인드 처리 ──────────────────────────────────────────
  const handleBlind = async (reportId: number) => {
    if (processing) return;
    setProcessing(true);
    try {
      const res = await reportApi.blindReport(reportId);
      if (!res.data.success) throw new Error(res.data.message);
      const { reportStatus } = res.data.data;
      setReports((prev) => prev.map((r) => r.reportId === reportId ? { ...r, reportStatus } : r));
      setSelected((prev) => prev && prev.reportId === reportId ? { ...prev, reportStatus } : prev);
      fetchSummary();
    } catch (err: unknown) {
      const msg = (err as any).response?.data?.message ?? (err instanceof Error ? err.message : undefined);
      alert(msg || '블라인드 처리에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // ── 기각 처리 ──────────────────────────────────────────────
  const handleDismiss = async (reportId: number) => {
    if (processing) return;
    setProcessing(true);
    try {
      const res = await reportApi.dismissReport(reportId);
      if (!res.data.success) throw new Error(res.data.message);
      const { reportStatus } = res.data.data;
      setReports((prev) => prev.map((r) => r.reportId === reportId ? { ...r, reportStatus } : r));
      setSelected((prev) => prev && prev.reportId === reportId ? { ...prev, reportStatus } : prev);
      fetchSummary();
    } catch (err: unknown) {
      const msg = (err as any).response?.data?.message ?? (err instanceof Error ? err.message : undefined);
      alert(msg || '기각 처리에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // ── 페이지네이션 ───────────────────────────────────────────
  const renderPagination = () => (
    <div className="pagination">
      <button disabled={listLoading || currentPage <= 1} onClick={() => fetchReports(currentPage - 1)}>{'<'}</button>
      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        const p = Math.max(1, currentPage - 2) + i;
        if (p > totalPages) return null;
        return (
          <button key={p} className={p === currentPage ? 'activePage' : ''} disabled={listLoading} onClick={() => fetchReports(p)}>{p}</button>
        );
      })}
      <button disabled={listLoading || currentPage >= totalPages} onClick={() => fetchReports(currentPage + 1)}>{'>'}</button>
    </div>
  );

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
          <article className="memberSummaryCard kpi-blue">
            <div className="memberKpiContent">
              <p>전체 신고</p><h3>{summary.totalCount.toLocaleString()}</h3><span>누적 접수</span>
            </div>
            <div className="memberKpiIcon kpi-blue"><Flag size={24} /></div>
          </article>
          <article className="memberSummaryCard kpi-yellow">
            <div className="memberKpiContent">
              <p>처리 대기</p><h3>{summary.pendingCount}</h3><span>즉시 검토 필요</span>
            </div>
            <div className="memberKpiIcon kpi-yellow"><Clock size={24} /></div>
          </article>
          <article className="memberSummaryCard kpi-purple">
            <div className="memberKpiContent">
              <p>블라인드 처리</p><h3>{summary.blindedCount}</h3><span>처리 완료</span>
            </div>
            <div className="memberKpiIcon kpi-purple"><EyeOff size={24} /></div>
          </article>
          <article className="memberSummaryCard kpi-green">
            <div className="memberKpiContent">
              <p>AI 고위험 감지</p><h3>{summary.highRiskCount}</h3><span>즉시 처리 권고</span>
            </div>
            <div className="memberKpiIcon kpi-green"><Bot size={24} /></div>
          </article>
        </section>

        {/* Filter */}
        <section className="admin-card memberFilter">
          <input
            type="text"
            placeholder="신고 ID, 대상, 신고자 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">전체</option>
            <option value="BOARD">게시글</option>
            <option value="COMMENT">댓글</option>
            <option value="MEMBER">회원</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">전체</option>
            <option value="PENDING">처리 대기</option>
            <option value="BLINDED">블라인드</option>
            <option value="DISMISSED">기각</option>
          </select>
          <button className="memberFilterBtn" onClick={applySearch}>검색</button>
        </section>

        {/* Bulk action bar */}
        {checkedIds.length > 0 && (
          <div className="bulkBar">
            <span>{checkedIds.length}건 선택됨</span>
            <button disabled>일괄 블라인드</button>
            <button disabled>일괄 기각</button>
            <button className="danger" disabled>일괄 삭제</button>
          </div>
        )}

        {/* Table */}
        <section className="admin-card memberTableCard">
          <div className="memberTableHeader">
            <h3>신고 목록<span className="memberTotalCount">총 {totalItems.toLocaleString()}건</span></h3>
          </div>
          {listError && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{listError}</p>}
          <div className="tableScroll">
          <table className="memberTable">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={reports.length > 0 && checkedIds.length === reports.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th>신고 ID</th><th>유형</th><th>신고 대상</th>
                <th>신고자</th><th>신고 사유</th>
                <th>접수일</th><th>상태</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>불러오는 중...</td></tr>
              ) : reports.map((r) => (
                <tr key={r.reportId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={checkedIds.includes(r.reportId)}
                      onChange={(e) => toggleOne(r.reportId, e.target.checked)}
                    />
                  </td>
                  <td style={{ color: '#7a8da4', fontSize: 13 }}>#{r.reportId}</td>
                  <td><span className={`reportTypeBadge ${typeCls[r.targetType]}`}>{typeLabel[r.targetType]}</span></td>
                  <td>{r.reportedName}</td>
                  <td>{r.reporterName}</td>
                  <td>{reasonLabel[r.reason]}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td><span className={`statusBadge ${statusCls[r.reportStatus]}`}>{statusLabel[r.reportStatus]}</span></td>
                  <td>
                    <button className="tableBtn" onClick={() => openDetail(r)}>상세보기</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="memberTableFooter">
            <span className="memberTableCount">
              {totalItems === 0
                ? '총 0건'
                : `표시 중: ${(currentPage - 1) * 20 + 1} - ${Math.min(currentPage * 20, totalItems)} / 총 ${totalItems.toLocaleString()}건`
              }
            </span>
            {renderPagination()}
          </div>
        </section>
      </div>

      {/* ── Detail Modal ───────────────────────────────────────── */}
      {selected && (
        <div className="modalOverlay" onClick={() => setSelected(null)}>
          <div className="memberModal modal--scrollable" onClick={(e) => e.stopPropagation()} style={{ width: 600 }}>
            <div className="modalHeader">
              <div>
                <h3>신고 상세 · #{selected.reportId}</h3>
                <p>{typeLabel[selected.targetType]} · {new Date(selected.createdAt).toLocaleDateString('ko-KR')}</p>
              </div>
              <button onClick={() => setSelected(null)}>닫기</button>
            </div>

            <div className="modalBody">
              {/* 신고 정보 */}
              <div className="modalInfoGrid">
                <div>
                  <span>유형</span>
                  <strong>
                    <span className={`reportTypeBadge ${typeCls[selected.targetType]}`}>{typeLabel[selected.targetType]}</span>
                  </strong>
                </div>
                <div><span>신고 사유</span><strong>{reasonLabel[selected.reason]}</strong></div>
                <div><span>접수일</span><strong>{new Date(selected.createdAt).toLocaleDateString('ko-KR')}</strong></div>
                <div><span>신고 대상</span><strong>{selected.reportedName}</strong></div>
                <div><span>신고자</span><strong>{selected.reporterName}</strong></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span>신고 대상 제목</span>
                  <strong style={{ display: 'block', marginTop: 8, lineHeight: 1.7, wordBreak: 'break-all' }}>
                    {selected.contentTitle ?? '—'}
                  </strong>
                </div>
                {selected.contentBody !== undefined && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span>신고 대상 본문</span>
                    <strong style={{ display: 'block', marginTop: 8, lineHeight: 1.7, wordBreak: 'break-all' }}>
                      {selected.contentBody ?? '—'}
                    </strong>
                  </div>
                )}
                <div>
                  <span>현재 상태</span>
                  <strong>
                    <span className={`statusBadge ${statusCls[selected.reportStatus]}`}>{statusLabel[selected.reportStatus]}</span>
                  </strong>
                </div>
              </div>

              {/* 콘텐츠 AI 검토 */}
              <div className="reportAiSection">
                <h4><Bot size={14} /> 콘텐츠 AI 검토</h4>
                {selected.aiSuggestion ? (
                  <>
                    <div className="reportAiGrid">
                      <div>
                        <span>심각도</span>
                        <span className={`severityBadge ${severityCls[selected.aiSuggestion.severity]}`}>
                          <AlertTriangle size={11} />{selected.aiSuggestion.severity}
                        </span>
                      </div>
                      <div>
                        <span>분류</span>
                        <span>{reasonLabel[selected.aiSuggestion.category]}</span>
                      </div>
                    </div>
                    <p className="reportAiSummary">{selected.aiSuggestion.suggestion}</p>
                  </>
                ) : (
                  <p className="reportAiPending">상세 조회 시 AI 분석이 자동 실행됩니다.</p>
                )}
              </div>

              {/* 대상 회원 AI 검토 */}
              <div className="userAiSection">
                <h4><UserX size={14} /> 대상 회원 AI 검토</h4>
                {selected.userAiReview ? (
                  <>
                    <div className="reportAiGrid">
                      <div>
                        <span>누적 신고</span>
                        <strong style={{ fontSize: 15, color: '#10243f' }}>{selected.userAiReview.reportCount}건</strong>
                      </div>
                      <div>
                        <span>위험도</span>
                        <span className={`severityBadge ${severityCls[selected.userAiReview.riskLevel]}`}>
                          <AlertTriangle size={11} />{selected.userAiReview.riskLevel}
                        </span>
                      </div>
                      <div>
                        <span>경고 횟수</span>
                        <div className="warnCountWrap">
                          <div className="warnDots">
                            {Array.from({ length: WARN_THRESHOLD }).map((_, i) => (
                              <span key={i} className={`warnDot ${i < selected.userAiReview!.warningCount ? 'filled' : ''}`} />
                            ))}
                          </div>
                          <strong className={`warnCountText ${
                            selected.userAiReview.warningCount >= WARN_THRESHOLD ? 'danger' :
                            selected.userAiReview.warningCount === WARN_THRESHOLD - 1 ? 'caution' : ''
                          }`}>
                            {selected.userAiReview.warningCount}/{WARN_THRESHOLD}회
                          </strong>
                          {selected.userAiReview.warningCount >= WARN_THRESHOLD && (
                            <span className="warnAlert">활동정지 권고</span>
                          )}
                          {selected.userAiReview.warningCount === WARN_THRESHOLD - 1 && (
                            <span className="warnCaution">1회 추가 시 활동정지 권고</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span>제재 권고</span>
                        <span className={`sanctionBadge ${sanctionRecCls[selected.userAiReview.recommendation]}`}>
                          {sanctionRecLabel[selected.userAiReview.recommendation]}
                        </span>
                      </div>
                    </div>
                    <p className="reportAiSummary">{selected.userAiReview.summary}</p>
                  </>
                ) : (
                  <button
                    className="aiReviewBtn"
                    disabled={userAiLoading === selected.reportId}
                    onClick={() => requestUserAiReview(selected.reportId)}
                  >
                    <UserX size={14} />
                    {userAiLoading === selected.reportId ? '분석 중...' : '대상 회원 AI 검토 요청'}
                  </button>
                )}
              </div>
            </div>{/* /modalBody */}

            {/* Action */}
            <div className="modalAction" style={{ justifyContent: 'space-between' }}>
              {selected.targetType !== 'MEMBER' ? (
                <button className="tableBtn tableBtn--danger" disabled>
                  {selected.targetType === 'COMMENT' ? '댓글 삭제' : '게시글 삭제'}
                </button>
              ) : (
                <span />
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                {selected.reportStatus === REPORT_STATUS.PENDING && (
                  <>
                    <button className="tableBtn tableBtn--approve" disabled={processing} onClick={() => handleBlind(selected.reportId)}>블라인드</button>
                    <button className="tableBtn" disabled={processing} onClick={() => handleDismiss(selected.reportId)}>기각</button>
                  </>
                )}
                <button
                  className="tableBtn tableBtn--warn"
                  disabled
                >
                  회원 제재
                </button>
                <button className="tableBtn" onClick={() => setSelected(null)}>닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 회원 제재 Modal ────────────────────────────────────── */}
      {suspendTarget && (
        <div className="modalOverlay" onClick={() => setSuspendTarget(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 460 }}>
            <div className="modalHeader">
              <div>
                <h3>회원 제재</h3>
                <p>신고 대상 회원에게 제재를 적용합니다</p>
              </div>
              <button onClick={() => setSuspendTarget(null)}>닫기</button>
            </div>

            <div className="sanctionTarget">
              <span>제재 대상</span>
              <strong>{suspendTarget.reportedName}</strong>
            </div>

            <span className="sanctionTypeLabel">제재 유형</span>
            <div className="sanctionTypeGroup">
              {(['WARNING', 'SUSPEND', 'BLACKLIST'] as SuspendType[]).map((type) => (
                <button
                  key={type}
                  className={`sanctionTypeBtn ${suspendType === type ? sanctionActiveCls[type] : ''}`}
                  onClick={() => setSuspendType(type)}
                >
                  {suspendTypeLabel[type]}
                </button>
              ))}
            </div>

            {suspendType === 'SUSPEND' && (
              <div className="sanctionDurationWrap">
                <span>정지 기간</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['THREE_DAYS', 'SEVEN_DAYS', 'THIRTY_DAYS', 'PERMANENT'] as SuspendDuration[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setSuspendDuration(d)}
                      style={{
                        height: 38, padding: '0 16px', borderRadius: 8, fontFamily: 'inherit',
                        border: `1px solid ${suspendDuration === d ? '#24496f' : '#d7e4f2'}`,
                        background: suspendDuration === d ? '#24496f' : 'white',
                        color: suspendDuration === d ? 'white' : '#24496f',
                        fontWeight: 600, fontSize: 14, cursor: 'pointer',
                      }}
                    >
                      {durationLabel[d]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="sanctionReasonWrap">
              <span>제재 사유</span>
              <textarea
                placeholder="제재 사유를 입력하세요."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
              />
              <p className="sanctionNote">해당 회원에게 안내됩니다.</p>
            </div>

            <div className="modalAction">
              <button
                className="tableBtn tableBtn--danger"
                onClick={applySuspend}
                disabled={!suspendReason.trim()}
              >
                제재 적용
              </button>
              <button className="tableBtn" onClick={() => setSuspendTarget(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
