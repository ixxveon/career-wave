import { useMemo, useState } from 'react';
import '../../styles/admin.css';

type Tone = 'normal' | 'warning' | 'danger' | 'info';
type PipelineStatus = 'ACTIVE' | 'WARNING' | 'FAILED' | 'RECOVERING' | 'PAUSED';
type ReviewStatus = 'PENDING' | 'REVIEW_REQUIRED' | 'AUTO_APPROVED' | 'SUSPENDED';
type QaStatus = 'READY' | 'APPLIED' | 'MANUAL_REVIEW';

interface SummaryCard {
  label: string;
  value: string;
  subLabel: string;
  tone: Tone;
}

interface PipelineRow {
  id: string;
  source: string;
  status: PipelineStatus;
  successRate: number;
  avgDurationMs: number;
  cycle: string;
  volume: number;
  recentError: string;
  live?: boolean;
}

interface IncidentItem {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  source: string;
  affectedCount: string;
  assignedOperator: string;
  incidentStatus: string;
  retryCount: number;
  lastSuccessTime: string;
  description: string;
  active: boolean;
  tone: Tone;
}

interface ReviewRow {
  id: string;
  title: string;
  riskReason: string;
  riskScore: number;
  submittedAt: string;
  assignee: string;
  status: ReviewStatus;
  suggestion?: string;
  processingMinutes: number;
}

interface QaItem {
  id: string;
  linkedReviewId: string;
  confidence: string;
  originalExtraction: [string, string];
  suggestedCorrection: [string, string];
  reasoningEvidence: string[];
  sourceSentence: string;
  status: QaStatus;
}

interface TimelineItem {
  id: string;
  time: string;
  title: string;
  detail: string;
  tone: Tone;
}

interface LogLine {
  id: string;
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
  detail?: string;
}

const initialPipelines: PipelineRow[] = [
  {
    id: 'PL-001',
    source: 'LinkedIn API',
    status: 'ACTIVE',
    successRate: 99.1,
    avgDurationMs: 1240,
    cycle: '15m',
    volume: 1402,
    recentError: '-',
    live: true,
  },
  {
    id: 'PL-002',
    source: 'Saramin DOM',
    status: 'FAILED',
    successRate: 12.4,
    avgDurationMs: 4810,
    cycle: '5m',
    volume: 0,
    recentError: 'SelectorMismatch',
    live: true,
  },
  {
    id: 'PL-003',
    source: 'Indeed Cloud',
    status: 'WARNING',
    successRate: 84.2,
    avgDurationMs: 2100,
    cycle: '30m',
    volume: 421,
    recentError: 'RateLimitApproach',
  },
  {
    id: 'PL-004',
    source: 'Wanted Feed',
    status: 'RECOVERING',
    successRate: 91.8,
    avgDurationMs: 1620,
    cycle: '20m',
    volume: 1042,
    recentError: 'ProxyRecovered',
  },
];

const initialIncidents: IncidentItem[] = [
  {
    id: 'INC-001',
    severity: 'CRITICAL',
    title: 'DOM 구조 변경 감지',
    source: 'Saramin',
    affectedCount: '842건 미수집',
    assignedOperator: 'Kim Ops',
    incidentStatus: '조사 중',
    retryCount: 12,
    lastSuccessTime: '2시간 전',
    description: '채용 상세 페이지 DOM 구조가 바뀌어 셀렉터 파싱 실패가 급증했습니다.',
    active: true,
    tone: 'danger',
  },
  {
    id: 'INC-002',
    severity: 'WARNING',
    title: '응답 지연 증가',
    source: 'Node-KR-04',
    affectedCount: '응답 지연 12초',
    assignedOperator: 'Auto_Bot',
    incidentStatus: '모니터링 중',
    retryCount: 3,
    lastSuccessTime: '18분 전',
    description: '국내 수집 노드의 응답 지연이 임계치에 근접해 배치 대기열이 늘고 있습니다.',
    active: true,
    tone: 'warning',
  },
  {
    id: 'INC-003',
    severity: 'INFO',
    title: '프록시 풀 교체 완료',
    source: 'Wanted Feed',
    affectedCount: '정상화 완료',
    assignedOperator: 'Lee QA',
    incidentStatus: '확인 대기',
    retryCount: 1,
    lastSuccessTime: '35분 전',
    description: '회복 조치 후 성공률이 90% 이상으로 회복되었습니다.',
    active: false,
    tone: 'info',
  },
];

