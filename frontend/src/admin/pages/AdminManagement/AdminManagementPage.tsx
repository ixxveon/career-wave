import { useEffect, useMemo, useState } from 'react';
import '../../styles/admin.css';

type AdminRole = 'MASTER' | 'CS' | 'BACKEND' | 'OPS' | 'BILLING' | 'AUDIT';
type AdminStatus = 'ACTIVE' | 'LOCKED';
type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';

interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  scope: string;
  ip: string;
  createdAt: string;
  lastLogin: string;
  status: AdminStatus;
}

interface AclRule {
  id: string;
  label: string;
  cidr: string;
  note: string;
  enabled: boolean;
  updatedAt: string;
}

interface AuditLog {
  id: string;
  time: string;
  actor: string;
  ip: string;
  action: string;
  target: string;
  severity: AuditSeverity;
}

interface AclDraft {
  label: string;
  cidr: string;
  note: string;
}

const ROLE_META: Record<AdminRole, { label: string; scope: string }> = {
  MASTER: { label: '마스터 관리자', scope: '전체 권한 통제' },
  CS: { label: 'CS 담당', scope: '회원 문의, 신고, 환불 1차 처리' },
  BACKEND: { label: '백엔드 개발', scope: 'API, DB, 배포, 장애 대응' },
  OPS: { label: '운영 담당', scope: '배너, 공지, 서비스 운영' },
  BILLING: { label: '정산 담당', scope: '결제, 환불, 정산 승인' },
  AUDIT: { label: '감사 담당', scope: '로그, 정책, 권한 감사' },
};

const roleColumns: AdminRole[] = ['MASTER', 'CS', 'BACKEND', 'OPS', 'BILLING', 'AUDIT'];

const initialAdmins: AdminAccount[] = [
  {
    id: 'ADM-0001',
    name: 'super_admin',
    email: 'super_admin@career-wave.com',
    role: 'MASTER',
    scope: ROLE_META.MASTER.scope,
    ip: '10.20.0.10',
    createdAt: '2026.05.01 09:30',
    lastLogin: '2026.05.22 09:12',
    status: 'ACTIVE',
  },
  {
    id: 'ADM-0002',
    name: 'cs_admin',
    email: 'cs_admin@career-wave.com',
    role: 'CS',
    scope: ROLE_META.CS.scope,
    ip: '10.20.0.21',
    createdAt: '2026.05.02 10:15',
    lastLogin: '2026.05.22 08:45',
    status: 'ACTIVE',
  },
  {
    id: 'ADM-0003',
    name: 'backend_admin',
    email: 'backend_admin@career-wave.com',
    role: 'BACKEND',
    scope: ROLE_META.BACKEND.scope,
    ip: '10.20.0.22',
    createdAt: '2026.05.03 11:20',
    lastLogin: '2026.05.21 18:10',
    status: 'ACTIVE',
  },
  {
    id: 'ADM-0004',
    name: 'ops_admin',
    email: 'ops_admin@career-wave.com',
    role: 'OPS',
    scope: ROLE_META.OPS.scope,
    ip: '10.20.0.23',
    createdAt: '2026.05.04 14:00',
    lastLogin: '2026.05.20 16:33',
    status: 'LOCKED',
  },
];

const initialAclRules: AclRule[] = [
  { id: 'ACL-001', label: '본사 사내망', cidr: '10.20.0.0/16', note: '사내 네트워크 전체 허용', enabled: true, updatedAt: '2026.05.22 08:30' },
  { id: 'ACL-002', label: '운영 VPN', cidr: '172.16.5.0/24', note: '원격 운영자 접속 허용', enabled: true, updatedAt: '2026.05.22 08:32' },
  { id: 'ACL-003', label: '점프 서버', cidr: '203.0.113.24/32', note: '배포 및 장애 대응용 고정 IP', enabled: true, updatedAt: '2026.05.22 08:34' },
];

