import type { LoginRequest, LoginResponse, MemberStatusResponse } from '../../../types/user/member';
import { authSession } from '../../../utils/user/member/authSession';
import { memberApiClient } from './memberApiClient';

export const memberAuthApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    // cross-origin(www→api) 환경에서 로그인 응답의 Set-Cookie: refreshToken=... 를
    // 브라우저가 저장하도록 credentials를 포함한다. 누락 시 새로고침 후 refresh cookie가
    // 없어 /token/refresh가 401로 실패하고 세션이 풀린다.
    return memberApiClient<LoginResponse>('/api/v1/user/members/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      credentials: 'include',
    });
  },

  async logout() {
    await memberApiClient('/api/v1/user/members/logout', {
      method: 'POST',
      auth: true,
    }).catch(() => {});
    authSession.clear();
  },

  getMyStatus(): Promise<MemberStatusResponse> {
    return memberApiClient<MemberStatusResponse>('/api/v1/user/members/me/status', {
      method: 'GET',
      auth: true,
    });
  },
};
