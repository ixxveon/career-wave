import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/ai-metrics.css';
import {
  AI_METRIC_INTERVAL,
  aiMetricsApi,
  type AiBudgetSetting,
  type AiDomain,
  type AiDomainUsage,
  type AiHeavyUser,
  type AiMetricLog,
  type AiMetricSummary,
  type AiTokenTrendPoint,
  type PageResult,
} from '../../../api/admin/aiMetricsApi';
import AiMetricsHeader from './AiMetricsHeader';
import AiMetricsDomainSection from './AiMetricsDomainSection';
import AiMetricsUsageSection from './AiMetricsUsageSection';
import AiMetricsHeavyUsersSection from './AiMetricsHeavyUsersSection';
import AiMetricsLogsSection from './AiMetricsLogsSection';
import {
  BUDGET_QUERY_KEY,
  DOMAIN_FILTER_OPTIONS,
  DOMAIN_USAGE_QUERY_KEY,
  formatCompactToken,
  formatCost,
  formatLatency,
  formatLastSyncedLabel,
  formatTrendBucket,
  getApiStateMessage,
  getHealthStatusLabel,
  HEAVY_USERS_QUERY_KEY,
  LOGS_QUERY_KEY,
  SUMMARY_QUERY_KEY,
  TOKEN_TREND_QUERY_KEY,
} from './aiMetricsPageUtils';

export { getApiStateMessage } from './aiMetricsPageUtils';

