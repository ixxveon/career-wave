import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import '../../styles/admin.css';
import MiniPagination from '../../components/MiniPagination';
import {
  SCRAPING_ACTION_TYPE,
  SCRAPING_STATUS,
  scrapingApi,
  type ScrapingActionType,
  type ScrapingLog,
  type ScrapingSource,
  type ScrapingStatus,
} from '../../api/scrapingApi';

type Tone = 'normal' | 'warning' | 'danger' | 'info';

const PIPELINE_PAGE_SIZE = 5;
const PIPELINE_TABLE_BODY_HEIGHT = 280;
const LOG_PAGE_SIZE = 5;
const FILTER_ALL = 'ALL' as const;

type StatusFilter = typeof FILTER_ALL | ScrapingStatus;

const statusTone: Record<ScrapingStatus, Tone> = {
  [SCRAPING_STATUS.SUCCESS]: 'normal',
  [SCRAPING_STATUS.FAILED]: 'danger',
};

const statusLabel: Record<ScrapingStatus, string> = {
  [SCRAPING_STATUS.SUCCESS]: '성공',
  [SCRAPING_STATUS.FAILED]: '실패',
};

const logStatusTone: Record<ScrapingStatus, Tone> = {
  [SCRAPING_STATUS.SUCCESS]: 'normal',
  [SCRAPING_STATUS.FAILED]: 'danger',
};