const initialReviews: ReviewRow[] = [
  {
    id: '331-Z',
    title: '백엔드 개발자 - Node/React',
    riskReason: '기술 스택 불일치',
    riskScore: 45,
    submittedAt: '17:22',
    assignee: 'Kim Ops',
    status: 'REVIEW_REQUIRED',
    suggestion: '스택 표기 보정 필요',
    processingMinutes: 16,
  },
  {
    id: '552-B',
    title: '데이터 엔지니어',
    riskReason: '민감 키워드 포함',
    riskScore: 68,
    submittedAt: '17:11',
    assignee: 'Kim Ops',
    status: 'REVIEW_REQUIRED',
    suggestion: '표현 수위 검토 필요',
    processingMinutes: 15,
  },
  {
    id: '991-X',
    title: 'AI 제품 디자이너',
    riskReason: '복지 정보 누락',
    riskScore: 31,
    submittedAt: '16:58',
    assignee: 'Auto_Bot',
    status: 'PENDING',
    suggestion: '복지 필드 재추출 권장',
    processingMinutes: 8,
  },
];

const initialQaItems: QaItem[] = [
  {
    id: 'QA-331-Z',
    linkedReviewId: '331-Z',
    confidence: '94.2%',
    originalExtraction: ['Node.js, React', '경력 3년 이상'],
    suggestedCorrection: ['Node.js, NestJS, React', '경력 5년 이상'],
    reasoningEvidence: [
      '본문 기술 스택 표기와 상세 요구사항 사이에 불일치가 감지되었습니다.',
      '상세요강 하단의 자격요건 문장에서 경력 기준 차이를 확인했습니다.',
    ],
    sourceSentence: '필수 스킬: NestJS, React / 백엔드 개발 경력 5년 이상',
    status: 'READY',
  },
];

const initialTimeline: TimelineItem[] = [
  {
    id: 'TL-001',
    time: '18:42:13',
    title: 'Saramin 파이프라인 실패',
    detail: 'DOM 구조 변경으로 셀렉터 재검증이 필요합니다.',
    tone: 'danger',
  },
  {
    id: 'TL-002',
    time: '18:39:52',
    title: '보정 제안 검수 큐 추가',
    detail: 'Node/React 공고가 수동 검수와 QA 보정 검수에 동시 등록되었습니다.',
    tone: 'warning',
  },
  {
    id: 'TL-003',
    time: '18:34:10',
    title: '프록시 풀 교체 완료',
    detail: 'Wanted Feed 성공률이 91.8%로 회복되었습니다.',
    tone: 'info',
  },
];

const statusTone: Record<PipelineStatus, Tone> = {
  ACTIVE: 'normal',
  WARNING: 'warning',
  FAILED: 'danger',
  RECOVERING: 'info',
  PAUSED: 'info',
};

const statusLabel: Record<PipelineStatus, string> = {
  ACTIVE: '정상',
  WARNING: '주의',
  FAILED: '실패',
  RECOVERING: '복구 중',
  PAUSED: '중지',
};

const reviewLabel: Record<ReviewStatus, string> = {
  PENDING: '대기',
  REVIEW_REQUIRED: '검수 필요',
  AUTO_APPROVED: '자동 승인',
  SUSPENDED: '중단',
};

const reviewTone = (status: ReviewStatus): Tone => {
  if (status === 'REVIEW_REQUIRED') return 'warning';
  if (status === 'SUSPENDED') return 'danger';
  return 'info';
};

const qaTone = (status: QaStatus): Tone => {
  if (status === 'APPLIED') return 'normal';
  if (status === 'MANUAL_REVIEW') return 'warning';
  return 'info';
};

const levelTone: Record<LogLine['level'], Tone> = {
  INFO: 'info',
  WARN: 'warning',
  ERROR: 'danger',
  SUCCESS: 'normal',
};

const buildQaSuggestionFromReview = (row: ReviewRow): QaItem => ({
  id: `QA-${row.id}`,
  linkedReviewId: row.id,
  confidence: `${Math.min(98.4, Math.max(82.1, row.riskScore + 36.2)).toFixed(1)}%`,
  originalExtraction: [row.riskReason, '기존 추출값'],
  suggestedCorrection: [row.suggestion ?? '보정안 생성', row.title],
  reasoningEvidence: [
    `${row.riskReason} 패턴이 감지되어 QA 보정 검수로 전환했습니다.`,
    `${row.title} 공고에서 운영자 확인이 필요한 필드를 재검토했습니다.`,
  ],
  sourceSentence: `${row.title} 공고 본문에서 보정 대상 문장이 감지되었습니다.`,
  status: 'READY',
});

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatDuration = (ms: number) => `${ms.toLocaleString()}ms`;
const formatVolume = (value: number) => value.toLocaleString();

