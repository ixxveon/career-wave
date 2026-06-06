import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { Bot, Database, FileText, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../styles/admin.css';
import { adminSession } from '../../api/adminAuthApi';
import {
  AUDIT_LOG_LEVEL_FILTER,
  AUDIT_LOG_SOURCE_FILTER,
  AUDIT_LOG_SOURCE_LABELS,
  auditLogApi,
} from '../../api/auditLogApi';
import type {
  AuditLogItem,
  AuditLogDetail,
  AuditLogLevel,
  AuditLogLevelFilter,
  AuditLogPreview,
  AuditLogSourceFilter,
  AuditLogSummary,
} from '../../api/auditLogApi';

type AuditTone = 'normal' | 'warning' | 'danger' | 'info';

const levelToneMap: Record<AuditLogLevel, AuditTone> = {
  INFO: 'info',
  WARN: 'warning',
  ERROR: 'danger',
  SUCCESS: 'normal',
};

const splitTimestamp = (value: string) => {
  const [date = '', time = ''] = value.split(' ');
  return { date, time };
};

const isUnauthorizedError = (error: unknown) =>
  axios.isAxiosError(error)
  && (error.response?.status === 401 || error.response?.data?.statusCode === 401);

const isForbiddenError = (error: unknown) =>
  axios.isAxiosError(error)
  && (error.response?.status === 403 || error.response?.data?.statusCode === 403);

const SENSITIVE_AUDIT_DETAIL_MESSAGE = '민감 정보는 감사 로그 상세에서 표시하지 않습니다.';
const SENSITIVE_AUDIT_PATTERNS = [
  /token/i,
  /bearer/i,
  /authorization/i,
  /cookie/i,
  /set-cookie/i,
  /password/i,
  /비밀번호/,
  /개인정보/,
  /프롬프트 원문/,
  /prompt/i,
  /외부 응답 전문/,
  /response body/i,
];

const AUDIT_LOG_SUMMARY_QUERY_KEY = ['admin', 'auditLog', 'summary'] as const;
const AUDIT_LOG_LIST_QUERY_KEY = ['admin', 'auditLog', 'list'] as const;
const AUDIT_LOG_DETAIL_QUERY_KEY = ['admin', 'auditLog', 'detail'] as const;
const AUDIT_LOG_LIST_DEFAULT_PAGE = 0;
const AUDIT_LOG_LIST_DEFAULT_SIZE = 20;
const buildUtcDateBoundary = (date: string, isEndOfDay: boolean) =>
  `${date}${isEndOfDay ? 'T23:59:59.999Z' : 'T00:00:00Z'}`;

const containsSensitiveAuditContent = (value: string) =>
  SENSITIVE_AUDIT_PATTERNS.some((pattern) => pattern.test(value));

const sanitizeAuditDetailText = (value: string) => {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return '-';
  }

  return containsSensitiveAuditContent(trimmedValue) ? SENSITIVE_AUDIT_DETAIL_MESSAGE : trimmedValue;
};

const maskAuditIpAddress = (value: string) => {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0 || trimmedValue === '-') {
    return '-';
  }

  if (trimmedValue.includes('*')) {
    return trimmedValue;
  }

  const ipv4Match = trimmedValue.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);

  if (ipv4Match) {
    return `${ipv4Match[1]}.*`;
  }

  return trimmedValue;
};

const sourceTabs: Array<{ key: AuditLogSourceFilter; label: string }> = [
  { key: AUDIT_LOG_SOURCE_FILTER.ALL, label: '전체' },
  { key: AUDIT_LOG_SOURCE_FILTER.ADMIN, label: AUDIT_LOG_SOURCE_LABELS.ADMIN },
  { key: AUDIT_LOG_SOURCE_FILTER.AI, label: AUDIT_LOG_SOURCE_LABELS.AI },
  { key: AUDIT_LOG_SOURCE_FILTER.SCRAPING, label: AUDIT_LOG_SOURCE_LABELS.SCRAPING },
];

