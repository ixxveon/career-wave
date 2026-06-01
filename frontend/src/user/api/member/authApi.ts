import type { LoginRequest, LoginResponse, MemberStatusResponse } from '../../types/member';
import { authSession } from '../../utils/member/authSession';
import { memberApiClient } from './memberApiClient';

export const memberAuthApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const data = await memberApiClient<LoginResponse>('/api/v1/members/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    authSession.setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    authSession.setMember(data.member);

    return data;
  },

  logout() {
    authSession.clear();
  },

  getMyStatus(): Promise<MemberStatusResponse> {
    return memberApiClient<MemberStatusResponse>('/api/v1/members/me/status', {
      method: 'GET',
      auth: true,
    });
  },
};
