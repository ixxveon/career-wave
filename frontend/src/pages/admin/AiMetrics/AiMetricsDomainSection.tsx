import { DOMAIN_LABELS, getAiDisplayModelName, type AiDomain, type AiDomainUsage } from '../../../api/admin/aiMetricsApi';
import type { AiMetricSummary } from '../../../api/admin/aiMetricsApi';
import { DOMAIN_CARD_ORDER, formatCost, formatLatency, formatNumber, formatPercent, getApiStateMessage, getRiskTone } from './aiMetricsPageUtils';

interface AiMetricsDomainSectionProps {
  domainUsageLoading: boolean;
  domainUsageFetching: boolean;
  domainUsageIsError: boolean;
  domainUsageError: Error | null;
  domainUsageEmpty: boolean;
  summaryLoading: boolean;
  summaryData?: AiMetricSummary;
  domainUsageByDomain: Map<AiDomain, AiDomainUsage>;
  refetchDomainUsage: () => void | Promise<unknown>;
}

export default function AiMetricsDomainSection(props: AiMetricsDomainSectionProps) {
  const { domainUsageLoading, domainUsageFetching, domainUsageIsError, domainUsageError, domainUsageEmpty, summaryLoading, summaryData, domainUsageByDomain, refetchDomainUsage } = props;

  return (
    <section className="aiOpsDomainSection" aria-label="AI 도메인 사용량">
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
                  ? '사용량이 발생하면 도메인 카드가 표시됩니다.'
                  : '최신 집계 데이터를 반영하고 있습니다.'}
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
          const modelName = usage ? getAiDisplayModelName(usage) : summaryData?.activeModelName ?? '모델 정보 없음';

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
                  <strong>{domainUsageLoading || summaryLoading ? '조회 중' : modelName}</strong>
                </div>
                <div className="aiOpsDomainRisk">
                  <span>위험도</span>
                  <strong className={getRiskTone(usage?.riskLevel)}>{usage?.riskLevel ?? '-'}</strong>
                </div>
              </div>

              <dl className="aiOpsDomainMetrics">
                <div><dt>전체 요청</dt><dd>{formatNumber(usage?.requestCount)}</dd></div>
                <div><dt>성공</dt><dd>{formatNumber(usage?.successCount)}</dd></div>
                <div><dt>실패</dt><dd>{formatNumber(usage?.failureCount)}</dd></div>
                <div><dt>실패율</dt><dd>{formatPercent(usage?.failureRate)}</dd></div>
                <div><dt>평균 응답</dt><dd>{formatLatency(usage?.averageLatencyMs)}</dd></div>
                <div><dt>입력 토큰</dt><dd>{formatNumber(usage?.inputTokens)}</dd></div>
                <div><dt>출력 토큰</dt><dd>{formatNumber(usage?.outputTokens)}</dd></div>
                <div><dt>추정 비용</dt><dd>{formatCost(usage?.estimatedCost)}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
