import type { AiMetricLog } from '../../../api/admin/aiMetricsApi';
import { formatDateTime, getApiStateMessage, toneForStatus } from './aiMetricsPageUtils';
import { sanitizeLogMessage } from '../../../utils/admin/aiMetricsLogSanitizer';

const auditToneForStatus = (value: ReturnType<typeof toneForStatus>) => {
  if (value === 'danger') return 'danger';
  if (value === 'warning') return 'warning';
  return 'info';
};

export default function AiMetricsLogsSection(props: {
  metricLogs: AiMetricLog[];
  metricLogsLoading: boolean;
  metricLogsIsError: boolean;
  metricLogsError: Error | null;
  metricLogsEmpty: boolean;
}) {
  const { metricLogs, metricLogsLoading, metricLogsIsError, metricLogsError, metricLogsEmpty } = props;

  return (
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

      <div className="auditOpsTableWrap auditOpsTableWrapFlat">
        <div className="auditOpsTableHead"><span>발생 시각</span><span>도메인</span><span>상태</span><span>행동</span><span>대상</span><span>관리자</span></div>
        <div className="auditOpsTableBody">
          {(metricLogsLoading || metricLogsIsError || metricLogsEmpty) && (
            <div className={`auditOpsEmpty ${metricLogsIsError ? 'error' : ''}`}>
              {metricLogsIsError
                ? getApiStateMessage(metricLogsError, 'AI 운영 로그 데이터를 불러오지 못했습니다.')
                : metricLogsEmpty
                  ? '표시할 AI 운영 로그가 없습니다.'
                  : 'AI 운영 로그 데이터를 불러오는 중입니다.'}
            </div>
          )}
          {metricLogs.map((event) => (
            <article key={event.eventId} className="auditOpsTableRow">
              <span className="timestamp">{formatDateTime(event.occurredAt)}</span>
              <span className="domain">{event.domainLabel}</span>
              <span className={`auditOpsTag ${auditToneForStatus(toneForStatus(event.severity))}`}>{event.severity}</span>
              <strong className="summary">{sanitizeLogMessage(event.message)}</strong>
              <span className="target">-</span>
              <span className="actor">-</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
