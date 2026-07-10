import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ADMIN_ROLE, ADMIN_AUDIT_LOG_TYPE, ADMIN_MANAGEMENT_ERROR_CODE, createAdminAccount as createAdminAccountRequest, createAdminAclRule, deleteAdminAccount, deleteAdminAclRule, getAdminAccounts, getAdminAclRules, getAdminAuditLogs, getAdminManagementAuthErrorMessage, getAdminManagementSummary, toAdminManagementApiError, updateAdminAclEnabled, updateAdminRole, updateAdminStatus, type AdminRole } from '../../../api/admin/adminManagementApi';
import { adminSession } from '../../../api/admin/adminAuthApi';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/AdminManagement.css';
import AdminManagementSummarySection from './AdminManagementSummarySection';
import AdminAccountsSection from './AdminAccountsSection';
import AdminAclSection from './AdminAclSection';
import AdminAuditLogsSection from './AdminAuditLogsSection';
import CreateAdminDialog from './CreateAdminDialog';
import { ACL_PAGE_SIZE, ADMIN_MANAGEMENT_ACLS_QUERY_KEY, ADMIN_MANAGEMENT_ADMINS_QUERY_KEY, ADMIN_MANAGEMENT_AUDIT_LOGS_QUERY_KEY, ADMIN_MANAGEMENT_QUERY_KEY, ADMIN_MANAGEMENT_SUMMARY_QUERY_KEY, ADMIN_PAGE_SIZE, ADMIN_SEARCH_DEBOUNCE_MS, createEmptyAdminDraft, initialAclRules, isValidCidr, MAX_SECURITY_LOGS, toAclRuleRow, toAdminAccountRow, toAuditLogRow, type AclDraft, type AdminDraft, type AdminStatus, useDebouncedValue } from './adminManagementModel';

