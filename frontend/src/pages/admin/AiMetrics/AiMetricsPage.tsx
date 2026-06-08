import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import '../../../styles/admin/admin.css';
import MiniPagination from '../../../components/admin/MiniPagination';
import { AI_DOMAIN, AI_EVENT_SEVERITY, AI_HEALTH_STATUS, AI_METRIC_INTERVAL, AI_USAGE_RISK_LEVEL, RAG_INDEX_STATUS, aiMetricsApi, getAiDisplayModelName } from '../../../api/admin/aiMetricsApi';
import type { AiBudgetSetting, AiDomain, AiDomainUsage, AiEventSeverity, AiHealthStatus, AiHeavyUser, AiMetricLog, AiMetricSummary, AiTokenTrendPoint, AiUsageRiskLevel, PageResult, RagDocumentMetric, RagIndexStatus } from '../../../api/admin/aiMetricsApi';
import { sanitizeLogMessage } from '../../../utils/admin/aiMetricsLogSanitizer';

type Tone = 'normal' | 'warning' | 'danger';
type EventSeverity = AiEventSeverity;

const DOC_PAGE_SIZE = 3;

const SUMMARY_QUERY_KEY = ['admin', 'aiMetrics', 'summary'] as const;
const DOMAIN_USAGE_QUERY_KEY = ['admin', 'aiMetrics', 'domainUsage'] as const;
const TOKEN_TREND_QUERY_KEY = ['admin', 'aiMetrics', 'tokenTrend'] as const;
const BUDGET_QUERY_KEY = ['admin', 'aiMetrics', 'budget'] as const;
const HEAVY_USERS_QUERY_KEY = ['admin', 'aiMetrics', 'heavyUsers'] as const;
const LOGS_QUERY_KEY = ['admin', 'aiMetrics', 'logs'] as const;
const RAG_DOCUMENTS_QUERY_KEY = ['admin', 'aiMetrics', 'ragDocuments'] as const;

const DOMAIN_CARD_ORDER: AiDomain[] = [AI_DOMAIN.DOCUMENT, AI_DOMAIN.INTERVIEW];

const DOMAIN_CARD_LABELS: Record<AiDomain, string> = {
  [AI_DOMAIN.DOCUMENT]: 'AI 서류 기능',
  [AI_DOMAIN.INTERVIEW]: 'AI 면접 기능',
};

const DOMAIN_FILTER_OPTIONS: Array<{ value: 'ALL' | AiDomain; label: string }> = [
  { value: 'ALL', label: '전체 도메인' },
  { value: AI_DOMAIN.DOCUMENT, label: DOMAIN_CARD_LABELS[AI_DOMAIN.DOCUMENT] },
  { value: AI_DOMAIN.INTERVIEW, label: DOMAIN_CARD_LABELS[AI_DOMAIN.INTERVIEW] },
];

const formatNumber = (value?: number) => (typeof value === 'number' ? value.toLocaleString() : '-');

const formatPercent = (value?: number) => (typeof value === 'number' ? `${value.toFixed(1)}%` : '-');

const formatLatency = (value?: number) => (typeof value === 'number' ? `${Math.round(value).toLocaleString()}ms` : '-');

const formatCost = (value?: number | null) => (typeof value === 'number' ? `$${value.toLocaleString()}` : '-');

const formatBudgetPercent = (value: number) => `${Math.min(100, Math.max(0, Math.round(value))).toLocaleString()}%`;

const formatCompactToken = (value: number) => {
  if (value >= 1000) return `${Math.round(value / 100) / 10}K`;
  return value.toLocaleString();
};

const formatTrendBucket = (bucket: string) => {
  const date = new Date(bucket);
  if (!Number.isNaN(date.getTime())) return `${String(date.getHours()).padStart(2, '0')}h`;
  return bucket;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getMaskedHeavyUserLabel = (user: AiHeavyUser) => {
  const label = user.maskedUserLabel.trim();
  if (label) return label;
  return `USER-${user.userId.slice(-4).padStart(4, '*')}`;
};

const getApiErrorStatus = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  return (error as { response?: { status?: number } }).response?.status;
};

const getApiStateMessage = (error: unknown, fallback: string) => {
  const status = getApiErrorStatus(error);
  if (status === 401) return '로그인이 만료되어 데이터를 처리할 수 없습니다. 다시 로그인해 주세요.';
  if (status === 403) return '관리자 권한이 없어 데이터를 처리할 수 없습니다.';
  return fallback;
};

const getHealthStatusLabel = (status?: AiHealthStatus) => {
  if (status === AI_HEALTH_STATUS.CRITICAL) return 'OpenAI API 위험';
  if (status === AI_HEALTH_STATUS.WARNING) return 'OpenAI API 주의';
  if (status === AI_HEALTH_STATUS.NORMAL) return 'OpenAI API 정상';
  return 'OpenAI API 상태 확인 중';
};

const getRiskTone = (riskLevel?: AiUsageRiskLevel) => {
  if (riskLevel === AI_USAGE_RISK_LEVEL.CRITICAL) return 'danger';
  if (riskLevel === AI_USAGE_RISK_LEVEL.WARNING) return 'warning';
  if (riskLevel === AI_USAGE_RISK_LEVEL.NORMAL) return 'normal';
  return 'muted';
};

const getRagStatusTone = (status: RagIndexStatus): Tone => {
  if (status === RAG_INDEX_STATUS.FAILED) return 'danger';
  if (status === RAG_INDEX_STATUS.INDEXING) return 'warning';
  return 'normal';
};

const getRagStatusLabel = (status: RagIndexStatus) => {
  if (status === RAG_INDEX_STATUS.FAILED) return '실패';
  if (status === RAG_INDEX_STATUS.INDEXING) return '인덱싱 중';
  return '동기화됨';
};

const toneForStatus = (value: EventSeverity): Tone => {
  if (value === AI_EVENT_SEVERITY.ERROR) return 'danger';
  if (value === AI_EVENT_SEVERITY.WARN) return 'warning';
  return 'normal';
};