export default function AiMetricsPage() {
  const queryClient = useQueryClient();
  const [budgetDraft, setBudgetDraft] = useState('2000');
  const [thresholdDraft, setThresholdDraft] = useState('85');
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false);
  const [budgetMutationErrorMessage, setBudgetMutationErrorMessage] = useState('');
  const [selectedTrendDomain, setSelectedTrendDomain] = useState<'ALL' | AiDomain>('ALL');

  const { data: summaryData, isLoading: summaryLoading, isError: summaryIsError, error: summaryError } = useQuery<AiMetricSummary, Error>({
    queryKey: SUMMARY_QUERY_KEY,
    queryFn: async () => {
      const response = await aiMetricsApi.getSummary();
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 요약 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const { data: domainUsageData, isLoading: domainUsageLoading, isFetching: domainUsageFetching, isError: domainUsageIsError, error: domainUsageError, refetch: refetchDomainUsage } =
    useQuery<AiDomainUsage[], Error>({
      queryKey: DOMAIN_USAGE_QUERY_KEY,
      queryFn: async () => {
        const response = await aiMetricsApi.getDomainUsage();
        if (!response.data.success) throw new Error(response.data.message ?? 'AI 도메인 사용량 조회에 실패했습니다.');
        return response.data.data;
      },
    });

  const { data: tokenTrendData, isLoading: tokenTrendLoading, isError: tokenTrendIsError, error: tokenTrendError } = useQuery<AiTokenTrendPoint[], Error>({
    queryKey: [...TOKEN_TREND_QUERY_KEY, selectedTrendDomain],
    queryFn: async () => {
      const response = await aiMetricsApi.getTokenTrend({ interval: AI_METRIC_INTERVAL.HOURLY, domain: selectedTrendDomain === 'ALL' ? undefined : selectedTrendDomain });
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 토큰 추이 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const { data: budgetSetting, isLoading: budgetLoading, isError: budgetIsError, error: budgetError } = useQuery<AiBudgetSetting, Error>({
    queryKey: BUDGET_QUERY_KEY,
    queryFn: async () => {
      const response = await aiMetricsApi.getBudget();
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 예산 설정 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const { data: heavyUsersData, isLoading: heavyUsersLoading, isError: heavyUsersIsError, error: heavyUsersError } = useQuery<AiHeavyUser[], Error>({
    queryKey: HEAVY_USERS_QUERY_KEY,
    queryFn: async () => {
      const response = await aiMetricsApi.getHeavyUsers({ limit: 6 });
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 헤비 유저 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const { data: metricLogsData, isLoading: metricLogsLoading, isError: metricLogsIsError, error: metricLogsError } = useQuery<PageResult<AiMetricLog>, Error>({
    queryKey: LOGS_QUERY_KEY,
    queryFn: async () => {
      const response = await aiMetricsApi.getLogs({ page: 1, size: 5 });
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 운영 로그 조회에 실패했습니다.');
      return response.data.data;
    },
  });

  const updateBudgetMutation = useMutation<AiBudgetSetting, Error, { monthlyBudget: number; thresholdPercent: number }>({
    mutationFn: async (data) => {
      const response = await aiMetricsApi.updateBudget(data);
      if (!response.data.success) throw new Error(response.data.message ?? 'AI 예산 설정 수정에 실패했습니다.');
      return response.data.data;
    },
    onMutate: () => setBudgetMutationErrorMessage(''),
    onSuccess: (nextBudgetSetting) => {
      queryClient.setQueryData(BUDGET_QUERY_KEY, nextBudgetSetting);
      setBudgetDraft(String(nextBudgetSetting.monthlyBudget));
      setThresholdDraft(String(nextBudgetSetting.thresholdPercent));
      setBudgetEditorOpen(false);
    },
    onError: (error) => setBudgetMutationErrorMessage(getApiStateMessage(error, 'AI 예산 설정 수정에 실패했습니다.')),
  });
  const updateDiscordAlertMutation = useMutation<AiBudgetSetting, Error, boolean>({
    mutationFn: async (enabled) => {
      const response = await aiMetricsApi.updateDiscordAlert({ enabled });
      if (!response.data.success) throw new Error(response.data.message ?? '디스코드 알림 설정 수정에 실패했습니다.');
      return response.data.data;
    },
    onMutate: () => setBudgetMutationErrorMessage(''),
    onSuccess: (nextBudgetSetting) => queryClient.setQueryData(BUDGET_QUERY_KEY, nextBudgetSetting),
    onError: (error) => setBudgetMutationErrorMessage(getApiStateMessage(error, '디스코드 알림 설정 수정에 실패했습니다.')),
  });
  const updateRateLimitMutation = useMutation<AiBudgetSetting, Error, boolean>({
    mutationFn: async (enabled) => {
      const response = await aiMetricsApi.updateRateLimit({ enabled, reason: enabled ? '관리자 AI Metrics 예산 영역에서 사용량 제한을 활성화했습니다.' : '관리자 AI Metrics 예산 영역에서 사용량 제한을 해제했습니다.' });
      if (!response.data.success) throw new Error(response.data.message ?? '사용량 제한 설정 수정에 실패했습니다.');
      return response.data.data;
    },
    onMutate: () => setBudgetMutationErrorMessage(''),
    onSuccess: (nextBudgetSetting) => queryClient.setQueryData(BUDGET_QUERY_KEY, nextBudgetSetting),
    onError: (error) => setBudgetMutationErrorMessage(getApiStateMessage(error, '사용량 제한 설정 수정에 실패했습니다.')),
  });

  const domainUsageByDomain = useMemo(() => new Map((domainUsageData ?? []).map((usage) => [usage.domain, usage])), [domainUsageData]);
  const domainUsageEmpty = !domainUsageLoading && !domainUsageIsError && (domainUsageData?.length ?? 0) === 0;
  const tokenTrendChartData = useMemo(() => (tokenTrendData ?? []).map((point) => ({ bucket: point.bucket, label: formatTrendBucket(point.bucket), input: point.inputTokens, output: point.outputTokens, requestCount: point.requestCount })), [tokenTrendData]);
  const tokenTrendEmpty = !tokenTrendLoading && !tokenTrendIsError && tokenTrendChartData.length === 0;
  const selectedTrendDomainLabel = useMemo(() => DOMAIN_FILTER_OPTIONS.find((option) => option.value === selectedTrendDomain)?.label ?? '전체 도메인', [selectedTrendDomain]);
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
  const heavyUsers = heavyUsersData ?? [];
  const heavyUsersEmpty = !heavyUsersLoading && !heavyUsersIsError && heavyUsers.length === 0;
  const metricLogs = metricLogsData?.content ?? [];
  const metricLogsEmpty = !metricLogsLoading && !metricLogsIsError && metricLogs.length === 0;
  const axisMax = useMemo(() => {
    const maxValue = Math.max(0, ...tokenTrendChartData.map((item) => Math.max(item.input, item.output)));
    return maxValue <= 0 ? 1 : Math.ceil(maxValue / 10) * 10;
  }, [tokenTrendChartData]);
  const axisTicks = useMemo(() => [1, 0.75, 0.5, 0.25, 0].map((ratio) => formatCompactToken(Math.round(axisMax * ratio))), [axisMax]);
  const tokenTrendHighlightIndex = useMemo(() => tokenTrendChartData.reduce((highlightIndex, item, index, items) => (items[highlightIndex].input + items[highlightIndex].output) < (item.input + item.output) ? index : highlightIndex, 0), [tokenTrendChartData]);
  const summaryStatusLabel = summaryIsError ? getApiStateMessage(summaryError, 'AI 요약 상태를 불러오지 못했습니다.') : getHealthStatusLabel(summaryData?.healthStatus);
  const summaryLastSyncedLabel = summaryData ? formatLastSyncedLabel(summaryData.lastSyncedAt) : summaryLoading ? '요약 조회 중' : '동기화 정보 없음';
  const totalTokens = summaryData ? summaryData.totalInputTokens + summaryData.totalOutputTokens : undefined;

  function handleBudgetSave() {
    if (!isBudgetLoaded) return setBudgetMutationErrorMessage('예산 정보를 불러온 뒤 다시 시도해 주세요.');
    const nextBudget = Number(budgetDraft.replace(/,/g, '').trim());
    const nextThreshold = Number(thresholdDraft.replace(/,/g, '').trim());
    if (!Number.isFinite(nextBudget) || nextBudget < 0 || !Number.isFinite(nextThreshold) || nextThreshold < 1 || nextThreshold > 100) return;
    updateBudgetMutation.mutate({ monthlyBudget: nextBudget, thresholdPercent: nextThreshold });
  }

  return (
    <section className="aiOpsPage">
      <AiMetricsHeader
        summaryIsError={summaryIsError}
        summaryStatusLabel={summaryStatusLabel}
        summaryLastSyncedLabel={summaryLastSyncedLabel}
        summaryLoading={summaryLoading}
        averageLatencyLabel={formatLatency(summaryData?.averageLatencyMs)}
        estimatedCostLabel={formatCost(summaryData?.estimatedCost)}
        totalTokensLabel={typeof totalTokens === 'number' ? totalTokens.toLocaleString() : '-'}
      />
      <AiMetricsDomainSection
        domainUsageLoading={domainUsageLoading}
        domainUsageFetching={domainUsageFetching}
        domainUsageIsError={domainUsageIsError}
        domainUsageError={domainUsageError}
        domainUsageEmpty={domainUsageEmpty}
        summaryLoading={summaryLoading}
        summaryData={summaryData}
        domainUsageByDomain={domainUsageByDomain}
        refetchDomainUsage={refetchDomainUsage}
      />
      <section className="aiOpsBoard">
        <div className="aiOpsBoardRow aiOpsBoardTop">
          <AiMetricsUsageSection
            selectedTrendDomain={selectedTrendDomain}
            setSelectedTrendDomain={setSelectedTrendDomain}
            selectedTrendDomainLabel={selectedTrendDomainLabel}
            budgetEditorOpen={budgetEditorOpen}
            setBudgetEditorOpen={setBudgetEditorOpen}
            budgetDraft={budgetDraft}
            setBudgetDraft={setBudgetDraft}
            thresholdDraft={thresholdDraft}
            setThresholdDraft={setThresholdDraft}
            handleBudgetSave={handleBudgetSave}
            budgetMutationDisabled={budgetMutationDisabled}
            updateBudgetPending={updateBudgetMutation.isPending}
            monthlyBudget={monthlyBudget}
            thresholdPercent={thresholdPercent}
            tokenTrendLoading={tokenTrendLoading}
            tokenTrendIsError={tokenTrendIsError}
            tokenTrendError={tokenTrendError}
            tokenTrendEmpty={tokenTrendEmpty}
            axisTicks={axisTicks}
            tokenTrendChartData={tokenTrendChartData}
            tokenTrendHighlightIndex={tokenTrendHighlightIndex}
            axisMax={axisMax}
            currentSpend={currentSpend}
            budgetLoading={budgetLoading}
            budgetIsError={budgetIsError}
            budgetError={budgetError}
            isBudgetLoaded={isBudgetLoaded}
            budgetUsed={budgetUsed}
            budgetProgress={budgetProgress}
            budgetMutationErrorMessage={budgetMutationErrorMessage}
            isBudgetRisk={isBudgetRisk}
            forecastSpend={forecastSpend}
            totalTokensLabel={typeof totalTokens === 'number' ? totalTokens.toLocaleString() : '-'}
            totalTokensValue={totalTokens}
            discordAlertEnabled={discordAlertEnabled}
            handleDiscordAlertToggle={() => updateDiscordAlertMutation.mutate(!discordAlertEnabled)}
            updateDiscordAlertPending={updateDiscordAlertMutation.isPending}
            rateLimitEnabled={rateLimitEnabled}
            handleRateLimitToggle={() => updateRateLimitMutation.mutate(!rateLimitEnabled)}
            updateRateLimitPending={updateRateLimitMutation.isPending}
          />
          <AiMetricsHeavyUsersSection heavyUsers={heavyUsers} heavyUsersLoading={heavyUsersLoading} heavyUsersIsError={heavyUsersIsError} heavyUsersError={heavyUsersError} heavyUsersEmpty={heavyUsersEmpty} />
        </div>
        <div className="aiOpsBoardRow aiOpsBoardBottom">
          <AiMetricsLogsSection metricLogs={metricLogs} metricLogsLoading={metricLogsLoading} metricLogsIsError={metricLogsIsError} metricLogsError={metricLogsError} metricLogsEmpty={metricLogsEmpty} />
        </div>
      </section>
    </section>
  );
}
