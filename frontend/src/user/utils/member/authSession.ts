import type { MemberSummary } from '../../types/member';

const REFRESH_TOKEN_STORAGE_KEY = 'career-wave.member.refreshToken';

function readRefreshTokenFromSessionStorage(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeRefreshTokenToSessionStorage(token: string | null) {
  if (typeof window === 'undefined') return;

  try {
    if (token) {
      window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
      return;
    }

    window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore browser storage failures and keep the in-memory fallback.
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = readRefreshTokenFromSessionStorage();
let currentMember: MemberSummary | null = null;

function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('career-wave:auth-change'));
  }
}

export const authSession = {
  setTokens(tokens: { accessToken: string; refreshToken?: string }) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken ?? null;
    writeRefreshTokenToSessionStorage(refreshToken);
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
    writeRefreshTokenToSessionStorage(null);
    notifyAuthChange();
  },
};
