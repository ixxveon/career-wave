import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/audit-log.css';
import '../../../styles/admin/scraping.css';
import MiniPagination from '../../../components/admin/MiniPagination';
import {
  PIPELINE_STATUS,
  SCRAPING_ACTION_TYPE,
  scrapingApi,
  type ScrapingActionType,
  type ScrapingSource,
  type PipelineStatus,
} from '../../../api/admin/scrapingApi';
import { AUDIT_LOG_TYPE, auditLogApi } from '../../../api/admin/auditLogApi';
import { formatLogTime } from '../../../utils/admin/logView';

type Tone = 'normal' | 'warning' | 'danger' | 'info';

const PIPELINE_PAGE_SIZE = 5;
const PIPELINE_TABLE_BODY_HEIGHT = 280;
const LOG_PAGE_SIZE = 5;
const FILTER_ALL = 'ALL' as const;

type PipelineStatusFilter = typeof FILTER_ALL | PipelineStatus;

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

const auditToneForSeverity = {
  INFO: 'info',
  SUCCESS: 'success',
  WARN: 'warning',
  ERROR: 'danger',
};

const toPipelineStatusFilter = (value: string): PipelineStatusFilter =>
  Object.values(PIPELINE_STATUS).includes(value as PipelineStatus)
    ? value as PipelineStatus
    : FILTER_ALL;

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatDuration = (ms: number) => `${ms.toLocaleString()}ms`;
const formatVolume = (value: number) => value.toLocaleString();
const getRecentErrorText = (source: ScrapingSource) =>
  source.recentErrorCode ?? source.recentErrorMessage ?? '-';
const getActionErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : '액션 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
const getScrapingResponseMessage = (message: string | null | undefined, fallback: string) =>
  message?.trim() || fallback;
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
  const [logSourceFilter, setLogSourceFilter] = useState<string | null>(null);
  const pipelineKeyword = pipelineQuery.trim();
  const sourceListQueryKey = ['admin', 'scraping', 'sources', pipelineKeyword, statusFilter, pipelinePage] as const;
  const logListQueryKey = ['admin', 'scraping', 'logs', logSourceFilter] as const;

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
      if (!response.data.success) {
        throw new Error(getScrapingResponseMessage(response.data.message, 'Failed to load scraping sources.'));
      }
      return response.data.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const {
    data: logListData,
    isError: isLogListError,
    isLoading: isLogListLoading,
    refetch: refetchLogList,
  } = useQuery({
    queryKey: logListQueryKey,
    queryFn: async () => {
      const response = await auditLogApi.getLogs({
        logType: AUDIT_LOG_TYPE.SCRAPING_SYSTEM,
        keyword: logSourceFilter ?? undefined,
        page: 1,
        size: LOG_PAGE_SIZE,
      });
      if (!response.data.success) {
        throw new Error(getScrapingResponseMessage(response.data.message, 'Failed to load scraping logs.'));
      }
      return response.data.data;
    },
    placeholderData: (previousData) => previousData,
  });

  const sourceActionMutation = useMutation({
    mutationFn: async ({ sourceName, actionType }: { sourceName: string; actionType: ScrapingActionType }) => {
      const response = await scrapingApi.requestAction(sourceName, {
        actionType,
        reason: actionReason[actionType],
      });

      if (!response.data.success) {
        throw new Error(getScrapingResponseMessage(response.data.message, 'Failed to request scraping action.'));
      }

      return response.data.data;
    },
    onMutate: ({ sourceName }) => {
      setActionErrorMessage(null);
      pendingSourceNamesRef.current.add(sourceName);
      setPendingSourceNames(new Set(pendingSourceNamesRef.current));
    },
    onSuccess: () => {
      setActionErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'scraping', 'sources'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'scraping', 'logs'] });
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
  const isSourceListInitialLoading = isSourceListLoading && !sourceListData;
  const showSourceStateRow = isSourceListInitialLoading || isSourceListError || pagedPipelines.length === 0;
  const pipelinePlaceholderCount = showSourceStateRow ? PIPELINE_PAGE_SIZE - 1 : Math.max(0, PIPELINE_PAGE_SIZE - pagedPipelines.length);
  const pipelineRowHeight = Math.floor(PIPELINE_TABLE_BODY_HEIGHT / PIPELINE_PAGE_SIZE);
  const sourceEmptyMessage =
    pipelineKeyword.length > 0 || statusFilter !== FILTER_ALL
      ? '조건에 맞는 스크래핑 source가 없습니다.'
      : '등록된 스크래핑 source가 없습니다.';
  const logEmptyMessage =
    logSourceFilter
      ? '조건에 맞는 운영 로그가 없습니다.'
      : '표시할 운영 로그가 없습니다.';

  useEffect(() => {
    setPipelinePage((prev) => Math.min(prev, pipelineTotalPages));
  }, [pipelineTotalPages]);

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
  };

  const clearLogSourceFilter = () => {
    setLogSourceFilter(null);
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
          <span className="scrapeOpsUpdatedAt">최근 갱신 {updatedSeconds}초 전</span>
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
                  const isActionDisabled = isRowActionPending || !row.isEnabled;
                  const disabledActionTitle = row.isEnabled ? undefined : '비활성화된 파이프라인은 실행할 수 없습니다.';

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
                            disabled={isActionDisabled}
                            title={disabledActionTitle}
                            onClick={() => handleSourceAction(row.sourceName, SCRAPING_ACTION_TYPE.RUN)}
                          >
                            실행
                          </button>
                          <button
                            type="button"
                            className="scrapeOpsActionButton primary"
                            disabled={isActionDisabled || !canRetryRow}
                            title={disabledActionTitle}
                            onClick={() => handleSourceAction(row.sourceName, SCRAPING_ACTION_TYPE.RETRY)}
                          >
                            재시도
                          </button>
                          <button
                            type="button"
                            className="scrapeOpsActionButton subtle"
                            disabled={isActionDisabled}
                            title={disabledActionTitle}
                            onClick={() => handleSourceAction(row.sourceName, SCRAPING_ACTION_TYPE.TEST)}
                          >
                            테스트
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
              <span className="scrapeOpsEyebrow">운영 로그</span>
              <h3>실시간 로그</h3>
            </div>
          </div>

          {logSourceFilter ? (
            <div className="scrapeOpsLogScope">
              <span>{logSourceFilter} 관련 로그</span>
              <button type="button" onClick={clearLogSourceFilter}>
                해제
              </button>
            </div>
          ) : null}

          <div className="auditOpsTableWrap auditOpsTableWrapFlat">
            <div className="auditOpsTableHead"><span>발생 시각</span><span>도메인</span><span>상태</span><span>행동</span><span>대상</span><span>관리자</span></div>
            <div className="auditOpsTableBody">
              {isLogListLoading ? (
                <div className="auditOpsEmpty">로그를 불러오는 중입니다.</div>
              ) : null}

              {isLogListError ? (
                <div className="auditOpsEmpty error">
                  <span>운영 로그 조회에 실패했습니다.</span>
                  <button type="button" onClick={() => refetchLogList()}>
                    다시 시도
                  </button>
                </div>
              ) : null}

              {!isLogListLoading && !isLogListError && logs.length === 0 ? (
                <div className="auditOpsEmpty">{logEmptyMessage}</div>
              ) : null}

              {!isLogListLoading && !isLogListError
                ? logs.map((log) => (
                  <article key={log.id} className="auditOpsTableRow">
                    <span className="timestamp">{formatLogTime(log.occurredAt)}</span>
                    <span className="domain">{log.logTypeLabel}</span>
                    <span className={`auditOpsTag ${auditToneForSeverity[log.severity]}`}>{log.severity}</span>
                    <strong className="summary">{log.summary}</strong>
                    <span className="target">{[log.targetType, log.targetId].filter((value) => value && value !== '-').join(' #') || '-'}</span>
                    <span className="actor">{log.actorId}</span>
                  </article>
                ))
                : null}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
