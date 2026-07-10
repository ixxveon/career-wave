import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/ai-metrics.css';
import MiniPagination from '../../../components/admin/MiniPagination';
import { AI_DOMAIN, AI_EVENT_SEVERITY, AI_HEALTH_STATUS, AI_METRIC_INTERVAL, AI_USAGE_RISK_LEVEL, DOMAIN_LABELS, RAG_INDEX_STATUS, aiMetricsApi, getAiDisplayModelName } from '../../../api/admin/aiMetricsApi';
import type { AiBudgetSetting, AiDomain, AiDomainUsage, AiEventSeverity, AiHealthStatus, AiHeavyUser, AiMetricLog, AiMetricSummary, AiTokenTrendPoint, AiUsageRiskLevel, PageResult, RagDocumentMetric, RagIndexStatus } from '../../../api/admin/aiMetricsApi';
import { sanitizeLogMessage } from '../../../utils/admin/aiMetricsLogSanitizer';

type Tone = 'normal' | 'warning' | 'danger';
type EventSeverity = AiEventSeverity;

const DOC_PAGE_SIZE = 3;
const MAX_RAG_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_RAG_UPLOAD_EXTENSIONS = ['pdf', 'txt', 'md'] as const;
const TEXT_RAG_UPLOAD_EXTENSIONS = ['txt', 'md'] as const;

const SUMMARY_QUERY_KEY = ['admin', 'aiMetrics', 'summary'] as const;
const DOMAIN_USAGE_QUERY_KEY = ['admin', 'aiMetrics', 'domainUsage'] as const;
const TOKEN_TREND_QUERY_KEY = ['admin', 'aiMetrics', 'tokenTrend'] as const;
const BUDGET_QUERY_KEY = ['admin', 'aiMetrics', 'budget'] as const;
const HEAVY_USERS_QUERY_KEY = ['admin', 'aiMetrics', 'heavyUsers'] as const;
const LOGS_QUERY_KEY = ['admin', 'aiMetrics', 'logs'] as const;
const RAG_DOCUMENTS_QUERY_KEY = ['admin', 'aiMetrics', 'ragDocuments'] as const;

const DOMAIN_CARD_ORDER: AiDomain[] = [AI_DOMAIN.DOCUMENT, AI_DOMAIN.INTERVIEW, AI_DOMAIN.ADMIN_CS, AI_DOMAIN.ADMIN_REPORT];

const DOMAIN_FILTER_OPTIONS: Array<{ value: 'ALL' | AiDomain; label: string }> = [
  { value: 'ALL', label: '전체 도메인' },
  { value: AI_DOMAIN.DOCUMENT, label: DOMAIN_LABELS[AI_DOMAIN.DOCUMENT] },
  { value: AI_DOMAIN.INTERVIEW, label: DOMAIN_LABELS[AI_DOMAIN.INTERVIEW] },
  { value: AI_DOMAIN.ADMIN_CS, label: DOMAIN_LABELS[AI_DOMAIN.ADMIN_CS] },
  { value: AI_DOMAIN.ADMIN_REPORT, label: DOMAIN_LABELS[AI_DOMAIN.ADMIN_REPORT] },
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

const formatLastSyncedLabel = (value?: string) => {
  if (!value?.trim() || value === '-') return '동기화 정보 없음';
  return `${formatDateTime(value)} 동기화`;
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

const getApiErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
};

export const isAllowedRagUploadFile = (file: Pick<File, 'name' | 'type'>) => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const hasAllowedExtension = ALLOWED_RAG_UPLOAD_EXTENSIONS.includes(fileExtension as (typeof ALLOWED_RAG_UPLOAD_EXTENSIONS)[number]);

  if (!hasAllowedExtension) {
    return false;
  }

  if (!file.type) {
    return true;
  }

  if (fileExtension === 'pdf') {
    return file.type === 'application/pdf';
  }

  if (TEXT_RAG_UPLOAD_EXTENSIONS.includes(fileExtension as (typeof TEXT_RAG_UPLOAD_EXTENSIONS)[number])) {
    return file.type.startsWith('text/');
  }

  return false;
};

export const getApiStateMessage = (error: unknown, fallback: string) => {
  const status = getApiErrorStatus(error);
  if (status === 401) return '로그인이 만료되어 데이터를 처리할 수 없습니다. 다시 로그인해 주세요.';
  if (status === 403) return '관리자 권한이 없어 데이터를 처리할 수 없습니다.';
  const message = getApiErrorMessage(error);
  if (typeof message === 'string' && message.trim()) return message;
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
  if (status === RAG_INDEX_STATUS.INDEXING || status === RAG_INDEX_STATUS.DELETING) return 'warning';
  return 'normal';
};

