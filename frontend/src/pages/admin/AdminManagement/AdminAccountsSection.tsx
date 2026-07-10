import { Plus, Trash2 } from 'lucide-react';
import type { AdminRole } from '../../../api/admin/adminManagementApi';
import MiniPagination from '../../../components/admin/MiniPagination';
import { ROLE_META, roleColumns, splitDateTime, type AdminAccount, type AdminStatus } from './adminManagementModel';

interface AdminAccountsSectionProps {
  isCurrentAdminMaster: boolean;
  isAccountMasterRoleRequired: boolean;
  setIsCreateAdminOpen: (value: boolean) => void;
  adminFilter: string;
  setAdminFilter: (value: string) => void;
  roleFilter: 'ALL' | AdminRole;
  setRoleFilter: (value: 'ALL' | AdminRole) => void;
  statusFilter: 'ALL' | AdminStatus;
  setStatusFilter: (value: 'ALL' | AdminStatus) => void;
  setAdminPage: (value: number | ((page: number) => number)) => void;
  updateAdminRoleErrorMessage: string;
  updateAdminStatusErrorMessage: string;
  deleteAdminErrorMessage: string;
  resetAccountMasterRoleRequired: () => void;
  isAdminAccountsLoading: boolean;
  isAdminAccountsError: boolean;
  adminAccountsErrorMessage: string;
  filteredAdmins: AdminAccount[];
  updateAdminRoleMutation: { isPending: boolean; variables?: { id: string } };
  updateAdminStatusMutation: { isPending: boolean; variables?: { id: string } };
  deleteAdminMutation: { isPending: boolean; variables?: string };
  changeAdminRole: (id: string, role: AdminRole) => void;
  toggleAdminStatus: (id: string) => void;
  removeAdminAccount: (admin: AdminAccount) => void;
  adminTotalItems: number;
  adminRangeStart: number;
  adminRangeEnd: number;
  safeAdminPage: number;
  adminTotalPages: number;
}