const levelOptions: Array<{ value: AuditLogLevelFilter; label: string }> = [
  { value: AUDIT_LOG_LEVEL_FILTER.ALL, label: '전체 유형' },
  { value: AUDIT_LOG_LEVEL_FILTER.INFO, label: 'INFO' },
  { value: AUDIT_LOG_LEVEL_FILTER.WARN, label: 'WARN' },
  { value: AUDIT_LOG_LEVEL_FILTER.ERROR, label: 'ERROR' },
  { value: AUDIT_LOG_LEVEL_FILTER.SUCCESS, label: 'SUCCESS' },
];

const toAuditLogPreview = (log: AuditLogItem): AuditLogPreview => ({
  id: log.id,
  source: log.source,
  sourceLabel: log.sourceLabel,
  timestamp: log.occurredAt,
  level: log.level,
  summary: log.summary,
  detail: log.detailSummary,
});

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [sourceFilter, setSourceFilter] = useState<AuditLogSourceFilter>(AUDIT_LOG_SOURCE_FILTER.ALL);
  const [levelFilter, setLevelFilter] = useState<AuditLogLevelFilter>(AUDIT_LOG_LEVEL_FILTER.ALL);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedLogId, setSelectedLogId] = useState('');

  useEffect(() => {
    const trimmedQuery = query.trim();
    const debounceTimer = window.setTimeout(() => {
      setDebouncedKeyword(trimmedQuery);
    }, 300);

    return () => window.clearTimeout(debounceTimer);
  }, [query]);

  const hasInvalidDateRange = fromDate.length > 0 && toDate.length > 0 && fromDate > toDate;
  const fromDateTime = fromDate ? buildUtcDateBoundary(fromDate, false) : '';
  const toDateTime = toDate ? buildUtcDateBoundary(toDate, true) : '';

  const {
    data: auditLogSummary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
  } = useQuery<AuditLogSummary, Error>({
    queryKey: [...AUDIT_LOG_SUMMARY_QUERY_KEY, fromDateTime, toDateTime],
    enabled: !hasInvalidDateRange,
    queryFn: async () => {
      const response = await auditLogApi.getSummary({
        ...(fromDateTime && { from: fromDateTime }),
        ...(toDateTime && { to: toDateTime }),
      });
      if (!response.data.success) {
        throw new Error(response.data.message ?? '감사 로그 요약 조회에 실패했습니다.');
      }
      return response.data.data;
    },
  });

  const {
    data: auditLogItems,
    isLoading: isAuditLogListLoading,
    isError: isAuditLogListError,
    error: auditLogListError,
    refetch: refetchAuditLogList,
  } = useQuery<AuditLogItem[], Error>({
    queryKey: [
      ...AUDIT_LOG_LIST_QUERY_KEY,
      sourceFilter,
      levelFilter,
      fromDateTime,
      toDateTime,
      debouncedKeyword,
      AUDIT_LOG_LIST_DEFAULT_PAGE,
      AUDIT_LOG_LIST_DEFAULT_SIZE,
    ],
    enabled: !hasInvalidDateRange,
    queryFn: async () => {
      const response = await auditLogApi.getLogs({
        page: AUDIT_LOG_LIST_DEFAULT_PAGE,
        size: AUDIT_LOG_LIST_DEFAULT_SIZE,
        ...(fromDateTime && { from: fromDateTime }),
        ...(toDateTime && { to: toDateTime }),
        ...(sourceFilter !== AUDIT_LOG_SOURCE_FILTER.ALL && { source: sourceFilter }),
        ...(levelFilter !== AUDIT_LOG_LEVEL_FILTER.ALL && { level: levelFilter }),
        ...(debouncedKeyword.length > 0 && { keyword: debouncedKeyword }),
      });

      if (!response.data.success) {
        throw new Error(response.data.message ?? '감사 로그 목록 조회에 실패했습니다.');
      }

      return response.data.data.content;
    },
  });

  const auditLogs = useMemo(() => (auditLogItems ?? []).map(toAuditLogPreview), [auditLogItems]);
  const filteredLogs = auditLogs;
  const isAuditLogListEmpty = !isAuditLogListLoading && !isAuditLogListError && filteredLogs.length === 0;
  const isAuditLogFiltered =
    sourceFilter !== AUDIT_LOG_SOURCE_FILTER.ALL
    || levelFilter !== AUDIT_LOG_LEVEL_FILTER.ALL
    || fromDate.length > 0
    || toDate.length > 0
    || debouncedKeyword.length > 0;
  const auditLogListEmptyMessage = isAuditLogFiltered
    ? '조건에 맞는 감사 로그가 없습니다.'
    : '표시할 감사 로그가 없습니다.';
  const dateRangeErrorMessage = hasInvalidDateRange ? '시작일은 종료일보다 늦을 수 없습니다.' : '';

  const summaryValueLabel = (value: number) => {
    if (isSummaryLoading) return '조회 중';
    if (isSummaryError) return '조회 실패';
    return value.toLocaleString();
  };

  const selectedLog = useMemo(
    () => auditLogs.find((log) => log.id === selectedLogId) ?? null,
    [auditLogs, selectedLogId]
  );
  const {
    data: selectedLogDetail,
    isLoading: isAuditLogDetailLoading,
    isError: isAuditLogDetailError,
    error: auditLogDetailError,
    refetch: refetchAuditLogDetail,
  } = useQuery<AuditLogDetail, Error>({
    queryKey: [...AUDIT_LOG_DETAIL_QUERY_KEY, selectedLogId],
    enabled: selectedLogId.length > 0 && Boolean(selectedLog),
    queryFn: async () => {
      const response = await auditLogApi.getLogDetail(selectedLogId);

      if (!response.data.success) {
        throw new Error(response.data.message ?? '감사 로그 상세 조회에 실패했습니다.');
      }

      return response.data.data;
    },
  });
  const selectedLogSourceLabel = selectedLogDetail?.sourceLabel ?? selectedLog?.sourceLabel;
  const selectedLogDisplay = selectedLog
    ? {
        occurredAt: selectedLogDetail?.occurredAt ?? selectedLog.timestamp,
        level: selectedLogDetail?.level ?? selectedLog.level,
        summary: sanitizeAuditDetailText(selectedLogDetail?.summary ?? selectedLog.summary),
        detailSummary: sanitizeAuditDetailText(selectedLogDetail?.detailSummary ?? selectedLog.detail),
        actorId: selectedLogDetail?.actorId ?? '-',
        target: selectedLogDetail ? `${selectedLogDetail.targetType}:${selectedLogDetail.targetId}` : '-',
        ipAddressMasked: maskAuditIpAddress(selectedLogDetail?.ipAddressMasked ?? '-'),
        requestId: selectedLogDetail?.requestId ?? '-',
      }
    : null;
  const isAuditLogDetailEmpty =
    Boolean(selectedLog) && !isAuditLogDetailLoading && !isAuditLogDetailError && !selectedLogDetail;
  const isAuditLogUnauthorized = [summaryError, auditLogListError, auditLogDetailError].some(isUnauthorizedError);
  const isAuditLogForbidden = [summaryError, auditLogListError, auditLogDetailError].some(isForbiddenError);
  const isAuditLogAuthBlocked = isAuditLogUnauthorized || isAuditLogForbidden;
  const globalStateTitle = isAuditLogUnauthorized
    ? '관리자 인증이 만료되었습니다.'
    : '감사 로그 화면 접근 권한이 없습니다.';
  const globalStateDescription = isAuditLogUnauthorized
    ? '감사 로그를 계속 보려면 관리자 계정으로 다시 로그인해 주세요.'
    : 'ROLE_ADMIN 권한이 있는 관리자 계정으로 다시 로그인해 주세요.';
  const globalStateActionLabel = isAuditLogUnauthorized ? '다시 로그인' : '로그인 화면 이동';

  const handleUnauthorizedAction = () => {
    adminSession.clearToken();
    navigate('/admin/login', { replace: true });
  };

  useEffect(() => {
    const isSelectedVisible = filteredLogs.some((log) => log.id === selectedLogId);

    if (filteredLogs.length === 0) {
      if (selectedLogId.length > 0) {
        setSelectedLogId('');
      }
      return;
    }

    if (!isSelectedVisible && filteredLogs[0]) {
      setSelectedLogId(filteredLogs[0].id);
    }
  }, [filteredLogs, selectedLogId]);

  const summaryItems = [
    {
      Icon: FileText,
      title: '전체 로그',
      value: auditLogSummary?.totalCount ?? 0,
      desc: '통합 감사 이벤트',
      theme: 'kpi-blue',
    },
    {
      Icon: ShieldCheck,
      title: '관리자 로그',
      value: auditLogSummary?.adminCount ?? 0,
      desc: '권한, ACL, 보안 이벤트',
      theme: 'kpi-green',
    },
    {
      Icon: Bot,
      title: 'AI 로그',
      value: auditLogSummary?.aiCount ?? 0,
      desc: '리소스, 토큰, 모델 이벤트',
      theme: 'kpi-purple',
    },
    {
      Icon: Database,
      title: '스크래핑 로그',
      value: auditLogSummary?.scrapingCount ?? 0,
      desc: '파이프라인, 복구, 수집 이벤트',
      theme: 'kpi-yellow',
    },
  ];

  return (
    <section className="auditOpsPage">
      <header className="admin-header">
        <div>
          <h2>감사 로그</h2>
          <p>관리자 관리, AI 메트릭스, 스크래핑 관리의 상세 로그를 한 화면에서 확인합니다.</p>
        </div>
      </header>

      {isAuditLogAuthBlocked ? (
        <section className="auditOpsGlobalState">
          <div>
            <strong>{globalStateTitle}</strong>
            <span>{globalStateDescription}</span>
          </div>
          <button type="button" className="auditOpsPrimaryButton" onClick={handleUnauthorizedAction}>
            {globalStateActionLabel}
          </button>
        </section>
      ) : null}

      {!isAuditLogAuthBlocked ? (
        <div className="auditOpsSummary">
          {summaryItems.map((item) => (
            <article className={`admin-card auditOpsSummaryCard ${item.theme}`} key={item.title}>
              <div className="auditOpsSummaryContent">
                <span>{item.title}</span>
                <strong>{summaryValueLabel(item.value)}</strong>
                <small>{item.desc}</small>
              </div>
              <div className={`auditOpsSummaryIcon ${item.theme}`}>
                <item.Icon size={26} strokeWidth={2.3} />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {!isAuditLogAuthBlocked ? (
        <section className="admin-card auditOpsShell">
        <div className="auditOpsToolbar">
          <div className="auditOpsTabs">
            {sourceTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={sourceFilter === tab.key ? 'active' : ''}
                onClick={() => setSourceFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="auditOpsFilters">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              aria-label="조회 시작일"
            />
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              aria-label="조회 종료일"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="로그 요약 또는 상세 내용 검색"
            />
            <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as AuditLogLevelFilter)}>
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {dateRangeErrorMessage ? <div className="auditOpsFilterError">{dateRangeErrorMessage}</div> : null}

        <div className="auditOpsGrid">
          <div className="auditOpsTableWrap">
            <div className="auditOpsTableHead">
              <span>TIMESTAMP</span>
              <span>TYPE</span>
              <span>MESSAGE</span>
            </div>

            <div className="auditOpsTableBody">
              {isAuditLogListLoading ? <div className="auditOpsEmpty">감사 로그를 조회 중입니다.</div> : null}

              {isAuditLogListError ? (
                <div className="auditOpsEmpty error">
                  <span>감사 로그 조회에 실패했습니다.</span>
                  <button type="button" onClick={() => refetchAuditLogList()}>
                    다시 조회
                  </button>
                </div>
              ) : null}

              {!isAuditLogListLoading && !isAuditLogListError
                ? filteredLogs.map((log) => {
                    const { date, time } = splitTimestamp(log.timestamp);
                    return (
                      <button
                        key={log.id}
                        type="button"
                        className={`auditOpsTableRow ${selectedLog?.id === log.id ? 'selected' : ''}`}
                        onClick={() => setSelectedLogId(log.id)}
                      >
                        <span className="timestamp">[{time || date}]</span>
                        <span className={`auditOpsTag ${levelToneMap[log.level]}`}>[{log.level}]</span>
                        <strong className="summary">{`[${log.sourceLabel}] ${log.summary}`}</strong>
                      </button>
                    );
                  })
                : null}

              {isAuditLogListEmpty ? <div className="auditOpsEmpty">{auditLogListEmptyMessage}</div> : null}
            </div>
          </div>

          <aside className="auditOpsDetail">
            <div className="auditOpsDetailHead">
              <span>선택 로그 상세</span>
              {selectedLogSourceLabel ? <strong>{selectedLogSourceLabel}</strong> : null}
            </div>

            {selectedLogDisplay ? (
              <div className="auditOpsDetailBody">
                {isAuditLogDetailLoading ? (
                  <div className="auditOpsDetailNotice">상세 정보를 조회 중입니다.</div>
                ) : null}

                {isAuditLogDetailError ? (
                  <div className="auditOpsDetailNotice error">
                    <span>상세 정보를 불러오지 못했습니다.</span>
                    <button type="button" onClick={() => refetchAuditLogDetail()}>
                      다시 조회
                    </button>
                  </div>
                ) : null}

                {isAuditLogDetailEmpty ? (
                  <div className="auditOpsDetailNotice empty">
                    상세 응답 데이터가 없어 목록 요약 정보를 표시합니다.
                  </div>
                ) : null}

                <div className="auditOpsDetailMeta">
                  <div>
                    <span>발생 시각</span>
                    <strong>{selectedLogDisplay.occurredAt}</strong>
                  </div>
                  <div>
                    <span>유형</span>
                    <strong className={`auditOpsTag ${levelToneMap[selectedLogDisplay.level]}`}>
                      [{selectedLogDisplay.level}]
                    </strong>
                  </div>
                </div>

                <div className="auditOpsDetailBlock">
                  <span>요약</span>
                  <strong>{selectedLogDisplay.summary}</strong>
                </div>

                <div className="auditOpsDetailBlock">
                  <span>상세 로그</span>
                  <p>{selectedLogDisplay.detailSummary}</p>
                </div>

                <div className="auditOpsDetailTrace">
                  <div>
                    <span>ACTOR</span>
                    <strong>{selectedLogDisplay.actorId}</strong>
                  </div>
                  <div>
                    <span>TARGET</span>
                    <strong>{selectedLogDisplay.target}</strong>
                  </div>
                  <div>
                    <span>IP</span>
                    <strong>{selectedLogDisplay.ipAddressMasked}</strong>
                  </div>
                  <div>
                    <span>REQUEST</span>
                    <strong>{selectedLogDisplay.requestId}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="auditOpsEmpty detail">표시할 로그가 없습니다.</div>
            )}
          </aside>
        </div>
        </section>
      ) : null}

      <style>{`
        .auditOpsPage {
          --audit-primary: #173553;
          --audit-border: #d8e4f1;
          --audit-surface: rgba(255, 255, 255, 0.98);
          --audit-muted: #72859b;
          --audit-success: #2d8b57;
          --audit-success-bg: #edf8f1;
          --audit-warning: #b17419;
          --audit-warning-bg: #fdf3de;
          --audit-danger: #d04545;
          --audit-danger-bg: #fff0f0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-bottom: 24px;
        }

        .auditOpsSummary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .auditOpsGlobalState {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px;
          border: 1px solid #f0b8bd;
          border-radius: 16px;
          background: linear-gradient(135deg, #fff2f2 0%, #fff8f8 100%);
        }

        .auditOpsGlobalState div {
          display: grid;
          gap: 6px;
        }

        .auditOpsGlobalState strong {
          color: #8e2630;
          font-size: 18px;
          font-weight: 800;
        }

        .auditOpsGlobalState span {
          color: #a04a52;
          font-size: 13px;
          font-weight: 600;
        }

        .auditOpsPrimaryButton {
          height: 40px;
          border: 0;
          border-radius: 10px;
          background: #bf3f4c;
          color: #fff;
          padding: 0 16px;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          flex: none;
        }

        .auditOpsSummaryCard {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 22px;
          border-radius: 16px;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .auditOpsSummaryCard:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(30, 60, 90, 0.08);
        }

        .auditOpsSummaryContent {
          min-width: 0;
        }

        .auditOpsSummaryCard.kpi-blue {
          background: linear-gradient(135deg, #daeaf8 0%, #ecf4fc 100%);
          border-color: #bfd5ed;
        }

        .auditOpsSummaryCard.kpi-green {
          background: linear-gradient(135deg, #d4eee3 0%, #e9f6ef 100%);
          border-color: #b5dac7;
        }

        .auditOpsSummaryCard.kpi-purple {
          background: linear-gradient(135deg, #e0d5f2 0%, #ede9f8 100%);
          border-color: #c8bde8;
        }

        .auditOpsSummaryCard.kpi-yellow {
          background: linear-gradient(135deg, #fde9cf 0%, #fef4e5 100%);
          border-color: #f0d0a4;
        }

        .auditOpsSummaryIcon {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }

        .auditOpsSummaryIcon.kpi-blue {
          background: rgba(58, 114, 178, 0.16);
          color: #2d5f8e;
        }

        .auditOpsSummaryIcon.kpi-green {
          background: rgba(45, 110, 79, 0.16);
          color: #2c6e4f;
        }

        .auditOpsSummaryIcon.kpi-purple {
          background: rgba(92, 77, 133, 0.16);
          color: #5c4d85;
        }

        .auditOpsSummaryIcon.kpi-yellow {
          background: rgba(155, 117, 53, 0.16);
          color: #8a5a20;
        }

        .auditOpsSummaryCard span,
        .auditOpsDetailBlock span,
        .auditOpsDetailMeta span,
        .auditOpsDetailHead span {
          color: #6d859d;
          font-size: 11px;
          font-weight: 800;
        }

        .auditOpsSummaryCard span {
          display: block;
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .auditOpsSummaryCard strong {
          display: block;
          font-size: 34px;
          letter-spacing: -1px;
        }

        .auditOpsSummaryCard small {
          display: block;
          margin-top: 8px;
          font-size: 13px;
          font-weight: 400;
        }

        .auditOpsSummaryCard.kpi-blue span,
        .auditOpsSummaryCard.kpi-blue strong,
        .auditOpsSummaryCard.kpi-blue small {
          color: #1a3d5e;
        }

        .auditOpsSummaryCard.kpi-blue span {
          color: #2d5f8e;
        }

        .auditOpsSummaryCard.kpi-blue small {
          color: #4a7299;
        }

        .auditOpsSummaryCard.kpi-green span,
        .auditOpsSummaryCard.kpi-green strong,
        .auditOpsSummaryCard.kpi-green small {
          color: #1a4a34;
        }

        .auditOpsSummaryCard.kpi-green span {
          color: #2c6e4f;
        }

        .auditOpsSummaryCard.kpi-green small {
          color: #3d7a5f;
        }

        .auditOpsSummaryCard.kpi-purple span,
        .auditOpsSummaryCard.kpi-purple strong,
        .auditOpsSummaryCard.kpi-purple small {
          color: #3d3260;
        }

        .auditOpsSummaryCard.kpi-purple span {
          color: #5c4d85;
        }

        .auditOpsSummaryCard.kpi-purple small {
          color: #6b5a96;
        }

        .auditOpsSummaryCard.kpi-yellow span,
        .auditOpsSummaryCard.kpi-yellow strong,
        .auditOpsSummaryCard.kpi-yellow small {
          color: #5e3d10;
        }

        .auditOpsSummaryCard.kpi-yellow span {
          color: #8a5a20;
        }

        .auditOpsSummaryCard.kpi-yellow small {
          color: #9e6c2a;
        }

        .auditOpsShell {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 18px;
          overflow: hidden;
        }

        .auditOpsToolbar {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .auditOpsTabs,
        .auditOpsFilters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .auditOpsTabs button,
        .auditOpsFilters select,
        .auditOpsFilters input {
          height: 38px;
          border: 1px solid #c8d9ee;
          border-radius: 10px;
          background: #f7fafe;
          color: var(--audit-primary);
          padding: 0 12px;
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
        }

        .auditOpsTabs button {
          cursor: pointer;
        }

        .auditOpsTabs button.active {
          border-color: #2563c9;
          background: #2563c9;
          color: #fff;
        }

        .auditOpsFilters input {
          width: 260px;
        }

        .auditOpsFilters input[type='date'] {
          width: 148px;
        }

        .auditOpsFilterError {
          padding: 10px 12px;
          border: 1px solid #f0d0a4;
          border-radius: 10px;
          background: #fff8e8;
          color: #9c6b16;
          font-size: 12px;
          font-weight: 800;
        }

        .auditOpsGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(300px, 0.85fr);
          gap: 14px;
          align-items: stretch;
        }

        .auditOpsTableWrap,
        .auditOpsDetail {
          display: flex;
          flex-direction: column;
          border: 1px solid #dfe8f2;
          border-radius: 16px;
          overflow: hidden;
          min-height: 448px;
        }

        .auditOpsTableWrap {
          background: linear-gradient(180deg, #13253d 0%, #0f2034 100%);
          border-color: #20344f;
        }

        .auditOpsDetail {
          background: #fff;
        }

        .auditOpsTableHead,
        .auditOpsTableRow {
          display: grid;
          grid-template-columns: 140px 90px minmax(0, 1fr);
          column-gap: 18px;
          align-items: center;
          font-family: Consolas, 'SFMono-Regular', Menlo, monospace;
          font-size: 12px;
          line-height: 1.55;
        }

        .auditOpsTableHead {
          padding: 4px 14px 12px;
          border-bottom: 1px solid rgba(107, 137, 173, 0.2);
          color: #88a2bf;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .auditOpsTableHead span:nth-child(2),
        .auditOpsTableRow span:nth-child(2) {
          justify-self: start;
        }

        .auditOpsTableBody {
          display: flex;
          flex-direction: column;
          min-height: 360px;
          max-height: 360px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #48658a #13253d;
        }

        .auditOpsTableBody::-webkit-scrollbar {
          width: 10px;
        }

        .auditOpsTableBody::-webkit-scrollbar-track {
          background: #13253d;
          border-left: 1px solid rgba(107, 137, 173, 0.14);
        }

        .auditOpsTableBody::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #48658a 0%, #334e73 100%);
          border-radius: 999px;
          border: 2px solid #13253d;
        }

        .auditOpsTableBody::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #5a7aa4 0%, #3e5f88 100%);
        }

        .auditOpsTableRow {
          width: 100%;
          min-height: 54px;
          flex: 0 0 auto;
          padding: 10px 14px;
          border: 0;
          border-top: 1px solid rgba(37, 56, 81, 0.9);
          background: transparent;
          color: #dce7f3;
          text-align: left;
          cursor: pointer;
        }

        .auditOpsTableRow.selected {
          background: rgba(255, 255, 255, 0.05);
        }

        .auditOpsTableRow .timestamp,
        .auditOpsDetailBlock strong,
        .auditOpsDetailMeta strong,
        .auditOpsTableRow .summary {
          color: #f4f8fd;
          font-size: 12px;
          font-weight: 700;
        }

        .auditOpsTableRow .timestamp,
        .auditOpsTag {
          font-family: Consolas, 'SFMono-Regular', Menlo, monospace;
        }

        .auditOpsTableRow .summary {
          color: #f4f8fd;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .auditOpsTag {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          min-width: 0;
          height: auto;
          padding: 0;
          border-radius: 0;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: -0.01em;
          background: transparent;
        }

        .auditOpsTag.normal {
          color: #7dd49a;
        }

        .auditOpsTag.warning {
          color: #e1c36d;
        }

        .auditOpsTag.danger {
          color: #e39aa2;
        }

        .auditOpsTag.info {
          color: #9ec1ff;
        }

        .auditOpsDetail {
          min-height: 448px;
        }

        .auditOpsDetailHead {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 16px 18px;
          border-bottom: 1px solid #edf2f7;
        }

        .auditOpsDetailHead strong {
          color: var(--audit-primary);
          font-size: 13px;
          font-weight: 800;
        }

        .auditOpsDetailBody {
          display: grid;
          align-content: start;
          flex: 1 1 auto;
          gap: 14px;
          padding: 18px;
        }

        .auditOpsDetailMeta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .auditOpsDetailMeta div,
        .auditOpsDetailBlock,
        .auditOpsDetailTrace div {
          display: grid;
          gap: 6px;
          padding: 14px;
          border-radius: 14px;
          background: #f7fafe;
          border: 1px solid #e3ecf6;
        }

        .auditOpsDetailTrace {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .auditOpsDetailTrace span {
          color: #6d859d;
          font-size: 11px;
          font-weight: 800;
        }

        .auditOpsDetailTrace strong {
          min-width: 0;
          color: var(--audit-primary);
          font-size: 12px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }

        .auditOpsDetailNotice {
          padding: 10px 12px;
          border: 1px solid #c8d9ee;
          border-radius: 10px;
          background: #eef6ff;
          color: #2563c9;
          font-size: 12px;
          font-weight: 800;
        }

        .auditOpsDetailNotice.error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-color: #f0b8bd;
          background: #fff0f0;
          color: #d04545;
        }

        .auditOpsDetailNotice.error button {
          height: 30px;
          border: 1px solid #e5a6ad;
          border-radius: 8px;
          background: #fff;
          color: #d04545;
          padding: 0 10px;
          font: inherit;
          cursor: pointer;
        }

        .auditOpsDetailNotice.empty {
          border-color: #e8d39b;
          background: #fff8e8;
          color: #9c6b16;
        }

        .auditOpsDetailBlock p {
          margin: 0;
          color: var(--audit-primary);
          font-size: 12px;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .auditOpsEmpty {
          min-height: 360px;
          padding: 28px 18px;
          display: grid;
          place-items: center;
          gap: 10px;
          color: #9cb1ca;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
        }

        .auditOpsEmpty.error {
          color: #e39aa2;
        }

        .auditOpsEmpty.error button {
          height: 34px;
          border: 1px solid rgba(227, 154, 162, 0.5);
          border-radius: 8px;
          background: rgba(227, 154, 162, 0.12);
          color: #ffd3d8;
          padding: 0 12px;
          font: inherit;
          cursor: pointer;
        }

        .auditOpsEmpty.detail {
          padding: 36px 18px;
        }

        @media (max-width: 1280px) {
          .auditOpsSummary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .auditOpsGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .auditOpsSummary {
            grid-template-columns: 1fr;
          }

          .auditOpsTableHead,
          .auditOpsTableRow {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .auditOpsFilters input {
            width: 100%;
          }

          .auditOpsDetailMeta {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
