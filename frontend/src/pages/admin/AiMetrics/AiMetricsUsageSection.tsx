import type { AiDomain } from '../../../api/admin/aiMetricsApi';
import { DOMAIN_FILTER_OPTIONS, formatBudgetPercent, formatCompactToken, formatCost, getApiStateMessage } from './aiMetricsPageUtils';

interface AiMetricsUsageSectionProps {
  selectedTrendDomain: 'ALL' | AiDomain;
  setSelectedTrendDomain: (value: 'ALL' | AiDomain) => void;
  selectedTrendDomainLabel: string;
  budgetEditorOpen: boolean;
  setBudgetEditorOpen: (value: boolean) => void;
  budgetDraft: string;
  setBudgetDraft: (value: string) => void;
  thresholdDraft: string;
  setThresholdDraft: (value: string) => void;
  handleBudgetSave: () => void;
  budgetMutationDisabled: boolean;
  updateBudgetPending: boolean;
  monthlyBudget: number;
  thresholdPercent: number;
  tokenTrendLoading: boolean;
  tokenTrendIsError: boolean;
  tokenTrendError: Error | null;
  tokenTrendEmpty: boolean;
  axisTicks: string[];
  tokenTrendChartData: Array<{ bucket: string; label: string; input: number; output: number; requestCount: number }>;
  tokenTrendHighlightIndex: number;
  axisMax: number;
  currentSpend: number | null;
  budgetLoading: boolean;
  budgetIsError: boolean;
  budgetError: Error | null;
  isBudgetLoaded: boolean;
  budgetUsed: number;
  budgetProgress: number;
  budgetMutationErrorMessage: string;
  isBudgetRisk: boolean;
  forecastSpend: number | null;
  totalTokensLabel: string;
  totalTokensValue?: number;
  discordAlertEnabled: boolean;
  handleDiscordAlertToggle: () => void;
  updateDiscordAlertPending: boolean;
  rateLimitEnabled: boolean;
  handleRateLimitToggle: () => void;
  updateRateLimitPending: boolean;
}

