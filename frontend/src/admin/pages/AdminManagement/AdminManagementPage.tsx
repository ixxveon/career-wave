import { useEffect, useMemo, useState } from 'react';
import { LockKeyhole, Network, ShieldCheck, UserCheck } from 'lucide-react';
import '../../styles/admin.css';
import MiniPagination from '../../components/MiniPagination';

type AdminRole = 'MASTER' | 'CS' | 'BACKEND' | 'OPS' | 'BILLING' | 'AUDIT';
type AdminStatus = 'ACTIVE' | 'LOCKED';
type AuditSeverity = 'INFO' | 'WARN' | 'ERROR';

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
  MASTER: { label: '마스터 관리자', scope: '전체 권한 통제 및 보안 승인' },
  CS: { label: 'CS 담당', scope: '회원 문의, 신고, 1차 조치' },
  BACKEND: { label: '백엔드 개발', scope: 'API, DB, 배포, 장애 대응' },
  OPS: { label: '운영 담당', scope: '공지, 배너, 서비스 운영' },
  BILLING: { label: '정산 담당', scope: '결제, 환불, 정산 확인' },
  AUDIT: { label: '감사 담당', scope: '로그, 정책, 권한 감사' },
};

const roleColumns: AdminRole[] = ['MASTER', 'CS', 'BACKEND', 'OPS', 'BILLING', 'AUDIT'];
const MAX_SECURITY_LOGS = 5;

const initialAdmins: AdminAccount[] = [
  {
    id: 'ADM-0001',
    name: 'super_admin',
    email: 'super_admin@career-wave.com',
    role: 'MASTER',
    scope: ROLE_META.MASTER.scope,
    ip: '10.20.0.10',
    createdAt: '2026.05.01 09:30:00',
    lastLogin: '2026.05.25 09:12:00',
    status: 'ACTIVE',
  },
  {
    id: 'ADM-0002',
    name: 'cs_admin',
    email: 'cs_admin@career-wave.com',
    role: 'CS',
    scope: ROLE_META.CS.scope,
    ip: '10.20.0.21',
    createdAt: '2026.05.02 10:15:00',
    lastLogin: '2026.05.25 08:45:00',
    status: 'ACTIVE',
  },
  {
    id: 'ADM-0003',
    name: 'backend_admin',
    email: 'backend_admin@career-wave.com',
    role: 'BACKEND',
    scope: ROLE_META.BACKEND.scope,
    ip: '10.20.0.22',
    createdAt: '2026.05.03 11:20:00',
    lastLogin: '2026.05.24 18:10:00',
    status: 'ACTIVE',
  },
  {
    id: 'ADM-0004',
    name: 'ops_admin',
    email: 'ops_admin@career-wave.com',
    role: 'OPS',
    scope: ROLE_META.OPS.scope,
    ip: '10.20.0.23',
    createdAt: '2026.05.04 14:00:00',
    lastLogin: '2026.05.23 16:33:00',
    status: 'LOCKED',
  },
  {
    id: 'ADM-0005',
    name: 'audit_admin',
    email: 'audit_admin@career-wave.com',
    role: 'AUDIT',
    scope: ROLE_META.AUDIT.scope,
    ip: '10.20.10.8',
    createdAt: '2026.05.05 13:05:00',
    lastLogin: '2026.05.25 07:58:00',
    status: 'ACTIVE',
  },
];

const initialAclRules: AclRule[] = [
  {
    id: 'ACL-001',
    label: '본사 사내망',
    cidr: '10.20.0.0/16',
    note: '사내 네트워크 전체 허용',
    enabled: true,
    updatedAt: '2026.05.25 08:30:00',
  },
  {
    id: 'ACL-002',
    label: '운영 VPN',
    cidr: '172.16.5.0/24',
    note: '원격 운영자 접속 허용',
    enabled: true,
    updatedAt: '2026.05.25 08:32:00',
  },
  {
    id: 'ACL-003',
    label: '점프 서버',
    cidr: '203.0.113.24/32',
    note: '배포 및 장애 대응용 고정 IP',
    enabled: true,
    updatedAt: '2026.05.25 08:34:00',
  },
];

