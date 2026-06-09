import { describe, it, expect } from 'vitest';
import { getLoginRouteDecision } from './useLogin';
import type { LoginResponse } from '../../types/member';

function makeResponse(overrides: Partial<LoginResponse['member']>): LoginResponse {
  return {
    accessToken: 'token',
    member: {
      memberId: 'uuid',
      loginId: 'user01',
      name: '홍길동',
      memberType: 'USER',
      memberStatus: 'ACTIVE',
      companyApprovalStatus: 'NONE',
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
      getLoginRouteDecision(makeResponse({ memberType: 'COMPANY', companyApprovalStatus: 'APPROVED' })),
    ).toEqual({ type: 'ALLOW', path: '/dashboard/company' });
  });

  it('SUSPENDED → BLOCK RESTRICTED', () => {
    expect(getLoginRouteDecision(makeResponse({ memberStatus: 'SUSPENDED' }))).toEqual({
      type: 'BLOCK',
      reason: 'RESTRICTED',
    });
  });

  it('BANNED → BLOCK RESTRICTED', () => {
    expect(getLoginRouteDecision(makeResponse({ memberStatus: 'BANNED' }))).toEqual({
      type: 'BLOCK',
      reason: 'RESTRICTED',
    });
  });

  it('LOCKED → BLOCK RESTRICTED', () => {
    expect(getLoginRouteDecision(makeResponse({ memberStatus: 'LOCKED' }))).toEqual({
      type: 'BLOCK',
      reason: 'RESTRICTED',
    });
  });

  it('WITHDRAWN → BLOCK RESTRICTED', () => {
    expect(getLoginRouteDecision(makeResponse({ memberStatus: 'WITHDRAWN' }))).toEqual({
      type: 'BLOCK',
      reason: 'RESTRICTED',
    });
  });

  it('ACTIVE COMPANY + PENDING_REVIEW → BLOCK COMPANY_PENDING', () => {
    expect(
      getLoginRouteDecision(makeResponse({ memberType: 'COMPANY', companyApprovalStatus: 'PENDING_REVIEW' })),
    ).toEqual({ type: 'BLOCK', reason: 'COMPANY_PENDING' });
  });

  it('ACTIVE COMPANY + REJECTED → BLOCK COMPANY_REJECTED', () => {
    expect(
      getLoginRouteDecision(makeResponse({ memberType: 'COMPANY', companyApprovalStatus: 'REJECTED' })),
    ).toEqual({ type: 'BLOCK', reason: 'COMPANY_REJECTED' });
  });

  it('ACTIVE COMPANY + NEEDS_REVISION → BLOCK COMPANY_NEEDS_REVISION', () => {
    expect(
      getLoginRouteDecision(makeResponse({ memberType: 'COMPANY', companyApprovalStatus: 'NEEDS_REVISION' })),
    ).toEqual({ type: 'BLOCK', reason: 'COMPANY_NEEDS_REVISION' });
  });
});