export default function ScrapingPage() {
  const [pipelines, setPipelines] = useState(initialPipelines);
  const [incidents, setIncidents] = useState(initialIncidents);
  const [reviews, setReviews] = useState(initialReviews);
  const [qaItems, setQaItems] = useState(initialQaItems);
  const [timelineItems, setTimelineItems] = useState(initialTimeline);
  const [pipelineQuery, setPipelineQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PipelineStatus>('ALL');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [expandedQaId, setExpandedQaId] = useState<string | null>(initialQaItems[0]?.id ?? null);
  const [updatedSeconds] = useState(35);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    const avgSuccess = pipelines.reduce((sum, item) => sum + item.successRate, 0) / pipelines.length;
    const failedCount = pipelines.filter((item) => item.status === 'FAILED').length;
    const reviewQueue = reviews.filter((item) => item.status === 'REVIEW_REQUIRED').length;
    const suspended = reviews.filter((item) => item.status === 'SUSPENDED').length;
    const uiChanges = incidents.filter((item) => item.severity === 'CRITICAL').length;
    const avgMinutes = Math.round(reviews.reduce((sum, item) => sum + item.processingMinutes, 0) / reviews.length);

    return [
      { label: '파이프라인 성공률', value: formatPercent(avgSuccess), subLabel: '+0.5%', tone: 'normal' },
      { label: '실패 파이프라인', value: String(failedCount), subLabel: '< 1/hr', tone: 'danger' },
      { label: '검수 대기 공고', value: String(reviewQueue), subLabel: '큐 추적 중', tone: 'warning' },
      { label: '노출 중단 공고', value: String(suspended), subLabel: '수동 검수 4건', tone: 'info' },
      { label: 'UI 변경 감지', value: String(uiChanges), subLabel: '즉시 대응 필요', tone: 'danger' },
      { label: '평균 검수 시간', value: `${avgMinutes}m`, subLabel: '-2m', tone: 'info' },
    ];
  }, [incidents, pipelines, reviews]);

  const filteredPipelines = useMemo(() => {
    return pipelines.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const keyword = pipelineQuery.trim().toLowerCase();
      const matchesQuery =
        keyword.length === 0 ||
        item.source.toLowerCase().includes(keyword) ||
        item.recentError.toLowerCase().includes(keyword);
      return matchesStatus && matchesQuery;
    });
  }, [pipelineQuery, pipelines, statusFilter]);

  const allVisibleSelected =
    filteredPipelines.length > 0 && filteredPipelines.every((item) => selectedRows.includes(item.id));

  const activityLogs = useMemo<LogLine[]>(() => {
    return [
      {
        id: 'LOG-001',
        time: '18:42:13',
        level: 'ERROR',
        message: 'Saramin 셀렉터 매칭 실패',
        detail: 'DOM 구조 변경으로 재배포 전까지 수집이 중단되었습니다.',
      },
      {
        id: 'LOG-002',
        time: '18:39:52',
        level: 'WARN',
        message: '검수 큐에서 QA 보정 검수 생성',
        detail: '331-Z 공고가 보정 제안 검수와 연결되었습니다.',
      },
      {
        id: 'LOG-003',
        time: '18:34:10',
        level: 'SUCCESS',
        message: 'Wanted Feed 복구 완료',
        detail: '프록시 교체 후 성공률 91.8%를 회복했습니다.',
      },
    ];
  }, []);

  const appendTimeline = (item: Omit<TimelineItem, 'id'>) => {
    setTimelineItems((prev) => [
      { id: `TL-${Date.now()}`, ...item },
      ...prev.slice(0, 5),
    ]);
  };

  const toggleAllRows = () => {
    if (allVisibleSelected) {
      setSelectedRows((prev) => prev.filter((id) => !filteredPipelines.some((item) => item.id === id)));
      return;
    }
    setSelectedRows((prev) => Array.from(new Set([...prev, ...filteredPipelines.map((item) => item.id)])));
  };

  const handlePipelineAction = (row: PipelineRow, action: 'run' | 'retry' | 'pause' | 'test') => {
    if (action === 'pause') {
      setPipelines((prev) => prev.map((item) => (item.id === row.id ? { ...item, status: 'PAUSED', live: false } : item)));
      appendTimeline({
        time: '방금 전',
        title: `${row.source} 배치 중지`,
        detail: '운영자가 수동으로 파이프라인을 일시 중지했습니다.',
        tone: 'warning',
      });
      return;
    }

    if (action === 'retry') {
      setPipelines((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? { ...item, status: 'RECOVERING', recentError: '재시도 실행', avgDurationMs: Math.max(1100, item.avgDurationMs - 350) }
            : item,
        ),
      );
      appendTimeline({
        time: '방금 전',
        title: `${row.source} 재시도`,
        detail: '복구 파이프라인을 재실행했습니다.',
        tone: 'info',
      });
      return;
    }

    if (action === 'test') {
      appendTimeline({
        time: '방금 전',
        title: `${row.source} 셀렉터 검증`,
        detail: '현재 셀렉터 규칙으로 샘플 페이지를 다시 검사했습니다.',
        tone: row.status === 'FAILED' ? 'warning' : 'info',
      });
      return;
    }

    appendTimeline({
      time: '방금 전',
      title: `${row.source} 수동 실행`,
      detail: '운영자가 파이프라인을 즉시 실행했습니다.',
      tone: 'normal',
    });
  };

  const syncQaFromReview = (row: ReviewRow) => {
    if (!row.suggestion) return;

    const nextQaId = qaItems.find((item) => item.linkedReviewId === row.id)?.id ?? `QA-${row.id}`;
    const nextQaItem = buildQaSuggestionFromReview({
      ...row,
      status: 'REVIEW_REQUIRED',
      assignee: row.assignee === 'Auto_Bot' ? 'Kim Ops' : row.assignee,
    });

    setQaItems((prev) => {
      const found = prev.find((item) => item.linkedReviewId === row.id);
      if (!found) {
        return [{ ...nextQaItem, id: nextQaId }, ...prev];
      }

      return prev.map((item) =>
        item.linkedReviewId === row.id
          ? {
              ...item,
              confidence: nextQaItem.confidence,
              suggestedCorrection: nextQaItem.suggestedCorrection,
              reasoningEvidence: nextQaItem.reasoningEvidence,
              sourceSentence: nextQaItem.sourceSentence,
              status: item.status === 'APPLIED' ? 'MANUAL_REVIEW' : 'READY',
            }
          : item,
      );
    });
    setExpandedQaId(nextQaId);
  };

  const handleReviewRowAction = (row: ReviewRow, action: 'approve' | 'review' | 'suspend') => {
    if (action === 'approve') {
      setReviews((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, status: 'AUTO_APPROVED', processingMinutes: Math.max(5, item.processingMinutes - 4) } : item,
        ),
      );
      appendTimeline({
        time: '방금 전',
        title: `${row.id} 공고 승인`,
        detail: `${row.title} 공고를 운영 검수에서 승인했습니다.`,
        tone: 'normal',
      });
      return;
    }

    if (action === 'review') {
      setReviews((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                status: 'REVIEW_REQUIRED',
                assignee: item.assignee === 'Auto_Bot' ? 'Kim Ops' : item.assignee,
                suggestion: item.suggestion ?? '보정안 생성',
              }
            : item,
        ),
      );
      setSelectedRows((prev) => (prev.includes(row.id) ? prev : [...prev, row.id]));
      syncQaFromReview(row);
      appendTimeline({
        time: '방금 전',
        title: `${row.id} 검수 시작`,
        detail: '검수 운영에서 시작한 항목을 보정 제안 검수에도 반영했습니다.',
        tone: 'warning',
      });
      return;
    }

    setReviews((prev) => prev.map((item) => (item.id === row.id ? { ...item, status: 'SUSPENDED' } : item)));
    appendTimeline({
      time: '방금 전',
      title: `${row.id} 공고 중단`,
      detail: `${row.title} 공고를 수동으로 중단했습니다.`,
      tone: 'danger',
    });
  };

  const handleQaApply = (item: QaItem) => {
    setQaItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, status: 'APPLIED' } : entry)));
    setReviews((prev) =>
      prev.map((row) =>
        row.id === item.linkedReviewId
          ? { ...row, suggestion: '보정 반영 완료', riskScore: Math.max(18, row.riskScore - 12) }
          : row,
      ),
    );
    appendTimeline({
      time: '방금 전',
      title: `${item.linkedReviewId} 보정안 반영`,
      detail: '보정 제안을 검수 큐에 반영했습니다.',
      tone: 'normal',
    });
  };

  const handleQaManual = (item: QaItem) => {
    setQaItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, status: 'MANUAL_REVIEW' } : entry)));
    setReviews((prev) =>
      prev.map((row) =>
        row.id === item.linkedReviewId ? { ...row, suggestion: '수동 보정 대기', status: 'REVIEW_REQUIRED' } : row,
      ),
    );
    setExpandedQaId(item.id);
    appendTimeline({
      time: '방금 전',
      title: `${item.linkedReviewId} 수동 보정 전환`,
      detail: '운영자가 AI 제안 대신 수동 검수를 선택했습니다.',
      tone: 'warning',
    });
  };

  return (
    <section className="scrapeOpsPage">
      <header className="admin-header">
        <div>
          <h2>스크래핑 관리</h2>
          <p>채용 공고 수집 상태, 파이프라인 장애, 검수 대기열을 한 화면에서 관리합니다.</p>
        </div>
        <div className="scrapeOpsLiveMeta">
          <span className="scrapeOpsLivePill">
            <i />
            실시간 파이프라인 모니터링
          </span>
          <span>Updated {updatedSeconds}s ago</span>
        </div>
      </header>

      <section className="scrapeOpsSummaryGrid">
        {summaryCards.map((card) => (
          <article key={card.label} className={`admin-card scrapeOpsSummaryCard ${card.tone}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.subLabel}</p>
          </article>
        ))}
      </section>

      <section className="scrapeOpsContentGrid">
        <div className="scrapeOpsMainColumn">
          <section className="admin-card scrapeOpsPanel">
            <div className="scrapeOpsPanelHead">
              <div>
                <span className="scrapeOpsEyebrow">PIPELINE</span>
                <h3>스크래핑 배치 모니터링</h3>
              </div>
              <div className="scrapeOpsHeadActions">
                <input
                  className="scrapeOpsSearch"
                  value={pipelineQuery}
                  onChange={(event) => setPipelineQuery(event.target.value)}
                  placeholder="파이프라인 검색"
                />
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | PipelineStatus)}>
                  <option value="ALL">전체 상태</option>
                  <option value="ACTIVE">정상</option>
                  <option value="WARNING">주의</option>
                  <option value="FAILED">실패</option>
                  <option value="RECOVERING">복구 중</option>
                  <option value="PAUSED">중지</option>
                </select>
              </div>
            </div>

            <div className="scrapeOpsTableWrap compact">
              <table className="scrapeOpsTable">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllRows} />
                    </th>
                    <th>Source</th>
                    <th>상태</th>
                    <th>성공률</th>
                    <th>평균 응답</th>
                    <th>주기</th>
                    <th>수집 건수</th>
                    <th>최근 에러</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPipelines.map((row) => (
                    <tr key={row.id} className={row.live ? 'scrapeOpsLiveRow' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={() =>
                            setSelectedRows((prev) =>
                              prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id],
                            )
                          }
                        />
                      </td>
                      <td>
                        <strong>{row.source}</strong>
                      </td>
                      <td>
                        <span className={`scrapeOpsBadge ${statusTone[row.status]}`}>{statusLabel[row.status]}</span>
                      </td>
                      <td>{formatPercent(row.successRate)}</td>
                      <td>{formatDuration(row.avgDurationMs)}</td>
                      <td>*/{row.cycle}</td>
                      <td>{formatVolume(row.volume)}</td>
                      <td>{row.recentError}</td>
                      <td>
                        <div className="scrapeOpsRowActions">
                          <button type="button" className="scrapeOpsActionButton secondary" onClick={() => handlePipelineAction(row, 'run')}>
                            실행
                          </button>
                          <button type="button" className="scrapeOpsActionButton primary" onClick={() => handlePipelineAction(row, 'retry')}>
                            재시도
                          </button>
                          <button type="button" className="scrapeOpsActionButton secondary" onClick={() => handlePipelineAction(row, 'test')}>
                            테스트
                          </button>
                          <button type="button" className="scrapeOpsActionButton danger" onClick={() => handlePipelineAction(row, 'pause')}>
                            중지
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-card scrapeOpsPanel">
            <div className="scrapeOpsPanelHead">
              <div>
                <span className="scrapeOpsEyebrow">REVIEW OPS</span>
                <h3>검수 운영</h3>
              </div>
              <div className="scrapeOpsSelectionBar">
                <span>선택 공고 {selectedRows.length}건</span>
              </div>
            </div>

            <div className="scrapeOpsTableWrap">
              <table className="scrapeOpsTable">
                <thead>
                  <tr>
                    <th>공고명</th>
                    <th>위험 사유</th>
                    <th>위험 점수</th>
                    <th>담당자</th>
                    <th>AI 제안</th>
                    <th>상태</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.title}</strong>
                      </td>
                      <td>{row.riskReason}</td>
                      <td>
                        <span className={`scrapeOpsBadge ${row.riskScore >= 60 ? 'danger' : row.riskScore >= 40 ? 'warning' : 'info'}`}>
                          {row.riskScore}
                        </span>
                      </td>
                      <td>{row.assignee}</td>
                      <td>{row.suggestion ?? '-'}</td>
                      <td>
                        <span className={`scrapeOpsBadge ${reviewTone(row.status)}`}>{reviewLabel[row.status]}</span>
                      </td>
                      <td>
                        <div className="scrapeOpsRowActions">
                          <button type="button" className="scrapeOpsActionButton primary" onClick={() => handleReviewRowAction(row, 'review')}>
                            검수
                          </button>
                          <button type="button" className="scrapeOpsActionButton secondary" onClick={() => handleReviewRowAction(row, 'approve')}>
                            승인
                          </button>
                          <button type="button" className="scrapeOpsActionButton danger" onClick={() => handleReviewRowAction(row, 'suspend')}>
                            중단
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-card scrapeOpsPanel">
            <div className="scrapeOpsPanelHead">
              <div>
                <span className="scrapeOpsEyebrow">AI CORRECTION</span>
                <h3>보정 제안 검수</h3>
              </div>
              <span className="scrapeOpsQaConfidence">{qaItems[0]?.confidence ?? '-'}</span>
            </div>

            <div className="scrapeOpsQaList">
              {qaItems.map((item) => {
                const expanded = expandedQaId === item.id;
                return (
                  <article key={item.id} className="scrapeOpsQaCard">
                    <div className="scrapeOpsQaCompactBar">
                      <div>
                        <strong>{item.linkedReviewId}</strong>
                        <span className={`scrapeOpsBadge ${qaTone(item.status)}`}>
                          {item.status === 'APPLIED' ? '반영 완료' : item.status === 'MANUAL_REVIEW' ? '수동 검수' : '검수 대기'}
                        </span>
                      </div>
                      <button type="button" className="scrapeOpsActionButton secondary" onClick={() => setExpandedQaId(expanded ? null : item.id)}>
                        {expanded ? '접기' : '상세 보기'}
                      </button>
                    </div>

                    {expanded ? (
                      <div className="scrapeOpsQaDetail">
                        <div className="scrapeOpsQaGrid">
                          <div>
                            <span>기존 추출</span>
                            <strong>{item.originalExtraction.join(' / ')}</strong>
                          </div>
                          <div>
                            <span>보정 제안</span>
                            <strong>{item.suggestedCorrection.join(' / ')}</strong>
                          </div>
                        </div>
                        <p>{item.sourceSentence}</p>
                        <ul>
                          {item.reasoningEvidence.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                        <div className="scrapeOpsRowActions">
                          <button type="button" className="scrapeOpsActionButton primary" onClick={() => handleQaApply(item)}>
                            반영
                          </button>
                          <button type="button" className="scrapeOpsActionButton secondary" onClick={() => handleQaManual(item)}>
                            수동 검수
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <div className="scrapeOpsSideColumn">
          <section className="admin-card scrapeOpsPanel">
            <div className="scrapeOpsPanelHead">
              <div>
                <span className="scrapeOpsEyebrow">INCIDENT RESPONSE</span>
                <h3>긴급 이슈 대응</h3>
              </div>
              <span className="scrapeOpsActivePill">{incidents.filter((item) => item.active).length}건 활성</span>
            </div>

            <div className="scrapeOpsIncidentList">
              {incidents.map((item) => (
                <article key={item.id} className={`scrapeOpsIncidentCard ${item.tone}`}>
                  <div className="scrapeOpsIncidentHead">
                    <span className={`scrapeOpsSeverity ${item.tone}`}>{item.severity}</span>
                    <span className="scrapeOpsIncidentTime">Last {item.lastSuccessTime}</span>
                  </div>
                  <strong>{item.title}: {item.source}</strong>
                  <p>{item.description}</p>
                  <div className="scrapeOpsIncidentMeta">
                    <span>Retry {item.retryCount}</span>
                    <span>{item.incidentStatus}</span>
                    <span>Assigned {item.assignedOperator}</span>
                    <span>{item.affectedCount}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-card scrapeOpsPanel">
            <div className="scrapeOpsPanelHead">
              <div>
                <span className="scrapeOpsEyebrow">OPERATIONS TIMELINE</span>
                <h3>실시간 이벤트</h3>
              </div>
            </div>
            <div className="scrapeOpsTimelineList compactScroll">
              {timelineItems.map((item) => (
                <article key={item.id} className="scrapeOpsTimelineItem">
                  <span className={`scrapeOpsTimelineDot ${item.tone}`} />
                  <div className="scrapeOpsTimelineContent">
                    <strong>{item.time}</strong>
                    <h4>{item.title}</h4>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-card scrapeOpsPanel">
            <div className="scrapeOpsPanelHead compact">
              <div>
                <span className="scrapeOpsEyebrow">OPERATIONS LOG</span>
                <h3>실시간 로그</h3>
              </div>
            </div>
            <div className="scrapeOpsLogConsole">
              {activityLogs.map((line) => (
                <article key={line.id} className="scrapeOpsLogLine">
                  <div className="scrapeOpsLogMeta">
                    <span className={`scrapeOpsSeverity ${levelTone[line.level]}`}>{line.level}</span>
                    <strong>{line.time}</strong>
                  </div>
                  <p>{line.message}</p>
                  {line.detail ? <small>{line.detail}</small> : null}
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <style>{`
        .scrapeOpsPage {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .scrapeOpsLiveMeta {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #6f88a6;
          font-size: 14px;
          font-weight: 700;
        }

        .scrapeOpsLivePill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: 1px solid #c8d9ef;
          border-radius: 999px;
          background: #f7fbff;
          color: #183b67;
        }

        .scrapeOpsLivePill i {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #2f9e69;
          display: inline-block;
        }

        .scrapeOpsSummaryGrid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
        }

        .scrapeOpsSummaryCard {
          padding: 16px;
          border-radius: 18px;
          border: 1px solid #d7e3f4;
        }

        .scrapeOpsSummaryCard span {
          display: block;
          color: #6c86a6;
          font-size: 13px;
          font-weight: 700;
        }

        .scrapeOpsSummaryCard strong {
          display: block;
          margin-top: 8px;
          color: #173c68;
          font-size: 40px;
          line-height: 1;
        }

        .scrapeOpsSummaryCard p {
          margin: 10px 0 0;
          font-size: 13px;
          font-weight: 700;
          color: #275fd1;
        }

        .scrapeOpsSummaryCard.normal {
          background: #ffffff;
        }

        .scrapeOpsSummaryCard.warning {
          background: #fffaf0;
        }

        .scrapeOpsSummaryCard.danger {
          background: #fff7f6;
        }

        .scrapeOpsSummaryCard.info {
          background: #f7fbff;
        }

        .scrapeOpsContentGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(360px, 0.9fr);
          gap: 16px;
          align-items: start;
        }

        .scrapeOpsMainColumn,
        .scrapeOpsSideColumn {
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        .scrapeOpsPanel {
          padding: 16px;
          border-radius: 22px;
          border: 1px solid #d7e3f4;
        }

        .scrapeOpsPanelHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .scrapeOpsPanelHead.compact {
          margin-bottom: 10px;
        }

        .scrapeOpsEyebrow {
          display: block;
          color: #6c86a6;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .scrapeOpsPanel h3 {
          margin: 4px 0 0;
          color: #173c68;
          font-size: 18px;
          font-weight: 800;
        }

        .scrapeOpsHeadActions {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .scrapeOpsSearch,
        .scrapeOpsHeadActions select {
          height: 40px;
          border-radius: 12px;
          border: 1px solid #cfdef1;
          background: #f8fbff;
          padding: 0 14px;
          color: #173c68;
          font-size: 14px;
          outline: none;
        }

        .scrapeOpsSearch {
          min-width: 220px;
        }

        .scrapeOpsSearch:focus,
        .scrapeOpsHeadActions select:focus {
          border-color: #5a8fe8;
          box-shadow: 0 0 0 3px rgba(90, 143, 232, 0.12);
        }

        .scrapeOpsTableWrap {
          overflow: auto;
        }

        .scrapeOpsTable {
          width: 100%;
          border-collapse: collapse;
        }

        .scrapeOpsTable th,
        .scrapeOpsTable td {
          padding: 14px 10px;
          border-bottom: 1px solid #e3ebf5;
          text-align: left;
          color: #173c68;
          font-size: 14px;
          vertical-align: middle;
        }

        .scrapeOpsTable th {
          color: #7088a8;
          font-size: 13px;
          font-weight: 800;
        }

        .scrapeOpsTable tbody tr:hover {
          background: #f8fbff;
        }

        .scrapeOpsLiveRow {
          box-shadow: inset 3px 0 0 #4f88e6;
        }

        .scrapeOpsBadge,
        .scrapeOpsSeverity,
        .scrapeOpsActivePill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .scrapeOpsBadge.normal,
        .scrapeOpsSeverity.normal {
          background: #e8f6ee;
          color: #2d8a57;
        }

        .scrapeOpsBadge.warning,
        .scrapeOpsSeverity.warning {
          background: #fff2dc;
          color: #b56a00;
        }

        .scrapeOpsBadge.danger,
        .scrapeOpsSeverity.danger {
          background: #ffe8e5;
          color: #c74f41;
        }

        .scrapeOpsBadge.info,
        .scrapeOpsSeverity.info,
        .scrapeOpsActivePill {
          background: #edf4ff;
          color: #3f73cc;
        }

        .scrapeOpsRowActions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .scrapeOpsActionButton {
          height: 34px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid #cddcf0;
          background: #fff;
          color: #173c68;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: background-color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
        }

        .scrapeOpsActionButton:hover {
          transform: translateY(-1px);
        }

        .scrapeOpsActionButton.primary {
          background: #346fd1;
          border-color: #346fd1;
          color: #fff;
        }

        .scrapeOpsActionButton.secondary {
          background: #fff;
        }

        .scrapeOpsActionButton.danger {
          background: #fff6f5;
          border-color: #f0c3bc;
          color: #c15245;
        }

        .scrapeOpsSelectionBar {
          color: #7088a8;
          font-size: 13px;
          font-weight: 700;
        }

        .scrapeOpsQaList,
        .scrapeOpsIncidentList {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .scrapeOpsQaCard,
        .scrapeOpsIncidentCard {
          border: 1px solid #dce7f4;
          border-radius: 18px;
          padding: 14px;
          background: #fbfdff;
        }

        .scrapeOpsIncidentCard.danger {
          background: #fff8f7;
          border-color: #f2c9c3;
        }

        .scrapeOpsIncidentCard.warning {
          background: #fffaf2;
          border-color: #eedbb8;
        }

        .scrapeOpsQaCompactBar,
        .scrapeOpsIncidentHead,
        .scrapeOpsLogMeta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .scrapeOpsQaCompactBar strong,
        .scrapeOpsIncidentCard strong {
          color: #173c68;
          font-size: 16px;
        }

        .scrapeOpsQaDetail {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #e3ebf5;
        }

        .scrapeOpsQaGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }

        .scrapeOpsQaGrid span {
          display: block;
          margin-bottom: 4px;
          color: #6c86a6;
          font-size: 12px;
          font-weight: 700;
        }

        .scrapeOpsQaDetail p,
        .scrapeOpsIncidentCard p,
        .scrapeOpsTimelineContent p,
        .scrapeOpsLogLine p {
          margin: 0;
          color: #4f6581;
          line-height: 1.5;
        }

        .scrapeOpsQaDetail ul {
          margin: 12px 0;
          padding-left: 18px;
          color: #4f6581;
        }

        .scrapeOpsIncidentMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .scrapeOpsIncidentMeta span {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid #d8e5f4;
          color: #6c86a6;
          font-size: 12px;
          font-weight: 700;
        }

        .scrapeOpsTimelineList {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .scrapeOpsTimelineItem {
          display: grid;
          grid-template-columns: 10px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          padding: 10px 0;
          border-bottom: 1px solid #e3ebf5;
        }

        .scrapeOpsTimelineItem:last-child {
          border-bottom: 0;
        }

        .scrapeOpsTimelineDot {
          width: 10px;
          height: 10px;
          margin-top: 5px;
          border-radius: 999px;
          display: inline-block;
        }

        .scrapeOpsTimelineDot.normal {
          background: #2d8a57;
        }

        .scrapeOpsTimelineDot.warning {
          background: #c98b2e;
        }

        .scrapeOpsTimelineDot.danger {
          background: #d25d4d;
        }

        .scrapeOpsTimelineDot.info {
          background: #4c7fe0;
        }

        .scrapeOpsTimelineContent {
          min-width: 0;
        }

        .scrapeOpsTimelineContent strong {
          display: block;
          margin-bottom: 2px;
          color: #6c86a6;
          font-size: 12px;
          font-weight: 800;
        }

        .scrapeOpsTimelineContent h4 {
          margin: 0 0 4px;
          color: #173c68;
          font-size: 14px;
          font-weight: 800;
        }

        .scrapeOpsLogConsole {
          border-radius: 18px;
          background: #11253f;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .scrapeOpsLogLine strong {
          color: #dce8fa;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
        }

        .scrapeOpsLogLine p {
          margin-top: 4px;
          color: #f3f7ff;
          font-size: 14px;
        }

        .scrapeOpsLogLine small {
          display: block;
          margin-top: 4px;
          color: #91a8c8;
          font-size: 12px;
        }

        @media (max-width: 1440px) {
          .scrapeOpsSummaryGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1200px) {
          .scrapeOpsContentGrid {
            grid-template-columns: minmax(0, 1fr);
          }

          .scrapeOpsSummaryGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
    </section>
  );
}
