import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/scraping.css';
import MiniPagination from '../../../components/admin/MiniPagination';
import {
  PIPELINE_STATUS,
  SCRAPING_ACTION_TYPE,
  SCRAPING_STATUS,
  scrapingApi,
  type ScrapingActionType,
  type ScrapingLog,
  type ScrapingSource,
  type PipelineStatus,
  type ScrapingStatus,
} from '../../../api/admin/scrapingApi';

type Tone = 'normal' | 'warning' | 'danger' | 'info';

const PIPELINE_PAGE_SIZE = 5;
const PIPELINE_TABLE_BODY_HEIGHT = 280;
const LOG_PAGE_SIZE = 5;
const FILTER_ALL = 'ALL' as const;

type PipelineStatusFilter = typeof FILTER_ALL | PipelineStatus;
type LogStatusFilter = typeof FILTER_ALL | ScrapingStatus;

const statusTone: Record<PipelineStatus, Tone> = {
  [PIPELINE_STATUS.IDLE]: 'info',
  [PIPELINE_STATUS.RUNNING]: 'warning',
  [PIPELINE_STATUS.SUCCESS]: 'normal',
  [PIPELINE_STATUS.FAILED]: 'danger',
};

const statusLabel: Record<PipelineStatus, string> = {
  [PIPELINE_STATUS.IDLE]: 'IDLE',
  [PIPELINE_STATUS.RUNNING]: 'RUNNING',
  [PIPELINE_STATUS.SUCCESS]: 'SUCCESS',
  [PIPELINE_STATUS.FAILED]: 'FAILED',
};

const logStatusTone: Record<ScrapingStatus, Tone> = {
  [SCRAPING_STATUS.SUCCESS]: 'normal',
  [SCRAPING_STATUS.FAILED]: 'danger',
};

const toPipelineStatusFilter = (value: string): PipelineStatusFilter =>
  Object.values(PIPELINE_STATUS).includes(value as PipelineStatus)
    ? value as PipelineStatus
    : FILTER_ALL;

const toLogStatusFilter = (value: string): LogStatusFilter =>
  value === SCRAPING_STATUS.SUCCESS || value === SCRAPING_STATUS.FAILED
    ? value
    : FILTER_ALL;

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatDuration = (ms: number) => `${ms.toLocaleString()}ms`;
const formatVolume = (value: number) => value.toLocaleString();
const formatLogTime = (value: string) =>
  Number.isNaN(new Date(value).getTime())
    ? value
    : new Date(value).toLocaleTimeString('ko-KR', { hour12: false });
const getRecentErrorText = (source: ScrapingSource) =>
  source.recentErrorCode ?? source.recentErrorMessage ?? '-';
const sanitizeLogDetail = (detail: string) => {
  const hasSensitiveKey = /\b(token|accessToken|refreshToken|authorization|cookie|set-cookie|proxy|proxyUrl|proxyAddress)\b/i.test(detail);
  const hasNetworkAddress = /\b(?:https?:\/\/|(?:\d{1,3}\.){3}\d{1,3})(?:[^\s]*)/i.test(detail);
  const looksLikeRawResponse = /<\/?[a-z][\s\S]*>|^\s*[{[][\s\S]*[}\]]\s*$/i.test(detail);

  if (hasSensitiveKey || hasNetworkAddress || looksLikeRawResponse) {
    return '민감 정보가 포함될 수 있어 상세 원문을 숨겼습니다.';
  }

  return detail;
};
const getLogMessage = (log: ScrapingLog) =>
  log.detail
    ? `${log.sourceName} ${sanitizeLogDetail(log.message)} ${sanitizeLogDetail(log.detail)}`
    : `${log.sourceName} ${sanitizeLogDetail(log.message)}`;
const getActionErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : '액션 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
const actionReason: Record<ScrapingActionType, string> = {
  [SCRAPING_ACTION_TYPE.RUN]: '관리자 수동 실행 요청',
  [SCRAPING_ACTION_TYPE.RETRY]: '관리자 수동 재시도 요청',
  [SCRAPING_ACTION_TYPE.TEST]: '관리자 수동 테스트 요청',
};

