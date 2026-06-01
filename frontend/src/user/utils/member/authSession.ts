import type { MemberSummary } from '../../types/member';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let currentMember: MemberSummary | null = null;

export const authSession = {
  setTokens(tokens: { accessToken: string; refreshToken?: string }) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken ?? null;
  },

  setAccessToken(token: string) {
    accessToken = token;
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
  },
};
