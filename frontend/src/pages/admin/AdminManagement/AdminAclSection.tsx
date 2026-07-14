import MiniPagination from '../../../components/admin/MiniPagination';
import { getAclRiskMeta, type AclDraft, type AclRule } from './adminManagementModel';

interface AdminAclSectionProps {
  aclEnforced: boolean;
  setAclEnforced: (value: boolean | ((prev: boolean) => boolean)) => void;
  aclDraft: AclDraft;
  setAclDraft: (value: AclDraft | ((prev: AclDraft) => AclDraft)) => void;
  aclCidrErrorMessage: string;
  createAclRuleErrorMessage: string;
  updateAclEnabledErrorMessage: string;
  deleteAclRuleErrorMessage: string;
  isAclMasterRoleRequired: boolean;
  createAclRuleMutation: { isPending: boolean };
  updateAclEnabledMutation: { isPending: boolean; variables?: { id: string } };
  deleteAclRuleMutation: { isPending: boolean; variables?: string };
  addAclRule: () => void;
  toggleAclRule: (id: string) => void;
  removeAclRule: (id: string) => void;
  pagedAclRules: AclRule[];
  visibleAclRules: AclRule[];
  isAdminAclRulesLoading: boolean;
  isAdminAclRulesError: boolean;
  aclRulesErrorMessage: string;
  resetAclMasterRoleRequired: () => void;
  aclTotalItems: number;
  safeAclPage: number;
  aclPageSize: number;
  aclTotalPages: number;
  setAclPage: (page: number) => void;
}

export default function AdminAclSection(props: AdminAclSectionProps) {
  const { aclEnforced, setAclEnforced, aclDraft, setAclDraft, aclCidrErrorMessage, createAclRuleErrorMessage, updateAclEnabledErrorMessage, deleteAclRuleErrorMessage, isAclMasterRoleRequired, createAclRuleMutation, updateAclEnabledMutation, deleteAclRuleMutation, addAclRule, toggleAclRule, removeAclRule, pagedAclRules, visibleAclRules, isAdminAclRulesLoading, isAdminAclRulesError, aclRulesErrorMessage, resetAclMasterRoleRequired, aclTotalItems, safeAclPage, aclPageSize, aclTotalPages, setAclPage } = props;

  return (
    <section className="admin-card amAclCard">
      <div className="amSectionHead">
        <div>
          <h3>IP 접근 제어 (ACL)</h3>
          <p>허용된 대역에서만 관리자 도메인 접근을 허용합니다.</p>
        </div>
        <button className={`amToggle ${aclEnforced ? 'on' : 'off'}`} type="button" aria-pressed={aclEnforced} onClick={() => setAclEnforced((prev) => !prev)}>
          <span className="amToggleKnob" />
          <span>{aclEnforced ? '보호 중' : '중지됨'}</span>
        </button>
      </div>

      <div className="amAclForm">
        <label>규칙명<input type="text" value={aclDraft.label} onChange={(e) => setAclDraft((prev) => ({ ...prev, label: e.target.value }))} placeholder="예: 본사 사내망" disabled={isAclMasterRoleRequired || createAclRuleMutation.isPending} /></label>
        <label>IP 대역<input type="text" value={aclDraft.cidr} onChange={(e) => setAclDraft((prev) => ({ ...prev, cidr: e.target.value }))} placeholder="예: 10.20.0.0/16" disabled={isAclMasterRoleRequired || createAclRuleMutation.isPending} /></label>
        <label>설명<input type="text" value={aclDraft.note} onChange={(e) => setAclDraft((prev) => ({ ...prev, note: e.target.value }))} placeholder="예: 사내 네트워크 전체 허용" disabled={isAclMasterRoleRequired || createAclRuleMutation.isPending} /></label>
        <button className="amPrimaryButton" type="button" disabled={isAclMasterRoleRequired || createAclRuleMutation.isPending || !aclDraft.label.trim() || !aclDraft.cidr.trim()} onClick={addAclRule}>
          {createAclRuleMutation.isPending ? '등록 중' : '추가'}
        </button>
      </div>

      {aclCidrErrorMessage ? <p className="amInlineError">{aclCidrErrorMessage}</p> : null}
      {createAclRuleErrorMessage ? <p className="amInlineError">{createAclRuleErrorMessage}</p> : null}
      {updateAclEnabledErrorMessage ? <p className="amInlineError">{updateAclEnabledErrorMessage}</p> : null}
      {deleteAclRuleErrorMessage ? <p className="amInlineError">{deleteAclRuleErrorMessage}</p> : null}
      {isAclMasterRoleRequired ? <button className="amHeaderButton" type="button" onClick={resetAclMasterRoleRequired}>ACL 권한 오류 상태 초기화</button> : null}

      <div className="amAclList">
        {isAdminAclRulesLoading ? <div className="amEmptyState">ACL 목록을 불러오는 중입니다.</div> : isAdminAclRulesError ? <div className="amEmptyState">{aclRulesErrorMessage}</div> : visibleAclRules.length === 0 ? <div className="amEmptyState">등록된 ACL 규칙이 없습니다.</div> : pagedAclRules.map((rule) => {
          const riskMeta = getAclRiskMeta(rule.cidr);
          const isAclTogglePending = updateAclEnabledMutation.isPending && updateAclEnabledMutation.variables?.id === rule.id;
          const isAclDeletePending = deleteAclRuleMutation.isPending && deleteAclRuleMutation.variables === rule.id;

          return (
            <article className={`amAclRow ${rule.enabled ? 'enabled' : 'disabled'}`} key={rule.id}>
              <div className="amAclMain">
                <div className="amAclTitleRow">
                  <strong>{rule.label}</strong>
                  <span className={`amRiskBadge ${riskMeta.tone}`}>{riskMeta.label}</span>
                  <span className={`amStateDot ${rule.enabled ? 'enabled' : 'disabled'}`}>{rule.enabled ? '활성' : '비활성'}</span>
                </div>
                <p className="amAclCidr">{rule.cidr}</p>
                <span>{rule.note}</span>
              </div>
              <div className="amAclMeta">
                <small>수정 {rule.updatedAt}</small>
                <div className="amAclButtons">
                  <button className="amGhostButton" type="button" disabled={isAclMasterRoleRequired || isAclTogglePending} onClick={() => toggleAclRule(rule.id)}>
                    {isAclTogglePending ? '처리 중' : rule.enabled ? '비활성화' : '활성화'}
                  </button>
                  <button className="amDangerButton" type="button" disabled={isAclMasterRoleRequired || isAclDeletePending} onClick={() => removeAclRule(rule.id)}>
                    {isAclDeletePending ? '삭제 중' : '삭제'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!isAdminAclRulesLoading && !isAdminAclRulesError && aclTotalItems > 0 && (
        <div className="amPagination amAclPagination">
          <span>총 {aclTotalItems}건 중 {((safeAclPage - 1) * aclPageSize + 1)}-{Math.min(safeAclPage * aclPageSize, aclTotalItems)} 표시</span>
          <div><MiniPagination page={safeAclPage} totalPages={aclTotalPages} onChange={setAclPage} /></div>
        </div>
      )}
    </section>
  );
}
