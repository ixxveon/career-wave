import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/audit-log.css';
import {
  AUDIT_LOG_SEVERITY_FILTER,
  AUDIT_LOG_TYPE_FILTER,
  AUDIT_LOG_TYPE_LABELS,
  auditLogApi,
} from '../../../api/admin/auditLogApi';
import type {
  AuditLogDetail,
  AuditLogItem,
  AuditLogSeverity,
  AuditLogSeverityFilter,
  AuditLogTypeFilter,
} from '../../../api/admin/auditLogApi';

type AuditTone = 'info' | 'success' | 'warning' | 'danger';
type DateRangePreset = '7d' | 'today' | '30d' | 'all';

interface AuditLogListResponse {
  content: AuditLogItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const severityToneMap: Record<AuditLogSeverity, AuditTone> = {
  INFO: 'info',
  WARN: 'warning',
  ERROR: 'danger',
  SUCCESS: 'success',
};

const DATE_RANGE_OPTIONS: Array<{ value: DateRangePreset; label: string }> = [
  { value: '7d', label: '최근 7일' },
  { value: 'today', label: '오늘' },
  { value: '30d', label: '최근 30일' },
  { value: 'all', label: '전체 기간' },
];

const logTypeOptions: Array<{ value: AuditLogTypeFilter; label: string }> = [
  { value: AUDIT_LOG_TYPE_FILTER.ALL, label: '전체 도메인' },
  { value: AUDIT_LOG_TYPE_FILTER.ADMIN_ACTIVITY, label: AUDIT_LOG_TYPE_LABELS.ADMIN_ACTIVITY },
  { value: AUDIT_LOG_TYPE_FILTER.ADMIN_MANAGEMENT, label: AUDIT_LOG_TYPE_LABELS.ADMIN_MANAGEMENT },
  { value: AUDIT_LOG_TYPE_FILTER.AI_METRICS_SYSTEM, label: AUDIT_LOG_TYPE_LABELS.AI_METRICS_SYSTEM },
  { value: AUDIT_LOG_TYPE_FILTER.SCRAPING_SYSTEM, label: AUDIT_LOG_TYPE_LABELS.SCRAPING_SYSTEM },
];

const severityOptions: Array<{ value: AuditLogSeverityFilter; label: string }> = [
  { value: AUDIT_LOG_SEVERITY_FILTER.ALL, label: '전체 심각도' },
  { value: AUDIT_LOG_SEVERITY_FILTER.INFO, label: 'INFO' },
  { value: AUDIT_LOG_SEVERITY_FILTER.WARN, label: 'WARN' },
  { value: AUDIT_LOG_SEVERITY_FILTER.ERROR, label: 'ERROR' },
  { value: AUDIT_LOG_SEVERITY_FILTER.SUCCESS, label: 'SUCCESS' },
];

const TARGET_TYPE_OPTIONS = [
  { value: '', label: '전체 대상' },
  { value: 'MEMBER', label: '회원' },
  { value: 'ADMIN', label: '관리자' },
  { value: 'IP_ACL', label: 'IP ACL' },
  { value: 'AI_OPS_SETTING', label: 'AI 운영 설정' },
  { value: 'RAG_DOCUMENT', label: 'RAG 문서' },
  { value: 'SETTLEMENT', label: '정산' },
];

const AUDIT_LOG_LIST_DEFAULT_SIZE = 20;

function getDateRange(preset: DateRangePreset) {
  if (preset === 'all') return {};

  const now = new Date();
  const from = new Date(now);
  if (preset === 'today') {
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(now.getDate() - (preset === '7d' ? 6 : 29));
    from.setHours(0, 0, 0, 0);
  }

  return { from: from.toISOString(), to: now.toISOString() };
}

function formatListTimestamp(value: string) {
  const [date = '', time = ''] = value.split(' ');
  const [, month = '', day = ''] = date.split('-');
  return month && day ? `${month}/${day} ${time}` : value;
}

function formatTarget(log: AuditLogItem) {
  if (log.targetType === '-') return '-';
  return log.targetId === '-' ? log.targetType : `${log.targetType} #${log.targetId}`;
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export default function AuditLogPage() {
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('7d');
  const [logTypeFilter, setLogTypeFilter] = useState<AuditLogTypeFilter>(AUDIT_LOG_TYPE_FILTER.ALL);
  const [severityFilter, setSeverityFilter] = useState<AuditLogSeverityFilter>(AUDIT_LOG_SEVERITY_FILTER.ALL);
  const [adminIdInput, setAdminIdInput] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(AUDIT_LOG_LIST_DEFAULT_SIZE);
  const [selectedLogId, setSelectedLogId] = useState('');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const dateRange = useMemo(() => getDateRange(dateRangePreset), [dateRangePreset]);
  const parsedAdminId = Number(adminIdInput);
  const adminId = Number.isInteger(parsedAdminId) && parsedAdminId > 0 ? parsedAdminId : undefined;

  useEffect(() => {
    setPage(1);
  }, [dateRangePreset, logTypeFilter, severityFilter, adminId, targetTypeFilter, debouncedKeyword, size]);

  const {
    data: auditLogList,
    isLoading: isListLoading,
    isError: isListError,
    refetch: refetchAuditLogList,
  } = useQuery<AuditLogListResponse, Error>({
    queryKey: ['admin', 'auditLog', 'list', dateRangePreset, logTypeFilter, severityFilter, adminId, targetTypeFilter, debouncedKeyword, page, size],
    queryFn: async () => {
      const response = await auditLogApi.getLogs({
        ...dateRange,
        page,
        size,
        ...(logTypeFilter !== AUDIT_LOG_TYPE_FILTER.ALL && { logType: logTypeFilter }),
        ...(severityFilter !== AUDIT_LOG_SEVERITY_FILTER.ALL && { severity: severityFilter }),
        ...(adminId != null && { adminId }),
        ...(targetTypeFilter && { targetType: targetTypeFilter }),
        ...(debouncedKeyword && { keyword: debouncedKeyword }),
      });
      if (!response.data.success) throw new Error(response.data.message ?? '감사 로그 목록 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const auditLogs = auditLogList?.content ?? [];
  const selectedLog = auditLogs.find((log) => log.id === selectedLogId) ?? null;

  useEffect(() => {
    if (auditLogs.length === 0) {
      setSelectedLogId('');
      return;
    }
    if (!selectedLog) setSelectedLogId(auditLogs[0].id);
  }, [auditLogs, selectedLog]);

  const {
    data: selectedLogDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    refetch: refetchAuditLogDetail,
  } = useQuery<AuditLogDetail, Error>({
    queryKey: ['admin', 'auditLog', 'detail', selectedLogId],
    enabled: Boolean(selectedLogId),
    queryFn: async () => {
      const response = await auditLogApi.getLogDetail(selectedLogId);
      if (!response.data.success) throw new Error(response.data.message ?? '감사 로그 상세 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const selectedDisplay = selectedLogDetail ?? selectedLog;
  const totalPages = auditLogList?.totalPages ?? 0;
  const pageNumbers = getPageNumbers(page, totalPages);

  const resetFilters = () => {
    setDateRangePreset('7d');
    setLogTypeFilter(AUDIT_LOG_TYPE_FILTER.ALL);
    setSeverityFilter(AUDIT_LOG_SEVERITY_FILTER.ALL);
    setAdminIdInput('');
    setTargetTypeFilter('');
    setQuery('');
    setDebouncedKeyword('');
    setSize(AUDIT_LOG_LIST_DEFAULT_SIZE);
    setPage(1);
  };

  const selectLog = (logId: string) => {
    setSelectedLogId(logId);
    setIsMobileDetailOpen(true);
  };

  return (
    <section className="auditOpsPage">
      <header className="admin-header auditOpsHeader">
        <div>
          <h2>감사 로그</h2>
          <p>관리자와 시스템의 주요 작업 이력을 조회합니다.</p>
        </div>
      </header>

      <section className="auditOpsShell">
        <div className="auditOpsFilters" aria-label="감사 로그 필터">
          <select value={dateRangePreset} onChange={(event) => setDateRangePreset(event.target.value as DateRangePreset)} aria-label="기간">
            {DATE_RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={logTypeFilter} onChange={(event) => setLogTypeFilter(event.target.value as AuditLogTypeFilter)} aria-label="도메인">
            {logTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as AuditLogSeverityFilter)} aria-label="심각도">
            {severityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input inputMode="numeric" value={adminIdInput} onChange={(event) => setAdminIdInput(event.target.value.replace(/\D/g, ''))} placeholder="관리자 ID" aria-label="관리자 ID" />
          <select value={targetTypeFilter} onChange={(event) => setTargetTypeFilter(event.target.value)} aria-label="대상 유형">
            {TARGET_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <label className="auditOpsSearch">
            <Search size={17} aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="행동, 대상, 관리자, 상세 내용 검색" aria-label="검색" />
          </label>
          <button type="button" className="auditOpsReset" onClick={resetFilters}>초기화</button>
        </div>

        <div className="auditOpsListHeader">
          <strong>총 {(auditLogList?.totalElements ?? 0).toLocaleString()}건</strong>
          <label>페이지 크기<select value={size} onChange={(event) => setSize(Number(event.target.value))} aria-label="페이지 크기"><option value={20}>20개씩 보기</option><option value={50}>50개씩 보기</option></select></label>
        </div>

        <div className="auditOpsGrid">
          <div className="auditOpsTableWrap">
            <div className="auditOpsTableHead"><span>발생 시각</span><span>도메인</span><span>심각도</span><span>행동</span><span>대상</span><span>관리자</span></div>
            <div className="auditOpsTableBody">
              {isListLoading ? <div className="auditOpsEmpty">감사 로그를 조회 중입니다.</div> : null}
              {isListError ? <div className="auditOpsEmpty error"><span>감사 로그 조회에 실패했습니다.</span><button type="button" onClick={() => refetchAuditLogList()}>다시 조회</button></div> : null}
              {!isListLoading && !isListError ? auditLogs.map((log) => (
                <button key={log.id} type="button" className={`auditOpsTableRow ${selectedLogId === log.id ? 'selected' : ''}`} onClick={() => selectLog(log.id)}>
                  <span className="timestamp">{formatListTimestamp(log.occurredAt)}</span><span className="domain">{log.logTypeLabel}</span><span className={`auditOpsTag ${severityToneMap[log.severity]}`}>{log.severity}</span><strong className="summary">{log.summary}</strong><span className="target">{formatTarget(log)}</span><span className="actor">{log.actorId}</span>
                </button>
              )) : null}
              {!isListLoading && !isListError && auditLogs.length === 0 ? <div className="auditOpsEmpty">조건에 맞는 감사 로그가 없습니다.</div> : null}
            </div>
          </div>

          <aside className={`auditOpsDetail ${isMobileDetailOpen ? 'mobile-open' : ''}`} aria-label="선택 로그 상세">
            <div className="auditOpsDetailHead"><span>선택 로그 상세</span><button type="button" className="auditOpsDetailClose" onClick={() => setIsMobileDetailOpen(false)} aria-label="상세 닫기"><X size={18} /></button></div>
            {selectedDisplay ? <div className="auditOpsDetailBody">
              <div className="auditOpsDetailAction"><span className={`auditOpsTag ${severityToneMap[selectedDisplay.severity]}`}>{selectedDisplay.severity}</span><strong>{selectedDisplay.summary}</strong></div>
              {isDetailLoading ? <div className="auditOpsDetailNotice">상세 정보를 조회 중입니다.</div> : null}
              {isDetailError ? <div className="auditOpsDetailNotice error"><span>상세 정보를 불러오지 못했습니다.</span><button type="button" onClick={() => refetchAuditLogDetail()}>다시 조회</button></div> : null}
              <dl className="auditOpsDetailMeta"><div><dt>발생 시각</dt><dd>{selectedDisplay.occurredAt}</dd></div><div><dt>도메인</dt><dd>{selectedDisplay.logTypeLabel}</dd></div><div><dt>대상</dt><dd>{formatTarget(selectedDisplay)}</dd></div><div><dt>관리자</dt><dd>{selectedDisplay.actorId}</dd></div><div><dt>IP 주소</dt><dd>{selectedDisplay.ipAddressMasked}</dd></div></dl>
              <div className="auditOpsDetailBlock"><span>상세 내용</span><p>{selectedDisplay.detailSummary}</p></div>
            </div> : <div className="auditOpsEmpty detail">표시할 로그가 없습니다.</div>}
          </aside>
        </div>

        {totalPages > 0 ? <nav className="auditOpsPagination" aria-label="감사 로그 페이지 이동"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>{pageNumbers[0] > 1 ? <><button type="button" onClick={() => setPage(1)}>1</button><span>...</span></> : null}{pageNumbers.map((pageNumber) => <button key={pageNumber} type="button" className={pageNumber === page ? 'active' : ''} onClick={() => setPage(pageNumber)}>{pageNumber}</button>)}{pageNumbers[pageNumbers.length - 1] < totalPages ? <><span>...</span><button type="button" onClick={() => setPage(totalPages)}>{totalPages}</button></> : null}<button type="button" disabled={page === totalPages} onClick={() => setPage(page + 1)}>다음</button></nav> : null}
      </section>
    </section>
  );
}