export const initialLogs: AuditLog[] = [
  {
    id: 'LOG-001',
    time: '2026.05.25 14:29:12',
    actor: 'super_admin',
    ip: '10.20.0.10',
    action: '권한 변경 승인',
    target: 'member:U-1007 / role:CS',
    severity: 'WARN',
  },
  {
    id: 'LOG-002',
    time: '2026.05.25 14:22:49',
    actor: 'backend_admin',
    ip: '10.20.0.22',
    action: 'DB 변경 감지',
    target: 'schema:member',
    severity: 'ERROR',
  },
  {
    id: 'LOG-003',
    time: '2026.05.25 14:18:27',
    actor: 'cs_admin',
    ip: '10.20.0.21',
    action: '회원 문의 처리',
    target: 'ticket:CS-1842',
    severity: 'INFO',
  },
  {
    id: 'LOG-004',
    time: '2026.05.25 14:12:08',
    actor: 'ops_admin',
    ip: '10.20.0.23',
    action: 'IP ACL 갱신',
    target: 'ACL-002',
    severity: 'WARN',
  },
  {
    id: 'LOG-005',
    time: '2026.05.25 13:58:41',
    actor: 'audit_admin',
    ip: '10.20.10.8',
    action: '감사 정책 검토',
    target: 'policy:admin-access',
    severity: 'INFO',
  },
];

const formatNow = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
};

const makeId = (prefix: string, value: number) => `${prefix}-${String(value).padStart(4, '0')}`;

const splitDateTime = (value: string) => {
  const [date = '', time = ''] = value.split(' ');
  return { date, time };
};

