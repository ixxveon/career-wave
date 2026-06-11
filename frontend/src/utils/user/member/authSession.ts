import type { MemberSummary } from '../../../types/user/member';

let accessToken: string | null = null;
// Phase 3: refreshToken은 HttpOnly cookie로 관리된다. JS 접근 불가이므로 sessionStorage 영속화 없이 in-memory만 유지한다.
let refreshToken: string | null = null;
let currentMember: MemberSummary | null = null;

export const AUTH_CHANGE_EVENT = 'career-wave:auth-change';

function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export const authSession = {
  setTokens(tokens: { accessToken: string; refreshToken?: string }) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken ?? null;
    notifyAuthChange();
  },

  setAccessToken(token: string) {
    accessToken = token;
    notifyAuthChange();
  },

  getAccessToken() {
    return accessToken;
  },

  getRefreshToken() {
    return refreshToken;
  },

  setMember(member: MemberSummary) {
    currentMember = member;
  },

  getMember() {
    return currentMember;
  },

  clear() {
    accessToken = null;
    refreshToken = null;
    currentMember = null;
    notifyAuthChange();
  },
};
