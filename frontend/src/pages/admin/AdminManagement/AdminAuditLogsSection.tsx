import type { AuditLog } from './adminManagementModel';

export default function AdminAuditLogsSection(props: {
  isAdminAuditLogsLoading: boolean;
  isAdminAuditLogsError: boolean;
  auditLogsErrorMessage: string;
  filteredLogs: AuditLog[];
}) {
  const { isAdminAuditLogsLoading, isAdminAuditLogsError, auditLogsErrorMessage, filteredLogs } = props;

  return (
    <section className="admin-card amLiveLogCard">
      <div className="amSectionHead">
        <div>
          <span className="amLogEyebrow">실시간 보안 감시 로그</span>
          <h3>실시간 보안 감시 로그</h3>
          <p>관리자 활동과 보안 이벤트를 시간순으로 정리해 즉시 대응할 수 있게 보여줍니다.</p>
        </div>
        <div className="amLogLights" aria-hidden="true"><i className="red" /><i className="amber" /><i className="green" /></div>
      </div>

      <div className="amSecurityConsole">
        <div className="amSecurityConsoleHead"><span>TIMESTAMP</span><span>TYPE</span><span>USER</span><span>MESSAGE</span><span>IP</span></div>
        {isAdminAuditLogsLoading ? <div className="amDarkEmptyState">감사 로그를 불러오는 중입니다.</div> : isAdminAuditLogsError ? <div className="amDarkEmptyState">{auditLogsErrorMessage}</div> : filteredLogs.length === 0 ? <div className="amDarkEmptyState">표시할 보안 로그가 없습니다.</div> : filteredLogs.map((log) => (
          <article className="amSecurityRow" key={log.id}>
            <span className="amSecurityTime">[{log.time.split(' ')[1] ?? log.time}]</span>
            <span className={`amSecurityType ${log.severity.toLowerCase()}`}>[{log.severity}]</span>
            <span className="amSecurityUser">{log.actor}</span>
            <strong className={`amSecurityMessage ${log.severity.toLowerCase()}`}>{log.action}</strong>
            <span className="amSecurityIp">{log.ip}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