export default function AiMetricsPage() {
  const queryClient = useQueryClient();
  const [docQuery, setDocQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedTrendDomain, setSelectedTrendDomain] = useState<'ALL' | AiDomain>('ALL');
  const [docPage, setDocPage] = useState(1);
  const [budgetDraft, setBudgetDraft] = useState('2000');
  const [thresholdDraft, setThresholdDraft] = useState('85');
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false);
  const [budgetMutationErrorMessage, setBudgetMutationErrorMessage] = useState('');

  const {
    data: summaryData,
    isLoading: summaryLoading,
    isError: summaryIsError,
    error: summaryError,
  } = useQuery<AiMetricSummary, Error>({
    queryKey: SUMMARY_QUERY_KEY,
    queryFn: async () => {
      const response = await aiMetricsApi.getSummary();
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 요약 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const {
    data: domainUsageData,
    isLoading: domainUsageLoading,
    isFetching: domainUsageFetching,
    isError: domainUsageIsError,
    error: domainUsageError,
    refetch: refetchDomainUsage,
  } = useQuery<AiDomainUsage[], Error>({
    queryKey: DOMAIN_USAGE_QUERY_KEY,
    queryFn: async () => {
      const response = await aiMetricsApi.getDomainUsage();
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 도메인 사용량 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const domainUsageByDomain = useMemo(() => {
    return new Map((domainUsageData ?? []).map((usage) => [usage.domain, usage]));
  }, [domainUsageData]);

  const domainUsageEmpty = !domainUsageLoading && !domainUsageIsError && (domainUsageData?.length ?? 0) === 0;

  const {
    data: tokenTrendData,
    isLoading: tokenTrendLoading,
    isError: tokenTrendIsError,
    error: tokenTrendError,
  } = useQuery<AiTokenTrendPoint[], Error>({
    queryKey: [...TOKEN_TREND_QUERY_KEY, selectedTrendDomain],
    queryFn: async () => {
      const response = await aiMetricsApi.getTokenTrend({
        interval: AI_METRIC_INTERVAL.HOURLY,
        domain: selectedTrendDomain === 'ALL' ? undefined : selectedTrendDomain,
      });
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 토큰 추이 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const tokenTrendChartData = useMemo(
    () =>
      (tokenTrendData ?? []).map((point) => ({
        bucket: point.bucket,
        label: formatTrendBucket(point.bucket),
        input: point.inputTokens,
        output: point.outputTokens,
        requestCount: point.requestCount,
      })),
    [tokenTrendData]
  );

  const tokenTrendEmpty = !tokenTrendLoading && !tokenTrendIsError && tokenTrendChartData.length === 0;

  const selectedTrendDomainLabel = useMemo(
    () => DOMAIN_FILTER_OPTIONS.find((option) => option.value === selectedTrendDomain)?.label ?? '전체 도메인',
    [selectedTrendDomain]
  );

  const {
    data: budgetSetting,
    isLoading: budgetLoading,
    isError: budgetIsError,
    error: budgetError,
  } = useQuery<AiBudgetSetting, Error>({
    queryKey: BUDGET_QUERY_KEY,
    queryFn: async () => {
      const response = await aiMetricsApi.getBudget();
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 예산 설정 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const isBudgetLoaded = budgetSetting != null;
  const monthlyBudget = isBudgetLoaded ? budgetSetting.monthlyBudget : 0;
  const currentSpend = isBudgetLoaded ? budgetSetting.currentSpend : null;
  const forecastSpend = isBudgetLoaded ? budgetSetting.forecastSpend : null;
  const thresholdPercent = isBudgetLoaded ? budgetSetting.thresholdPercent : 0;
  const discordAlertEnabled = isBudgetLoaded ? budgetSetting.discordAlertEnabled : false;
  const rateLimitEnabled = isBudgetLoaded ? budgetSetting.rateLimitEnabled : false;
  const budgetUsed = isBudgetLoaded && monthlyBudget > 0 && typeof currentSpend === 'number' ? (currentSpend / monthlyBudget) * 100 : 0;
  const budgetProgress = isBudgetLoaded ? Math.min(100, Math.max(0, budgetUsed)) : 0;
  const isBudgetRisk = isBudgetLoaded && thresholdPercent > 0 && budgetUsed >= thresholdPercent;
  const budgetMutationDisabled = !isBudgetLoaded || budgetLoading || budgetIsError;

  const updateBudgetMutation = useMutation<AiBudgetSetting, Error, { monthlyBudget: number; thresholdPercent: number }>({
    mutationFn: async (data) => {
      const response = await aiMetricsApi.updateBudget(data);
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 예산 설정 수정에 실패했습니다.');
      return response.data.data;
    },
    onMutate: () => {
      setBudgetMutationErrorMessage('');
    },
    onSuccess: (nextBudgetSetting) => {
      queryClient.setQueryData(BUDGET_QUERY_KEY, nextBudgetSetting);
      setBudgetDraft(String(nextBudgetSetting.monthlyBudget));
      setThresholdDraft(String(nextBudgetSetting.thresholdPercent));
      setBudgetEditorOpen(false);
      setBudgetMutationErrorMessage('');
    },
    onError: (error) => {
      setBudgetMutationErrorMessage(getApiStateMessage(error, 'AI 예산 설정 수정에 실패했습니다.'));
    },
  });

  const updateDiscordAlertMutation = useMutation<AiBudgetSetting, Error, boolean>({
    mutationFn: async (enabled) => {
      const response = await aiMetricsApi.updateDiscordAlert({ enabled });
      if (!response.data.success) throw new Error(response.data.message ?? '디스코드 알림 설정 수정에 실패했습니다.');
      return response.data.data;
    },
    onMutate: () => {
      setBudgetMutationErrorMessage('');
    },
    onSuccess: (nextBudgetSetting) => {
      queryClient.setQueryData(BUDGET_QUERY_KEY, nextBudgetSetting);
      setBudgetMutationErrorMessage('');
    },
    onError: (error) => {
      setBudgetMutationErrorMessage(getApiStateMessage(error, '디스코드 알림 설정 수정에 실패했습니다.'));
    },
  });

  const updateRateLimitMutation = useMutation<AiBudgetSetting, Error, boolean>({
    mutationFn: async (enabled) => {
      const response = await aiMetricsApi.updateRateLimit({
        enabled,
        reason: enabled ? '관리자 AI Metrics 예산 제어에서 사용량 제한을 활성화했습니다.' : '관리자 AI Metrics 예산 제어에서 사용량 제한을 해제했습니다.',
      });
      if (!response.data.success) throw new Error(response.data.message ?? '사용량 제한 설정 수정에 실패했습니다.');
      return response.data.data;
    },
    onMutate: () => {
      setBudgetMutationErrorMessage('');
    },
    onSuccess: (nextBudgetSetting) => {
      queryClient.setQueryData(BUDGET_QUERY_KEY, nextBudgetSetting);
      setBudgetMutationErrorMessage('');
    },
    onError: (error) => {
      setBudgetMutationErrorMessage(getApiStateMessage(error, '사용량 제한 설정 수정에 실패했습니다.'));
    },
  });

  const {
    data: heavyUsersData,
    isLoading: heavyUsersLoading,
    isError: heavyUsersIsError,
    error: heavyUsersError,
  } = useQuery<AiHeavyUser[], Error>({
    queryKey: HEAVY_USERS_QUERY_KEY,
    queryFn: async () => {
      const response = await aiMetricsApi.getHeavyUsers({ limit: 6 });
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 헤비 유저 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const heavyUsers = heavyUsersData ?? [];
  const heavyUsersEmpty = !heavyUsersLoading && !heavyUsersIsError && heavyUsers.length === 0;

  const {
    data: metricLogsData,
    isLoading: metricLogsLoading,
    isError: metricLogsIsError,
    error: metricLogsError,
  } = useQuery<PageResult<AiMetricLog>, Error>({
    queryKey: LOGS_QUERY_KEY,
    queryFn: async () => {
      const response = await aiMetricsApi.getLogs({ page: 0, size: 5 });
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 운영 로그 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const metricLogs = metricLogsData?.content ?? [];
  const metricLogsEmpty = !metricLogsLoading && !metricLogsIsError && metricLogs.length === 0;

  const {
    data: ragDocumentsData,
    isLoading: ragDocumentsLoading,
    isError: ragDocumentsIsError,
    error: ragDocumentsError,
  } = useQuery<RagDocumentMetric[], Error>({
    queryKey: RAG_DOCUMENTS_QUERY_KEY,
    queryFn: async () => {
      const response = await aiMetricsApi.getRagDocuments();
      if (!response.data.success) throw new Error(response.data.message ?? 'RAG 지식 베이스 상태 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const ragDocs = ragDocumentsData ?? [];
  const ragDocsEmpty = !ragDocumentsLoading && !ragDocumentsIsError && ragDocs.length === 0;

  const filteredDocs = useMemo(() => {
    const keyword = docQuery.trim().toLowerCase();
    if (!keyword) return ragDocs;
    return ragDocs.filter((doc) => doc.name.toLowerCase().includes(keyword));
  }, [docQuery, ragDocs]);

  useEffect(() => {
    if (ragDocs.length === 0) {
      if (selectedDocId) setSelectedDocId('');
      return;
    }
    if (!ragDocs.some((doc) => doc.documentId === selectedDocId)) {
      setSelectedDocId(ragDocs[0].documentId);
    }
  }, [ragDocs, selectedDocId]);

  const selectedDoc = useMemo(
    () => ragDocs.find((doc) => doc.documentId === selectedDocId) ?? ragDocs[0],
    [ragDocs, selectedDocId]
  );

  const docTotalPages = Math.max(1, Math.ceil(filteredDocs.length / DOC_PAGE_SIZE));
  const pagedDocs = useMemo(() => {
    const start = (docPage - 1) * DOC_PAGE_SIZE;
    return filteredDocs.slice(start, start + DOC_PAGE_SIZE);
  }, [docPage, filteredDocs]);
  const emptyDocRows = ragDocumentsLoading || ragDocumentsIsError || ragDocsEmpty ? 0 : DOC_PAGE_SIZE - pagedDocs.length;

  const axisMax = useMemo(
    () => {
      const maxValue = Math.max(0, ...tokenTrendChartData.map((item) => Math.max(item.input, item.output)));
      if (maxValue <= 0) return 1;
      return Math.ceil(maxValue / 10) * 10;
    },
    [tokenTrendChartData]
  );

  const axisTicks = useMemo(
    () => [1, 0.75, 0.5, 0.25, 0].map((ratio) => formatCompactToken(Math.round(axisMax * ratio))),
    [axisMax]
  );
  const tokenTrendHighlightIndex = useMemo(() => {
    if (tokenTrendChartData.length === 0) return -1;
    return tokenTrendChartData.reduce((highlightIndex, item, index, items) => {
      const itemTotal = item.input + item.output;
      const highlightTotal = items[highlightIndex].input + items[highlightIndex].output;
      return itemTotal > highlightTotal ? index : highlightIndex;
    }, 0);
  }, [tokenTrendChartData]);

  useEffect(() => {
    setDocPage((prev) => Math.min(prev, docTotalPages));
  }, [docTotalPages]);

  const summaryStatusLabel = summaryIsError
    ? getApiStateMessage(summaryError, 'AI 요약 상태를 불러오지 못했습니다.')
    : getHealthStatusLabel(summaryData?.healthStatus);
  const summaryLastSyncedLabel = summaryData ? `${formatDateTime(summaryData.lastSyncedAt)} 동기화` : summaryLoading ? '요약 조회 중' : '동기화 정보 없음';
  const totalTokens = summaryData ? summaryData.totalInputTokens + summaryData.totalOutputTokens : undefined;

  const handleDownloadDocument = (doc: RagDocumentMetric) => {
    const content = [
      `Document: ${doc.name}`,
      `Chunks: ${doc.chunkCount}`,
      `Progress: ${doc.progressPercent}%`,
      `Status: ${doc.status}`,
      `Updated At: ${doc.updatedAt}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = doc.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  };

  const handleBudgetSave = () => {
    if (!isBudgetLoaded) {
      setBudgetMutationErrorMessage('예산 정보를 불러온 뒤 다시 시도해 주세요.');
      return;
    }
    const nextBudget = Number(budgetDraft.replace(/,/g, '').trim());
    const nextThreshold = Number(thresholdDraft.replace(/,/g, '').trim());
    if (!Number.isFinite(nextBudget) || nextBudget < 0) return;
    if (!Number.isFinite(nextThreshold) || nextThreshold < 1 || nextThreshold > 100) return;
    updateBudgetMutation.mutate({
      monthlyBudget: nextBudget,
      thresholdPercent: nextThreshold,
    });
  };

  const handleDiscordAlertToggle = () => {
    if (!isBudgetLoaded) {
      setBudgetMutationErrorMessage('예산 정보를 불러온 뒤 다시 시도해 주세요.');
      return;
    }
    updateDiscordAlertMutation.mutate(!discordAlertEnabled);
  };

  const handleRateLimitToggle = () => {
    if (!isBudgetLoaded) {
      setBudgetMutationErrorMessage('예산 정보를 불러온 뒤 다시 시도해 주세요.');
      return;
    }
    updateRateLimitMutation.mutate(!rateLimitEnabled);
  };

  return (
    <section className="aiOpsPage">
      <header className="admin-header">
        <div>
          <h2>AI 메트릭스</h2>
          <p>AI 사용량과 리소스 상태를 한 화면에서 모니터링합니다.</p>
        </div>

        <div className="aiOpsHeaderStatus">
          <div className="aiOpsLiveState">
            <span className="aiOpsPulse" />
            <div>
              <strong>{summaryIsError ? '요약 연결 실패' : 'LIVE 모니터링'}</strong>
              <small>{summaryLastSyncedLabel}</small>
            </div>
          </div>
          <div className="aiOpsHeaderMeta">
            <span>{summaryStatusLabel}</span>
            <span>평균 응답 {summaryLoading ? '조회 중' : formatLatency(summaryData?.averageLatencyMs)}</span>
            <span>누적 비용 {summaryLoading ? '조회 중' : formatCost(summaryData?.estimatedCost)}</span>
            <span>전체 토큰 {typeof totalTokens === 'number' ? totalTokens.toLocaleString() : '-'}</span>
          </div>
        </div>
      </header>

      <section className="aiOpsDomainSection" aria-label="AI 도메인별 사용량">
        {(domainUsageLoading || domainUsageIsError || domainUsageEmpty) && (
          <div className={`aiOpsDomainNotice ${domainUsageIsError ? 'danger' : domainUsageEmpty ? 'empty' : 'loading'}`}>
            <div>
              <strong>
                {domainUsageIsError
                  ? getApiStateMessage(domainUsageError, '도메인 사용량을 불러오지 못했습니다.')
                  : domainUsageEmpty
                    ? '집계된 도메인 사용량이 없습니다.'
                    : '도메인 사용량을 불러오는 중입니다.'}
              </strong>
              <span>
                {domainUsageIsError
                  ? domainUsageError?.message ?? '잠시 후 다시 시도해 주세요.'
                  : domainUsageEmpty
                    ? 'AI 서류 기능과 AI 면접 기능 사용량이 발생하면 카드에 표시됩니다.'
                    : 'DOCUMENT와 INTERVIEW 사용량을 최신 데이터로 갱신하고 있습니다.'}
              </span>
            </div>
            {domainUsageIsError && (
              <button type="button" onClick={() => void refetchDomainUsage()} disabled={domainUsageFetching}>
                {domainUsageFetching ? '재시도 중' : '다시 조회'}
              </button>
            )}
          </div>
        )}

        <div className="aiOpsDomainGrid">
        {DOMAIN_CARD_ORDER.map((domain) => {
          const usage = domainUsageByDomain.get(domain);
          const modelName = usage ? getAiDisplayModelName(usage) : '모델 정보 없음';

          return (
            <article className="admin-card aiOpsDomainCard" key={domain}>
              <div className="aiOpsDomainCardHead">
                <div>
                  <span className="aiOpsEyebrow">{domain}</span>
                  <h3>{usage?.domainLabel ?? DOMAIN_CARD_LABELS[domain]}</h3>
                </div>
                <span className={`aiOpsDomainState ${domainUsageIsError ? 'danger' : usage ? 'normal' : 'warning'}`}>
                  {domainUsageIsError ? '연결 실패' : usage ? '연결됨' : domainUsageLoading ? '조회 중' : '데이터 없음'}
                </span>
              </div>

              <div className="aiOpsDomainModel">
                <div>
                  <span>표시 모델</span>
                  <strong>{domainUsageLoading ? '조회 중' : modelName}</strong>
                </div>
                <div className="aiOpsDomainRisk">
                  <span>위험도</span>
                  <strong className={getRiskTone(usage?.riskLevel)}>{usage?.riskLevel ?? '-'}</strong>
                </div>
              </div>

              <dl className="aiOpsDomainMetrics">
                <div>
                  <dt>전체 요청</dt>
                  <dd>{formatNumber(usage?.requestCount)}</dd>
                </div>
                <div>
                  <dt>성공</dt>
                  <dd>{formatNumber(usage?.successCount)}</dd>
                </div>
                <div>
                  <dt>실패</dt>
                  <dd>{formatNumber(usage?.failureCount)}</dd>
                </div>
                <div>
                  <dt>실패율</dt>
                  <dd>{formatPercent(usage?.failureRate)}</dd>
                </div>
                <div>
                  <dt>평균 응답</dt>
                  <dd>{formatLatency(usage?.averageLatencyMs)}</dd>
                </div>
                <div>
                  <dt>입력 토큰</dt>
                  <dd>{formatNumber(usage?.inputTokens)}</dd>
                </div>
                <div>
                  <dt>출력 토큰</dt>
                  <dd>{formatNumber(usage?.outputTokens)}</dd>
                </div>
                <div>
                  <dt>추정 비용</dt>
                  <dd>{formatCost(usage?.estimatedCost)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
        </div>
      </section>

      <section className="aiOpsBoard">
        <div className="aiOpsBoardRow aiOpsBoardTop">
          <section className="admin-card aiOpsUsageCard">
            <div className="aiOpsPanelHead">
              <div>
                <span className="aiOpsEyebrow">LLM API 토큰 추이</span>
                <h3>{selectedTrendDomainLabel}</h3>
              </div>
              <label className="aiOpsModelField">
                <span>도메인 필터</span>
                <select
                  value={selectedTrendDomain}
                  onChange={(event) => setSelectedTrendDomain(event.target.value as 'ALL' | AiDomain)}
                >
                  {DOMAIN_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="aiOpsUsageGrid">
              <div className="aiOpsUsageChartBlock">
                <div className="aiOpsChartHead">
                  <div>
                    <div className="aiOpsMetricCaption">시간대별 토큰 사용량</div>
                    <div className="aiOpsUsageMeta">시간대별 입력/출력 토큰 분포</div>
                    <div className="aiOpsBudgetControls">
                      {budgetEditorOpen ? (
                        <>
                          <div className="aiOpsBudgetEditFields">
                            <label>
                              <span>월간 예산</span>
                              <input
                                type="text"
                                value={budgetDraft}
                                onChange={(event) => setBudgetDraft(event.target.value.replace(/[^\d,]/g, ''))}
                                aria-label="총 예산 입력"
                              />
                            </label>
                            <label>
                              <span>임계치</span>
                              <input
                                type="text"
                                value={thresholdDraft}
                                onChange={(event) => setThresholdDraft(event.target.value.replace(/[^\d]/g, ''))}
                                aria-label="임계치 입력"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            className="aiOpsBudgetButton primary"
                            onClick={handleBudgetSave}
                            disabled={budgetMutationDisabled || updateBudgetMutation.isPending}
                          >
                            {updateBudgetMutation.isPending ? '저장 중' : '저장'}
                          </button>
                          <button
                            type="button"
                            className="aiOpsBudgetButton"
                            disabled={updateBudgetMutation.isPending}
                            onClick={() => {
                              setBudgetDraft(String(monthlyBudget || ''));
                              setThresholdDraft(String(thresholdPercent || ''));
                              setBudgetEditorOpen(false);
                            }}
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="aiOpsBudgetButton"
                          disabled={budgetMutationDisabled}
                          onClick={() => {
                            setBudgetDraft(String(monthlyBudget || ''));
                            setThresholdDraft(String(thresholdPercent || ''));
                            setBudgetEditorOpen(true);
                          }}
                        >
                          총 예산 변경
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="aiOpsLegend">
                    <span className="input">입력 토큰</span>
                    <span className="output">출력 토큰</span>
                  </div>
                </div>

                <div className="aiOpsChartPlot">
                  {(tokenTrendLoading || tokenTrendIsError || tokenTrendEmpty) && (
                    <div className={`aiOpsChartNotice ${tokenTrendIsError ? 'danger' : tokenTrendEmpty ? 'empty' : 'loading'}`}>
                      {tokenTrendIsError
                        ? getApiStateMessage(tokenTrendError, '토큰 추이 데이터를 불러오지 못했습니다.')
                        : tokenTrendEmpty
                          ? '표시할 토큰 추이 데이터가 없습니다.'
                          : '토큰 추이 데이터를 불러오는 중입니다.'}
                    </div>
                  )}

                  <div className="aiOpsYAxis">
                    {axisTicks.map((tick) => (
                      <span key={tick}>{tick}</span>
                    ))}
                  </div>

                  <div className="aiOpsChartPanel">
                    <div className="aiOpsBars">
                      {tokenTrendChartData.map((item, index) => {
                        const tone = index === tokenTrendHighlightIndex ? 'strong' : 'soft';
                        return (
                          <div className="aiOpsBarItem" key={item.bucket}>
                            <div
                              className="aiOpsBarGroup"
                              data-tooltip={`입력 ${formatCompactToken(item.input)} | 출력 ${formatCompactToken(item.output)} | 요청 ${item.requestCount.toLocaleString()}건`}
                            >
                              <div
                                className={`aiOpsBar input tone-${tone}`}
                                style={{ height: `${(item.input / axisMax) * 100}%` }}
                              />
                              <div
                                className={`aiOpsBar output tone-${tone}`}
                                style={{ height: `${(item.output / axisMax) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="aiOpsXAxisLabels">
                      {tokenTrendChartData.map((item) => {
                        const total = item.input + item.output;
                        return (
                          <div className="aiOpsXAxisItem" key={`${item.bucket}-label`}>
                            <span>{item.label}</span>
                            <small>{formatCompactToken(total)} 토큰</small>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="aiOpsBudgetBox">
                <div className="aiOpsBudgetShell">
                  <div className="aiOpsBudgetMain">
                    <div className="aiOpsBudgetValue">{budgetLoading ? '조회 중' : formatCost(currentSpend)}</div>
                    <div className="aiOpsBudgetLabel">월간 사용 비용</div>
                    <div className="aiOpsBudgetLine">
                      {budgetIsError
                        ? getApiStateMessage(budgetError, '예산 정보를 불러오지 못했습니다.')
                        : !isBudgetLoaded
                          ? '예산 정보를 불러오는 중입니다.'
                        : `${formatCost(monthlyBudget)} 예산 중 ${formatBudgetPercent(budgetUsed)} 사용`}
                    </div>
                  </div>

                  <div className="aiOpsProgress">
                    <div style={{ width: `${budgetProgress}%` }} />
                  </div>

                  {budgetMutationErrorMessage ? (
                    <div className="aiOpsBudgetError" role="alert">
                      {budgetMutationErrorMessage}
                    </div>
                  ) : null}

                  <div className={`aiOpsStatusBadge ${isBudgetRisk ? 'danger' : 'stable'}`}>
                    <span />
                    {isBudgetRisk ? '위험' : '안정'}
                  </div>

                  <div className="aiOpsBudgetFacts">
                    <div>
                      <span>예상 비용</span>
                      <strong>{budgetLoading ? '조회 중' : formatCost(forecastSpend)}</strong>
                    </div>
                    <div>
                      <span>임계치</span>
                      <strong>{thresholdPercent > 0 ? `${thresholdPercent}%` : '-'}</strong>
                    </div>
                    <div>
                      <span>전체 토큰</span>
                      <strong>{typeof totalTokens === 'number' ? formatCompactToken(totalTokens) : '-'}</strong>
                    </div>
                  </div>

                  <div className="aiOpsAlertCard">
                    <div className="aiOpsAlertHead">
                      <div>
                        <strong>디스코드 알림</strong>
                        <span>{discordAlertEnabled ? '켜짐' : '꺼짐'}</span>
                      </div>
                      <button
                        type="button"
                        className={`aiOpsSwitch compact ${discordAlertEnabled ? 'active' : ''}`}
                        onClick={handleDiscordAlertToggle}
                        disabled={budgetMutationDisabled || updateDiscordAlertMutation.isPending}
                        aria-label="디스코드 알림 토글"
                      >
                        <i />
                      </button>
                    </div>

                    <div className="aiOpsThreshold">
                      <span>임계치</span>
                      <strong>{thresholdPercent > 0 ? `${thresholdPercent}%` : '-'}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`aiOpsDangerButton ${rateLimitEnabled || isBudgetRisk ? 'danger' : 'neutral'}`}
                    onClick={handleRateLimitToggle}
                    disabled={budgetMutationDisabled || updateRateLimitMutation.isPending}
                  >
                    {updateRateLimitMutation.isPending
                      ? '처리 중'
                      : rateLimitEnabled
                        ? '사용량 제한 해제'
                        : isBudgetRisk
                          ? '긴급 제한'
                          : '속도 제한 제어'}
                  </button>
                </div>
              </aside>
            </div>
          </section>

          <section className="admin-card aiOpsHeavyCard">
            <div className="aiOpsPanelHead compact">
              <div>
                <span className="aiOpsEyebrow">이상치 트래커 (토큰 사용량)</span>
                <h3>헤비 유저 토큰 트래커</h3>
              </div>
            </div>

            <div className="aiOpsTableWrap compact">
              <table className="aiOpsTable">
                <thead>
                  <tr>
                    <th>사용자</th>
                    <th>도메인</th>
                    <th>누적 토큰</th>
                    <th>요청 수</th>
                    <th>위험도</th>
                    <th>최근 사용</th>
                  </tr>
                </thead>
                <tbody>
                  {(heavyUsersLoading || heavyUsersIsError || heavyUsersEmpty) && (
                    <tr className="placeholder">
                      <td colSpan={6}>
                        {heavyUsersIsError
                          ? getApiStateMessage(heavyUsersError, '헤비 유저 데이터를 불러오지 못했습니다.')
                          : heavyUsersEmpty
                            ? '표시할 헤비 유저 데이터가 없습니다.'
                            : '헤비 유저 데이터를 불러오는 중입니다.'}
                      </td>
                    </tr>
                  )}
                  {heavyUsers.map((user) => (
                    <tr key={`${user.userId}-${user.domain}`}>
                      <td>{getMaskedHeavyUserLabel(user)}</td>
                      <td>{user.domainLabel}</td>
                      <td>{user.tokenUsage.toLocaleString()}</td>
                      <td>{user.requestCount.toLocaleString()}</td>
                      <td>
                        <span className={`aiOpsBadge ${getRiskTone(user.riskLevel)}`}>{user.riskLevel}</span>
                      </td>
                      <td>{formatDateTime(user.lastUsedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="aiOpsBoardRow aiOpsBoardMiddle">
          <section className="admin-card aiOpsRagCard">
            <div className="aiOpsPanelHead compact">
              <div>
                <span className="aiOpsEyebrow">RAG 지식 베이스 관리</span>
                <h3>{selectedDoc?.name ?? 'RAG 문서 상태'}</h3>
              </div>
            </div>

            <div className="aiOpsRagLayout">
              <aside className="aiOpsUploadCard">
                <div className="aiOpsUploadIcon">
                  <span />
                </div>
                <strong>인프라 문서 업로드</strong>
                <span>PDF, TXT, DOCX 최대 50MB</span>
                <button type="button">업로드 및 임베딩</button>
              </aside>

              <div className="aiOpsRagTableBlock">
                <div className="aiOpsSearchRow">
                  <span className="aiOpsSearchIcon small" />
                  <input
                    type="text"
                    value={docQuery}
                    onChange={(event) => {
                      setDocQuery(event.target.value);
                      setDocPage(1);
                    }}
                    placeholder="청크 또는 메타데이터 검색..."
                  />
                </div>

                <div className="aiOpsTableWrap ragFixed">
                  <table className="aiOpsTable">
                    <colgroup>
                      <col style={{ width: '34%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '22%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>문서명</th>
                        <th>청크</th>
                        <th>현재 진행도</th>
                        <th>상태</th>
                        <th>액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ragDocumentsLoading || ragDocumentsIsError || ragDocsEmpty) && (
                        <tr className="placeholder">
                          <td colSpan={5}>
                            {ragDocumentsIsError
                              ? getApiStateMessage(ragDocumentsError, 'RAG 지식 베이스 상태를 불러오지 못했습니다.')
                              : ragDocsEmpty
                                ? '표시할 RAG 문서가 없습니다.'
                                : 'RAG 지식 베이스 상태를 불러오는 중입니다.'}
                          </td>
                        </tr>
                      )}
                      {pagedDocs.map((doc) => (
                        <tr
                          key={doc.documentId}
                          className={selectedDocId === doc.documentId ? 'selected' : ''}
                          onClick={() => setSelectedDocId(doc.documentId)}
                        >
                          <td>{doc.name}</td>
                          <td>{doc.chunkCount.toLocaleString()}</td>
                          <td>
                            <div className="aiOpsInlineProgress">
                              <div style={{ width: `${doc.progressPercent}%` }} />
                            </div>
                          </td>
                          <td>
                            <span className={`aiOpsBadge ${getRagStatusTone(doc.status)}`}>{getRagStatusLabel(doc.status)}</span>
                          </td>
                          <td>
                            <button type="button" className="aiOpsTextButton">
                              재인덱싱
                            </button>
                            <button
                              type="button"
                              className="aiOpsTextButton"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDownloadDocument(doc);
                              }}
                            >
                              다운로드
                            </button>
                            <button type="button" className="aiOpsTextButton danger">
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                      {Array.from({ length: emptyDocRows }, (_, index) => (
                        <tr key={`doc-placeholder-${index}`} className="placeholder" aria-hidden="true">
                          <td colSpan={5} />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <MiniPagination
                  page={docPage}
                  totalPages={docTotalPages}
                  onChange={setDocPage}
                  className="aiOpsPagination"
                  showWhenSingle
                />
              </div>
            </div>
          </section>
        </div>

        <div className="aiOpsBoardRow aiOpsBoardBottom">
          <section className="admin-card aiOpsLogCard fullWidth">
            <div className="aiOpsPanelHead compact">
              <div>
                <span className="aiOpsEyebrow">실시간 리소스 및 시스템 로그</span>
                <h3>시스템 리소스 모니터 로그</h3>
              </div>
              <div className="aiOpsLogLights">
                <i className="red" />
                <i className="amber" />
                <i className="green" />
              </div>
            </div>

            <div className="aiOpsLogConsole">
              <div className="aiOpsLogHead">
                <span>TIMESTAMP</span>
                <span>DOMAIN</span>
                <span>TYPE</span>
                <span>MESSAGE</span>
              </div>
              {(metricLogsLoading || metricLogsIsError || metricLogsEmpty) && (
                <article className="aiOpsLogRow placeholder">
                  <span className="time">[-]</span>
                  <span>-</span>
                  <span className="aiOpsLogTag normal">[INFO]</span>
                  <strong>
                    {metricLogsIsError
                      ? getApiStateMessage(metricLogsError, 'AI 운영 로그 데이터를 불러오지 못했습니다.')
                      : metricLogsEmpty
                        ? '표시할 AI 운영 로그가 없습니다.'
                        : 'AI 운영 로그 데이터를 불러오는 중입니다.'}
                  </strong>
                </article>
              )}
              {metricLogs.map((event) => (
                <article key={event.eventId} className="aiOpsLogRow">
                  <span className="time">[{formatDateTime(event.occurredAt)}]</span>
                  <span>{event.domainLabel}</span>
                  <span className={`aiOpsLogTag ${toneForStatus(event.severity)}`}>[{event.severity}]</span>
                  <strong>{sanitizeLogMessage(event.message)}</strong>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <style>{`
        .aiOpsPage {
          --ai-primary: #173553;
          --ai-border: #d8e4f1;
          --ai-surface: rgba(255, 255, 255, 0.98);
          --ai-surface-alt: #f6f9fd;
          --ai-muted: #72859b;
          --ai-accent: #2563c9;
          --ai-success: #2d8b57;
          --ai-success-bg: #edf8f1;
          --ai-warning: #b17419;
          --ai-warning-bg: #fdf3de;
          --ai-danger: #d04545;
          --ai-danger-bg: #fff0f0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-bottom: 24px;
        }

        .aiOpsHeaderStatus {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .aiOpsLiveState {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 40px;
          padding: 0 12px;
          border-radius: 14px;
          border: 1px solid var(--ai-border);
          background: var(--ai-surface);
        }

        .aiOpsPulse {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #2563c9;
          animation: aiOpsPulse 1.8s infinite;
        }

        .aiOpsLiveState strong {
          display: block;
          color: var(--ai-primary);
          font-size: 13px;
        }

        .aiOpsLiveState small,
        .aiOpsHeaderMeta span {
          color: var(--ai-muted);
          font-size: 11px;
        }

        .aiOpsHeaderMeta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .aiOpsHeaderMeta span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .aiOpsHeaderMeta span::before {
          content: '';
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #a5b7ca;
        }

        .aiOpsDomainSection {
          display: grid;
          gap: 12px;
        }

        .aiOpsDomainNotice {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          min-height: 64px;
          padding: 14px 16px;
          border: 1px solid #dbe6f2;
          border-radius: 8px;
          background: #f8fafc;
        }

        .aiOpsDomainNotice > div {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .aiOpsDomainNotice strong {
          color: var(--ai-primary);
          font-size: 14px;
          line-height: 1.35;
        }

        .aiOpsDomainNotice span {
          color: var(--ai-muted);
          font-size: 12px;
          line-height: 1.45;
        }

        .aiOpsDomainNotice.loading {
          border-color: rgba(37, 99, 201, 0.22);
          background: rgba(37, 99, 201, 0.06);
        }

        .aiOpsDomainNotice.empty {
          border-color: rgba(100, 116, 139, 0.22);
          background: rgba(100, 116, 139, 0.06);
        }

        .aiOpsDomainNotice.danger {
          border-color: rgba(220, 38, 38, 0.22);
          background: rgba(220, 38, 38, 0.06);
        }

        .aiOpsDomainNotice button {
          flex: 0 0 auto;
          height: 34px;
          padding: 0 14px;
          border: 1px solid #c8d5e5;
          border-radius: 8px;
          background: #ffffff;
          color: var(--ai-primary);
          font-size: 12px;
          font-weight: 900;
          font-family: inherit;
          cursor: pointer;
        }

        .aiOpsDomainNotice button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .aiOpsDomainGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .aiOpsDomainCard {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
          padding: 18px;
        }

        .aiOpsDomainCardHead {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .aiOpsDomainCardHead h3 {
          margin: 2px 0 0;
          color: var(--ai-ink);
          font-size: 20px;
          line-height: 1.25;
        }

        .aiOpsDomainState {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid #d8e0ea;
          background: #f8fafc;
          color: var(--ai-muted);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .aiOpsDomainState.normal {
          border-color: rgba(22, 163, 74, 0.28);
          background: rgba(22, 163, 74, 0.08);
          color: #15803d;
        }

        .aiOpsDomainState.warning {
          border-color: rgba(245, 158, 11, 0.32);
          background: rgba(245, 158, 11, 0.1);
          color: #b45309;
        }

        .aiOpsDomainState.danger {
          border-color: rgba(220, 38, 38, 0.28);
          background: rgba(220, 38, 38, 0.08);
          color: #b91c1c;
        }

        .aiOpsDomainModel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px;
          align-items: end;
          min-width: 0;
          padding-top: 14px;
          border-top: 1px solid #e7edf4;
        }

        .aiOpsDomainModel > div {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .aiOpsDomainModel span {
          color: var(--ai-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .aiOpsDomainModel strong {
          min-width: 0;
          color: var(--ai-ink);
          font-size: 18px;
          line-height: 1.25;
          overflow-wrap: anywhere;
        }

        .aiOpsDomainRisk {
          justify-items: end;
        }

        .aiOpsDomainRisk strong {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid #d8e0ea;
          background: #f8fafc;
          color: var(--ai-muted);
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .aiOpsDomainRisk strong.normal {
          border-color: rgba(22, 163, 74, 0.28);
          background: rgba(22, 163, 74, 0.08);
          color: #15803d;
        }

        .aiOpsDomainRisk strong.warning {
          border-color: rgba(245, 158, 11, 0.32);
          background: rgba(245, 158, 11, 0.1);
          color: #b45309;
        }

        .aiOpsDomainRisk strong.danger {
          border-color: rgba(220, 38, 38, 0.28);
          background: rgba(220, 38, 38, 0.08);
          color: #b91c1c;
        }

        .aiOpsDomainMetrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin: 0;
        }

        .aiOpsDomainMetrics div {
          display: grid;
          gap: 4px;
          min-width: 0;
          padding: 12px;
          border: 1px solid #e3ebf4;
          border-radius: 8px;
          background: #f8fafc;
        }

        .aiOpsDomainMetrics dt {
          color: var(--ai-muted);
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .aiOpsDomainMetrics dd {
          margin: 0;
          color: var(--ai-primary);
          font-size: 17px;
          font-weight: 900;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .aiOpsBoard {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .aiOpsBoardRow {
          display: grid;
          gap: 12px;
          align-items: stretch;
        }

        .aiOpsBoardTop {
          grid-template-columns: minmax(0, 1.55fr) minmax(320px, 1fr);
        }

        .aiOpsBoardMiddle,
        .aiOpsBoardBottom {
          grid-template-columns: 1fr;
        }

        .aiOpsUsageCard,
        .aiOpsHeavyCard,
        .aiOpsRagCard,
        .aiOpsLogCard {
          display: flex;
          flex-direction: column;
          padding: 18px;
          min-width: 0;
          height: 100%;
        }

        .aiOpsHeavyCard {
          min-height: 100%;
          align-self: start;
          height: auto;
        }

        .aiOpsRagCard {
          min-height: 418px;
        }

        .aiOpsLogCard.fullWidth {
          grid-column: 1 / -1;
        }

        .aiOpsPanelHead {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 14px;
          min-height: 40px;
        }

        .aiOpsPanelHead.compact {
          margin-bottom: 14px;
        }

        .aiOpsRagCard .aiOpsPanelHead {
          min-height: 42px;
        }

        .aiOpsPanelHead h3 {
          margin: 2px 0 0;
          color: var(--ai-primary);
          font-size: 15px;
          font-weight: 800;
        }

        .aiOpsRagCard .aiOpsPanelHead h3 {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .aiOpsEyebrow {
          display: block;
          color: #6d859d;
          font-size: 11px;
          font-weight: 800;
        }

        .aiOpsModelField {
          display: grid;
          gap: 6px;
          justify-items: end;
          color: #6d859d;
          font-size: 11px;
          font-weight: 800;
        }

        .aiOpsModelField select {
          min-width: 168px;
          height: 38px;
          border: 1px solid #c8d9ee;
          border-radius: 10px;
          background: #f7fafe;
          color: var(--ai-primary);
          padding: 0 12px;
          font-size: 12px;
          font-weight: 700;
          font-family: inherit;
        }

        .aiOpsUsageGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) 230px;
          gap: 18px;
          align-items: start;
          flex: 1;
        }

        .aiOpsUsageChartBlock {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
        }

        .aiOpsChartHead {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }

        .aiOpsMetricCaption {
          color: #173b72;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .aiOpsUsageMeta {
          margin-top: 4px;
          color: #55708d;
          font-size: 11px;
          font-weight: 700;
        }

        .aiOpsLegend {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          color: #4f6d92;
          font-size: 11px;
          font-weight: 700;
        }

        .aiOpsLegend span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .aiOpsLegend span::before {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: block;
        }

        .aiOpsLegend span.input::before {
          background: #9dc0eb;
        }

        .aiOpsLegend span.output::before {
          background: #245fb8;
        }

        .aiOpsChartPlot {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
        }

        .aiOpsChartNotice {
          grid-column: 1 / -1;
          min-height: 42px;
          padding: 12px 14px;
          border: 1px solid rgba(37, 99, 201, 0.18);
          border-radius: 8px;
          background: rgba(37, 99, 201, 0.06);
          color: var(--ai-primary);
          font-size: 12px;
          font-weight: 800;
        }

        .aiOpsChartNotice.empty {
          border-color: rgba(100, 116, 139, 0.22);
          background: rgba(100, 116, 139, 0.06);
          color: var(--ai-muted);
        }

        .aiOpsChartNotice.danger {
          border-color: rgba(220, 38, 38, 0.22);
          background: rgba(220, 38, 38, 0.06);
          color: #b91c1c;
        }

        .aiOpsYAxis {
          display: grid;
          grid-template-rows: repeat(5, 1fr);
          align-items: end;
          justify-items: end;
          height: 250px;
          padding: 2px 0 10px;
          color: #7a90ab;
          font-size: 10px;
          font-weight: 700;
        }

        .aiOpsChartPanel {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .aiOpsBars {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(38px, 1fr));
          gap: 8px;
          align-items: end;
          min-height: 250px;
          height: 250px;
          padding: 12px 10px 10px;
          background:
            linear-gradient(to bottom, rgba(200, 216, 236, 0.45) 1px, transparent 1px) 0 0 / 100% 36px,
            #f6f9ff;
          border: 1px solid #e1ebf5;
          border-radius: 12px;
        }

        .aiOpsBarItem {
          display: flex;
          align-items: end;
          justify-content: center;
          height: 100%;
        }

        .aiOpsBarGroup {
          position: relative;
          width: 100%;
          max-width: 54px;
          height: 212px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 6px;
        }

        .aiOpsBarGroup::after {
          content: attr(data-tooltip);
          position: absolute;
          left: 50%;
          bottom: calc(100% + 10px);
          transform: translateX(-50%);
          min-width: 164px;
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(22, 42, 67, 0.96);
          color: #eef5ff;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.4;
          text-align: center;
          opacity: 0;
          pointer-events: none;
          box-shadow: 0 10px 20px rgba(18, 39, 64, 0.16);
          transition: opacity 0.16s ease;
        }

        .aiOpsBarGroup:hover::after {
          opacity: 1;
        }

        .aiOpsBar {
          width: 18px;
          min-height: 12px;
          border-radius: 4px 4px 0 0;
        }

        .aiOpsBar.input.tone-soft {
          background: #a9c3ea;
        }

        .aiOpsBar.output.tone-soft {
          background: #4d7fc6;
        }

        .aiOpsBar.input.tone-strong {
          background: #7aa8e8;
        }

        .aiOpsBar.output.tone-strong {
          background: #1f58af;
        }

        .aiOpsXAxisLabels {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(38px, 1fr));
          gap: 8px;
          padding: 0 10px;
        }

        .aiOpsXAxisItem {
          display: grid;
          justify-items: center;
          gap: 4px;
        }

        .aiOpsXAxisItem span {
          color: var(--ai-primary);
          font-size: 10px;
          font-weight: 700;
        }

        .aiOpsXAxisItem small {
          color: #7a90ab;
          font-size: 9px;
          font-weight: 700;
        }

        .aiOpsBudgetShell {
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .aiOpsBudgetValue {
          color: #173b72;
          font-size: 34px;
          font-weight: 800;
          line-height: 1;
        }

        .aiOpsBudgetLabel {
          color: #5a7694;
          font-size: 12px;
          font-weight: 700;
        }

        .aiOpsBudgetLine {
          color: var(--ai-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .aiOpsBudgetError {
          padding: 9px 10px;
          border: 1px solid #f0caca;
          border-radius: 8px;
          background: var(--ai-danger-bg);
          color: var(--ai-danger);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.4;
        }

        .aiOpsBudgetControls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        .aiOpsBudgetEditFields {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .aiOpsBudgetEditFields label {
          display: grid;
          gap: 4px;
          color: var(--ai-muted);
          font-size: 10px;
          font-weight: 800;
        }

        .aiOpsBudgetControls input {
          width: 118px;
          height: 32px;
          border: 1px solid #d6dfeb;
          border-radius: 8px;
          background: #fff;
          color: var(--ai-primary);
          padding: 0 10px;
          font-size: 11px;
          font-weight: 700;
          font-family: inherit;
        }

        .aiOpsBudgetButton {
          height: 32px;
          border-radius: 8px;
          border: 1px solid #d6dfeb;
          background: #fff;
          color: var(--ai-primary);
          padding: 0 12px;
          font-size: 11px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .aiOpsBudgetButton:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .aiOpsBudgetButton.primary {
          border-color: #2563c9;
          background: #2563c9;
          color: #fff;
        }

        .aiOpsProgress,
        .aiOpsInlineProgress {
          height: 8px;
          border-radius: 999px;
          background: #e5edf6;
          overflow: hidden;
        }

        .aiOpsProgress div,
        .aiOpsInlineProgress div {
          height: 100%;
          background: linear-gradient(90deg, #78a8ea, #2563c9);
        }

        .aiOpsStatusBadge {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #d5e3f2;
          background: #edf9f3;
          color: #1c4d3e;
          font-size: 11px;
          font-weight: 800;
        }

        .aiOpsStatusBadge span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #28a36a;
        }

        .aiOpsStatusBadge.danger {
          border-color: #f0c7c7;
          background: #fff1f1;
          color: #9f2f2f;
        }

        .aiOpsStatusBadge.danger span {
          background: #d94141;
        }

        .aiOpsBudgetFacts,
        .aiOpsAlertCard {
          display: grid;
          gap: 8px;
          padding: 12px;
          border: 1px solid #e1ebf5;
          border-radius: 12px;
          background: #f7fafe;
        }

        .aiOpsBudgetFacts div,
        .aiOpsThreshold {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .aiOpsBudgetFacts span,
        .aiOpsAlertHead span,
        .aiOpsThreshold {
          color: #68839f;
          font-size: 11px;
          font-weight: 700;
        }

        .aiOpsBudgetFacts strong,
        .aiOpsAlertHead strong {
          color: #173b72;
          font-size: 12px;
          font-weight: 800;
        }

        .aiOpsAlertHead {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .aiOpsAlertHead > div {
          display: grid;
          gap: 2px;
        }

        .aiOpsSwitch {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 32px;
          border: 1px solid var(--ai-border);
          border-radius: 999px;
          background: #f8fbff;
          cursor: pointer;
        }

        .aiOpsSwitch:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .aiOpsSwitch i {
          position: relative;
          width: 24px;
          height: 14px;
          border-radius: 999px;
          background: #d1dce8;
        }

        .aiOpsSwitch i::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #fff;
          transition: transform 0.2s ease;
        }

        .aiOpsSwitch.active i {
          background: #2563c9;
        }

        .aiOpsSwitch.active i::after {
          transform: translateX(10px);
        }

        .aiOpsDangerButton,
        .aiOpsUploadCard button,
        .aiOpsTextButton {
          height: 32px;
          border-radius: 8px;
          border: 1px solid #d6dfeb;
          background: #fff;
          color: var(--ai-primary);
          font-size: 11px;
          font-weight: 800;
          padding: 0 12px;
          font-family: inherit;
          cursor: pointer;
        }

        .aiOpsDangerButton {
          width: 100%;
        }

        .aiOpsDangerButton:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .aiOpsDangerButton.neutral {
          border-color: #c6d6ea;
          background: #eaf1fb;
          color: #173b72;
        }

        .aiOpsDangerButton.danger {
          border-color: #dfb7b7;
          background: #da2e2e;
          color: #fff;
        }

        .aiOpsTableWrap {
          overflow: auto;
          border: 1px solid #dfe8f2;
          background: #fff;
        }

        .aiOpsTableWrap.compact {
          flex: 1 1 auto;
          min-height: 0;
          height: 100%;
        }

        .aiOpsHeavyCard .aiOpsTableWrap.compact {
          flex: 0 0 auto;
          height: auto;
        }

        .aiOpsTableWrap.ragFixed {
          min-height: 212px;
          max-height: 212px;
          overflow: hidden;
        }

        .aiOpsTable {
          width: 100%;
          min-width: 680px;
          border-collapse: collapse;
        }

        .aiOpsTableWrap.ragFixed .aiOpsTable {
          min-width: 720px;
          table-layout: fixed;
        }

        .aiOpsTable tbody tr {
          height: 56px;
        }

        .aiOpsTable th,
        .aiOpsTable td {
          padding: 12px 14px;
          border-bottom: 1px solid #edf2f7;
          color: var(--ai-primary);
          font-size: 12px;
          text-align: left;
          white-space: nowrap;
        }

        .aiOpsTableWrap.ragFixed th:nth-child(2),
        .aiOpsTableWrap.ragFixed td:nth-child(2),
        .aiOpsTableWrap.ragFixed th:nth-child(4),
        .aiOpsTableWrap.ragFixed td:nth-child(4) {
          text-align: center;
        }

        .aiOpsTableWrap.ragFixed th:nth-child(3),
        .aiOpsTableWrap.ragFixed td:nth-child(3),
        .aiOpsTableWrap.ragFixed th:nth-child(5),
        .aiOpsTableWrap.ragFixed td:nth-child(5) {
          text-align: left;
        }

        .aiOpsTableWrap.ragFixed td:first-child,
        .aiOpsTableWrap.ragFixed td:last-child {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .aiOpsTable th {
          color: #6b86a3;
          font-size: 11px;
          font-weight: 800;
        }

        .aiOpsTable tbody tr.selected {
          background: #f5f9ff;
        }

        .aiOpsTable tbody tr.placeholder td {
          color: transparent;
          background: #fff;
        }

        .aiOpsBadge {
          display: inline-flex;
          align-items: center;
          height: 24px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .aiOpsBadge.normal {
          background: var(--ai-success-bg);
          color: var(--ai-success);
        }

        .aiOpsBadge.warning {
          background: var(--ai-warning-bg);
          color: var(--ai-warning);
        }

        .aiOpsBadge.danger {
          background: var(--ai-danger-bg);
          color: var(--ai-danger);
        }

        .aiOpsActionIcons {
          display: flex;
          gap: 6px;
        }

        .aiOpsMiniIcon {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 1px solid currentColor;
          background: #fff;
          font-size: 11px;
          font-weight: 800;
          line-height: 1;
          cursor: pointer;
        }

        .aiOpsMiniWarn {
          color: #2f6fcd;
        }

        .aiOpsMiniBlock {
          color: #d04545;
        }

        .aiOpsRagLayout {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 18px;
          align-items: stretch;
          flex: 1;
          min-height: 304px;
        }

        .aiOpsUploadCard {
          display: grid;
          justify-items: center;
          align-content: center;
          gap: 12px;
          min-height: 260px;
          padding: 24px 18px;
          border: 1px dashed #c6d3e5;
          background: #f4f7fd;
          text-align: center;
        }

        .aiOpsUploadIcon {
          position: relative;
          width: 44px;
          height: 32px;
        }

        .aiOpsUploadIcon span {
          position: absolute;
          inset: 0;
          border: 3px solid #c5d1e0;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          border-bottom-left-radius: 10px;
          border-bottom-right-radius: 10px;
          border-top-color: transparent;
        }

        .aiOpsUploadIcon::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          width: 12px;
          height: 18px;
          border-left: 3px solid #c5d1e0;
          border-top: 3px solid #c5d1e0;
          transform: translateX(-50%) rotate(45deg);
        }

        .aiOpsUploadCard strong {
          color: var(--ai-primary);
          font-size: 14px;
        }

        .aiOpsUploadCard span {
          color: var(--ai-muted);
          font-size: 11px;
        }

        .aiOpsUploadCard button {
          background: #2563c9;
          border-color: #2563c9;
          color: #fff;
        }

        .aiOpsRagTableBlock {
          min-width: 0;
          display: flex;
          flex-direction: column;
          min-height: 304px;
        }

        .aiOpsSearchRow {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 12px;
          margin-bottom: 10px;
          border-radius: 10px;
          border: 1px solid #dfe7f1;
          background: #f4f7fb;
        }

        .aiOpsSearchRow input {
          width: 100%;
          height: 100%;
          border: 0;
          background: transparent;
          color: var(--ai-primary);
          font-size: 12px;
          font-family: inherit;
        }

        .aiOpsSearchRow input:focus {
          outline: none;
        }

        .aiOpsSearchIcon {
          position: relative;
          width: 12px;
          height: 12px;
        }

        .aiOpsSearchIcon::before,
        .aiOpsSearchIcon::after {
          content: '';
          position: absolute;
        }

        .aiOpsSearchIcon::before {
          width: 9px;
          height: 9px;
          border: 2px solid #88a2bf;
          border-radius: 999px;
          left: 0;
          top: 0;
        }

        .aiOpsSearchIcon::after {
          width: 6px;
          height: 2px;
          background: #88a2bf;
          right: -1px;
          bottom: 0;
          transform: rotate(45deg);
          transform-origin: right center;
        }

        .aiOpsTextButton {
          margin-right: 6px;
          color: var(--ai-accent);
        }

        .aiOpsTextButton.danger {
          color: var(--ai-danger);
        }

        .aiOpsPagination {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding-top: 12px;
          min-height: 44px;
        }

        .aiOpsPagination button {
          min-width: 32px;
          height: 32px;
          border: 1px solid #d6dfeb;
          border-radius: 8px;
          background: #fff;
          color: var(--ai-primary);
          font-size: 11px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
        }

        .aiOpsPagination button.active {
          border-color: #2563c9;
          background: #2563c9;
          color: #fff;
        }

        .aiOpsPagination button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .aiOpsLogLights {
          display: flex;
          gap: 6px;
        }

        .aiOpsLogLights i {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: block;
        }

        .aiOpsLogLights .red {
          background: #ea4f4f;
        }

        .aiOpsLogLights .amber {
          background: #d8b46e;
        }

        .aiOpsLogLights .green {
          background: #76a37f;
        }

        .aiOpsLogConsole {
          display: flex;
          flex-direction: column;
          min-height: 274px;
          max-height: 274px;
          overflow: auto;
          padding: 14px 16px;
          border-radius: 14px;
          background: linear-gradient(180deg, #13253d 0%, #0f2034 100%);
          border: 1px solid #20344f;
        }

        .aiOpsLogHead,
        .aiOpsLogRow {
          display: grid;
          grid-template-columns: 140px 120px 90px minmax(0, 1fr);
          column-gap: 18px;
          align-items: center;
          font-family: Consolas, 'SFMono-Regular', Menlo, monospace;
          font-size: 12px;
          line-height: 1.55;
        }

        .aiOpsLogHead {
          padding: 4px 14px 12px;
          border-bottom: 1px solid rgba(107, 137, 173, 0.2);
          color: #88a2bf;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .aiOpsLogRow {
          padding: 10px 14px;
          color: #dce7f3;
          border-top: 1px solid rgba(37, 56, 81, 0.9);
        }

        .aiOpsLogTag.normal {
          color: #7dd49a;
        }

        .aiOpsLogTag.warning {
          color: #e1c36d;
        }

        .aiOpsLogTag.danger {
          color: #e39aa2;
        }

        .aiOpsLogRow strong {
          color: #f4f8fd;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @keyframes aiOpsPulse {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 201, 0.34); }
          70% { box-shadow: 0 0 0 8px rgba(37, 99, 201, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 201, 0); }
        }

        @media (max-width: 1480px) {
          .aiOpsBoardTop,
          .aiOpsUsageGrid,
          .aiOpsRagLayout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 820px) {
          .aiOpsDomainNotice {
            flex-direction: column;
            align-items: stretch;
          }

          .aiOpsDomainNotice button {
            width: 100%;
          }

          .aiOpsDomainGrid {
            grid-template-columns: 1fr;
          }

          .aiOpsDomainMetrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .aiOpsDomainModel {
            grid-template-columns: 1fr;
          }

          .aiOpsDomainRisk {
            justify-items: start;
          }

          .aiOpsHeaderStatus,
          .aiOpsDomainCardHead,
          .aiOpsPanelHead,
          .aiOpsChartHead {
            flex-direction: column;
            align-items: stretch;
          }

          .aiOpsModelField {
            justify-items: stretch;
          }

          .aiOpsModelField select {
            width: 100%;
            min-width: 0;
          }

          .aiOpsChartPlot {
            grid-template-columns: 34px minmax(0, 1fr);
            gap: 8px;
          }

          .aiOpsYAxis {
            height: 220px;
            font-size: 9px;
          }

          .aiOpsBars {
            min-width: 520px;
            min-height: 220px;
            height: 220px;
          }

          .aiOpsBarGroup {
            height: 182px;
          }

          .aiOpsXAxisLabels {
            min-width: 520px;
          }

          .aiOpsTableWrap.ragFixed {
            max-height: none;
            overflow: auto;
          }

          .aiOpsLogHead,
          .aiOpsLogRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