export default function AiMetricsUsageSection(props: AiMetricsUsageSectionProps) {
  const {
    selectedTrendDomain,
    setSelectedTrendDomain,
    selectedTrendDomainLabel,
    budgetEditorOpen,
    setBudgetEditorOpen,
    budgetDraft,
    setBudgetDraft,
    thresholdDraft,
    setThresholdDraft,
    handleBudgetSave,
    budgetMutationDisabled,
    updateBudgetPending,
    monthlyBudget,
    thresholdPercent,
    tokenTrendLoading,
    tokenTrendIsError,
    tokenTrendError,
    tokenTrendEmpty,
    axisTicks,
    tokenTrendChartData,
    tokenTrendHighlightIndex,
    axisMax,
    currentSpend,
    budgetLoading,
    budgetIsError,
    budgetError,
    isBudgetLoaded,
    budgetUsed,
    budgetProgress,
    budgetMutationErrorMessage,
    isBudgetRisk,
    forecastSpend,
    totalTokensLabel,
    totalTokensValue,
    discordAlertEnabled,
    handleDiscordAlertToggle,
    updateDiscordAlertPending,
    rateLimitEnabled,
    handleRateLimitToggle,
    updateRateLimitPending,
  } = props;

  return (
    <section className="admin-card aiOpsUsageCard">
      <div className="aiOpsPanelHead">
        <div>
          <span className="aiOpsEyebrow">LLM API 토큰 추이</span>
          <h3>{selectedTrendDomainLabel}</h3>
        </div>
        <label className="aiOpsModelField">
          <span>도메인 필터</span>
          <select value={selectedTrendDomain} onChange={(event) => setSelectedTrendDomain(event.target.value as 'ALL' | AiDomain)}>
            {DOMAIN_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
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
                        <input type="text" value={budgetDraft} onChange={(event) => setBudgetDraft(event.target.value.replace(/[^\d,]/g, ''))} aria-label="총 예산 입력" />
                      </label>
                      <label>
                        <span>임계치</span>
                        <input type="text" value={thresholdDraft} onChange={(event) => setThresholdDraft(event.target.value.replace(/[^\d]/g, ''))} aria-label="임계치 입력" />
                      </label>
                    </div>
                    <button type="button" className="aiOpsBudgetButton primary" onClick={handleBudgetSave} disabled={budgetMutationDisabled || updateBudgetPending}>
                      {updateBudgetPending ? '저장 중' : '저장'}
                    </button>
                    <button type="button" className="aiOpsBudgetButton" disabled={updateBudgetPending} onClick={() => { setBudgetDraft(String(monthlyBudget || '')); setThresholdDraft(String(thresholdPercent || '')); setBudgetEditorOpen(false); }}>
                      취소
                    </button>
                  </>
                ) : (
                  <button type="button" className="aiOpsBudgetButton" disabled={budgetMutationDisabled} onClick={() => { setBudgetDraft(String(monthlyBudget || '')); setThresholdDraft(String(thresholdPercent || '')); setBudgetEditorOpen(true); }}>
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

            <div className="aiOpsYAxis">{axisTicks.map((tick) => <span key={tick}>{tick}</span>)}</div>

            <div className="aiOpsChartPanel">
              <div className="aiOpsBars">
                {tokenTrendChartData.map((item, index) => {
                  const tone = index === tokenTrendHighlightIndex ? 'strong' : 'soft';
                  return (
                    <div className="aiOpsBarItem" key={item.bucket}>
                      <div className="aiOpsBarGroup" data-tooltip={`입력 ${formatCompactToken(item.input)} | 출력 ${formatCompactToken(item.output)} | 요청 ${item.requestCount.toLocaleString()}건`}>
                        <div className={`aiOpsBar input tone-${tone}`} style={{ height: `${(item.input / axisMax) * 100}%` }} />
                        <div className={`aiOpsBar output tone-${tone}`} style={{ height: `${(item.output / axisMax) * 100}%` }} />
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

            <div className="aiOpsProgress"><div style={{ width: `${budgetProgress}%` }} /></div>

            {budgetMutationErrorMessage ? <div className="aiOpsBudgetError" role="alert">{budgetMutationErrorMessage}</div> : null}

            <div className={`aiOpsStatusBadge ${isBudgetRisk ? 'danger' : 'stable'}`}>
              <span />
              {isBudgetRisk ? '위험' : '안정'}
            </div>

            <div className="aiOpsBudgetFacts">
              <div><span>예상 비용</span><strong>{budgetLoading ? '조회 중' : formatCost(forecastSpend)}</strong></div>
              <div><span>임계치</span><strong>{thresholdPercent > 0 ? `${thresholdPercent}%` : '-'}</strong></div>
              <div><span>전체 토큰</span><strong>{typeof totalTokensValue === 'number' ? formatCompactToken(totalTokensValue) : totalTokensLabel}</strong></div>
            </div>

            <div className="aiOpsAlertCard">
              <div className="aiOpsAlertHead">
                <div><strong>디스코드 알림</strong><span>{discordAlertEnabled ? '켜짐' : '꺼짐'}</span></div>
                <button type="button" className={`aiOpsSwitch compact ${discordAlertEnabled ? 'active' : ''}`} onClick={handleDiscordAlertToggle} disabled={budgetMutationDisabled || updateDiscordAlertPending} aria-label="디스코드 알림 토글">
                  <i />
                </button>
              </div>
              <div className="aiOpsThreshold"><span>임계치</span><strong>{thresholdPercent > 0 ? `${thresholdPercent}%` : '-'}</strong></div>
            </div>

            <button type="button" className={`aiOpsDangerButton ${rateLimitEnabled || isBudgetRisk ? 'danger' : 'neutral'}`} onClick={handleRateLimitToggle} disabled={budgetMutationDisabled || updateRateLimitPending}>
              {updateRateLimitPending ? '처리 중' : rateLimitEnabled ? '사용량 제한 해제' : isBudgetRisk ? '긴급 제한' : '한도 제한 제어'}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