export default function ScrapingPage() {
  const queryClient = useQueryClient();
  const [pipelineQuery, setPipelineQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PipelineStatusFilter>(FILTER_ALL);
  const [selectedPipelineIds, setSelectedPipelineIds] = useState<string[]>([]);
  const [pipelinePage, setPipelinePage] = useState(1);
  const [updatedSeconds] = useState(35);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [pendingSourceNames, setPendingSourceNames] = useState<Set<string>>(new Set());
  const pendingSourceNamesRef = useRef<Set<string>>(new Set());
  const [logStatusFilter, setLogStatusFilter] = useState<LogStatusFilter>(FILTER_ALL);
  const [logSourceFilter, setLogSourceFilter] = useState<string | null>(null);
  const [logPage, setLogPage] = useState(1);
  const pipelineKeyword = pipelineQuery.trim();
  const sourceListQueryKey = ['admin', 'scraping', 'sources', pipelineKeyword, statusFilter, pipelinePage] as const;
  const logListQueryKey = ['admin', 'scraping', 'logs', logStatusFilter, logSourceFilter, logPage] as const;

  const {
    data: sourceListData,
    isError: isSourceListError,
    isFetching: isSourceListFetching,
    isLoading: isSourceListLoading,
    refetch: refetchSourceList,
  } = useQuery({
    queryKey: sourceListQueryKey,
    queryFn: async () => {
      const response = await scrapingApi.getSources({
        keyword: pipelineKeyword.length > 0 ? pipelineKeyword : undefined,
        status: statusFilter === FILTER_ALL ? undefined : statusFilter,
        page: pipelinePage,
        size: PIPELINE_PAGE_SIZE,
      });
      return response.data.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const {
    data: logListData,
    isError: isLogListError,
    isFetching: isLogListFetching,
    isLoading: isLogListLoading,
    refetch: refetchLogList,
  } = useQuery({
    queryKey: logListQueryKey,
    queryFn: async () => {
      const response = await scrapingApi.getLogs({
        sourceName: logSourceFilter ?? undefined,
        status: logStatusFilter === FILTER_ALL ? undefined : logStatusFilter,
        page: logPage,
        size: LOG_PAGE_SIZE,
      });
      return response.data.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const sourceActionMutation = useMutation({
    mutationFn: ({ sourceName, actionType }: { sourceName: string; actionType: ScrapingActionType }) =>
      scrapingApi.requestAction(sourceName, {
        actionType,
        reason: actionReason[actionType],
      }),
    onMutate: ({ sourceName }) => {
      setActionErrorMessage(null);
      pendingSourceNamesRef.current.add(sourceName);
      setPendingSourceNames(new Set(pendingSourceNamesRef.current));
    },
    onSuccess: () => {
      setActionErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'scraping', 'sources'] });
    },
    onError: (error) => {
      setActionErrorMessage(getActionErrorMessage(error));
    },
    onSettled: (_data, _error, { sourceName }) => {
      pendingSourceNamesRef.current.delete(sourceName);
      setPendingSourceNames(new Set(pendingSourceNamesRef.current));
    },
  });

  const pagedPipelines = sourceListData?.content ?? [];
  const logs = logListData?.content ?? [];
  const pipelineTotalPages = Math.max(1, sourceListData?.totalPages ?? 1);
  const logTotalPages = Math.max(1, logListData?.totalPages ?? 1);
  const isSourceListInitialLoading = isSourceListLoading && !sourceListData;
  const showSourceStateRow = isSourceListInitialLoading || isSourceListError || pagedPipelines.length === 0;
  const pipelinePlaceholderCount = showSourceStateRow ? PIPELINE_PAGE_SIZE - 1 : Math.max(0, PIPELINE_PAGE_SIZE - pagedPipelines.length);
  const pipelineRowHeight = Math.floor(PIPELINE_TABLE_BODY_HEIGHT / PIPELINE_PAGE_SIZE);
  const sourceEmptyMessage =
    pipelineKeyword.length > 0 || statusFilter !== FILTER_ALL
      ? '조건에 맞는 스크래핑 source가 없습니다.'
      : '등록된 스크래핑 source가 없습니다.';
  const logEmptyMessage =
    logStatusFilter !== 'ALL' || logSourceFilter
      ? '조건에 맞는 운영 로그가 없습니다.'
      : '표시할 운영 로그가 없습니다.';

  useEffect(() => {
    setPipelinePage((prev) => Math.min(prev, pipelineTotalPages));
  }, [pipelineTotalPages]);

  useEffect(() => {
    setLogPage((prev) => Math.min(prev, logTotalPages));
  }, [logTotalPages]);

  const allVisibleSelected =
    pagedPipelines.length > 0 && pagedPipelines.every((item) => selectedPipelineIds.includes(item.sourceName));

  const toggleAllRows = () => {
    if (allVisibleSelected) {
      setSelectedPipelineIds((prev) => prev.filter((id) => !pagedPipelines.some((item) => item.sourceName === id)));
      return;
    }

    setSelectedPipelineIds((prev) => Array.from(new Set([...prev, ...pagedPipelines.map((item) => item.sourceName)])));
  };

  const toggleRow = (id: string) => {
    setSelectedPipelineIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSourceAction = (sourceName: string, actionType: ScrapingActionType) => {
    if (pendingSourceNamesRef.current.has(sourceName)) return;

    sourceActionMutation.mutate({ sourceName, actionType });
  };

  const isSourceActionPending = (sourceName: string) => pendingSourceNames.has(sourceName);

  const handleRecentErrorClick = (source: ScrapingSource) => {
    setLogSourceFilter(source.sourceName);
    setLogStatusFilter(SCRAPING_STATUS.FAILED);
    setLogPage(1);
  };

  const clearLogSourceFilter = () => {
    setLogSourceFilter(null);
    setLogStatusFilter(FILTER_ALL);
    setLogPage(1);
  };

  return (
    <section className="scrapeOpsPage">
      <header className="admin-header">
        <div>
          <h2>스크래핑 관리</h2>
          <p>스크래핑 배치 상태와 실시간 운영 로그를 한 화면에서 모니터링합니다.</p>
        </div>

        <div className="scrapeOpsHeaderStatus">
          <div className="scrapeOpsLivePill">
            <span className="scrapeOpsPulse" />
            <strong>실시간 파이프라인 모니터링</strong>
          </div>
          <span className="scrapeOpsUpdatedAt">Updated {updatedSeconds}s ago</span>
        </div>
      </header>

      <div className="scrapeOpsBoard">
        <section className="admin-card scrapeOpsPanel">
          <div className="scrapeOpsPanelHeader">
            <div>
              <span className="scrapeOpsEyebrow">PIPELINE</span>
              <h3>스크래핑 배치 모니터링</h3>
            </div>

            <div className="scrapeOpsFilters">
              <input
                type="search"
                value={pipelineQuery}
                onChange={(event) => {
                  setPipelineQuery(event.target.value);
                  setPipelinePage(1);
                }}
                placeholder="파이프라인 또는 에러 검색"
              />

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(toPipelineStatusFilter(event.target.value));
                  setPipelinePage(1);
                }}
              >
                <option value={FILTER_ALL}>전체 상태</option>
                <option value={PIPELINE_STATUS.IDLE}>IDLE</option>
                <option value={PIPELINE_STATUS.RUNNING}>RUNNING</option>
                <option value={PIPELINE_STATUS.SUCCESS}>SUCCESS</option>
                <option value={PIPELINE_STATUS.FAILED}>FAILED</option>
              </select>
            </div>
          </div>

          {actionErrorMessage ? (
            <div className="scrapeOpsAlert danger" role="alert">
              {actionErrorMessage}
            </div>
          ) : null}

          <div className="scrapeOpsTableWrap fixed">
            <table className="scrapeOpsTable">
              <colgroup>
                <col style={{ width: '4%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '28%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllRows}
                      disabled={showSourceStateRow}
                      aria-label="전체 선택"
                    />
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
                {isSourceListInitialLoading ? (
                  <tr className="scrapeOpsStateRow" style={{ height: `${pipelineRowHeight}px` }}>
                    <td colSpan={9}>스크래핑 source를 불러오는 중입니다.</td>
                  </tr>
                ) : null}

                {isSourceListError ? (
                  <tr className="scrapeOpsStateRow danger" style={{ height: `${pipelineRowHeight}px` }}>
                    <td colSpan={9}>
                      <span>스크래핑 source 조회에 실패했습니다.</span>
                      <button type="button" onClick={() => refetchSourceList()}>
                        다시 시도
                      </button>
                    </td>
                  </tr>
                ) : null}

                {!isSourceListInitialLoading && !isSourceListError && pagedPipelines.length === 0 ? (
                  <tr className="scrapeOpsStateRow" style={{ height: `${pipelineRowHeight}px` }}>
                    <td colSpan={9}>{sourceEmptyMessage}</td>
                  </tr>
                ) : null}

                {!isSourceListInitialLoading && !isSourceListError ? pagedPipelines.map((row) => {
                  const isRowActionPending = isSourceActionPending(row.sourceName);
                  const canRetryRow = row.status === PIPELINE_STATUS.FAILED;

                  return (
                    <tr key={row.sourceName} style={{ height: `${pipelineRowHeight}px` }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedPipelineIds.includes(row.sourceName)}
                          onChange={() => toggleRow(row.sourceName)}
                          aria-label={`${row.sourceName} 선택`}
                        />
                      </td>
                      <td>{row.sourceName}</td>
                      <td>
                        <span className={`scrapeOpsBadge ${statusTone[row.status]}`}>{statusLabel[row.status]}</span>
                      </td>
                      <td>{formatPercent(row.successRate)}</td>
                      <td>{formatDuration(row.averageDurationMs)}</td>
                      <td>{row.cycleExpression}</td>
                      <td>{formatVolume(row.collectedCount)}</td>
                      <td>
                        {row.status === PIPELINE_STATUS.FAILED && getRecentErrorText(row) !== '-' ? (
                          <button
                            type="button"
                            className="scrapeOpsErrorLink"
                            onClick={() => handleRecentErrorClick(row)}
                          >
                            {getRecentErrorText(row)}
                          </button>
                        ) : (
                          getRecentErrorText(row)
                        )}
                      </td>
                      <td>
                        <div className="scrapeOpsActionGroup">
                          <button
                            type="button"
                            className="scrapeOpsActionButton subtle"
                            disabled={isRowActionPending}
                            onClick={() => handleSourceAction(row.sourceName, SCRAPING_ACTION_TYPE.RUN)}
                          >
                            실행
                          </button>
                          <button
                            type="button"
                            className="scrapeOpsActionButton primary"
                            disabled={isRowActionPending || !canRetryRow}
                            onClick={() => handleSourceAction(row.sourceName, SCRAPING_ACTION_TYPE.RETRY)}
                          >
                            재시도
                          </button>
                          <button
                            type="button"
                            className="scrapeOpsActionButton subtle"
                            disabled={isRowActionPending}
                            onClick={() => handleSourceAction(row.sourceName, SCRAPING_ACTION_TYPE.TEST)}
                          >
                            테스트
                          </button>
                          <button
                            type="button"
                            className="scrapeOpsActionButton dangerGhost"
                            disabled
                            title="미구현"
                          >
                            {/* TODO: 중지 액션은 백엔드 계약 확정 후 연결한다. */}
                            중지
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : null}
                {Array.from({ length: pipelinePlaceholderCount }, (_, index) => (
                  <tr key={`pipeline-placeholder-${index}`} className="scrapeOpsPlaceholderRow" aria-hidden="true" style={{ height: `${pipelineRowHeight}px` }}>
                    <td colSpan={9}>
                      <span />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <MiniPagination
            page={pipelinePage}
            totalPages={pipelineTotalPages}
            onChange={(nextPage) => {
              if (!isSourceListFetching) setPipelinePage(nextPage);
            }}
            className="pagination scrapeOpsPagination"
            activeClassName="activePage"
          />
        </section>

        <section className="admin-card scrapeOpsPanel">
          <div className="scrapeOpsPanelHeader compact">
            <div>
              <span className="scrapeOpsEyebrow">LOG</span>
              <h3>실시간 로그</h3>
            </div>

            <div className="scrapeOpsFilters">
              <select
                value={logStatusFilter}
                onChange={(event) => {
                  setLogStatusFilter(toLogStatusFilter(event.target.value));
                  setLogPage(1);
                }}
              >
                <option value={FILTER_ALL}>전체 로그</option>
                <option value={SCRAPING_STATUS.SUCCESS}>SUCCESS</option>
                <option value={SCRAPING_STATUS.FAILED}>FAILED</option>
              </select>
            </div>
          </div>

          {logSourceFilter ? (
            <div className="scrapeOpsLogScope">
              <span>{logSourceFilter} 실패 로그</span>
              <button type="button" onClick={clearLogSourceFilter}>
                해제
              </button>
            </div>
          ) : null}

          <div className="scrapeOpsLogConsole">
            <div className="scrapeOpsLogHead">
              <span>TIMESTAMP</span>
              <span>TYPE</span>
              <span>MESSAGE</span>
            </div>
            {isLogListLoading ? (
              <div className="scrapeOpsConsoleState">로그를 불러오는 중입니다.</div>
            ) : null}

            {isLogListError ? (
              <div className="scrapeOpsConsoleState danger">
                <span>운영 로그 조회에 실패했습니다.</span>
                <button type="button" onClick={() => refetchLogList()}>
                  다시 시도
                </button>
              </div>
            ) : null}

            {!isLogListLoading && !isLogListError && logs.length === 0 ? (
              <div className="scrapeOpsConsoleState">{logEmptyMessage}</div>
            ) : null}

            {!isLogListLoading && !isLogListError
              ? logs.map((log) => (
                <article key={log.logId} className="scrapeOpsConsoleRow">
                  <span className="time">[{formatLogTime(log.occurredAt)}]</span>
                  <span className={`scrapeOpsConsoleTag ${logStatusTone[log.status]}`}>[{log.status}]</span>
                  <strong>{getLogMessage(log)}</strong>
                </article>
              ))
              : null}
          </div>

          <MiniPagination
            page={logPage}
            totalPages={logTotalPages}
            onChange={(nextPage) => {
              if (!isLogListFetching) setLogPage(nextPage);
            }}
            className="pagination scrapeOpsPagination"
            activeClassName="activePage"
          />
        </section>
      </div>
    </section>
  );
}
