import { useState } from 'react';
import { AlertTriangle, Bot, Clock, EyeOff, Flag, UserX } from 'lucide-react';
import '../../styles/admin.css';

// ── ERD 기반 타입 ────────────────────────────────────────────
type ReportStatus   = 'PENDING' | 'BLINDED' | 'DISMISSED';
type ReportType     = 'BOARD' | 'COMMENT' | 'MEMBER';
type ReportReason   = 'SPAM' | 'ABUSE' | 'AD' | 'INAPPROPRIATE' | 'OTHER';
type BoardCategory  = '취업 후기' | '면접 후기' | '자유 게시판' | '-';
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
interface AiReview {
  severity: Severity;
  recommendation: 'BLINDED' | 'DISMISSED';
  summary: string;
}

interface UserAiReview {
  reportCount: number;
  warningCount: number;
  riskLevel: Severity;
  recommendation: SanctionRec;
  summary: string;
}

interface Report {
  id: string;
  type: ReportType;
  category: BoardCategory;
  targetName: string;
  reporterName: string;
  reason: ReportReason;
  content: string;
  reportedAt: string;
  status: ReportStatus;
  aiReview?: AiReview;
  userAiReview?: UserAiReview;
}

// ── 더미 데이터 ──────────────────────────────────────────────
const initial: Report[] = [
  {
    id: 'R-2001', type: 'BOARD', category: '자유 게시판',
    targetName: '박서연', reporterName: '김민지', reason: 'ABUSE',
    content: '이 플랫폼 진짜 쓸모없고 여기 사람들 다 가짜임...',
    reportedAt: '2026.05.22', status: 'PENDING',
    aiReview: { severity: '중간', recommendation: 'BLINDED', summary: '욕설 및 비방 표현이 포함되어 있으며 커뮤니티 가이드라인 위반으로 판단됩니다. 블라인드 처리를 권고합니다.' },
    userAiReview: { reportCount: 2, warningCount: 2, riskLevel: '중간', recommendation: 'WARNING', summary: '최근 30일 내 2건의 신고가 접수되었습니다. 경고 수준으로 판단되며 추가 위반 시 활동정지를 권고합니다.' },
  },
  {
    id: 'R-2002', type: 'COMMENT', category: '취업 후기',
    targetName: '이준호', reporterName: '최도윤', reason: 'SPAM',
    content: '카카오톡 오픈채팅 1234 들어오시면 취업 100% 보장!',
    reportedAt: '2026.05.22', status: 'PENDING',
    aiReview: { severity: '높음', recommendation: 'BLINDED', summary: '외부 링크 유도 및 허위 광고성 내용이 확인됩니다. 즉시 블라인드 처리를 권고합니다.' },
    userAiReview: { reportCount: 7, warningCount: 3, riskLevel: '높음', recommendation: 'BLACKLIST', summary: '최근 30일 내 7건의 신고가 접수되었으며 스팸성 댓글 패턴이 반복 감지됩니다. 블랙리스트 등록을 강력 권고합니다.' },
  },
  {
    id: 'R-2003', type: 'MEMBER', category: '-',
    targetName: '홍길동', reporterName: '박서연', reason: 'INAPPROPRIATE',
    content: '경력 10년이라 써놨지만 실제로는 신입으로 확인됨',
    reportedAt: '2026.05.21', status: 'BLINDED',
    aiReview: { severity: '중간', recommendation: 'BLINDED', summary: '허위 경력 기재 의혹이 있습니다. 추가 확인 후 처리를 권고합니다.' },
    userAiReview: { reportCount: 1, warningCount: 0, riskLevel: '낮음', recommendation: 'WARNING', summary: '최초 신고 접수입니다. 허위 정보 기재 여부 확인 후 경고 처리를 권고합니다.' },
  },
  {
    id: 'R-2004', type: 'BOARD', category: '면접 후기',
    targetName: '이영희', reporterName: '김민지', reason: 'ABUSE',
    content: '취업도 못하는 주제에 여기서 뭘 가르치려고...',
    reportedAt: '2026.05.20', status: 'DISMISSED',
    aiReview: { severity: '낮음', recommendation: 'DISMISSED', summary: '표현이 다소 거칠지만 직접적인 욕설이나 명예훼손으로 보기 어렵습니다. 기각이 적합합니다.' },
    userAiReview: { reportCount: 1, warningCount: 0, riskLevel: '낮음', recommendation: 'NONE', summary: '신고 건이 기각 처리되었으며 회원 제재 사유가 없는 것으로 분류됩니다.' },
  },
  {
    id: 'R-2005', type: 'COMMENT', category: '자유 게시판',
    targetName: '최지수', reporterName: '이준호', reason: 'SPAM',
    content: '동일 내용 댓글을 30분 간격으로 반복 게시 중',
    reportedAt: '2026.05.19', status: 'PENDING',
  },
];

