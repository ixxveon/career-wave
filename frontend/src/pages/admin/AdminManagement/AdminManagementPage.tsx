import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LockKeyhole, Network, Plus, ShieldCheck, Trash2, UserCheck } from 'lucide-react';
import {
  ADMIN_ROLE,
  ADMIN_MANAGEMENT_ERROR_CODE,
  createAdminAccount as createAdminAccountRequest,
  createAdminAclRule,
  deleteAdminAccount,
  deleteAdminAclRule,
  getAdminAccounts,
  getAdminAclRules,
  getAdminAuditLogs,
  getAdminManagementAuthErrorMessage,
  getAdminManagementSummary,
  toAdminManagementApiError,
  updateAdminAclEnabled,
  updateAdminRole,
  updateAdminStatus,
} from '../../../api/admin/adminManagementApi';
import { adminSession } from '../../../api/admin/adminAuthApi';
import type {
  AdminAccount as AdminAccountResponse,
  AdminAclRule as AdminAclRuleResponse,
  AdminAuditLog as AdminAuditLogResponse,
  AdminRole,
} from '../../../api/admin/adminManagementApi';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/admin-management.css';
import MiniPagination from '../../../components/admin/MiniPagination';

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

interface AdminDraft {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
}

const ROLE_META: Record<AdminRole, { label: string; scope: string }> = {
  MASTER: { label: '마스터 관리자', scope: '전체 권한 통제 및 보안 승인' },
  CS: { label: 'CS 담당', scope: '회원 문의, 신고, 1차 조치' },
  BACKEND: { label: '백엔드 개발', scope: 'API, DB, 배포, 장애 대응' },
};

const roleColumns: AdminRole[] = [ADMIN_ROLE.MASTER, ADMIN_ROLE.CS, ADMIN_ROLE.BACKEND];
const MAX_SECURITY_LOGS = 5;
const ADMIN_PAGE_SIZE = 20;
const ACL_PAGE_SIZE = 3;
const ADMIN_SEARCH_DEBOUNCE_MS = 400;
const ADMIN_MANAGEMENT_QUERY_KEY = ['adminManagement'] as const;
const ADMIN_MANAGEMENT_SUMMARY_QUERY_KEY = [...ADMIN_MANAGEMENT_QUERY_KEY, 'summary'] as const;
const ADMIN_MANAGEMENT_ADMINS_QUERY_KEY = [...ADMIN_MANAGEMENT_QUERY_KEY, 'admins'] as const;
const ADMIN_MANAGEMENT_ACLS_QUERY_KEY = [...ADMIN_MANAGEMENT_QUERY_KEY, 'acls'] as const;
const ADMIN_MANAGEMENT_AUDIT_LOGS_QUERY_KEY = [...ADMIN_MANAGEMENT_QUERY_KEY, 'auditLogs'] as const;

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

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debouncedValue;
}

const splitDateTime = (value: string) => {
  const [date = '', time = ''] = value.split(' ');
  return { date, time };
};

const isValidCidr = (value: string) => {
  const match = value.match(/^(\d{1,3})(?:\.(\d{1,3})){3}\/(\d{1,2})$/);
  if (!match) return false;

  const [ip, prefix] = value.split('/');
  const prefixNumber = Number(prefix);
  if (!Number.isInteger(prefixNumber) || prefixNumber < 0 || prefixNumber > 32) return false;

  return ip.split('.').every((octet) => {
    const octetNumber = Number(octet);
    return Number.isInteger(octetNumber) && octetNumber >= 0 && octetNumber <= 255;
  });
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

const createEmptyAdminDraft = (): AdminDraft => ({
  email: '',
  password: '',
  name: '',
  role: 'CS',
});

const toAdminAccountRow = (admin: AdminAccountResponse): AdminAccount => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
  scope: admin.scope,
  ip: admin.ip,
  createdAt: admin.createdAt,
  lastLogin: admin.lastLoginAt,
  status: admin.status,
});

const toAclRuleRow = (aclRule: AdminAclRuleResponse): AclRule => ({
  id: aclRule.id,
  label: aclRule.label,
  cidr: aclRule.cidr,
  note: aclRule.note,
  enabled: aclRule.enabled,
  updatedAt: aclRule.updatedAt,
});