export default function AdminAccountsSection(props: AdminAccountsSectionProps) {
  const { isAccountMasterRoleRequired, setIsCreateAdminOpen, adminFilter, setAdminFilter, roleFilter, setRoleFilter, statusFilter, setStatusFilter, setAdminPage, updateAdminRoleErrorMessage, updateAdminStatusErrorMessage, deleteAdminErrorMessage, resetAccountMasterRoleRequired, isAdminAccountsLoading, isAdminAccountsError, adminAccountsErrorMessage, filteredAdmins, updateAdminRoleMutation, updateAdminStatusMutation, deleteAdminMutation, changeAdminRole, toggleAdminStatus, removeAdminAccount, adminTotalItems, adminRangeStart, adminRangeEnd, safeAdminPage, adminTotalPages } = props;

  return (
    <section className="admin-card amTableCard">
      <div className="amSectionHead">
        <div>
          <h3>관리자 계정 목록 (RBAC)</h3>
          <p>권한, 상태, 최근 접속 이력을 한 번에 비교할 수 있도록 정리했습니다.</p>
        </div>
        <button className="amHeaderButton amCreateAdminButton" type="button" disabled={isAccountMasterRoleRequired} onClick={() => setIsCreateAdminOpen(true)}>
          <Plus size={16} />
          관리자 계정 생성
        </button>
      </div>

      <div className="amToolbar">
        <div className="amToolbarField search">
          <span className="amToolbarLabel">검색</span>
          <input type="text" value={adminFilter} onChange={(e) => { setAdminFilter(e.target.value); setAdminPage(1); }} placeholder="이름, 이메일, 관리자 ID 검색" />
        </div>
        <div className="amToolbarField select">
          <span className="amToolbarLabel">권한 필터</span>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as 'ALL' | AdminRole); setAdminPage(1); }}>
            <option value="ALL">전체 권한</option>
            {roleColumns.map((role) => <option key={role} value={role}>{ROLE_META[role].label}</option>)}
          </select>
        </div>
        <div className="amToolbarField select">
          <span className="amToolbarLabel">상태 필터</span>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as 'ALL' | AdminStatus); setAdminPage(1); }}>
            <option value="ALL">전체 상태</option>
            <option value="ACTIVE">활성</option>
            <option value="LOCKED">잠금</option>
          </select>
        </div>
      </div>

      {updateAdminRoleErrorMessage ? <p className="amInlineError">{updateAdminRoleErrorMessage}</p> : null}
      {updateAdminStatusErrorMessage ? <p className="amInlineError">{updateAdminStatusErrorMessage}</p> : null}
      {deleteAdminErrorMessage ? <p className="amInlineError">{deleteAdminErrorMessage}</p> : null}
      {isAccountMasterRoleRequired ? <button className="amHeaderButton" type="button" onClick={resetAccountMasterRoleRequired}>권한 오류 상태 초기화</button> : null}

      <div className="amTableWrap">
        <table className="amCompactTable">
          <thead>
            <tr><th>관리자 정보</th><th>권한</th><th>상태</th><th>최근 접속</th><th>관리</th></tr>
          </thead>
          <tbody>
            {isAdminAccountsLoading ? <tr><td className="amEmptyCell" colSpan={5}>관리자 목록을 불러오는 중입니다.</td></tr> : null}
            {!isAdminAccountsLoading && isAdminAccountsError ? <tr><td className="amEmptyCell" colSpan={5}>{adminAccountsErrorMessage}</td></tr> : null}
            {!isAdminAccountsLoading && !isAdminAccountsError && filteredAdmins.length === 0 ? <tr><td className="amEmptyCell" colSpan={5}>관리자 검색 결과가 없습니다.</td></tr> : null}
            {!isAdminAccountsLoading && !isAdminAccountsError ? filteredAdmins.map((admin) => {
              const { date, time } = splitDateTime(admin.lastLogin);
              const isRolePending = updateAdminRoleMutation.isPending && updateAdminRoleMutation.variables?.id === admin.id;
              const isStatusPending = updateAdminStatusMutation.isPending && updateAdminStatusMutation.variables?.id === admin.id;
              const isDeletePending = deleteAdminMutation.isPending && deleteAdminMutation.variables === admin.id;

              return (
                <tr key={admin.id}>
                  <td><strong>{admin.name}</strong><small>{admin.email}</small><small>{admin.id}</small></td>
                  <td>
                    <select className="amInlineSelect" value={admin.role} disabled={isAccountMasterRoleRequired || admin.role === 'MASTER' || isRolePending} onChange={(e) => changeAdminRole(admin.id, e.target.value as AdminRole)}>
                      {roleColumns.map((role) => <option key={role} value={role}>{ROLE_META[role].label}</option>)}
                    </select>
                    <small>{admin.scope}</small>
                  </td>
                  <td><span className={`amStatusBadge ${admin.status === 'ACTIVE' ? 'active' : 'locked'}`}>{admin.status === 'ACTIVE' ? '활성' : '잠금'}</span></td>
                  <td><strong>{time}</strong><small>{date}</small><small>{admin.ip ?? '-'}</small></td>
                  <td>
                    <div className="amRowActions">
                      <button className="amRowButton" type="button" disabled={isAccountMasterRoleRequired || isStatusPending} onClick={() => toggleAdminStatus(admin.id)}>
                        {isStatusPending ? '처리 중' : admin.status === 'ACTIVE' ? '잠금' : '해제'}
                      </button>
                      <button className="amRowButton danger" type="button" disabled={isAccountMasterRoleRequired || isDeletePending} onClick={() => removeAdminAccount(admin)}>
                        <Trash2 size={14} />
                        {isDeletePending ? '삭제 중' : '삭제'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : null}
          </tbody>
        </table>
      </div>

      <div className="amPagination">
        <span>총 {adminTotalItems.toLocaleString()}건 중 {adminRangeStart.toLocaleString()}-{adminRangeEnd.toLocaleString()} 표시</span>
        <div><MiniPagination page={safeAdminPage} totalPages={adminTotalPages} onChange={setAdminPage as (page: number) => void} /></div>
      </div>
    </section>
  );
}