const getRagStatusLabel = (status: RagIndexStatus) => {
  if (status === RAG_INDEX_STATUS.FAILED) return '실패';
  if (status === RAG_INDEX_STATUS.INDEXING) return '인덱싱 중';
  return '동기화됨';
};

const getRagStatusDisplayLabel = (status: RagIndexStatus) => {
  if (status === RAG_INDEX_STATUS.FAILED) return '실패';
  if (status === RAG_INDEX_STATUS.INDEXING) return '인덱싱 중';
  if (status === RAG_INDEX_STATUS.DELETING) return '삭제 중';
  return '동기화됨';
};

const toneForStatus = (value: EventSeverity): Tone => {
  if (value === AI_EVENT_SEVERITY.ERROR) return 'danger';
  if (value === AI_EVENT_SEVERITY.WARN) return 'warning';
  return 'normal';
};

export default function AiMetricsPage() {
  const queryClient = useQueryClient();
  const ragUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [docQuery, setDocQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [deletingDocId, setDeletingDocId] = useState('');
  const [selectedTrendDomain, setSelectedTrendDomain] = useState<'ALL' | AiDomain>('ALL');
  const [docPage, setDocPage] = useState(1);
  const [ragUploadErrorMessage, setRagUploadErrorMessage] = useState('');
  const [ragActionErrorMessage, setRagActionErrorMessage] = useState('');
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
      const response = await aiMetricsApi.getLogs({ page: 1, size: 5 });
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
    refetchInterval: (query) => {
      const docs = query.state.data ?? [];
      return docs.some((doc) => doc.status === RAG_INDEX_STATUS.INDEXING) ? 3000 : false;
    },
  });

  const ragDocs = ragDocumentsData ?? [];
  const ragDocsEmpty = !ragDocumentsLoading && !ragDocumentsIsError && ragDocs.length === 0;

  const uploadRagDocumentMutation = useMutation<RagDocumentMetric, Error, File>({
    mutationFn: async (file) => {
      const response = await aiMetricsApi.uploadRagDocument({ file });
      if (!response.data.success) throw new Error(response.data.message ?? 'RAG 문서 업로드에 실패했습니다.');
      return response.data.data;
    },
    onMutate: () => {
      setRagActionErrorMessage('');
    },
    onSuccess: async (uploadedDocument) => {
      setDocQuery('');
      setDocPage(1);
      setSelectedDocId(uploadedDocument.documentId);
      setRagActionErrorMessage('');
      await queryClient.invalidateQueries({ queryKey: RAG_DOCUMENTS_QUERY_KEY });
    },
    onError: (error) => {
      setRagActionErrorMessage(getApiStateMessage(error, 'RAG 문서 업로드에 실패했습니다.'));
    },
  });

  const deleteRagDocumentMutation = useMutation<null, Error, string, { previousRagDocuments?: RagDocumentMetric[] }>({
    mutationFn: async (documentId) => {
      const response = await aiMetricsApi.deleteRagDocument(documentId);
      if (!response.data.success) throw new Error(response.data.message ?? 'RAG 문서 삭제에 실패했습니다.');
      return response.data.data;
    },
    onMutate: async (documentId) => {
      setRagActionErrorMessage('');
      await queryClient.cancelQueries({ queryKey: RAG_DOCUMENTS_QUERY_KEY });
      const previousRagDocuments = queryClient.getQueryData<RagDocumentMetric[]>(RAG_DOCUMENTS_QUERY_KEY);
      setDeletingDocId(documentId);
      queryClient.setQueryData<RagDocumentMetric[]>(RAG_DOCUMENTS_QUERY_KEY, (current = []) =>
        current.map((doc) =>
          doc.documentId === documentId
            ? {
                ...doc,
                status: RAG_INDEX_STATUS.DELETING,
              }
            : doc
        )
      );
      return { previousRagDocuments };
    },
    onSuccess: async (_, documentId) => {
      if (selectedDocId === documentId) {
        setSelectedDocId('');
      }
      setRagActionErrorMessage('');
      await queryClient.invalidateQueries({ queryKey: RAG_DOCUMENTS_QUERY_KEY });
    },
    onError: (error, _documentId, context) => {
      if (context?.previousRagDocuments) {
        queryClient.setQueryData(RAG_DOCUMENTS_QUERY_KEY, context.previousRagDocuments);
      }
      setRagActionErrorMessage(getApiStateMessage(error, 'RAG 문서 삭제에 실패했습니다.'));
    },
    onSettled: () => {
      setDeletingDocId('');
    },
  });

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
  const summaryLastSyncedLabel = summaryData ? formatLastSyncedLabel(summaryData.lastSyncedAt) : summaryLoading ? '요약 조회 중' : '동기화 정보 없음';
  const totalTokens = summaryData ? summaryData.totalInputTokens + summaryData.totalOutputTokens : undefined;

  const handleDownloadDocument = (doc: RagDocumentMetric) => {
    void (async () => {
      try {
        setRagActionErrorMessage('');
        const response = await aiMetricsApi.downloadRagDocument(doc.documentId);
        if (!response.data.success) throw new Error(response.data.message ?? 'RAG document download info failed.');
        const download = response.data.data;
        const anchor = document.createElement('a');
        anchor.href = download.downloadUrl;
        anchor.download = download.name;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } catch (error) {
        setRagActionErrorMessage(getApiStateMessage(error, 'RAG 문서 다운로드에 실패했습니다.'));
      }
    })();
  };

  const handleUploadButtonClick = () => {
    ragUploadInputRef.current?.click();
  };

  const handleUploadFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.trim()) {
      setRagUploadErrorMessage('업로드할 문서 파일을 다시 선택해 주세요.');
      return;
    }

    if (!isAllowedRagUploadFile(file)) {
      setRagUploadErrorMessage('PDF, TXT, MD 형식의 문서만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > MAX_RAG_UPLOAD_FILE_SIZE) {
      setRagUploadErrorMessage('업로드 가능한 최대 파일 크기인 10MB를 초과했습니다.');
      return;
    }

    setRagUploadErrorMessage('');
    await uploadRagDocumentMutation.mutateAsync(file);
  };

  const handleDeleteDocument = (documentId: string) => {
    void deleteRagDocumentMutation.mutateAsync(documentId);
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
          const modelName = usage
            ? getAiDisplayModelName(usage)
            : summaryData?.activeModelName ?? '모델 정보 없음';

          return (
            <article className="admin-card aiOpsDomainCard" key={domain}>
              <div className="aiOpsDomainCardHead">
                <div>
                  <span className="aiOpsEyebrow">{domain}</span>
                  <h3>{usage?.domainLabel ?? DOMAIN_LABELS[domain]}</h3>
                </div>
                <span className={`aiOpsDomainState ${domainUsageIsError ? 'danger' : usage ? 'normal' : 'warning'}`}>
                  {domainUsageIsError ? '연결 실패' : usage ? '연결됨' : domainUsageLoading ? '조회 중' : '데이터 없음'}
                </span>
              </div>

              <div className="aiOpsDomainModel">
                <div>
                  <span>표시 모델</span>
                  <strong>{(domainUsageLoading || summaryLoading) ? '조회 중' : modelName}</strong>
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
                <input
                  ref={ragUploadInputRef}
                  type="file"
                  className="aiOpsUploadInput"
                  accept=".pdf,.txt,.md"
                  onChange={(event) => {
                    void handleUploadFileChange(event);
                  }}
                />
                <div className="aiOpsUploadIcon">
                  <span />
                </div>
                <strong>인프라 문서 업로드</strong>
                <span>PDF, TXT, MD 최대 10MB</span>
                {ragUploadErrorMessage ? (
                  <div className="aiOpsUploadError" role="alert">
                    {ragUploadErrorMessage}
                  </div>
                ) : null}
                {ragActionErrorMessage ? (
                  <div className="aiOpsUploadError" role="alert">
                    {ragActionErrorMessage}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={handleUploadButtonClick}
                  disabled={uploadRagDocumentMutation.isPending}
                >
                  {uploadRagDocumentMutation.isPending ? '업로드 중' : '업로드 및 임베딩'}
                </button>
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
                            <span className={`aiOpsBadge ${getRagStatusTone(doc.status)}`}>
                              {doc.status === RAG_INDEX_STATUS.DELETING ? getRagStatusDisplayLabel(doc.status) : getRagStatusLabel(doc.status)}
                            </span>
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
                            <button
                              type="button"
                              className="aiOpsTextButton danger"
                              disabled={deleteRagDocumentMutation.isPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteDocument(doc.documentId);
                              }}
                            >
                              {deleteRagDocumentMutation.isPending && deletingDocId === doc.documentId ? '삭제 중' : '삭제'}
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
    </section>
  );
}