const toStatusFilter = (value: string): StatusFilter =>
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(FILTER_ALL);
  const [selectedPipelineIds, setSelectedPipelineIds] = useState<string[]>([]);
  const [pipelinePage, setPipelinePage] = useState(1);
  const [updatedSeconds] = useState(35);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [logStatusFilter, setLogStatusFilter] = useState<StatusFilter>(FILTER_ALL);
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
    onMutate: () => {
      setActionErrorMessage(null);
    },
    onSuccess: () => {
      setActionErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'scraping', 'sources'] });
    },
    onError: (error) => {
      setActionErrorMessage(getActionErrorMessage(error));
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
    sourceActionMutation.mutate({ sourceName, actionType });
  };

  const isSourceActionPending = (sourceName: string) =>
    sourceActionMutation.isPending && sourceActionMutation.variables?.sourceName === sourceName;

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
                  setStatusFilter(toStatusFilter(event.target.value));
                  setPipelinePage(1);
                }}
              >
                <option value={FILTER_ALL}>전체 상태</option>
                <option value={SCRAPING_STATUS.SUCCESS}>성공</option>
                <option value={SCRAPING_STATUS.FAILED}>실패</option>
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
                        {row.status === SCRAPING_STATUS.FAILED && getRecentErrorText(row) !== '-' ? (
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
                            disabled={isRowActionPending}
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
                  setLogStatusFilter(toStatusFilter(event.target.value));
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
              <div className="scrapeOpsConsoleState">표시할 운영 로그가 없습니다.</div>
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

      <style>{`
        .scrapeOpsPage {
          --scrape-primary: #173553;
          --scrape-border: #d8e4f1;
          --scrape-surface: rgba(255, 255, 255, 0.98);
          --scrape-muted: #72859b;
          --scrape-accent: #2563c9;
          --scrape-success: #2d8b57;
          --scrape-success-bg: #edf8f1;
          --scrape-warning: #b17419;
          --scrape-warning-bg: #fdf3de;
          --scrape-danger: #d04545;
          --scrape-danger-bg: #fff0f0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-bottom: 24px;
        }

        .scrapeOpsHeaderStatus {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .scrapeOpsLivePill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid #bcd2eb;
          background: #f7fbff;
          color: var(--scrape-primary);
          font-size: 12px;
          font-weight: 800;
        }

        .scrapeOpsPulse {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #2f9b63;
        }

        .scrapeOpsUpdatedAt {
          color: #6684a7;
          font-size: 12px;
          font-weight: 700;
        }

        .scrapeOpsBoard {
          display: grid;
          gap: 14px;
        }

        .scrapeOpsPanel {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 18px;
        }

        .scrapeOpsPanelHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }

        .scrapeOpsPanelHeader.compact {
          margin-bottom: 2px;
        }

        .scrapeOpsPanel:last-child .scrapeOpsPanelHeader.compact::after {
          content: '';
          width: 42px;
          height: 10px;
          flex: 0 0 auto;
          border-radius: 999px;
          background:
            radial-gradient(circle at 5px 5px, #ea4f4f 0 4px, transparent 4.5px),
            radial-gradient(circle at 21px 5px, #d8b46e 0 4px, transparent 4.5px),
            radial-gradient(circle at 37px 5px, #76a37f 0 4px, transparent 4.5px);
        }

        .scrapeOpsEyebrow {
          display: block;
          color: #6d859d;
          font-size: 11px;
          font-weight: 800;
        }

        .scrapeOpsPanelHeader h3 {
          margin: 4px 0 0;
          color: var(--scrape-primary);
          font-size: 16px;
          font-weight: 800;
        }

        .scrapeOpsFilters {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .scrapeOpsFilters input,
        .scrapeOpsFilters select {
          height: 40px;
          border: 1px solid #c8d9ee;
          border-radius: 10px;
          background: #f7fafe;
          color: var(--scrape-primary);
          padding: 0 12px;
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
        }

        .scrapeOpsFilters input {
          width: 260px;
        }

        .scrapeOpsAlert {
          display: flex;
          align-items: center;
          min-height: 38px;
          padding: 0 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 800;
        }

        .scrapeOpsAlert.danger {
          border: 1px solid #efb4b4;
          background: var(--scrape-danger-bg);
          color: var(--scrape-danger);
        }

        .scrapeOpsTableWrap.fixed {
          overflow: hidden;
          border: 1px solid #dfe8f2;
          background: #fff;
          min-height: 332px;
          height: 332px;
        }

        .scrapeOpsTable {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .scrapeOpsTable thead tr {
          height: 52px;
        }

        .scrapeOpsTable th,
        .scrapeOpsTable td {
          padding: 12px 14px;
          border-bottom: 1px solid #edf2f7;
          color: var(--scrape-primary);
          font-size: 12px;
          text-align: left;
          white-space: nowrap;
          vertical-align: middle;
        }

        .scrapeOpsTable th {
          color: #6b86a3;
          font-size: 11px;
          font-weight: 800;
        }

        .scrapeOpsPlaceholderRow td {
          padding: 0;
          background: #fff;
        }

        .scrapeOpsPlaceholderRow span {
          display: block;
          width: 100%;
          height: 100%;
        }

        .scrapeOpsStateRow td {
          text-align: center;
          color: #6b86a3;
          font-size: 12px;
          font-weight: 800;
          white-space: normal;
          background: #fbfdff;
        }

        .scrapeOpsStateRow.danger td {
          color: var(--scrape-danger);
          background: var(--scrape-danger-bg);
        }

        .scrapeOpsStateRow button {
          margin-left: 10px;
          height: 28px;
          padding: 0 10px;
          border: 1px solid #efb4b4;
          border-radius: 8px;
          background: #fff;
          color: var(--scrape-danger);
          font-size: 11px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .scrapeOpsBadge {
          display: inline-flex;
          align-items: center;
          height: 24px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .scrapeOpsBadge.normal {
          background: var(--scrape-success-bg);
          color: var(--scrape-success);
        }

        .scrapeOpsBadge.warning {
          background: var(--scrape-warning-bg);
          color: var(--scrape-warning);
        }

        .scrapeOpsBadge.danger {
          background: var(--scrape-danger-bg);
          color: var(--scrape-danger);
        }

        .scrapeOpsBadge.info {
          background: #edf4fd;
          color: #356eb6;
        }

        .scrapeOpsErrorLink {
          max-width: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--scrape-danger);
          font-size: 12px;
          font-weight: 800;
          font-family: inherit;
          text-align: left;
          text-decoration: underline;
          text-underline-offset: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
        }

        .scrapeOpsActionGroup {
          display: flex;
          gap: 6px;
          align-items: center;
          justify-content: flex-start;
        }

        .scrapeOpsActionButton {
          height: 30px;
          min-width: 48px;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid #d6dfeb;
          background: #fff;
          color: var(--scrape-primary);
          font-size: 11px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .scrapeOpsActionButton.primary {
          border-color: #2563c9;
          background: #2563c9;
          color: #fff;
        }

        .scrapeOpsActionButton.subtle {
          background: #f7fafe;
        }

        .scrapeOpsActionButton.dangerGhost {
          border-color: #e8c2c2;
          color: var(--scrape-danger);
        }

        .scrapeOpsActionButton:disabled {
          opacity: 0.56;
          cursor: not-allowed;
        }

        .scrapeOpsLogConsole {
          display: flex;
          flex-direction: column;
          padding: 14px 16px;
          border-radius: 16px;
          background: linear-gradient(180deg, #13253d 0%, #0f2034 100%);
          border: 1px solid #20344f;
        }

        .scrapeOpsLogScope {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          align-self: flex-start;
          min-height: 32px;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid #dfe8f2;
          background: #f7fafe;
          color: var(--scrape-primary);
          font-size: 12px;
          font-weight: 800;
        }

        .scrapeOpsLogScope button {
          height: 22px;
          padding: 0 8px;
          border: 1px solid #c8d9ee;
          border-radius: 7px;
          background: #fff;
          color: #356eb6;
          font-size: 11px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .scrapeOpsLogHead,
        .scrapeOpsConsoleRow {
          display: grid;
          grid-template-columns: 140px 100px minmax(0, 1fr);
          gap: 18px;
          align-items: center;
        }

        .scrapeOpsLogHead {
          padding: 6px 12px 14px;
          border-bottom: 1px solid rgba(84, 112, 148, 0.34);
          color: #8fb1d8;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .scrapeOpsConsoleRow {
          min-height: 54px;
          padding: 0 12px;
          border-bottom: 1px solid rgba(84, 112, 148, 0.22);
        }

        .scrapeOpsConsoleState {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 54px;
          padding: 0 12px;
          border-bottom: 1px solid rgba(84, 112, 148, 0.22);
          color: #9ec1ff;
          font-size: 12px;
          font-weight: 800;
        }

        .scrapeOpsConsoleState.danger {
          color: #ff9b9b;
        }

        .scrapeOpsConsoleState button {
          height: 28px;
          padding: 0 10px;
          border: 1px solid rgba(255, 155, 155, 0.5);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          color: #ffb3b3;
          font-size: 11px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .scrapeOpsConsoleRow:last-child {
          border-bottom: 0;
        }

        .scrapeOpsConsoleRow .time {
          color: #f4f8fd;
          font-size: 11px;
          font-weight: 800;
        }

        .scrapeOpsConsoleTag {
          font-size: 11px;
          font-weight: 800;
          font-family: 'Consolas', 'Monaco', monospace;
        }

        .scrapeOpsConsoleTag.normal {
          color: #7de1aa;
        }

        .scrapeOpsConsoleTag.warning {
          color: #ffd27a;
        }

        .scrapeOpsConsoleTag.danger {
          color: #ff9b9b;
        }

        .scrapeOpsConsoleTag.info {
          color: #9ec1ff;
        }

        .scrapeOpsConsoleRow strong {
          color: #f4f8fd;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.5;
        }

        @media (max-width: 1280px) {
          .scrapeOpsPanelHeader {
            flex-direction: column;
          }
        }

        @media (max-width: 820px) {
          .scrapeOpsFilters input,
          .scrapeOpsFilters select {
            width: 100%;
          }

          .scrapeOpsLogHead,
          .scrapeOpsConsoleRow {
            grid-template-columns: 1fr;
            gap: 6px;
          }
        }
      `}</style>
    </section>
  );
}