const initialLogs: AuditLog[] = [
  { id: 'LOG-001', time: '09:12:04', actor: 'super_admin', ip: '10.20.0.10', action: '회원 강퇴 승인', target: 'member:U-1007', severity: 'WARN' },
  { id: 'LOG-002', time: '09:18:29', actor: 'backend_admin', ip: '10.20.0.22', action: 'DB 변경', target: 'settlement_table', severity: 'INFO' },
  { id: 'LOG-003', time: '09:22:51', actor: 'cs_admin', ip: '10.20.0.21', action: '환불 승인', target: 'payment:PAY-4491', severity: 'WARN' },
  { id: 'LOG-004', time: '09:31:12', actor: 'ops_admin', ip: '10.20.0.23', action: 'IP ACL 등록', target: 'ACL-002', severity: 'INFO' },
];

const formatNow = () =>
  new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

const makeId = (prefix: string, value: number) => `${prefix}-${String(value).padStart(4, '0')}`;

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState(initialAdmins);
  const [aclRules, setAclRules] = useState(initialAclRules);
  const [logs, setLogs] = useState(initialLogs);
  const [adminFilter, setAdminFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRole>('ALL');
  const [auditQuery, setAuditQuery] = useState('');
  const [auditSeverity, setAuditSeverity] = useState<'ALL' | AuditSeverity>('ALL');
  const [aclEnforced, setAclEnforced] = useState(true);
  const [aclSeed, setAclSeed] = useState(4);
  const [aclDraft, setAclDraft] = useState<AclDraft>({ label: '', cidr: '', note: '' });

  const addLog = (log: Omit<AuditLog, 'id' | 'time'>) => {
    setLogs((prev) => [{ ...log, id: `LOG-${String(Date.now()).slice(-6)}`, time: formatNow() }, ...prev].slice(0, 40));
  };

  const changeAdminRole = (id: string, role: AdminRole) => {
    setAdmins((prev) =>
      prev.map((admin) => (admin.id === id ? { ...admin, role, scope: ROLE_META[role].scope } : admin))
    );

    const target = admins.find((item) => item.id === id);
    if (target) {
      addLog({
        actor: 'super_admin',
        ip: '10.20.0.10',
        action: '권한 변경',
        target: target.id,
        severity: 'CRITICAL',
      });
    }
  };

  const toggleAdminStatus = (id: string) => {
    const target = admins.find((item) => item.id === id);
    if (!target) return;

    setAdmins((prev) =>
      prev.map((admin) =>
        admin.id === id ? { ...admin, status: admin.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' } : admin
      )
    );

    addLog({
      actor: 'super_admin',
      ip: '10.20.0.10',
      action: target.status === 'ACTIVE' ? '계정 잠금' : '계정 해제',
      target: target.id,
      severity: 'WARN',
    });
  };

  const addAclRule = () => {
    if (!aclDraft.label.trim() || !aclDraft.cidr.trim()) return;

    const nextRule: AclRule = {
      id: makeId('ACL', aclSeed),
      label: aclDraft.label.trim(),
      cidr: aclDraft.cidr.trim(),
      note: aclDraft.note.trim() || '설명 없음',
      enabled: true,
      updatedAt: formatNow(),
    };

    setAclRules((prev) => [nextRule, ...prev]);
    setAclSeed((prev) => prev + 1);
    setAclDraft({ label: '', cidr: '', note: '' });
    addLog({
      actor: 'super_admin',
      ip: '10.20.0.10',
      action: 'IP ACL 등록',
      target: nextRule.id,
      severity: 'WARN',
    });
  };

  const toggleAclRule = (id: string) => {
    const target = aclRules.find((item) => item.id === id);
    if (!target) return;

    setAclRules((prev) =>
      prev.map((rule) => (rule.id === id ? { ...rule, enabled: !rule.enabled, updatedAt: formatNow() } : rule))
    );

    addLog({
      actor: 'super_admin',
      ip: '10.20.0.10',
      action: target.enabled ? 'IP ACL 비활성화' : 'IP ACL 활성화',
      target: target.id,
      severity: 'WARN',
    });
  };

  const removeAclRule = (id: string) => {
    const target = aclRules.find((item) => item.id === id);
    if (!target) return;

    setAclRules((prev) => prev.filter((rule) => rule.id !== id));
    addLog({
      actor: 'super_admin',
      ip: '10.20.0.10',
      action: 'IP ACL 삭제',
      target: target.id,
      severity: 'CRITICAL',
    });
  };

  const addTestLog = () => {
    addLog({
      actor: 'system',
      ip: '127.0.0.1',
      action: '로그 추가',
      target: 'monitor',
      severity: 'INFO',
    });
  };

  useEffect(() => {
    const events: Array<Omit<AuditLog, 'id' | 'time'>> = [
      { actor: 'cs_admin', ip: '10.20.0.21', action: '회원 문의 처리', target: 'ticket:CS-1842', severity: 'INFO' },
      { actor: 'backend_admin', ip: '10.20.0.22', action: 'DB 변경 감지', target: 'schema:member', severity: 'WARN' },
      { actor: 'super_admin', ip: '10.20.0.10', action: '권한 검토', target: 'role:CS', severity: 'INFO' },
      { actor: 'ops_admin', ip: '10.20.0.23', action: 'IP ACL 갱신', target: 'ACL-001', severity: 'WARN' },
    ];

    let cursor = 0;
    const timer = window.setInterval(() => {
      const next = events[cursor];
      cursor = (cursor + 1) % events.length;
      setLogs((prev) => [{ ...next, id: `LOG-${String(Date.now()).slice(-6)}`, time: formatNow() }, ...prev].slice(0, 40));
    }, 8000);

    return () => window.clearInterval(timer);
  }, []);

  const filteredAdmins = useMemo(() => {
    const keyword = adminFilter.trim().toLowerCase();
    return admins.filter((admin) => {
      const matchesKeyword =
        !keyword ||
        admin.id.toLowerCase().includes(keyword) ||
        admin.name.toLowerCase().includes(keyword) ||
        admin.email.toLowerCase().includes(keyword);
      const matchesRole = roleFilter === 'ALL' || admin.role === roleFilter;
      return matchesKeyword && matchesRole;
    });
  }, [admins, adminFilter, roleFilter]);

  const filteredLogs = useMemo(() => {
    const keyword = auditQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesKeyword =
        !keyword ||
        log.actor.toLowerCase().includes(keyword) ||
        log.action.toLowerCase().includes(keyword) ||
        log.target.toLowerCase().includes(keyword) ||
        log.ip.toLowerCase().includes(keyword);
      const matchesSeverity = auditSeverity === 'ALL' || log.severity === auditSeverity;
      return matchesKeyword && matchesSeverity;
    });
  }, [logs, auditQuery, auditSeverity]);

  const totalAdmins = admins.length;
  const masterCount = admins.filter((admin) => admin.role === 'MASTER').length;
  const activeAclCount = aclRules.filter((rule) => rule.enabled).length;
  const criticalLogCount = logs.filter((log) => log.severity === 'CRITICAL').length;

  return (
    <section className="admin-managementPage">
      <header className="admin-header">
        <div>
          <h2>관리자 설정</h2>
          <p>RBAC, IP ACL, 관리자 활동 로그를 한 화면에서 관리합니다.</p>
        </div>
        <div className="amHeaderActions">
          <button className="amHeaderButton" onClick={addTestLog}>데이터 내보내기</button>
        </div>
      </header>

      <section className="amLayout">
        <div className="amLeftColumn">
          <section className="admin-card amTableCard">
            <div className="amSectionHead">
              <div>
                <h3>관리자 계정 목록 (RBAC)</h3>
                <p>관리자 계정의 권한과 상태를 관리합니다.</p>
              </div>
              <div className="amTopStats">
                <span>전체 {totalAdmins}명</span>
                <span>마스터 {masterCount}명</span>
                <span>활성 ACL {activeAclCount}개</span>
                <span>중요 로그 {criticalLogCount}건</span>
              </div>
            </div>

            <div className="amListTools">
              <input type="text" value={adminFilter} onChange={(e) => setAdminFilter(e.target.value)} placeholder="이름, 이메일 검색" />
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'ALL' | AdminRole)}>
                <option value="ALL">전체</option>
                <option value="MASTER">마스터</option>
                <option value="CS">CS</option>
                <option value="BACKEND">백엔드</option>
                <option value="OPS">운영</option>
                <option value="BILLING">정산</option>
                <option value="AUDIT">감사</option>
              </select>
            </div>

            <div className="amTableWrap">
              <table className="amCompactTable">
                <thead>
                  <tr>
                    <th>관리자 정보</th>
                    <th>권한</th>
                    <th>상태</th>
                    <th>최근 접속</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id}>
                      <td><strong>{admin.name}</strong><small>{admin.email}</small></td>
                      <td>
                        <select
                          className="amInlineSelect"
                          value={admin.role}
                          disabled={admin.role === 'MASTER'}
                          onChange={(e) => changeAdminRole(admin.id, e.target.value as AdminRole)}
                        >
                          {roleColumns.map((role) => (
                            <option key={role} value={role}>{ROLE_META[role].label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`amStatusBadge ${admin.status === 'ACTIVE' ? 'active' : 'locked'}`}>
                          {admin.status === 'ACTIVE' ? '활성' : '잠금'}
                        </span>
                      </td>
                      <td><strong>{admin.lastLogin}</strong><small>{admin.ip}</small></td>
                      <td>
                        <button className="amRowButton" onClick={() => toggleAdminStatus(admin.id)}>
                          {admin.status === 'ACTIVE' ? '잠금' : '해제'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="amPagination">
              <span>총 12건 중 1-5 표시</span>
              <div>
                <button>{'<'}</button>
                <button className="active">1</button>
                <button>2</button>
                <button>{'>'}</button>
              </div>
            </div>
          </section>
        </div>

        <aside className="amRightColumn">
          <section className="admin-card amAclCard">
            <div className="amSectionHead">
              <div>
                <h3>IP 접근 제어 (ACL)</h3>
                <p>허용된 대역에서만 `admin.itcareer.com` 접속을 허용합니다.</p>
              </div>
              <button className={`amSwitchButton ${aclEnforced ? 'on' : ''}`} onClick={() => setAclEnforced((prev) => !prev)}>
                {aclEnforced ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="amAclForm">
              <label>
                규칙명
                <input type="text" value={aclDraft.label} onChange={(e) => setAclDraft((prev) => ({ ...prev, label: e.target.value }))} placeholder="예: 본사 사내망" />
              </label>
              <label>
                IP 대역
                <input type="text" value={aclDraft.cidr} onChange={(e) => setAclDraft((prev) => ({ ...prev, cidr: e.target.value }))} placeholder="예: 10.20.0.0/16" />
              </label>
              <label>
                비고
                <input type="text" value={aclDraft.note} onChange={(e) => setAclDraft((prev) => ({ ...prev, note: e.target.value }))} placeholder="예: 사내망 전체 허용" />
              </label>
              <button className="amPrimaryButton" onClick={addAclRule}>추가</button>
            </div>

            <div className="amAclList">
              {aclRules.map((rule) => (
                <article className={`amAclRow ${rule.enabled ? 'enabled' : 'disabled'}`} key={rule.id}>
                  <div>
                    <strong>{rule.label}</strong>
                    <p>{rule.cidr}</p>
                    <span>{rule.note}</span>
                  </div>
                  <div className="amAclMeta">
                    <small>{rule.updatedAt}</small>
                    <div className="amAclButtons">
                      <button onClick={() => toggleAclRule(rule.id)}>{rule.enabled ? '비활성화' : '활성화'}</button>
                      <button onClick={() => removeAclRule(rule.id)}>삭제</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="admin-card amLiveLogCard">
        <div className="amSectionHead">
          <div>
            <h3>실시간 보안 감시 로그</h3>
            <p>관리자 활동을 콘솔형 형식으로 표시합니다.</p>
          </div>
          <button className="amHeaderButton" onClick={addTestLog}>스크롤 초기화</button>
        </div>

        <div className="amLogFilters">
          <input type="text" value={auditQuery} onChange={(e) => setAuditQuery(e.target.value)} placeholder="로그 검색" />
          <select value={auditSeverity} onChange={(e) => setAuditSeverity(e.target.value as 'ALL' | AuditSeverity)}>
            <option value="ALL">전체</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>

        <div className="amLiveLogList">
          {filteredLogs.map((log) => (
            <article className="amLogRow" key={log.id}>
              <span className="amLogTime">[{log.time}]</span>
              <span className={`amLogCode ${log.severity.toLowerCase()}`}>{log.severity}</span>
              <span className={`amLogMessage ${log.severity.toLowerCase()}`}>{log.action}</span>
              <span className="amLogTarget">{log.target}</span>
            </article>
          ))}
        </div>
      </section>

      <style>{`
        .admin-managementPage {
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: calc(100vh - 62px);
          overflow: hidden;
        }

        .amHeaderActions {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .amHeaderButton,
        .amRowButton,
        .amSwitchButton,
        .amPrimaryButton,
        .amPagination button {
          height: 34px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid #d7e4f2;
          background: white;
          color: #24496f;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
        }

        .amHeaderButton {
          background: linear-gradient(180deg, #f7fbff, #edf3f9);
        }

        .amHeaderButton:hover,
        .amRowButton:hover,
        .amSwitchButton:hover,
        .amPrimaryButton:hover,
        .amPagination button:hover {
          background: #edf3f9;
        }

        .amLayout {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) 390px;
          gap: 14px;
          align-items: stretch;
          flex: 0 0 auto;
        }

        .amLeftColumn,
        .amRightColumn {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-self: stretch;
        }

        .amTableCard,
        .amAclCard,
        .amLiveLogCard {
          padding: 14px 16px;
        }

        .amTableCard,
        .amAclCard {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .amTableWrap {
          flex: 1;
          min-height: 0;
        }

        .amSectionHead {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .amSectionHead h3 {
          margin: 0;
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.4px;
          color: #1c3e63;
        }

        .amSectionHead p {
          margin: 6px 0 0;
          font-size: 12px;
          color: #64788d;
          line-height: 1.45;
        }

        .amTopStats {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-end;
        }

        .amTopStats span {
          height: 24px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border-radius: 999px;
          background: #edf3f9;
          color: #5f7388;
          font-size: 11px;
          font-weight: 600;
        }

        .amListTools,
        .amLogFilters {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 10px;
        }

        .amListTools input,
        .amListTools select,
        .amLogFilters input,
        .amLogFilters select,
        .amAclForm input {
          height: 36px;
          border: 1px solid #d8e3ed;
          border-radius: 8px;
          padding: 0 12px;
          font-size: 13px;
          color: #23384f;
          background: white;
          font-family: inherit;
          width: 100%;
        }

        .amListTools input:focus,
        .amListTools select:focus,
        .amLogFilters input:focus,
        .amLogFilters select:focus,
        .amAclForm input:focus {
          outline: none;
          border-color: #8daeca;
        }

        .amTableWrap {
          overflow-x: auto;
        }

        .amCompactTable {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }

        .amCompactTable thead {
          background: #f6f9fc;
        }

        .amCompactTable th,
        .amCompactTable td {
          border-bottom: 1px solid #eef3f8;
        }

        .amCompactTable th {
          height: 38px;
          padding: 0 12px;
          text-align: left;
          color: #5f7388;
          font-size: 12px;
          font-weight: 700;
        }

        .amCompactTable td {
          height: 54px;
          padding: 0 12px;
          color: #23384f;
          font-size: 13px;
          vertical-align: middle;
        }

        .amCompactTable td strong {
          display: block;
          color: #1f3650;
          font-weight: 700;
        }

        .amCompactTable td small {
          display: block;
          margin-top: 2px;
          color: #7a8da4;
          font-size: 11px;
        }

        .amInlineSelect {
          height: 30px;
          width: 100%;
          border: 1px solid #d8e3ed;
          border-radius: 6px;
          padding: 0 8px;
          background: white;
          color: #23384f;
          font-family: inherit;
          font-size: 12px;
        }

        .amInlineSelect:disabled {
          background: #f7f9fc;
          color: #7a8da4;
        }

        .amStatusBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 60px;
          height: 24px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
        }

        .amStatusBadge.active {
          background: #edf7f2;
          color: #5d7b69;
        }

        .amStatusBadge.locked {
          background: #fff1f2;
          color: #9a6767;
        }

        .amRowButton {
          width: 64px;
          height: 30px;
          padding: 0 10px;
          border-radius: 8px;
          font-size: 12px;
        }

        .amPagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-top: 10px;
          color: #7a8da4;
          font-size: 12px;
        }

        .amPagination > div {
          display: flex;
          gap: 8px;
        }

        .amPagination button {
          width: 28px;
          height: 28px;
          padding: 0;
          border-radius: 7px;
          font-size: 11px;
        }

        .amPagination button.active {
          background: #24496f;
          color: white;
          border-color: #24496f;
        }

        .amSwitchButton.on {
          background: #edf7f2;
          color: #5d7b69;
          border-color: #d8e8dd;
        }

        .amAclForm {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 8px;
          align-items: end;
          margin-bottom: 10px;
        }

        .amAclForm label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #4b627d;
          font-size: 12px;
          font-weight: 600;
        }

        .amAclList,
        .amLiveLogList {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .amLiveLogList {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 10px 12px;
          background: #0d1a2b;
          border: 1px solid #1d3047;
          border-radius: 12px;
        }

        .amAclRow {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          background: #f8fbff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
        }

        .amAclRow.disabled {
          background: #fdfafa;
        }

        .amAclRow strong {
          color: #1f3650;
          font-size: 13px;
          font-weight: 700;
        }

        .amAclRow p,
        .amAclRow span {
          margin: 4px 0 0;
          color: #60758c;
          font-size: 12px;
          line-height: 1.4;
        }

        .amAclMeta {
          min-width: 128px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
          gap: 8px;
        }

        .amAclMeta small {
          color: #7a8da4;
          font-size: 11px;
        }

        .amAclButtons {
          display: flex;
          gap: 6px;
        }

        .amLogRow {
          display: grid;
          grid-template-columns: 215px 78px minmax(0, 1fr) 170px;
          gap: 10px;
          align-items: center;
          min-height: 30px;
          padding: 0 10px;
          border-bottom: 1px solid rgba(95, 122, 156, 0.18);
          background: transparent;
          color: #d8e3f0;
          font-family: Consolas, 'SFMono-Regular', Menlo, monospace;
          font-size: 12px;
          line-height: 1.4;
        }

        .amLogRow:last-child {
          border-bottom: 0;
        }

        .amLogTime {
          color: #9fb0c1;
        }

        .amLogCode {
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .amLogCode.info { color: #5fe3b8; }
        .amLogCode.warn { color: #ffcf6b; }
        .amLogCode.critical { color: #ff8c8c; }

        .amLogMessage {
          color: #d8e3f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .amLogMessage.info { color: #5fe3b8; }
        .amLogMessage.warn { color: #ffcf6b; }
        .amLogMessage.critical { color: #ff8c8c; }

        .amLogTarget {
          color: #76a8ff;
          text-align: right;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .amLiveLogCard {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, #101f33 0%, #0e1a2c 100%);
          border-color: #20344f;
          color: #d8e3f0;
        }

        .amLiveLogCard .amSectionHead h3,
        .amLiveLogCard .amSectionHead p {
          color: #e5edf7;
        }

        .amLiveLogCard .amHeaderButton {
          background: #17304d;
          color: #d8e3f0;
          border-color: #2a4568;
        }

        .amLiveLogCard .amHeaderButton:hover {
          background: #1c395c;
        }

        .amLiveLogCard .amLogFilters input,
        .amLiveLogCard .amLogFilters select {
          background: #13253d;
          border-color: #28415f;
          color: #d8e3f0;
        }

        .amLiveLogCard .amLogFilters input::placeholder {
          color: #89a1be;
        }

        @media (max-width: 1400px) {
          .amLayout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1200px) {
          .amAclForm {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 900px) {
          .amHeaderActions,
          .amSectionHead,
          .amListTools,
          .amLogFilters,
          .amAclRow,
          .amPagination {
            flex-direction: column;
            align-items: stretch;
          }

          .amTopStats {
            justify-content: flex-start;
          }

          .amListTools input,
          .amListTools select,
          .amLogFilters input,
          .amLogFilters select,
          .amAclForm input,
          .amHeaderButton,
          .amRowButton,
          .amSwitchButton,
          .amPrimaryButton {
            width: 100%;
          }

          .amAclForm {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
