// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  parseLoginBlockedDecision,
  toMemberApiError,
  MEMBER_ERROR_CODE,
} from './errorMapping';

// ─────────────────────────────────────────────
// toMemberApiError — serverCode 전파
// ─────────────────────────────────────────────
describe('toMemberApiError — serverCode 전파', () => {
  it('body에 code가 있으면 serverCode로 전파된다', () => {
    const error = toMemberApiError(403, { code: 'AUTH_ACCOUNT_SUSPENDED', message: '정지된 계정입니다.' });
    expect(error.serverCode).toBe('AUTH_ACCOUNT_SUSPENDED');
  });

  it('body에 code가 없으면 serverCode가 undefined이다', () => {
    const error = toMemberApiError(403, { message: '이용할 수 없습니다.' });
    expect(error.serverCode).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// parseLoginBlockedDecision — 403 계정 제한 판별
// ─────────────────────────────────────────────
describe('parseLoginBlockedDecision — 계정 제한 판별', () => {
  it('403 + AUTH_ACCOUNT_SUSPENDED → RESTRICTED blockedDecision 반환', () => {
    const error = toMemberApiError(403, { code: 'AUTH_ACCOUNT_SUSPENDED' });
    expect(parseLoginBlockedDecision(error)).toEqual({ type: 'BLOCK', reason: 'RESTRICTED' });
  });

  it('403 + AUTH_ACCOUNT_BANNED → RESTRICTED blockedDecision 반환', () => {
    const error = toMemberApiError(403, { code: 'AUTH_ACCOUNT_BANNED' });
    expect(parseLoginBlockedDecision(error)).toEqual({ type: 'BLOCK', reason: 'RESTRICTED' });
  });

  it('403 + AUTH_ACCOUNT_WITHDRAWN → RESTRICTED blockedDecision 반환', () => {
    const error = toMemberApiError(403, { code: 'AUTH_ACCOUNT_WITHDRAWN' });
    expect(parseLoginBlockedDecision(error)).toEqual({ type: 'BLOCK', reason: 'RESTRICTED' });
  });

  it('403 + AUTH_COMPANY_PENDING_REVIEW → COMPANY_PENDING blockedDecision 반환', () => {
    const error = toMemberApiError(403, { code: 'AUTH_COMPANY_PENDING_REVIEW' });
    expect(parseLoginBlockedDecision(error)).toEqual({ type: 'BLOCK', reason: 'COMPANY_PENDING' });
  });

  it('403 + AUTH_COMPANY_REJECTED → COMPANY_REJECTED blockedDecision 반환', () => {
    const error = toMemberApiError(403, { code: 'AUTH_COMPANY_REJECTED' });
    expect(parseLoginBlockedDecision(error)).toEqual({ type: 'BLOCK', reason: 'COMPANY_REJECTED' });
  });

  it('403이지만 serverCode 없으면 null 반환 (generic 403)', () => {
    const error = { code: MEMBER_ERROR_CODE.FORBIDDEN, statusCode: 403, message: '권한 없음' };
    expect(parseLoginBlockedDecision(error)).toBeNull();
  });

  it('401이면 null 반환', () => {
    const error = toMemberApiError(401, { code: 'AUTH_INVALID_CREDENTIALS' });
    expect(parseLoginBlockedDecision(error)).toBeNull();
  });

  it('알 수 없는 서버 코드면 null 반환', () => {
    const error = toMemberApiError(403, { code: 'SOME_UNKNOWN_CODE' });
    expect(parseLoginBlockedDecision(error)).toBeNull();
  });
});