export default function ReportPage() {
  const [reports, setReports]             = useState<Report[]>(initial);
  const [selected, setSelected]           = useState<Report | null>(null);
  const [checkedIds, setCheckedIds]       = useState<string[]>([]);
  const [keyword, setKeyword]             = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [aiLoading, setAiLoading]         = useState<string | null>(null);
  const [userAiLoading, setUserAiLoading] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Report | null>(null);
  const [suspendType, setSuspendType]     = useState<SuspendType>('WARNING');
  const [suspendDuration, setSuspendDuration] = useState<SuspendDuration>('THREE_DAYS');
  const [suspendReason, setSuspendReason] = useState('');

  const filtered = reports.filter(
    (r) =>
      (!typeFilter   || r.type   === typeFilter) &&
      (!statusFilter || r.status === statusFilter) &&
      (r.id.includes(keyword) || r.targetName.includes(keyword) || r.reporterName.includes(keyword)),
  );

  const toggleAll = (checked: boolean) =>
    setCheckedIds(checked ? filtered.map((r) => r.id) : []);
  const toggleOne = (id: string, checked: boolean) =>
    setCheckedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));

  const applyStatus = (ids: string[], status: ReportStatus) => {
    setReports((prev) => prev.map((r) => (ids.includes(r.id) ? { ...r, status } : r)));
    setSelected((prev) => (prev && ids.includes(prev.id) ? { ...prev, status } : prev));
    setCheckedIds([]);
  };

  const deleteItems = (ids: string[]) => {
    setReports((prev) => prev.filter((r) => !ids.includes(r.id)));
    if (selected && ids.includes(selected.id)) setSelected(null);
    setCheckedIds([]);
  };

  const requestAiReview = (reportId: string) => {
    setAiLoading(reportId);
    setTimeout(() => {
      const mockReview: AiReview = {
        severity: '중간', recommendation: 'BLINDED',
        summary: 'AI 검토 결과, 해당 콘텐츠에 커뮤니티 가이드라인 위반 요소가 감지되었습니다. 블라인드 처리를 권고합니다.',
      };
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, aiReview: mockReview } : r)));
      setSelected((prev) => (prev && prev.id === reportId ? { ...prev, aiReview: mockReview } : prev));
      setAiLoading(null);
    }, 1500);
  };

  const requestUserAiReview = (reportId: string) => {
    setUserAiLoading(reportId);
    setTimeout(() => {
      const mockReview: UserAiReview = {
        reportCount: 3, warningCount: 1, riskLevel: '중간', recommendation: 'WARNING',
        summary: 'AI 분석 결과 최근 활동에서 반복적인 가이드라인 위반 패턴이 감지되었습니다. 경고 조치를 권고합니다.',
      };
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, userAiReview: mockReview } : r)));
      setSelected((prev) => (prev && prev.id === reportId ? { ...prev, userAiReview: mockReview } : prev));
      setUserAiLoading(null);
    }, 1500);
  };

  const applySuspend = () => {
    setSuspendTarget(null);
    setSuspendReason('');
    setSuspendType('WARNING');
    setSuspendDuration('THREE_DAYS');
  };

  const pendingCount  = reports.filter((r) => r.status === 'PENDING').length;
  const blindedCount  = reports.filter((r) => r.status === 'BLINDED').length;
  const highRiskCount = reports.filter((r) => r.aiReview?.severity === '높음').length;

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
              <p>전체 신고</p><h3>{reports.length}</h3><span>누적 접수</span>
            </div>
            <div className="memberKpiIcon kpi-blue"><Flag size={24} /></div>
          </article>
          <article className="memberSummaryCard kpi-yellow">
            <div className="memberKpiContent">
              <p>처리 대기</p><h3>{pendingCount}</h3><span>즉시 검토 필요</span>
            </div>
            <div className="memberKpiIcon kpi-yellow"><Clock size={24} /></div>
          </article>
          <article className="memberSummaryCard kpi-purple">
            <div className="memberKpiContent">
              <p>블라인드 처리</p><h3>{blindedCount}</h3><span>처리 완료</span>
            </div>
            <div className="memberKpiIcon kpi-purple"><EyeOff size={24} /></div>
          </article>
          <article className="memberSummaryCard kpi-green">
            <div className="memberKpiContent">
              <p>AI 고위험 감지</p><h3>{highRiskCount}</h3><span>즉시 처리 권고</span>
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
          <button className="memberFilterBtn">검색</button>
        </section>

        {/* Bulk action bar */}
        {checkedIds.length > 0 && (
          <div className="bulkBar">
            <span>{checkedIds.length}건 선택됨</span>
            <button onClick={() => applyStatus(checkedIds, 'BLINDED')}>일괄 블라인드</button>
            <button onClick={() => applyStatus(checkedIds, 'DISMISSED')}>일괄 기각</button>
            <button className="danger" onClick={() => deleteItems(checkedIds)}>일괄 삭제</button>
          </div>
        )}

        {/* Table */}
        <section className="admin-card memberTableCard">
          <div className="memberTableHeader">
            <h3>신고 목록<span className="memberTotalCount">총 {filtered.length}건</span></h3>
          </div>
          <div className="tableScroll">
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
                <th>신고 ID</th><th>유형</th><th>게시판</th>
                <th>신고 대상</th><th>신고자</th><th>신고 사유</th>
                <th>접수일</th><th>상태</th><th>관리</th>
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
                  <td><span className={`reportTypeBadge ${typeCls[r.type]}`}>{typeLabel[r.type]}</span></td>
                  <td>{r.category}</td>
                  <td>{r.targetName}</td>
                  <td>{r.reporterName}</td>
                  <td>{reasonLabel[r.reason]}</td>
                  <td>{r.reportedAt}</td>
                  <td><span className={`statusBadge ${statusCls[r.status]}`}>{statusLabel[r.status]}</span></td>
                  <td>
                    <button className="tableBtn" onClick={() => setSelected(r)}>상세보기</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="memberTableFooter">
            <span className="memberTableCount">총 {filtered.length}건</span>
            <div className="pagination">
              <button>{'<'}</button>
              <button className="activePage">1</button>
              <button>2</button>
              <button>{'>'}</button>
            </div>
          </div>
        </section>
      </div>

      {/* ── Detail Modal ───────────────────────────────────────── */}
      {selected && (
        <div className="modalOverlay" onClick={() => setSelected(null)}>
          <div className="memberModal modal--scrollable" onClick={(e) => e.stopPropagation()} style={{ width: 600 }}>
            <div className="modalHeader">
              <div>
                <h3>신고 상세 · {selected.id}</h3>
                <p>{typeLabel[selected.type]} · {selected.reportedAt}</p>
              </div>
              <button onClick={() => setSelected(null)}>닫기</button>
            </div>

            <div className="modalBody">
              {/* 신고 정보 */}
              <div className="modalInfoGrid">
                <div>
                  <span>유형</span>
                  <strong>
                    <span className={`reportTypeBadge ${typeCls[selected.type]}`}>{typeLabel[selected.type]}</span>
                  </strong>
                </div>
                <div><span>신고 사유</span><strong>{reasonLabel[selected.reason]}</strong></div>
                <div><span>게시판</span><strong>{selected.category}</strong></div>
                <div><span>접수일</span><strong>{selected.reportedAt}</strong></div>
                <div><span>신고 대상</span><strong>{selected.targetName}</strong></div>
                <div><span>신고자</span><strong>{selected.reporterName}</strong></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span>신고 대상 본문</span>
                  <strong style={{ display: 'block', marginTop: 8, lineHeight: 1.7, wordBreak: 'break-all' }}>
                    {selected.content}
                  </strong>
                </div>
                <div>
                  <span>현재 상태</span>
                  <strong>
                    <span className={`statusBadge ${statusCls[selected.status]}`}>{statusLabel[selected.status]}</span>
                  </strong>
                </div>
              </div>

              {/* 콘텐츠 AI 검토 */}
              <div className="reportAiSection">
                <h4><Bot size={14} /> 콘텐츠 AI 검토</h4>
                {selected.aiReview ? (
                  <>
                    <div className="reportAiGrid">
                      <div>
                        <span>심각도</span>
                        <span className={`severityBadge ${severityCls[selected.aiReview.severity]}`}>
                          <AlertTriangle size={11} />{selected.aiReview.severity}
                        </span>
                      </div>
                      <div>
                        <span>처리 권고</span>
                        <span className={`statusBadge ${statusCls[selected.aiReview.recommendation]}`}>
                          {statusLabel[selected.aiReview.recommendation]}
                        </span>
                      </div>
                    </div>
                    <p className="reportAiSummary">{selected.aiReview.summary}</p>
                  </>
                ) : (
                  <button
                    className="aiReviewBtn"
                    disabled={aiLoading === selected.id}
                    onClick={() => requestAiReview(selected.id)}
                  >
                    <Bot size={14} />
                    {aiLoading === selected.id ? 'AI 검토 중...' : 'AI 검토 요청'}
                  </button>
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
                    disabled={userAiLoading === selected.id}
                    onClick={() => requestUserAiReview(selected.id)}
                  >
                    <UserX size={14} />
                    {userAiLoading === selected.id ? '분석 중...' : '대상 회원 AI 검토 요청'}
                  </button>
                )}
              </div>
            </div>{/* /modalBody */}

            {/* Action */}
            <div className="modalAction" style={{ justifyContent: 'space-between' }}>
              {selected.type !== 'MEMBER' ? (
                <button className="tableBtn tableBtn--danger" onClick={() => deleteItems([selected.id])}>
                  {selected.type === 'COMMENT' ? '댓글 삭제' : '게시글 삭제'}
                </button>
              ) : (
                <span />
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                {selected.status === 'PENDING' && (
                  <>
                    <button className="tableBtn tableBtn--approve" onClick={() => applyStatus([selected.id], 'BLINDED')}>
                      블라인드
                    </button>
                    <button className="tableBtn" onClick={() => applyStatus([selected.id], 'DISMISSED')}>
                      기각
                    </button>
                  </>
                )}
                <button
                  className="tableBtn tableBtn--warn"
                  onClick={() => { setSuspendTarget(selected); setSuspendType('WARNING'); setSuspendReason(''); }}
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
              <strong>{suspendTarget.targetName}</strong>
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