export default function AdminManagementPage() {
  const queryClient = useQueryClient();
  const [aclRules] = useState(initialAclRules);
  const [adminFilter, setAdminFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AdminStatus>('ALL');
  const [aclEnforced, setAclEnforced] = useState(true);
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [adminDraft, setAdminDraft] = useState<AdminDraft>(createEmptyAdminDraft);
  const [aclPage, setAclPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);
  const [aclDraft, setAclDraft] = useState<AclDraft>({ label: '', cidr: '', note: '' });
  const [aclCidrErrorMessage, setAclCidrErrorMessage] = useState('');
  const createAdminPendingRef = useRef(false);
  const debouncedAdminFilter = useDebouncedValue(adminFilter.trim(), ADMIN_SEARCH_DEBOUNCE_MS);
  const isCurrentAdminMaster = adminSession.getRole() === ADMIN_ROLE.MASTER;

  const { data: summary, error: summaryError, isError: isSummaryError, isLoading: isSummaryLoading } = useQuery({ queryKey: ADMIN_MANAGEMENT_SUMMARY_QUERY_KEY, queryFn: getAdminManagementSummary });
  const adminListQueryParams = { keyword: debouncedAdminFilter || undefined, role: roleFilter, status: statusFilter, page: adminPage, size: ADMIN_PAGE_SIZE };
  const { data: adminAccounts, error: adminAccountsError, isError: isAdminAccountsError, isLoading: isAdminAccountsLoading } = useQuery({ queryKey: [...ADMIN_MANAGEMENT_ADMINS_QUERY_KEY, adminListQueryParams], queryFn: () => getAdminAccounts(adminListQueryParams), refetchOnMount: 'always' });
  const aclListQueryParams = { page: aclPage, size: ACL_PAGE_SIZE };
  const { data: adminAclRules, error: adminAclRulesError, isError: isAdminAclRulesError, isLoading: isAdminAclRulesLoading } = useQuery({ queryKey: [...ADMIN_MANAGEMENT_ACLS_QUERY_KEY, aclListQueryParams], queryFn: () => getAdminAclRules(aclListQueryParams) });
  const auditLogQueryParams = { logType: ADMIN_AUDIT_LOG_TYPE.ADMIN_MANAGEMENT, page: 1, size: MAX_SECURITY_LOGS };
  const { data: adminAuditLogs, error: adminAuditLogsError, isError: isAdminAuditLogsError, isLoading: isAdminAuditLogsLoading } = useQuery({ queryKey: [...ADMIN_MANAGEMENT_AUDIT_LOGS_QUERY_KEY, auditLogQueryParams], queryFn: () => getAdminAuditLogs(auditLogQueryParams) });

  const filteredAdmins = adminAccounts?.items.map(toAdminAccountRow) ?? [];
  const visibleAclRules = adminAclRules?.items.map(toAclRuleRow) ?? aclRules;
  const filteredLogs = adminAuditLogs?.items.map(toAuditLogRow) ?? [];
  const refreshAdminManagementQueries = () => { void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_SUMMARY_QUERY_KEY }); void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_ADMINS_QUERY_KEY }); };
  const refreshAclManagementQueries = () => { void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_SUMMARY_QUERY_KEY }); void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_ACLS_QUERY_KEY }); };
  const refreshAuditLogQueries = () => { void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_AUDIT_LOGS_QUERY_KEY }); };
  const retryAdminManagementQueries = () => { void queryClient.invalidateQueries({ queryKey: ADMIN_MANAGEMENT_QUERY_KEY }); };

  const createAdminMutation = useMutation({ mutationFn: createAdminAccountRequest, onSuccess: () => { setAdminFilter(''); setRoleFilter('ALL'); setStatusFilter('ALL'); setAdminPage(1); closeCreateAdminPage({ force: true }); refreshAdminManagementQueries(); refreshAuditLogQueries(); } });
  const updateAdminRoleMutation = useMutation({ mutationFn: ({ id, role }: { id: string; role: AdminRole }) => updateAdminRole(id, { role }), onSuccess: () => { refreshAdminManagementQueries(); refreshAuditLogQueries(); } });
  const updateAdminStatusMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: AdminStatus }) => updateAdminStatus(id, { status }), onSuccess: () => { refreshAdminManagementQueries(); refreshAuditLogQueries(); } });
  const deleteAdminMutation = useMutation({ mutationFn: (id: string) => deleteAdminAccount(id), onSuccess: () => { refreshAdminManagementQueries(); refreshAuditLogQueries(); } });
  const createAclRuleMutation = useMutation({ mutationFn: createAdminAclRule, onSuccess: () => { setAclPage(1); setAclDraft({ label: '', cidr: '', note: '' }); setAclCidrErrorMessage(''); refreshAclManagementQueries(); refreshAuditLogQueries(); } });
  const updateAclEnabledMutation = useMutation({ mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => updateAdminAclEnabled(id, { enabled }), onSuccess: () => { refreshAclManagementQueries(); refreshAuditLogQueries(); } });
  const deleteAclRuleMutation = useMutation({ mutationFn: (id: string) => deleteAdminAclRule(id), onSuccess: () => { if (aclPage > 1 && visibleAclRules.length === 1) setAclPage((page) => Math.max(1, page - 1)); refreshAclManagementQueries(); refreshAuditLogQueries(); } });

  const resetAccountMasterRoleRequired = () => { createAdminMutation.reset(); updateAdminRoleMutation.reset(); updateAdminStatusMutation.reset(); deleteAdminMutation.reset(); };
  const resetAclMasterRoleRequired = () => { createAclRuleMutation.reset(); updateAclEnabledMutation.reset(); deleteAclRuleMutation.reset(); };
  const closeCreateAdminPage = ({ force = false }: { force?: boolean } = {}) => { if (!force && createAdminPendingRef.current) return; createAdminMutation.reset(); setAdminDraft(createEmptyAdminDraft()); setIsCreateAdminOpen(false); };
  const changeAdminRole = (id: string, role: AdminRole) => { if (!isAccountMasterRoleRequired) updateAdminRoleMutation.mutate({ id, role }); };
  const handleCreateAdminAccount = () => { if (isAccountMasterRoleRequired) return; const { loginId, email, name, password, role } = adminDraft; if (!loginId.trim() || !email.trim() || !name.trim() || !password.trim()) return; createAdminMutation.mutate({ loginId: loginId.trim(), name: name.trim(), email: email.trim(), password: password.trim(), role }); };
  const toggleAdminStatus = (id: string) => { if (isAccountMasterRoleRequired) return; const target = filteredAdmins.find((item) => item.id === id); if (!target) return; updateAdminStatusMutation.mutate({ id, status: target.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE' }); };
  const removeAdminAccount = (admin: { id: string }) => { if (!isAccountMasterRoleRequired) deleteAdminMutation.mutate(admin.id); };
  const addAclRule = () => { if (isAclMasterRoleRequired) return; const label = aclDraft.label.trim(); const cidr = aclDraft.cidr.trim(); const note = aclDraft.note.trim(); if (!label || !cidr) return; if (!isValidCidr(cidr)) return setAclCidrErrorMessage('CIDR 형식이 올바르지 않습니다. 예: 10.20.0.0/16'); setAclCidrErrorMessage(''); createAclRuleMutation.mutate({ label, cidr, note }); };
  const toggleAclRule = (id: string) => { if (isAclMasterRoleRequired) return; const target = visibleAclRules.find((item) => item.id === id); if (target) updateAclEnabledMutation.mutate({ id, enabled: !target.enabled }); };
  const removeAclRule = (id: string) => { if (!isAclMasterRoleRequired) deleteAclRuleMutation.mutate(id); };

  const summaryApiError = isSummaryError ? toAdminManagementApiError(summaryError) : null;
  const adminAccountsApiError = isAdminAccountsError ? toAdminManagementApiError(adminAccountsError) : null;
  const adminAuditLogsApiError = isAdminAuditLogsError ? toAdminManagementApiError(adminAuditLogsError) : null;
  const adminAclRulesApiError = isAdminAclRulesError ? toAdminManagementApiError(adminAclRulesError) : null;
  const createAdminApiError = createAdminMutation.isError ? toAdminManagementApiError(createAdminMutation.error) : null;
  const updateAdminRoleApiError = updateAdminRoleMutation.isError ? toAdminManagementApiError(updateAdminRoleMutation.error) : null;
  const updateAdminStatusApiError = updateAdminStatusMutation.isError ? toAdminManagementApiError(updateAdminStatusMutation.error) : null;
  const deleteAdminApiError = deleteAdminMutation.isError ? toAdminManagementApiError(deleteAdminMutation.error) : null;
  const createAclRuleApiError = createAclRuleMutation.isError ? toAdminManagementApiError(createAclRuleMutation.error) : null;
  const updateAclEnabledApiError = updateAclEnabledMutation.isError ? toAdminManagementApiError(updateAclEnabledMutation.error) : null;
  const deleteAclRuleApiError = deleteAclRuleMutation.isError ? toAdminManagementApiError(deleteAclRuleMutation.error) : null;
  const adminAccountsErrorMessage = adminAccountsApiError ? getAdminManagementAuthErrorMessage(adminAccountsApiError) : '';
  const auditLogsErrorMessage = adminAuditLogsApiError ? getAdminManagementAuthErrorMessage(adminAuditLogsApiError) : '';
  const aclRulesErrorMessage = adminAclRulesApiError ? getAdminManagementAuthErrorMessage(adminAclRulesApiError) : '';
  const createAdminErrorMessage = createAdminApiError ? getAdminManagementAuthErrorMessage(createAdminApiError) : '';
  const updateAdminRoleErrorMessage = updateAdminRoleApiError ? getAdminManagementAuthErrorMessage(updateAdminRoleApiError) : '';
  const updateAdminStatusErrorMessage = updateAdminStatusApiError ? getAdminManagementAuthErrorMessage(updateAdminStatusApiError) : '';
  const deleteAdminErrorMessage = deleteAdminApiError ? getAdminManagementAuthErrorMessage(deleteAdminApiError) : '';
  const createAclRuleErrorMessage = createAclRuleApiError ? getAdminManagementAuthErrorMessage(createAclRuleApiError) : '';
  const updateAclEnabledErrorMessage = updateAclEnabledApiError ? getAdminManagementAuthErrorMessage(updateAclEnabledApiError) : '';
  const deleteAclRuleErrorMessage = deleteAclRuleApiError ? getAdminManagementAuthErrorMessage(deleteAclRuleApiError) : '';
  const isAllAdminManagementQueryError = isSummaryError && isAdminAccountsError && isAdminAclRulesError && isAdminAuditLogsError;
  const isRoleAdminAccessDenied = isAllAdminManagementQueryError && [summaryApiError, adminAccountsApiError, adminAclRulesApiError, adminAuditLogsApiError].every((error) => error?.code === ADMIN_MANAGEMENT_ERROR_CODE.FORBIDDEN);
  const isAccountMasterRoleRequired = !isCurrentAdminMaster || [createAdminApiError, updateAdminRoleApiError, updateAdminStatusApiError, deleteAdminApiError].some((error) => error?.code === ADMIN_MANAGEMENT_ERROR_CODE.MASTER_ROLE_REQUIRED);
  const isAclMasterRoleRequired = !isCurrentAdminMaster || [createAclRuleApiError, updateAclEnabledApiError, deleteAclRuleApiError].some((error) => error?.code === ADMIN_MANAGEMENT_ERROR_CODE.MASTER_ROLE_REQUIRED);
  const adminTotalItems = adminAccounts?.totalItems ?? filteredAdmins.length;
  const adminTotalPages = Math.max(1, adminAccounts?.totalPages ?? 1);
  const safeAdminPage = Math.min(adminPage, adminTotalPages);
  const adminRangeStart = adminTotalItems > 0 ? (safeAdminPage - 1) * ADMIN_PAGE_SIZE + 1 : 0;
  const adminRangeEnd = Math.min(safeAdminPage * ADMIN_PAGE_SIZE, adminTotalItems);
  const aclTotalItems = adminAclRules?.totalItems ?? visibleAclRules.length;
  const aclTotalPages = Math.max(1, adminAclRules?.totalPages ?? Math.ceil(visibleAclRules.length / ACL_PAGE_SIZE));
  const safeAclPage = Math.min(aclPage, aclTotalPages);
  const pagedAclRules = adminAclRules ? visibleAclRules : visibleAclRules.slice((safeAclPage - 1) * ACL_PAGE_SIZE, safeAclPage * ACL_PAGE_SIZE);

  useEffect(() => { const nextTotalPages = Math.max(1, adminAccounts?.totalPages ?? 1); if (adminPage > nextTotalPages) setAdminPage(nextTotalPages); }, [adminAccounts?.totalPages, adminPage]);
  useEffect(() => { const nextTotalPages = Math.max(1, adminAclRules?.totalPages ?? 1); if (aclPage > nextTotalPages) setAclPage(nextTotalPages); }, [adminAclRules?.totalPages, aclPage]);
  useEffect(() => { createAdminPendingRef.current = createAdminMutation.isPending; }, [createAdminMutation.isPending]);
  useEffect(() => { if (!isCreateAdminOpen) return undefined; const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeCreateAdminPage(); }; document.body.style.overflow = 'hidden'; window.addEventListener('keydown', handleKeyDown); return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handleKeyDown); }; }, [isCreateAdminOpen]);

  return (
    <section className="admin-managementPage">
      <header className="admin-header"><div><h2>관리자 설정</h2><p>RBAC, IP ACL, 관리자 활동 로그를 한 화면에서 관리합니다.</p></div></header>
      <AdminManagementSummarySection
        isAllAdminManagementQueryError={isAllAdminManagementQueryError}
        globalErrorTitle={isRoleAdminAccessDenied ? '관리자 관리 화면 접근 권한이 없습니다.' : '관리자 관리 데이터를 불러오지 못했습니다.'}
        globalErrorDescription={isRoleAdminAccessDenied ? 'ROLE_ADMIN 권한이 있는 관리자 계정으로 다시 로그인해 주세요.' : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'}
        retryAdminManagementQueries={retryAdminManagementQueries}
        isSummaryLoading={isSummaryLoading}
        isSummaryError={isSummaryError}
        summaryStatusText={isSummaryLoading ? '요약을 불러오는 중' : (summaryApiError ? getAdminManagementAuthErrorMessage(summaryApiError) : '')}
        totalAdmins={summary?.totalAdminCount ?? 0}
        activeAdminCount={summary?.activeAdminCount ?? 0}
        activeAclCount={summary?.activeAclCount ?? 0}
        lockedAdminCount={summary?.lockedAdminCount ?? 0}
      />
      <section className="amLayout">
        <div className="amLeftColumn">
          <AdminAccountsSection
            isCurrentAdminMaster={isCurrentAdminMaster}
            isAccountMasterRoleRequired={isAccountMasterRoleRequired}
            setIsCreateAdminOpen={setIsCreateAdminOpen}
            adminFilter={adminFilter}
            setAdminFilter={setAdminFilter}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            setAdminPage={setAdminPage}
            updateAdminRoleErrorMessage={updateAdminRoleErrorMessage}
            updateAdminStatusErrorMessage={updateAdminStatusErrorMessage}
            deleteAdminErrorMessage={deleteAdminErrorMessage}
            resetAccountMasterRoleRequired={resetAccountMasterRoleRequired}
            isAdminAccountsLoading={isAdminAccountsLoading}
            isAdminAccountsError={isAdminAccountsError}
            adminAccountsErrorMessage={adminAccountsErrorMessage}
            filteredAdmins={filteredAdmins}
            updateAdminRoleMutation={updateAdminRoleMutation}
            updateAdminStatusMutation={updateAdminStatusMutation}
            deleteAdminMutation={deleteAdminMutation}
            changeAdminRole={changeAdminRole}
            toggleAdminStatus={toggleAdminStatus}
            removeAdminAccount={removeAdminAccount}
            adminTotalItems={adminTotalItems}
            adminRangeStart={adminRangeStart}
            adminRangeEnd={adminRangeEnd}
            safeAdminPage={safeAdminPage}
            adminTotalPages={adminTotalPages}
          />
        </div>
        <aside className="amRightColumn">
          <AdminAclSection
            aclEnforced={aclEnforced}
            setAclEnforced={setAclEnforced}
            aclDraft={aclDraft}
            setAclDraft={setAclDraft}
            aclCidrErrorMessage={aclCidrErrorMessage}
            createAclRuleErrorMessage={createAclRuleErrorMessage}
            updateAclEnabledErrorMessage={updateAclEnabledErrorMessage}
            deleteAclRuleErrorMessage={deleteAclRuleErrorMessage}
            isAclMasterRoleRequired={isAclMasterRoleRequired}
            createAclRuleMutation={createAclRuleMutation}
            updateAclEnabledMutation={updateAclEnabledMutation}
            deleteAclRuleMutation={deleteAclRuleMutation}
            addAclRule={addAclRule}
            toggleAclRule={toggleAclRule}
            removeAclRule={removeAclRule}
            pagedAclRules={pagedAclRules}
            visibleAclRules={visibleAclRules}
            isAdminAclRulesLoading={isAdminAclRulesLoading}
            isAdminAclRulesError={isAdminAclRulesError}
            aclRulesErrorMessage={aclRulesErrorMessage}
            resetAclMasterRoleRequired={resetAclMasterRoleRequired}
            aclTotalItems={aclTotalItems}
            safeAclPage={safeAclPage}
            aclPageSize={ACL_PAGE_SIZE}
            aclTotalPages={aclTotalPages}
            setAclPage={setAclPage}
          />
        </aside>
      </section>
      <AdminAuditLogsSection isAdminAuditLogsLoading={isAdminAuditLogsLoading} isAdminAuditLogsError={isAdminAuditLogsError} auditLogsErrorMessage={auditLogsErrorMessage} filteredLogs={filteredLogs} />
      <CreateAdminDialog isOpen={isCreateAdminOpen} adminDraft={adminDraft} setAdminDraft={setAdminDraft} closeCreateAdminPage={closeCreateAdminPage} handleCreateAdminAccount={handleCreateAdminAccount} createAdminPending={createAdminMutation.isPending} createAdminErrorMessage={createAdminErrorMessage} isAccountMasterRoleRequired={isAccountMasterRoleRequired} />
    </section>
  );
}