const getAclRiskMeta = (cidr: string) => {
  const size = Number(cidr.split('/')[1] ?? 32);

  if (size === 32) {
    return { label: '고정 IP', tone: 'low' as const };
  }

  if (size === 24) {
    return { label: '제한 대역', tone: 'medium' as const };
  }

  return { label: '넓은 대역', tone: 'high' as const };
};

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState(initialAdmins);
  const [aclRules, setAclRules] = useState(initialAclRules);
  const [logs, setLogs] = useState(initialLogs);
  const [adminFilter, setAdminFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRole>('ALL');
  const [auditActor, setAuditActor] = useState<string>('ALL');
  const [aclEnforced, setAclEnforced] = useState(true);
  const [aclSeed, setAclSeed] = useState(4);
  const [aclPage, setAclPage] = useState(1);
  const [aclDraft, setAclDraft] = useState<AclDraft>({ label: '', cidr: '', note: '' });

  const addLog = (log: Omit<AuditLog, 'id' | 'time'>) => {
    setLogs((prev) => [{ ...log, id: makeId('LOG', prev.length + 1), time: formatNow() }, ...prev].slice(0, MAX_SECURITY_LOGS));
  };

  const changeAdminRole = (id: string, role: AdminRole) => {
    setAdmins((prev) =>
      prev.map((admin) => (admin.id === id ? { ...admin, role, scope: ROLE_META[role].scope } : admin))
    );

    addLog({
      actor: 'super_admin',
      ip: '10.20.0.10',
      action: '권한 변경',
      target: `${id} / ${ROLE_META[role].label}`,
      severity: 'WARN',
    });
  };

  const toggleAdminStatus = (id: string) => {
    const target = admins.find((item) => item.id === id);
    if (!target) return;

    const nextStatus = target.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';

    setAdmins((prev) => prev.map((admin) => (admin.id === id ? { ...admin, status: nextStatus } : admin)));

    addLog({
      actor: 'super_admin',
      ip: '10.20.0.10',
      action: nextStatus === 'LOCKED' ? '계정 잠금' : '계정 잠금 해제',
      target: target.id,
      severity: nextStatus === 'LOCKED' ? 'WARN' : 'INFO',
    });
  };

  const openAdminDetail = (admin: AdminAccount) => {
    addLog({
      actor: 'super_admin',
      ip: '10.20.0.10',
      action: '관리자 상세 조회',
      target: admin.id,
      severity: 'INFO',
    });
  };

  const openAdminActivity = (admin: AdminAccount) => {
    setAuditActor(admin.name);
    addLog({
      actor: 'super_admin',
      ip: '10.20.0.10',
      action: '관리자 활동 로그 조회',
      target: admin.id,
      severity: 'INFO',
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
    setAclPage(1);
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
      severity: target.enabled ? 'WARN' : 'INFO',
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
      severity: 'ERROR',
    });
  };

  useEffect(() => {
    const events: Array<Omit<AuditLog, 'id' | 'time'>> = [
      { actor: 'cs_admin', ip: '10.20.0.21', action: '회원 문의 처리', target: 'ticket:CS-1842', severity: 'INFO' },
      { actor: 'backend_admin', ip: '10.20.0.22', action: 'DB 변경 감지', target: 'schema:member', severity: 'ERROR' },
      { actor: 'super_admin', ip: '10.20.0.10', action: '권한 검토', target: 'role:CS', severity: 'INFO' },
      { actor: 'ops_admin', ip: '10.20.0.23', action: 'IP ACL 갱신', target: 'ACL-001', severity: 'WARN' },
    ];

    let cursor = 0;
    const timer = window.setInterval(() => {
      const next = events[cursor];
      cursor = (cursor + 1) % events.length;
      setLogs((prev) => [{ ...next, id: makeId('LOG', prev.length + 1), time: formatNow() }, ...prev].slice(0, MAX_SECURITY_LOGS));
    }, 8000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(aclRules.length / 3));
    if (aclPage > nextTotalPages) {
      setAclPage(nextTotalPages);
    }
  }, [aclPage, aclRules.length]);

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
    return logs.filter((log) => {
      const matchesActor = auditActor === 'ALL' || log.actor === auditActor;
      return matchesActor;
    });
  }, [auditActor, logs]);

  const totalAdmins = admins.length;
  const activeAdminCount = admins.filter((admin) => admin.status === 'ACTIVE').length;
  const lockedAdminCount = admins.filter((admin) => admin.status === 'LOCKED').length;
  const activeAclCount = aclRules.filter((rule) => rule.enabled).length;
  const aclPageSize = 3;
  const aclTotalPages = Math.max(1, Math.ceil(aclRules.length / aclPageSize));
  const safeAclPage = Math.min(aclPage, aclTotalPages);
  const pagedAclRules = aclRules.slice((safeAclPage - 1) * aclPageSize, safeAclPage * aclPageSize);

  const kpiItems = [
    { label: '전체 관리자', value: totalAdmins, desc: '등록된 관리자 계정', tone: 'kpi-blue', Icon: ShieldCheck },
    { label: '활성 관리자', value: activeAdminCount, desc: '즉시 접근 가능', tone: 'kpi-green', Icon: UserCheck },
    { label: '활성 ACL', value: activeAclCount, desc: '접근 허용 정책', tone: 'kpi-purple', Icon: Network },
    { label: '잠긴 계정', value: lockedAdminCount, desc: '보안 확인 필요', tone: 'kpi-yellow', Icon: LockKeyhole },
  ];

  return (
    <section className="admin-managementPage">
      <header className="admin-header">
        <div>
          <h2>관리자 설정</h2>
          <p>RBAC, IP ACL, 관리자 활동 로그를 한 화면에서 관리합니다.</p>
        </div>
      </header>

      <section className="amOverviewGrid">
        {kpiItems.map((item) => (
          <article className={`admin-card amKpiCard ${item.tone}`} key={item.label}>
            <div className="amKpiContent">
              <p>{item.label}</p>
              <h3>{item.value.toLocaleString()}</h3>
              <span>{item.desc}</span>
            </div>
            <div className={`amKpiIcon ${item.tone}`}>
              <item.Icon size={26} />
            </div>
          </article>
        ))}
      </section>

      <section className="amLayout">
        <div className="amLeftColumn">
          <section className="admin-card amTableCard">
            <div className="amSectionHead">
              <div>
                <h3>관리자 계정 목록 (RBAC)</h3>
                <p>권한, 상태, 최근 접속 이력을 한 번에 비교할 수 있도록 정리했습니다.</p>
              </div>
            </div>

            <div className="amToolbar">
              <div className="amToolbarField search">
                <span className="amToolbarLabel">검색</span>
                <input
                  type="text"
                  value={adminFilter}
                  onChange={(e) => setAdminFilter(e.target.value)}
                  placeholder="이름, 이메일, 관리자 ID 검색"
                />
              </div>
              <div className="amToolbarField select">
                <span className="amToolbarLabel">권한 필터</span>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'ALL' | AdminRole)}>
                  <option value="ALL">전체 권한</option>
                  {roleColumns.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_META[role].label}
                    </option>
                  ))}
                </select>
              </div>
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
                  {filteredAdmins.length === 0 ? (
                    <tr>
                      <td className="amEmptyCell" colSpan={5}>
                        관리자 검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredAdmins.map((admin) => {
                      const { date, time } = splitDateTime(admin.lastLogin);

                      return (
                        <tr key={admin.id}>
                          <td>
                            <strong>{admin.name}</strong>
                            <small>{admin.email}</small>
                            <small>{admin.id}</small>
                          </td>
                          <td>
                            <select
                              className="amInlineSelect"
                              value={admin.role}
                              disabled={admin.role === 'MASTER'}
                              onChange={(e) => changeAdminRole(admin.id, e.target.value as AdminRole)}
                            >
                              {roleColumns.map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_META[role].label}
                                </option>
                              ))}
                            </select>
                            <small>{admin.scope}</small>
                          </td>
                          <td>
                            <span className={`amStatusBadge ${admin.status === 'ACTIVE' ? 'active' : 'locked'}`}>
                              {admin.status === 'ACTIVE' ? '활성' : '잠금'}
                            </span>
                          </td>
                          <td>
                            <strong>{time}</strong>
                            <small>{date}</small>
                            <small>{admin.ip}</small>
                          </td>
                          <td>
                            <div className="amRowActions">
                              <button className="amRowButton" type="button" onClick={() => toggleAdminStatus(admin.id)}>
                                {admin.status === 'ACTIVE' ? '잠금' : '해제'}
                              </button>
                              <button className="amRowButton subtle" type="button" onClick={() => openAdminDetail(admin)}>
                                상세
                              </button>
                              <button className="amRowButton subtle" type="button" onClick={() => openAdminActivity(admin)}>
                                활동 로그
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="amPagination">
              <span>총 12건 중 1-5 표시</span>
              <div>
                <button type="button">{'<'}</button>
                <button className="active" type="button">
                  1
                </button>
                <button type="button">2</button>
                <button type="button">{'>'}</button>
              </div>
            </div>
          </section>
        </div>

        <aside className="amRightColumn">
          <section className="admin-card amAclCard">
            <div className="amSectionHead">
              <div>
                <h3>IP 접근 제어 (ACL)</h3>
                <p>허용된 대역에서만 `admin.itcareer.com` 접근을 허용합니다.</p>
              </div>
              <button
                className={`amToggle ${aclEnforced ? 'on' : 'off'}`}
                type="button"
                onClick={() => setAclEnforced((prev) => !prev)}
              >
                <span className="amToggleKnob" />
                <span>{aclEnforced ? '보호 중' : '중지됨'}</span>
              </button>
            </div>

            <div className="amAclForm">
              <label>
                규칙명
                <input
                  type="text"
                  value={aclDraft.label}
                  onChange={(e) => setAclDraft((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="예: 본사 사내망"
                />
              </label>
              <label>
                IP 대역
                <input
                  type="text"
                  value={aclDraft.cidr}
                  onChange={(e) => setAclDraft((prev) => ({ ...prev, cidr: e.target.value }))}
                  placeholder="예: 10.20.0.0/16"
                />
              </label>
              <label>
                설명
                <input
                  type="text"
                  value={aclDraft.note}
                  onChange={(e) => setAclDraft((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="예: 사내 네트워크 전체 허용"
                />
              </label>
              <button className="amPrimaryButton" type="button" onClick={addAclRule}>
                추가
              </button>
            </div>

            <div className="amAclList">
              {aclRules.length === 0 ? (
                <div className="amEmptyState">등록된 ACL 규칙이 없습니다.</div>
              ) : (
                pagedAclRules.map((rule) => {
                  const riskMeta = getAclRiskMeta(rule.cidr);

                  return (
                    <article className={`amAclRow ${rule.enabled ? 'enabled' : 'disabled'}`} key={rule.id}>
                      <div className="amAclMain">
                        <div className="amAclTitleRow">
                          <strong>{rule.label}</strong>
                          <span className={`amRiskBadge ${riskMeta.tone}`}>{riskMeta.label}</span>
                          <span className={`amStateDot ${rule.enabled ? 'enabled' : 'disabled'}`}>
                            {rule.enabled ? '활성' : '비활성'}
                          </span>
                        </div>
                        <p className="amAclCidr">{rule.cidr}</p>
                        <span>{rule.note}</span>
                      </div>
                      <div className="amAclMeta">
                        <small>수정 {rule.updatedAt}</small>
                        <div className="amAclButtons">
                          <button className="amGhostButton" type="button" onClick={() => toggleAclRule(rule.id)}>
                            {rule.enabled ? '비활성화' : '활성화'}
                          </button>
                          <button className="amDangerButton" type="button" onClick={() => removeAclRule(rule.id)}>
                            삭제
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {aclRules.length > 0 && (
              <div className="amPagination amAclPagination">
                <span>
                  총 {aclRules.length}건 중 {(safeAclPage - 1) * aclPageSize + 1}-{Math.min(safeAclPage * aclPageSize, aclRules.length)} 표시
                </span>
                <div>
                  <MiniPagination page={safeAclPage} totalPages={aclTotalPages} onChange={setAclPage} />
                </div>
              </div>
            )}
          </section>
        </aside>
      </section>

      <section className="admin-card amLiveLogCard">
        <div className="amSectionHead">
          <div>
            <span className="amLogEyebrow">실시간 보안 감시 로그</span>
            <h3>실시간 보안 감시 로그</h3>
            <p>관리자 활동과 보안 이벤트를 시간순으로 정리해 즉시 대응할 수 있게 보여줍니다.</p>
          </div>
          <div className="amLogLights" aria-hidden="true">
            <i className="red" />
            <i className="amber" />
            <i className="green" />
          </div>
        </div>

        <div className="amSecurityConsole">
          <div className="amSecurityConsoleHead">
            <span>TIMESTAMP</span>
            <span>TYPE</span>
            <span>USER</span>
            <span>MESSAGE</span>
            <span>IP</span>
          </div>
          {filteredLogs.length === 0 ? (
            <div className="amDarkEmptyState">표시할 보안 로그가 없습니다.</div>
          ) : (
            filteredLogs.map((log) => {
              return (
                <article className="amSecurityRow" key={log.id}>
                  <span className="amSecurityTime">[{log.time.split(' ')[1] ?? log.time}]</span>
                  <span className={`amSecurityType ${log.severity.toLowerCase()}`}>[{log.severity}]</span>
                  <span className="amSecurityUser">{log.actor}</span>
                  <strong className={`amSecurityMessage ${log.severity.toLowerCase()}`}>{log.action}</strong>
                  <span className="amSecurityIp">{log.ip}</span>
                </article>
              );
            })
          )}
        </div>
      </section>

      <style>{`
        .admin-managementPage {
          --am-primary: #163554;
          --am-primary-strong: #0f2740;
          --am-accent: #3f79bd;
          --am-accent-soft: #edf4fd;
          --am-border: #d7e4f2;
          --am-border-strong: #c8d8ea;
          --am-text: #1d3551;
          --am-text-soft: #647b95;
          --am-success: #5e7d6f;
          --am-success-bg: #edf5f0;
          --am-warning: #9a7234;
          --am-warning-bg: #fbf4e6;
          --am-danger: #996767;
          --am-danger-bg: #fbeff0;
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-height: calc(100vh - 62px);
          padding-bottom: 20px;
        }

        .amOverviewGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .amKpiCard {
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 22px;
          border-radius: 16px;
          border: 1px solid var(--am-border);
          box-shadow: 0 8px 24px rgba(30, 60, 90, 0.04);
        }

        .amKpiContent {
          flex: 1;
          min-width: 0;
        }

        .amKpiContent p {
          margin: 0 0 8px;
          font-size: 14px;
          font-weight: 800;
        }

        .amKpiContent h3 {
          margin: 0;
          font-size: 34px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -0.06em;
        }

        .amKpiContent span {
          display: block;
          margin-top: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        .amKpiIcon {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: none;
        }

        .amKpiCard.kpi-blue {
          background: linear-gradient(135deg, #daeaf8 0%, #ecf4fc 100%);
          border-color: #bfd5ed;
        }

        .amKpiCard.kpi-green {
          background: linear-gradient(135deg, #d4eee3 0%, #e9f6ef 100%);
          border-color: #b5dac7;
        }

        .amKpiCard.kpi-purple {
          background: linear-gradient(135deg, #e0d5f2 0%, #ede9f8 100%);
          border-color: #c8bde8;
        }

        .amKpiCard.kpi-yellow {
          background: linear-gradient(135deg, #fde9cf 0%, #fef4e5 100%);
          border-color: #f0d0a4;
        }

        .amKpiCard.kpi-blue .amKpiContent p,
        .amKpiIcon.kpi-blue {
          color: #2d5f8e;
        }

        .amKpiCard.kpi-blue .amKpiContent h3 {
          color: #1a3d5e;
        }

        .amKpiCard.kpi-blue .amKpiContent span {
          color: #4a7299;
        }

        .amKpiCard.kpi-green .amKpiContent p,
        .amKpiIcon.kpi-green {
          color: #2c6e4f;
        }

        .amKpiCard.kpi-green .amKpiContent h3 {
          color: #1a4a34;
        }

        .amKpiCard.kpi-green .amKpiContent span {
          color: #3d7a5f;
        }

        .amKpiCard.kpi-purple .amKpiContent p,
        .amKpiIcon.kpi-purple {
          color: #5c4d85;
        }

        .amKpiCard.kpi-purple .amKpiContent h3 {
          color: #3d3260;
        }

        .amKpiCard.kpi-purple .amKpiContent span {
          color: #6b5a96;
        }

        .amKpiCard.kpi-yellow .amKpiContent p,
        .amKpiIcon.kpi-yellow {
          color: #8a5a20;
        }

        .amKpiCard.kpi-yellow .amKpiContent h3 {
          color: #5e3d10;
        }

        .amKpiCard.kpi-yellow .amKpiContent span {
          color: #9e6c2a;
        }

        .amKpiIcon.kpi-blue {
          background: rgba(58, 114, 178, 0.16);
        }

        .amKpiIcon.kpi-green {
          background: rgba(45, 110, 79, 0.16);
        }

        .amKpiIcon.kpi-purple {
          background: rgba(92, 77, 133, 0.16);
        }

        .amKpiIcon.kpi-yellow {
          background: rgba(155, 117, 53, 0.16);
        }

        .amHeaderButton,
        .amRowButton,
        .amPrimaryButton,
        .amPagination button,
        .amGhostButton,
        .amDangerButton {
          height: 36px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid var(--am-border);
          background: #fff;
          color: var(--am-primary);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease,
            transform 0.18s ease;
        }

        .amHeaderButton:hover,
        .amRowButton:hover,
        .amPrimaryButton:hover,
        .amPagination button:hover,
        .amGhostButton:hover,
        .amDangerButton:hover {
          background: #eef4fb;
          border-color: #b7cee4;
        }

        .amHeaderButton:focus-visible,
        .amRowButton:focus-visible,
        .amPrimaryButton:focus-visible,
        .amPagination button:focus-visible,
        .amGhostButton:focus-visible,
        .amDangerButton:focus-visible,
        .amToolbar input:focus,
        .amToolbar select:focus,
        .amAclForm input:focus,
        .amLogToolbar input:focus,
        .amLogToolbar select:focus,
        .amInlineSelect:focus {
          outline: none;
          border-color: #7ea8d7;
          box-shadow: 0 0 0 3px rgba(79, 131, 194, 0.14);
        }

        .amRowButton:disabled,
        .amPrimaryButton:disabled,
        .amGhostButton:disabled,
        .amDangerButton:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .amPrimaryButton {
          background: var(--am-primary);
          border-color: var(--am-primary);
          color: #f5f9ff;
        }

        .amPrimaryButton:hover {
          background: var(--am-primary-strong);
          border-color: var(--am-primary-strong);
        }

        .amGhostButton {
          background: #f6f9fd;
        }

        .amDangerButton {
          border-color: #ebd2d6;
          color: #8b6067;
          background: #fff7f8;
        }

        .amDangerButton:hover {
          background: #faeef0;
          border-color: #e2bfc5;
        }

        .amLayout {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) 400px;
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
          padding: 16px 18px;
          border-radius: 16px;
          border: 1px solid var(--am-border);
          box-shadow: 0 12px 28px rgba(17, 42, 69, 0.06);
        }

        .amTableCard,
        .amAclCard {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 100%;
        }

        .amSectionHead {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .amSectionHead h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--am-primary);
        }

        .amSectionHead p {
          margin: 6px 0 0;
          font-size: 12px;
          color: var(--am-text-soft);
          line-height: 1.5;
        }

        .amToolbar {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(220px, 0.8fr);
          gap: 12px;
          align-items: end;
        }

        .amToolbarField,
        .amAclForm label {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .amToolbarLabel {
          color: var(--am-text-soft);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .amToolbar input,
        .amToolbar select,
        .amAclForm input,
        .amLogToolbar input,
        .amLogToolbar select,
        .amInlineSelect {
          height: 38px;
          border: 1px solid var(--am-border);
          border-radius: 10px;
          padding: 0 12px;
          font-size: 13px;
          color: var(--am-text);
          background: #fff;
          font-family: inherit;
          width: 100%;
        }

        .amTableWrap {
          overflow-x: auto;
          border-radius: 12px;
          border: 1px solid #e5edf6;
          background: #fff;
        }

        .amCompactTable {
          width: 100%;
          border-collapse: collapse;
          min-width: 980px;
        }

        .amCompactTable thead {
          background: #f6f9fc;
        }

        .amCompactTable th,
        .amCompactTable td {
          border-bottom: 1px solid #edf2f7;
        }

        .amCompactTable th {
          padding: 14px 14px;
          text-align: left;
          color: #68819b;
          font-size: 12px;
          font-weight: 800;
        }

        .amCompactTable td {
          padding: 14px 14px;
          color: var(--am-text);
          font-size: 13px;
          vertical-align: middle;
          background: #fff;
          transition: background-color 0.18s ease;
        }

        .amCompactTable tbody tr:hover td {
          background: #f8fbff;
        }

        .amCompactTable td strong {
          display: block;
          color: var(--am-primary);
          font-weight: 800;
        }

        .amCompactTable td small {
          display: block;
          margin-top: 3px;
          color: #7f93a8;
          font-size: 11px;
          line-height: 1.45;
        }

        .amStatusBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 64px;
          height: 28px;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .amStatusBadge.active {
          background: var(--am-success-bg);
          color: var(--am-success);
        }

        .amStatusBadge.locked {
          background: var(--am-danger-bg);
          color: var(--am-danger);
        }

        .amRowActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .amRowButton.subtle {
          background: #f7fafe;
          color: #4d6c91;
        }

        .amPagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          color: #7a8da4;
          font-size: 12px;
        }

        .amPagination > div {
          display: flex;
          gap: 8px;
        }

        .amPagination button {
          width: 32px;
          height: 32px;
          padding: 0;
          border-radius: 10px;
        }

        .amPagination button.active {
          background: var(--am-primary);
          color: #fff;
          border-color: var(--am-primary);
          box-shadow: 0 6px 14px rgba(20, 53, 84, 0.18);
        }

        .amToggle {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: 38px;
          padding: 0 14px 0 10px;
          min-width: 104px;
          border-radius: 999px;
          border: 1px solid #d6e3ef;
          background: #fff;
          color: var(--am-primary);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }

        .amToggle.on {
          background: #eef6f2;
          border-color: #d5e6dc;
          color: #547467;
        }

        .amToggle.off {
          background: #f7f9fc;
          color: #7b8ea4;
        }

        .amToggleKnob {
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          border-radius: 999px;
          background: currentColor;
          opacity: 0.85;
        }

        .amAclForm {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) auto;
          gap: 10px;
          align-items: end;
        }

        .amAclForm label {
          color: #4b627d;
          font-size: 12px;
          font-weight: 700;
        }

        .amAclList {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
          min-height: 0;
          justify-content: flex-start;
        }

        .amAclRow {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 15px;
          background: #f8fbff;
          border-radius: 14px;
          border: 1px solid #dfe8f2;
          transition: border-color 0.18s ease, background-color 0.18s ease;
        }

        .amAclRow:hover {
          border-color: #c7d8ea;
          background: #f5f9fe;
        }

        .amAclRow.disabled {
          background: #fbfcfe;
          opacity: 0.88;
        }

        .amAclMain {
          min-width: 0;
        }

        .amAclTitleRow {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .amAclRow strong {
          color: var(--am-primary);
          font-size: 14px;
          font-weight: 800;
        }

        .amAclCidr {
          margin: 6px 0 4px;
          color: #2f5c8f;
          font-size: 13px;
          font-weight: 700;
        }

        .amAclRow span,
        .amAclMeta small {
          color: #667d96;
          font-size: 12px;
          line-height: 1.5;
        }

        .amAclMeta {
          min-width: 180px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
          gap: 10px;
        }

        .amAclButtons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .amAclPagination {
          margin-top: auto;
          padding-top: 2px;
        }

        .amRiskBadge,
        .amStateDot {
          display: inline-flex;
          align-items: center;
          height: 24px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .amRiskBadge.low {
          background: #edf5f0;
          color: #587467;
        }

        .amRiskBadge.medium {
          background: #fbf4e6;
          color: #916c32;
        }

        .amRiskBadge.high {
          background: #fbeff0;
          color: #936469;
        }

        .amStateDot.enabled {
          background: #edf4fd;
          color: #3f6ea2;
        }

        .amStateDot.disabled {
          background: #f5f7fa;
          color: #7d8fa2;
        }

        .amLogEyebrow {
          display: block;
          margin-bottom: 6px;
          color: #9eb6d2;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .amLogSummary {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .amLogSummary span {
          display: inline-flex;
          align-items: center;
          height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          background: rgba(64, 102, 150, 0.26);
          border: 1px solid rgba(120, 152, 196, 0.28);
          color: #e0ebf8;
          font-size: 12px;
          font-weight: 800;
        }

        .amLiveLogCard {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #ffffff;
          border-color: var(--am-border);
          color: var(--am-text);
          box-shadow: 0 10px 24px rgba(19, 45, 74, 0.06);
        }

        .amLiveLogCard .amSectionHead h3,
        .amLiveLogCard .amSectionHead p {
          color: var(--am-text);
        }

        .amLogLights {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 6px;
        }

        .amLogLights i {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: inline-block;
        }

        .amLogLights .red { background: #d85d5d; }
        .amLogLights .amber { background: #e3ad4d; }
        .amLogLights .green { background: #7ba36d; }

        .amLogToolbar {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) repeat(3, minmax(160px, 0.7fr));
          gap: 10px;
        }

        .amLogToolbar input,
        .amLogToolbar select {
          background: rgba(12, 24, 39, 0.92);
          border-color: rgba(112, 144, 186, 0.26);
          color: #e5edf7;
        }

        .amLogToolbar input::placeholder {
          color: #88a0bc;
        }

        .amSecurityConsole {
          display: flex;
          flex-direction: column;
          height: auto;
          min-height: 0;
          background: #162a43;
          border: 1px solid #203a59;
          border-radius: 14px;
          overflow: hidden;
          padding: 14px 16px;
        }

        .amSecurityConsoleHead,
        .amSecurityRow {
          display: grid;
          grid-template-columns: 140px 90px 160px minmax(260px, 1fr) 130px;
          column-gap: 18px;
          align-items: center;
          font-family: Consolas, 'SFMono-Regular', Menlo, monospace;
          font-size: 12px;
          line-height: 1.55;
        }

        .amSecurityConsoleHead {
          padding: 4px 14px 12px;
          border-bottom: 1px solid rgba(107, 137, 173, 0.2);
          color: #88a2bf;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .amSecurityRow {
          padding: 10px 14px;
          color: #dce7f3;
          border-top: 1px solid rgba(37, 56, 81, 0.9);
        }

        .amSecurityRow:first-of-type {
          border-top: 0;
        }

        .amSecurityTime,
        .amSecurityUser,
        .amSecurityIp {
          color: #e7f0fb;
          font-weight: 700;
        }

        .amSecurityType {
          font-weight: 800;
        }

        .amSecurityType.info {
          color: #70f1ce;
        }

        .amSecurityType.warn {
          color: #f4c55d;
        }

        .amSecurityType.error {
          color: #ff8c8c;
        }

        .amSecurityMessage {
          color: #f4f8fd;
          font-size: 13px;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .amSecurityMessage.info {
          color: #8cefdc;
        }

        .amSecurityMessage.warn {
          color: #ffd77a;
        }

        .amSecurityMessage.error {
          color: #ff9c9c;
        }

        .amEmptyCell,
        .amEmptyState,
        .amDarkEmptyState {
          padding: 32px 18px;
          text-align: center;
          font-size: 13px;
          font-weight: 700;
        }

        .amEmptyCell,
        .amEmptyState {
          color: #7a8ea5;
        }

        .amDarkEmptyState {
          color: #93aac7;
          min-height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 1400px) {
          .amOverviewGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .amLayout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 1200px) {
          .amOverviewGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .amToolbar,
          .amAclForm {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 900px) {
          .amOverviewGrid,
          .amToolbar,
          .amAclForm {
            grid-template-columns: 1fr;
          }

          .amSectionHead,
          .amAclRow,
          .amPagination {
            flex-direction: column;
            align-items: stretch;
          }

          .amLogSummary,
          .amAclButtons {
            justify-content: flex-start;
          }

          .amCompactTable,
          .amSecurityConsoleHead,
          .amSecurityRow {
            min-width: 980px;
          }

          .amTableWrap,
          .amSecurityConsole {
            overflow-x: auto;
          }
        }
      `}</style>
    </section>
  );
}
