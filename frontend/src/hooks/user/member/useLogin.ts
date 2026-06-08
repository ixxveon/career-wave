import { useMutation } from '@tanstack/react-query';
import { memberAuthApi } from '../../../api/user/member';
import {
  COMPANY_APPROVAL_STATUS,
  MEMBER_STATUS,
  MEMBER_TYPE,
  type CompanyApprovalStatus,
  type LoginRequest,
  type LoginResponse,
  type LoginRouteDecision,
  type MemberStatus,
} from '../../../types/user/member';

const COMPANY_BLOCK_REASON_BY_STATUS = {
  [COMPANY_APPROVAL_STATUS.PENDING_REVIEW]: 'COMPANY_PENDING',
  [COMPANY_APPROVAL_STATUS.REJECTED]: 'COMPANY_REJECTED',
  [COMPANY_APPROVAL_STATUS.NEEDS_REVISION]: 'COMPANY_NEEDS_REVISION',
} as const;

function isRestrictedStatus(status: MemberStatus): boolean {
  return status !== MEMBER_STATUS.ACTIVE;
}

function getCompanyBlockReason(status: CompanyApprovalStatus): LoginRouteDecision | null {
  const reason = COMPANY_BLOCK_REASON_BY_STATUS[status as keyof typeof COMPANY_BLOCK_REASON_BY_STATUS];
  return reason ? { type: 'BLOCK', reason } : null;
}

export function getLoginRouteDecision(response: LoginResponse): LoginRouteDecision {
  const { member } = response;

  if (isRestrictedStatus(member.memberStatus)) {
    return { type: 'BLOCK', reason: 'RESTRICTED' };
  }

  if (member.memberType === MEMBER_TYPE.COMPANY) {
    const companyBlock = getCompanyBlockReason(member.companyApprovalStatus);
    if (companyBlock) return companyBlock;
    return { type: 'ALLOW', path: '/dashboard/company' };
  }

  return { type: 'ALLOW', path: '/' };
}

export function useLogin() {
  return useMutation({
    mutationFn: (payload: LoginRequest) => memberAuthApi.login(payload),
  });
}
