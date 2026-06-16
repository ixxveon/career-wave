import type { MemberSummary } from '../../../types/user/member';

let accessToken: string | null = null;
let currentMember: MemberSummary | null = null;

export const AUTH_CHANGE_EVENT = 'career-wave:auth-change';

function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export const authSession = {
  setTokens(tokens: { accessToken: string }) {
    accessToken = tokens.accessToken;
    notifyAuthChange();
  },

  setAccessToken(token: string) {
    accessToken = token;
    notifyAuthChange();
  },

  getAccessToken() {
    return accessToken;
  },

  setMember(member: MemberSummary) {
    currentMember = member;
  },

  getMember() {
    return currentMember;
  },

  clear() {
    accessToken = null;
    currentMember = null;
    notifyAuthChange();
  },
};
