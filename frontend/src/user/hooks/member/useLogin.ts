import { useMutation } from '@tanstack/react-query';
import { memberAuthApi } from '../../api/member';
import type { CompanyApprovalStatus, LoginRequest, LoginResponse, LoginRouteDecision, MemberStatus } from '../../types/member';

function isRestrictedStatus(status: MemberStatus): boolean {
  return status !== 'ACTIVE';
}

function getCompanyBlockReason(status: CompanyApprovalStatus): LoginRouteDecision | null {
  if (status === 'PENDING_REVIEW') return { type: 'BLOCK', reason: 'COMPANY_PENDING' };
  if (status === 'REJECTED') return { type: 'BLOCK', reason: 'COMPANY_REJECTED' };
  if (status === 'NEEDS_REVISION') return { type: 'BLOCK', reason: 'COMPANY_NEEDS_REVISION' };
  return null;
}

export function getLoginRouteDecision(response: LoginResponse): LoginRouteDecision {
  const { member } = response;

  if (isRestrictedStatus(member.memberStatus)) {
    return { type: 'BLOCK', reason: 'RESTRICTED' };
  }

  if (member.memberType === 'COMPANY') {
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
