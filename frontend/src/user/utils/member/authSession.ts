import type { MemberSummary } from '../../types/member';

let accessToken: string | null = null;
let currentMember: MemberSummary | null = null;

export const authSession = {
  setAccessToken(token: string) {
    accessToken = token;
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
  },
};