const toAuditLogRow = (auditLog: AdminAuditLogResponse): AuditLog => ({
  id: auditLog.id,
  time: auditLog.occurredAt,
  actor: auditLog.actor,
  ip: auditLog.ip,
  action: auditLog.action,
  target: auditLog.target,
  severity: auditLog.severity,
});

export default function AdminManagementPage() {
  const queryClient = useQueryClient();
  const currentAdminRole = adminSession.getRole();
  const isCurrentAdminMaster = currentAdminRole === 'MASTER';
  const {
    data: summary,
    error: summaryError,
    isError: isSummaryError,
    isLoading: isSummaryLoading,
  } = useQuery({
    queryKey: ADMIN_MANAGEMENT_SUMMARY_QUERY_KEY,
    queryFn: getAdminManagementSummary,
  });
  const [aclRules] = useState(initialAclRules);
  const [logs, setLogs] = useState(initialLogs);
  const [adminFilter, setAdminFilter] = useState('');
  const debouncedAdminFilter = useDebouncedValue(adminFilter.trim(), ADMIN_SEARCH_DEBOUNCE_MS);
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdminStatus>('ALL');
  const [aclEnforced, setAclEnforced] = useState(true);
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [adminDraft, setAdminDraft] = useState<AdminDraft>(createEmptyAdminDraft);
  const [aclPage, setAclPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const logIdSeedRef = useRef(initialLogs.length + 1);
  const createAdminPendingRef = useRef(false);
  const [aclDraft, setAclDraft] = useState<AclDraft>({ label: '', cidr: '', note: '' });
  const [aclCidrErrorMessage, setAclCidrErrorMessage] = useState('');
  const adminListQueryParams = {
    keyword: debouncedAdminFilter || undefined,
    role: roleFilter,
    status: statusFilter,
    page: adminPage,
    size: ADMIN_PAGE_SIZE,
  };
  const {
    data: adminAccounts,
    error: adminAccountsError,
    isError: isAdminAccountsError,
    isLoading: isAdminAccountsLoading,
  } = useQuery({
    queryKey: [...ADMIN_MANAGEMENT_ADMINS_QUERY_KEY, adminListQueryParams],
    queryFn: () => getAdminAccounts(adminListQueryParams),
  });
  const filteredAdmins = adminAccounts?.items.map(toAdminAccountRow) ?? [];
  const aclListQueryParams = {
    page: aclPage,
    size: ACL_PAGE_SIZE,
  };
  const {
    data: adminAclRules,
    error: adminAclRulesError,
    isError: isAdminAclRulesError,
    isLoading: isAdminAclRulesLoading,
  } = useQuery({
    queryKey: [...ADMIN_MANAGEMENT_ACLS_QUERY_KEY, aclListQueryParams],
    queryFn: () => getAdminAclRules(aclListQueryParams),
  });
  const visibleAclRules = adminAclRules?.items.map(toAclRuleRow) ?? aclRules;
  const auditLogQueryParams = {
    page: 1,
    size: MAX_SECURITY_LOGS,
  };
  const {
    data: adminAuditLogs,
    error: adminAuditLogsError,
    isError: isAdminAuditLogsError,
    isLoading: isAdminAuditLogsLoading,
  } = useQuery({
    queryKey: [...ADMIN_MANAGEMENT_AUDIT_LOGS_QUERY_KEY, auditLogQueryParams],
    queryFn: () => getAdminAuditLogs(auditLogQueryParams),
  });
  const visibleLogs = adminAuditLogs?.items.map(toAuditLogRow) ?? logs;

  const addLog = (log: Omit<AuditLog, 'id' | 'time'>) => {
    const nextLogId = logIdSeedRef.current;
    logIdSeedRef.current += 1;
    setLogs((prev) => [{ ...log, id: makeId('LOG', nextLogId), time: formatNow() }, ...prev].slice(0, MAX_SECURITY_LOGS));
  };

  const refreshAdminManagementQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_SUMMARY_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_ADMINS_QUERY_KEY });
  };

  const refreshAclManagementQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_SUMMARY_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_ACLS_QUERY_KEY });
  };

  const refreshAuditLogQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_AUDIT_LOGS_QUERY_KEY });
  };

  const retryAdminManagementQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_QUERY_KEY });
  };

  const createAdminMutation = useMutation({
    mutationFn: createAdminAccountRequest,
    onSuccess: (createdAdmin) => {
      const nextAdmin = toAdminAccountRow(createdAdmin);

      setAdminFilter('');
      setRoleFilter('ALL');
      setStatusFilter('ALL');
      setAdminPage(1);
      closeCreateAdminPage({ force: true });

      addLog({
        actor: 'super_admin',
        ip: '10.20.0.10',
        action: '관리자 계정 생성',
        target: nextAdmin.id,
        severity: 'WARN',
      });
      refreshAdminManagementQueries();
      refreshAuditLogQueries();
    },
  });

  const updateAdminRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminRole }) => updateAdminRole(id, { role }),
    onSuccess: (updatedAdmin) => {
      const nextAdmin = toAdminAccountRow(updatedAdmin);

      addLog({
        actor: 'super_admin',
        ip: '10.20.0.10',
        action: '권한 변경',
        target: `${nextAdmin.id} / ${ROLE_META[nextAdmin.role].label}`,
        severity: 'WARN',
      });
      refreshAdminManagementQueries();
      refreshAuditLogQueries();
    },
  });

  const updateAdminStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminStatus }) => updateAdminStatus(id, { status }),
    onSuccess: (updatedAdmin) => {
      const nextAdmin = toAdminAccountRow(updatedAdmin);

      addLog({
        actor: 'super_admin',
        ip: '10.20.0.10',
        action: nextAdmin.status === 'LOCKED' ? '계정 잠금' : '계정 잠금 해제',
        target: nextAdmin.id,
        severity: nextAdmin.status === 'LOCKED' ? 'WARN' : 'INFO',
      });
      refreshAdminManagementQueries();
      refreshAuditLogQueries();
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: (id: string) => deleteAdminAccount(id),
    onSuccess: (_, deletedId) => {
      addLog({
        actor: 'super_admin',
        ip: '10.20.0.10',
        action: '관리자 계정 삭제',
        target: deletedId,
        severity: 'ERROR',
      });
      refreshAdminManagementQueries();
      refreshAuditLogQueries();
    },
  });

  const createAclRuleMutation = useMutation({
    mutationFn: createAdminAclRule,
    onSuccess: (createdAclRule) => {
      const nextRule = toAclRuleRow(createdAclRule);

      setAclPage(1);
      setAclDraft({ label: '', cidr: '', note: '' });
      setAclCidrErrorMessage('');

      addLog({
        actor: 'super_admin',
        ip: '10.20.0.10',
        action: 'IP ACL 등록',
        target: nextRule.id,
        severity: 'WARN',
      });
      refreshAclManagementQueries();
      refreshAuditLogQueries();
    },
  });

  const updateAclEnabledMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateAdminAclEnabled(id, { enabled }),
    onSuccess: (updatedAclRule) => {
      const nextRule = toAclRuleRow(updatedAclRule);

      addLog({
        actor: 'super_admin',
        ip: '10.20.0.10',
        action: nextRule.enabled ? 'IP ACL 활성화' : 'IP ACL 비활성화',
        target: nextRule.id,
        severity: nextRule.enabled ? 'INFO' : 'WARN',
      });
      refreshAclManagementQueries();
      refreshAuditLogQueries();
    },
  });

  const deleteAclRuleMutation = useMutation({
    mutationFn: (id: string) => deleteAdminAclRule(id),
    onSuccess: (_, deletedAclId) => {
      const isCurrentPageEmptyAfterDelete = aclPage > 1 && visibleAclRules.length === 1;
      if (isCurrentPageEmptyAfterDelete) {
        setAclPage((page) => Math.max(1, page - 1));
      }

      addLog({
        actor: 'super_admin',
        ip: '10.20.0.10',
        action: 'IP ACL 삭제',
        target: deletedAclId,
        severity: 'ERROR',
      });
      refreshAclManagementQueries();
      refreshAuditLogQueries();
    },
  });

  const resetAccountMasterRoleRequired = () => {
    createAdminMutation.reset();
    updateAdminRoleMutation.reset();
    updateAdminStatusMutation.reset();
    deleteAdminMutation.reset();
  };

  const resetAclMasterRoleRequired = () => {
    createAclRuleMutation.reset();
    updateAclEnabledMutation.reset();
    deleteAclRuleMutation.reset();
  };

  const changeAdminRole = (id: string, role: AdminRole) => {
    if (shouldBlockAccountMasterAction) return;
    updateAdminRoleMutation.mutate({ id, role });
  };

  const closeCreateAdminPage = ({ force = false }: { force?: boolean } = {}) => {
    if (!force && createAdminPendingRef.current) return;

    createAdminMutation.reset();
    setAdminDraft(createEmptyAdminDraft());
    setIsCreateAdminOpen(false);
  };

  const handleCreateAdminAccount = () => {
    if (shouldBlockAccountMasterAction) return;

    const email = adminDraft.email.trim();
    const name = adminDraft.name.trim();
    const password = adminDraft.password.trim();
    if (!email || !name || !password) return;

    createAdminMutation.mutate({
      name,
      email,
      password,
      role: adminDraft.role,
    });
  };

  const toggleAdminStatus = (id: string) => {
    if (shouldBlockAccountMasterAction) return;

    const target = filteredAdmins.find((item) => item.id === id);
    if (!target) return;

    const nextStatus = target.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    updateAdminStatusMutation.mutate({ id, status: nextStatus });
  };

  const removeAdminAccount = (admin: AdminAccount) => {
    if (shouldBlockAccountMasterAction) return;

    deleteAdminMutation.mutate(admin.id);
  };

  const addAclRule = () => {
    if (shouldBlockAclMasterAction) return;

    const label = aclDraft.label.trim();
    const cidr = aclDraft.cidr.trim();
    const note = aclDraft.note.trim();
    if (!label || !cidr) return;
    if (!isValidCidr(cidr)) {
      setAclCidrErrorMessage('CIDR 형식이 올바르지 않습니다. 예: 10.20.0.0/16');
      return;
    }

    setAclCidrErrorMessage('');

    createAclRuleMutation.mutate({
      label,
      cidr,
      note,
    });
  };

  const toggleAclRule = (id: string) => {
    if (shouldBlockAclMasterAction) return;

    const target = visibleAclRules.find((item) => item.id === id);
    if (!target) return;

    updateAclEnabledMutation.mutate({ id, enabled: !target.enabled });
  };

  const removeAclRule = (id: string) => {
    if (shouldBlockAclMasterAction) return;

    const target = visibleAclRules.find((item) => item.id === id);
    if (!target) return;

    deleteAclRuleMutation.mutate(target.id);
  };

  useEffect(() => {
    const nextTotalPages = Math.max(1, adminAccounts?.totalPages ?? 1);
    if (adminPage > nextTotalPages) {
      setAdminPage(nextTotalPages);
    }
  }, [adminAccounts?.totalPages, adminPage]);

  useEffect(() => {
    const nextTotalPages = Math.max(1, adminAclRules?.totalPages ?? 1);
    if (aclPage > nextTotalPages) {
      setAclPage(nextTotalPages);
    }
  }, [adminAclRules?.totalPages, aclPage]);

  useEffect(() => {
    createAdminPendingRef.current = createAdminMutation.isPending;
  }, [createAdminMutation.isPending]);

  useEffect(() => {
    if (!isCreateAdminOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCreateAdminPage();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCreateAdminOpen]);

  const filteredLogs = visibleLogs;

  const summaryApiError = isSummaryError ? toAdminManagementApiError(summaryError) : null;
  const adminAccountsApiError = isAdminAccountsError ? toAdminManagementApiError(adminAccountsError) : null;
  const adminAuditLogsApiError = isAdminAuditLogsError ? toAdminManagementApiError(adminAuditLogsError) : null;
  const adminAclRulesApiError = isAdminAclRulesError ? toAdminManagementApiError(adminAclRulesError) : null;
  const summaryErrorMessage = summaryApiError ? getAdminManagementAuthErrorMessage(summaryApiError) : '';
  const adminAccountsErrorMessage = adminAccountsApiError ? getAdminManagementAuthErrorMessage(adminAccountsApiError) : '';
  const createAdminApiError = createAdminMutation.isError ? toAdminManagementApiError(createAdminMutation.error) : null;
  const updateAdminRoleApiError = updateAdminRoleMutation.isError ? toAdminManagementApiError(updateAdminRoleMutation.error) : null;
  const updateAdminStatusApiError = updateAdminStatusMutation.isError ? toAdminManagementApiError(updateAdminStatusMutation.error) : null;
  const deleteAdminApiError = deleteAdminMutation.isError ? toAdminManagementApiError(deleteAdminMutation.error) : null;
  const createAdminErrorMessage = createAdminApiError ? getAdminManagementAuthErrorMessage(createAdminApiError) : '';
  const updateAdminRoleErrorMessage = updateAdminRoleApiError ? getAdminManagementAuthErrorMessage(updateAdminRoleApiError) : '';
  const updateAdminStatusErrorMessage = updateAdminStatusApiError ? getAdminManagementAuthErrorMessage(updateAdminStatusApiError) : '';
  const deleteAdminErrorMessage = deleteAdminApiError ? getAdminManagementAuthErrorMessage(deleteAdminApiError) : '';
  const auditLogsErrorMessage = adminAuditLogsApiError ? getAdminManagementAuthErrorMessage(adminAuditLogsApiError) : '';
  const aclRulesErrorMessage = adminAclRulesApiError ? getAdminManagementAuthErrorMessage(adminAclRulesApiError) : '';
  const createAclRuleApiError = createAclRuleMutation.isError ? toAdminManagementApiError(createAclRuleMutation.error) : null;
  const updateAclEnabledApiError = updateAclEnabledMutation.isError ? toAdminManagementApiError(updateAclEnabledMutation.error) : null;
  const deleteAclRuleApiError = deleteAclRuleMutation.isError ? toAdminManagementApiError(deleteAclRuleMutation.error) : null;
  const createAclRuleErrorMessage = createAclRuleApiError ? getAdminManagementAuthErrorMessage(createAclRuleApiError) : '';
  const updateAclEnabledErrorMessage = updateAclEnabledApiError ? getAdminManagementAuthErrorMessage(updateAclEnabledApiError) : '';
  const deleteAclRuleErrorMessage = deleteAclRuleApiError ? getAdminManagementAuthErrorMessage(deleteAclRuleApiError) : '';
  const summaryStatusText = isSummaryLoading ? '요약을 불러오는 중' : summaryErrorMessage;
  const totalAdmins = summary?.totalAdminCount ?? 0;
  const activeAdminCount = summary?.activeAdminCount ?? 0;
  const lockedAdminCount = summary?.lockedAdminCount ?? 0;
  const activeAclCount = summary?.activeAclCount ?? 0;
  const adminTotalItems = adminAccounts?.totalItems ?? filteredAdmins.length;
  const adminTotalPages = Math.max(1, adminAccounts?.totalPages ?? 1);
  const safeAdminPage = Math.min(adminPage, adminTotalPages);
  const adminRangeStart = adminTotalItems > 0 ? (safeAdminPage - 1) * ADMIN_PAGE_SIZE + 1 : 0;
  const adminRangeEnd = Math.min(safeAdminPage * ADMIN_PAGE_SIZE, adminTotalItems);
  const aclPageSize = ACL_PAGE_SIZE;
  const aclTotalItems = adminAclRules?.totalItems ?? visibleAclRules.length;
  const aclTotalPages = Math.max(1, adminAclRules?.totalPages ?? Math.ceil(visibleAclRules.length / aclPageSize));
  const safeAclPage = Math.min(aclPage, aclTotalPages);
  const pagedAclRules = adminAclRules ? visibleAclRules : visibleAclRules.slice((safeAclPage - 1) * aclPageSize, safeAclPage * aclPageSize);
  const isAllAdminManagementQueryError =
    isSummaryError && isAdminAccountsError && isAdminAclRulesError && isAdminAuditLogsError;
  const isRoleAdminAccessDenied =
    isAllAdminManagementQueryError
    && [summaryApiError, adminAccountsApiError, adminAclRulesApiError, adminAuditLogsApiError].every(
      (error) => error?.code === ADMIN_MANAGEMENT_ERROR_CODE.FORBIDDEN,
    );
  const isAccountMasterRoleRequired =
    [createAdminApiError, updateAdminRoleApiError, updateAdminStatusApiError, deleteAdminApiError].some(
      (error) => error?.code === ADMIN_MANAGEMENT_ERROR_CODE.MASTER_ROLE_REQUIRED,
    );
  const isAclMasterRoleRequired =
    [createAclRuleApiError, updateAclEnabledApiError, deleteAclRuleApiError].some(
      (error) => error?.code === ADMIN_MANAGEMENT_ERROR_CODE.MASTER_ROLE_REQUIRED,
    );
  const shouldBlockAccountMasterAction = !isCurrentAdminMaster || isAccountMasterRoleRequired;
  const shouldBlockAclMasterAction = !isCurrentAdminMaster || isAclMasterRoleRequired;
  const globalErrorTitle = isRoleAdminAccessDenied
    ? '관리자 관리 화면 접근 권한이 없습니다.'
    : '관리자 관리 데이터를 불러오지 못했습니다.';
  const globalErrorDescription = isRoleAdminAccessDenied
    ? 'ROLE_ADMIN 권한이 있는 관리자 계정으로 다시 로그인해 주세요.'
    : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.';

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

      {isAllAdminManagementQueryError ? (
        <section className="amGlobalErrorState">
          <div>
            <strong>{globalErrorTitle}</strong>
            <span>{globalErrorDescription}</span>
          </div>
          <button className="amHeaderButton" type="button" onClick={retryAdminManagementQueries}>
            재시도
          </button>
        </section>
      ) : null}

      <section className="amOverviewGrid">
        {kpiItems.map((item) => (
          <article className={`admin-card amKpiCard ${item.tone}`} key={item.label}>
            <div className="amKpiContent">
              <p>{item.label}</p>
              <h3>{isSummaryLoading || isSummaryError ? '-' : item.value.toLocaleString()}</h3>
              <span>{summaryStatusText || item.desc}</span>
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
              <button
                className="amHeaderButton amCreateAdminButton"
                type="button"
                disabled={shouldBlockAccountMasterAction}
                onClick={() => setIsCreateAdminOpen(true)}
              >
                <Plus size={16} />
                관리자 계정 생성
              </button>
            </div>

            <div className="amToolbar">
              <div className="amToolbarField search">
                <span className="amToolbarLabel">검색</span>
                <input
                  type="text"
                  value={adminFilter}
                  onChange={(e) => {
                    setAdminFilter(e.target.value);
                    setAdminPage(1);
                  }}
                  placeholder="이름, 이메일, 관리자 ID 검색"
                />
              </div>
              <div className="amToolbarField select">
                <span className="amToolbarLabel">권한 필터</span>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value as 'ALL' | AdminRole);
                    setAdminPage(1);
                  }}
                >
                  <option value="ALL">전체 권한</option>
                  {roleColumns.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_META[role].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="amToolbarField select">
                <span className="amToolbarLabel">상태 필터</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as 'ALL' | AdminStatus);
                    setAdminPage(1);
                  }}
                >
                  <option value="ALL">전체 상태</option>
                  <option value="ACTIVE">활성</option>
                  <option value="LOCKED">잠금</option>
                </select>
              </div>
            </div>

            {updateAdminRoleErrorMessage ? <p className="amInlineError">{updateAdminRoleErrorMessage}</p> : null}
            {updateAdminStatusErrorMessage ? <p className="amInlineError">{updateAdminStatusErrorMessage}</p> : null}
            {deleteAdminErrorMessage ? <p className="amInlineError">{deleteAdminErrorMessage}</p> : null}
            {isAccountMasterRoleRequired ? (
              <button className="amHeaderButton" type="button" onClick={resetAccountMasterRoleRequired}>
                권한 오류 상태 초기화
              </button>
            ) : null}

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
                  {isAdminAccountsLoading ? (
                    <tr>
                      <td className="amEmptyCell" colSpan={5}>
                        관리자 목록을 불러오는 중입니다.
                      </td>
                    </tr>
                  ) : null}
                  {!isAdminAccountsLoading && isAdminAccountsError ? (
                    <tr>
                      <td className="amEmptyCell" colSpan={5}>
                        {adminAccountsErrorMessage}
                      </td>
                    </tr>
                  ) : null}
                  {!isAdminAccountsLoading && !isAdminAccountsError && filteredAdmins.length === 0 ? (
                    <tr>
                      <td className="amEmptyCell" colSpan={5}>
                        관리자 검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : null}
                  {!isAdminAccountsLoading && !isAdminAccountsError
                    ? (
                    filteredAdmins.map((admin) => {
                      const { date, time } = splitDateTime(admin.lastLogin);
                      const isRolePending =
                        updateAdminRoleMutation.isPending && updateAdminRoleMutation.variables?.id === admin.id;
                      const isStatusPending =
                        updateAdminStatusMutation.isPending && updateAdminStatusMutation.variables?.id === admin.id;
                      const isDeletePending = deleteAdminMutation.isPending && deleteAdminMutation.variables === admin.id;
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
                              disabled={shouldBlockAccountMasterAction || admin.role === 'MASTER' || isRolePending}
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
                              <button
                                className="amRowButton"
                                type="button"
                                disabled={shouldBlockAccountMasterAction || isStatusPending}
                                onClick={() => toggleAdminStatus(admin.id)}
                              >
                                {isStatusPending ? '처리 중' : admin.status === 'ACTIVE' ? '잠금' : '해제'}
                              </button>
                              <button
                                className="amRowButton danger"
                                type="button"
                                disabled={shouldBlockAccountMasterAction || isDeletePending}
                                onClick={() => removeAdminAccount(admin)}
                              >
                                <Trash2 size={14} />
                                {isDeletePending ? '삭제 중' : '삭제'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                    )
                    : null}
                </tbody>
              </table>
            </div>

            <div className="amPagination">
              <span>
                총 {adminTotalItems.toLocaleString()}건 중 {adminRangeStart.toLocaleString()}-
                {adminRangeEnd.toLocaleString()} 표시
              </span>
              <div>
                <button
                  type="button"
                  disabled={safeAdminPage <= 1}
                  onClick={() => setAdminPage((page) => Math.max(1, page - 1))}
                >
                  {'<'}
                </button>
                {Array.from({ length: adminTotalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    className={safeAdminPage === page ? 'active' : ''}
                    type="button"
                    onClick={() => setAdminPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safeAdminPage >= adminTotalPages}
                  onClick={() => setAdminPage((page) => Math.min(adminTotalPages, page + 1))}
                >
                  {'>'}
                </button>
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
                aria-pressed={aclEnforced}
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
                  disabled={shouldBlockAclMasterAction || createAclRuleMutation.isPending}
                />
              </label>
              <label>
                IP 대역
                <input
                  type="text"
                  value={aclDraft.cidr}
                  onChange={(e) => {
                    setAclDraft((prev) => ({ ...prev, cidr: e.target.value }));
                    if (aclCidrErrorMessage) setAclCidrErrorMessage('');
                  }}
                  placeholder="예: 10.20.0.0/16"
                  disabled={shouldBlockAclMasterAction || createAclRuleMutation.isPending}
                />
              </label>
              <label>
                설명
                <input
                  type="text"
                  value={aclDraft.note}
                  onChange={(e) => setAclDraft((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="예: 사내 네트워크 전체 허용"
                  disabled={shouldBlockAclMasterAction || createAclRuleMutation.isPending}
                />
              </label>
              <button
                className="amPrimaryButton"
                type="button"
                disabled={shouldBlockAclMasterAction || createAclRuleMutation.isPending || !aclDraft.label.trim() || !aclDraft.cidr.trim()}
                onClick={addAclRule}
              >
                {createAclRuleMutation.isPending ? '등록 중' : '추가'}
              </button>
            </div>
            {aclCidrErrorMessage ? <p className="amInlineError">{aclCidrErrorMessage}</p> : null}
            {createAclRuleErrorMessage ? <p className="amInlineError">{createAclRuleErrorMessage}</p> : null}
            {updateAclEnabledErrorMessage ? <p className="amInlineError">{updateAclEnabledErrorMessage}</p> : null}
            {deleteAclRuleErrorMessage ? <p className="amInlineError">{deleteAclRuleErrorMessage}</p> : null}
            {isAclMasterRoleRequired ? (
              <button className="amHeaderButton" type="button" onClick={resetAclMasterRoleRequired}>
                ACL 권한 오류 상태 초기화
              </button>
            ) : null}

            <div className="amAclList">
              {isAdminAclRulesLoading ? (
                <div className="amEmptyState">ACL 목록을 불러오는 중입니다.</div>
              ) : isAdminAclRulesError ? (
                <div className="amEmptyState">{aclRulesErrorMessage}</div>
              ) : visibleAclRules.length === 0 ? (
                <div className="amEmptyState">등록된 ACL 규칙이 없습니다.</div>
              ) : (
                pagedAclRules.map((rule) => {
                  const riskMeta = getAclRiskMeta(rule.cidr);
                  const isAclTogglePending =
                    updateAclEnabledMutation.isPending && updateAclEnabledMutation.variables?.id === rule.id;
                  const isAclDeletePending = deleteAclRuleMutation.isPending && deleteAclRuleMutation.variables === rule.id;

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
                          <button
                            className="amGhostButton"
                            type="button"
                            disabled={shouldBlockAclMasterAction || isAclTogglePending}
                            onClick={() => toggleAclRule(rule.id)}
                          >
                            {isAclTogglePending ? '처리 중' : rule.enabled ? '비활성화' : '활성화'}
                          </button>
                          <button
                            className="amDangerButton"
                            type="button"
                            disabled={shouldBlockAclMasterAction || isAclDeletePending}
                            onClick={() => removeAclRule(rule.id)}
                          >
                            {isAclDeletePending ? '삭제 중' : '삭제'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {!isAdminAclRulesLoading && !isAdminAclRulesError && aclTotalItems > 0 && (
              <div className="amPagination amAclPagination">
                <span>
                  총 {aclTotalItems}건 중 {((safeAclPage - 1) * aclPageSize + 1)}-{Math.min(safeAclPage * aclPageSize, aclTotalItems)} 표시
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
          {isAdminAuditLogsLoading ? (
            <div className="amDarkEmptyState">감사 로그를 불러오는 중입니다.</div>
          ) : isAdminAuditLogsError ? (
            <div className="amDarkEmptyState">{auditLogsErrorMessage}</div>
          ) : filteredLogs.length === 0 ? (
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

      {isCreateAdminOpen && (
        <div className="amCreatePageOverlay" role="presentation" onMouseDown={() => closeCreateAdminPage()}>
          <form
            className="amCreatePage"
            role="dialog"
            aria-modal="true"
            aria-labelledby="amCreatePageTitle"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateAdminAccount();
            }}
          >
            <div className="amCreatePageHero">
              <div>
                <span>RBAC 관리자 등록</span>
                <h3 id="amCreatePageTitle">관리자 계정 생성</h3>
                <p>새 관리자에게 로그인 정보와 초기 권한을 부여합니다.</p>
              </div>
              <button className="amGhostButton" type="button" onClick={() => closeCreateAdminPage()}>
                닫기
              </button>
            </div>

            <div className="amCreatePageBody">
              <label>
                로그인 이메일
                <input
                  type="email"
                  value={adminDraft.email}
                  onChange={(e) => setAdminDraft((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@career-wave.com"
                  disabled={createAdminMutation.isPending}
                  autoFocus
                />
              </label>
              <label>
                비밀번호
                <input
                  type="password"
                  value={adminDraft.password}
                  onChange={(e) => setAdminDraft((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="초기 비밀번호 입력"
                  disabled={createAdminMutation.isPending}
                />
              </label>
              <label>
                관리자 이름
                <input
                  type="text"
                  value={adminDraft.name}
                  onChange={(e) => setAdminDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="관리자 이름"
                  disabled={createAdminMutation.isPending}
                />
              </label>
              <label>
                권한
                <select
                  value={adminDraft.role}
                  onChange={(e) => setAdminDraft((prev) => ({ ...prev, role: e.target.value as AdminRole }))}
                  disabled={createAdminMutation.isPending}
                >
                  {roleColumns.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_META[role].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {createAdminErrorMessage ? <p className="amCreatePageError">{createAdminErrorMessage}</p> : null}

            <div className="amCreatePageActions">
              <button className="amGhostButton" type="button" onClick={() => closeCreateAdminPage()} disabled={createAdminMutation.isPending}>
                취소
              </button>
              <button
                className="amPrimaryButton"
                type="submit"
                disabled={
                  createAdminMutation.isPending ||
                  shouldBlockAccountMasterAction ||
                  !adminDraft.email.trim() ||
                  !adminDraft.password.trim() ||
                  !adminDraft.name.trim()
                }
              >
                {createAdminMutation.isPending ? '생성 중' : '관리자 생성'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
