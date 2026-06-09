import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Database, FileText, ShieldCheck } from 'lucide-react';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/audit-log.css';
import {
  AUDIT_LOG_LEVEL_FILTER,
  AUDIT_LOG_SOURCE_FILTER,
  AUDIT_LOG_SOURCE_LABELS,
  auditLogApi,
} from '../../../api/admin/auditLogApi';
import type {
  AuditLogItem,
  AuditLogDetail,
  AuditLogLevel,
  AuditLogLevelFilter,
  AuditLogPreview,
  AuditLogSourceFilter,
  AuditLogSummary,
} from '../../../api/admin/auditLogApi';

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

const AUDIT_LOG_SUMMARY_QUERY_KEY = ['admin', 'auditLog', 'summary'] as const;
const AUDIT_LOG_LIST_QUERY_KEY = ['admin', 'auditLog', 'list'] as const;
const AUDIT_LOG_DETAIL_QUERY_KEY = ['admin', 'auditLog', 'detail'] as const;
const AUDIT_LOG_LIST_DEFAULT_PAGE = 0;
const AUDIT_LOG_LIST_DEFAULT_SIZE = 20;

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
  const [sourceFilter, setSourceFilter] = useState<AuditLogSourceFilter>(AUDIT_LOG_SOURCE_FILTER.ALL);
  const [levelFilter, setLevelFilter] = useState<AuditLogLevelFilter>(AUDIT_LOG_LEVEL_FILTER.ALL);
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

  const {
    data: auditLogSummary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = useQuery<AuditLogSummary, Error>({
    queryKey: AUDIT_LOG_SUMMARY_QUERY_KEY,
    queryFn: async () => {
      const response = await auditLogApi.getSummary();
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
    refetch: refetchAuditLogList,
  } = useQuery<AuditLogItem[], Error>({
    queryKey: [
      ...AUDIT_LOG_LIST_QUERY_KEY,
      sourceFilter,
      levelFilter,
      debouncedKeyword,
      AUDIT_LOG_LIST_DEFAULT_PAGE,
      AUDIT_LOG_LIST_DEFAULT_SIZE,
    ],
    queryFn: async () => {
      const response = await auditLogApi.getLogs({
        page: AUDIT_LOG_LIST_DEFAULT_PAGE,
        size: AUDIT_LOG_LIST_DEFAULT_SIZE,
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
        summary: selectedLogDetail?.summary ?? selectedLog.summary,
        detailSummary: selectedLogDetail?.detailSummary ?? selectedLog.detail,
        actorId: selectedLogDetail?.actorId ?? '-',
        target: selectedLogDetail ? `${selectedLogDetail.targetType}:${selectedLogDetail.targetId}` : '-',
        ipAddressMasked: selectedLogDetail?.ipAddressMasked ?? '-',
        requestId: selectedLogDetail?.requestId ?? '-',
      }
    : null;
  const isAuditLogDetailEmpty =
    Boolean(selectedLog) && !isAuditLogDetailLoading && !isAuditLogDetailError && !selectedLogDetail;

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

              {isAuditLogListEmpty ? <div className="auditOpsEmpty">조건에 맞는 감사 로그가 없습니다.</div> : null}
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
    </section>
  );
}
