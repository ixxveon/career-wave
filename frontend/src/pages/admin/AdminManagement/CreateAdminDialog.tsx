import type { AdminRole } from '../../../api/admin/adminManagementApi';
import { ROLE_META, roleColumns, type AdminDraft } from './adminManagementModel';

export default function CreateAdminDialog(props: {
  isOpen: boolean;
  adminDraft: AdminDraft;
  setAdminDraft: (value: AdminDraft | ((prev: AdminDraft) => AdminDraft)) => void;
  closeCreateAdminPage: (options?: { force?: boolean }) => void;
  handleCreateAdminAccount: () => void;
  createAdminPending: boolean;
  createAdminErrorMessage: string;
  isAccountMasterRoleRequired: boolean;
}) {
  const { isOpen, adminDraft, setAdminDraft, closeCreateAdminPage, handleCreateAdminAccount, createAdminPending, createAdminErrorMessage, isAccountMasterRoleRequired } = props;
  if (!isOpen) return null;

  return (
    <div className="amCreatePageOverlay" role="presentation" onMouseDown={() => closeCreateAdminPage()}>
      <form
        className="amCreatePage"
        role="dialog"
        aria-modal="true"
        aria-labelledby="amCreatePageTitle"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => { event.preventDefault(); handleCreateAdminAccount(); }}
      >
        <div className="amCreatePageHero">
          <div>
            <span>RBAC 관리자 등록</span>
            <h3 id="amCreatePageTitle">관리자 계정 생성</h3>
            <p>새 관리자에게 로그인 정보와 초기 권한을 부여합니다.</p>
          </div>
        </div>

        <div className="amCreatePageBody">
          <label>로그인 아이디<input type="text" value={adminDraft.loginId} onChange={(e) => setAdminDraft((prev) => ({ ...prev, loginId: e.target.value }))} placeholder="admin_master" disabled={createAdminPending} autoFocus /></label>
          <label>이메일<input type="email" value={adminDraft.email} onChange={(e) => setAdminDraft((prev) => ({ ...prev, email: e.target.value }))} placeholder="admin@career-wave.com" disabled={createAdminPending} /></label>
          <label>비밀번호<input type="password" value={adminDraft.password} onChange={(e) => setAdminDraft((prev) => ({ ...prev, password: e.target.value }))} placeholder="초기 비밀번호 입력" disabled={createAdminPending} /></label>
          <label>관리자 이름<input type="text" value={adminDraft.name} onChange={(e) => setAdminDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="관리자 이름" disabled={createAdminPending} /></label>
          <label>권한
            <select value={adminDraft.role} onChange={(e) => setAdminDraft((prev) => ({ ...prev, role: e.target.value as AdminRole }))} disabled={createAdminPending}>
              {roleColumns.map((role) => <option key={role} value={role}>{ROLE_META[role].label}</option>)}
            </select>
          </label>
        </div>

        {createAdminErrorMessage ? <p className="amCreatePageError">{createAdminErrorMessage}</p> : null}

        <div className="amCreatePageActions">
          <button className="amGhostButton" type="button" onClick={() => closeCreateAdminPage()} disabled={createAdminPending}>취소</button>
          <button className="amPrimaryButton" type="submit" disabled={createAdminPending || isAccountMasterRoleRequired || !adminDraft.email.trim() || !adminDraft.password.trim() || !adminDraft.name.trim()}>
            {createAdminPending ? '생성 중' : '관리자 생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
