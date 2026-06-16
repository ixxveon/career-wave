import { describe, it, expect } from 'vitest';
import { getLoginRouteDecision } from './useLogin';
import {
  MEMBER_TYPE,
  MEMBER_STATUS,
  COMPANY_APPROVAL_STATUS,
  MEMBER_SUBSCRIPTION_STATUS,
  type LoginResponse,
} from '../../../types/user/member';

function makeResponse(overrides: Partial<LoginResponse['member']>): LoginResponse {
  return {
    accessToken: 'token',
    member: {
      memberId: 'uuid',
      loginId: 'user01',
      name: '홍길동',
      roleType: MEMBER_TYPE.USER,
      memberStatus: MEMBER_STATUS.ACTIVE,
      subscriptionStatus: MEMBER_SUBSCRIPTION_STATUS.FREE,
      companyApprovalStatus: COMPANY_APPROVAL_STATUS.NONE,
      lastLoginAt: null,
      ...overrides,
    },
  };
}

// ─────────────────────────────────────────────
// 성공 응답 기반 blocked login (getLoginRouteDecision)
// ─────────────────────────────────────────────
describe('getLoginRouteDecision — 성공 응답 기반 blocked login', () => {
  it('ACTIVE USER → ALLOW /', () => {
    expect(getLoginRouteDecision(makeResponse({}))).toEqual({ type: 'ALLOW', path: '/' });
  });

  it('ACTIVE COMPANY + APPROVED → ALLOW /dashboard/company', () => {
    expect(
      getLoginRouteDecision(makeResponse({ roleType: MEMBER_TYPE.COMPANY, companyApprovalStatus: COMPANY_APPROVAL_STATUS.APPROVED })),
    ).toEqual({ type: 'ALLOW', path: '/dashboard/company' });
  });

  it('SUSPENDED → BLOCK RESTRICTED', () => {
    expect(getLoginRouteDecision(makeResponse({ memberStatus: MEMBER_STATUS.SUSPENDED }))).toEqual({
      type: 'BLOCK',
      reason: 'RESTRICTED',
    });
  });

  it('BANNED → BLOCK RESTRICTED', () => {
    expect(getLoginRouteDecision(makeResponse({ memberStatus: MEMBER_STATUS.BANNED }))).toEqual({
      type: 'BLOCK',
      reason: 'RESTRICTED',
    });
  });

  it('LOCKED → BLOCK RESTRICTED', () => {
    expect(getLoginRouteDecision(makeResponse({ memberStatus: MEMBER_STATUS.LOCKED }))).toEqual({
      type: 'BLOCK',
      reason: 'RESTRICTED',
    });
  });

  it('WITHDRAWN → BLOCK RESTRICTED', () => {
    expect(getLoginRouteDecision(makeResponse({ memberStatus: MEMBER_STATUS.WITHDRAWN }))).toEqual({
      type: 'BLOCK',
      reason: 'RESTRICTED',
    });
  });

  it('ACTIVE COMPANY + PENDING_REVIEW → BLOCK COMPANY_PENDING', () => {
    expect(
      getLoginRouteDecision(makeResponse({ roleType: MEMBER_TYPE.COMPANY, companyApprovalStatus: COMPANY_APPROVAL_STATUS.PENDING_REVIEW })),
    ).toEqual({ type: 'BLOCK', reason: 'COMPANY_PENDING' });
  });

  it('ACTIVE COMPANY + REJECTED → BLOCK COMPANY_REJECTED', () => {
    expect(
      getLoginRouteDecision(makeResponse({ roleType: MEMBER_TYPE.COMPANY, companyApprovalStatus: COMPANY_APPROVAL_STATUS.REJECTED })),
    ).toEqual({ type: 'BLOCK', reason: 'COMPANY_REJECTED' });
  });

  it('ACTIVE COMPANY + NEEDS_REVISION → BLOCK COMPANY_NEEDS_REVISION', () => {
    expect(
      getLoginRouteDecision(makeResponse({ roleType: MEMBER_TYPE.COMPANY, companyApprovalStatus: COMPANY_APPROVAL_STATUS.NEEDS_REVISION })),
    ).toEqual({ type: 'BLOCK', reason: 'COMPANY_NEEDS_REVISION' });
  });
});
