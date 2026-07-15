import type { AuditLog } from './adminManagementModel';

export default function AdminAuditLogsSection(props: {
  isAdminAuditLogsLoading: boolean;
  isAdminAuditLogsError: boolean;
  isAuditLogAccessDenied: boolean;
  auditLogsErrorMessage: string;
  filteredLogs: AuditLog[];
  onRetry: () => void;
}) {
  const { isAdminAuditLogsLoading, isAdminAuditLogsError, isAuditLogAccessDenied, auditLogsErrorMessage, filteredLogs, onRetry } = props;

  return (
    <section className="admin-card amLiveLogCard">
      <div className="amSectionHead">
        <div>
          <span className="amLogEyebrow">관리자 관리 활동 로그</span>
          <h3>관리자 관리 활동 로그</h3>
          <p>관리자 계정과 IP ACL 설정 변경 이력을 최신순으로 확인합니다.</p>
        </div>
        <div className="amLogLights" aria-hidden="true"><i className="red" /><i className="amber" /><i className="green" /></div>
      </div>

      <div className="amSecurityConsole">
        <div className="amSecurityConsoleHead"><span>발생 시각</span><span>유형</span><span>관리자</span><span>활동</span><span>IP</span></div>
        {isAdminAuditLogsLoading ? <div className="amDarkEmptyState">관리자 관리 활동 로그를 불러오는 중입니다.</div> : isAdminAuditLogsError ? <div className="amDarkEmptyState"><strong>{isAuditLogAccessDenied ? '활동 로그 조회 권한이 없습니다.' : '활동 로그를 불러오지 못했습니다.'}</strong><span>{isAuditLogAccessDenied ? '권한이 있는 관리자 계정으로 다시 로그인해 주세요.' : auditLogsErrorMessage}</span>{!isAuditLogAccessDenied && <button type="button" onClick={onRetry}>다시 시도</button>}</div> : filteredLogs.length === 0 ? <div className="amDarkEmptyState">표시할 관리자 관리 활동 로그가 없습니다.</div> : filteredLogs.map((log) => (
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
