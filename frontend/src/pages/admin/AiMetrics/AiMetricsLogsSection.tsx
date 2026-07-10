import type { AiMetricLog } from '../../../api/admin/aiMetricsApi';
import { formatDateTime, getApiStateMessage, toneForStatus } from './aiMetricsPageUtils';
import { sanitizeLogMessage } from '../../../utils/admin/aiMetricsLogSanitizer';

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
  );
}
