import type { LoginRequest, LoginResponse, MemberStatusResponse } from '../../../types/user/member';
import { authSession } from '../../../utils/user/member/authSession';
import { memberApiClient } from './memberApiClient';

export const memberAuthApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    return memberApiClient<LoginResponse>('/api/v1/user/members/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  logout() {
    authSession.clear();
  },

  getMyStatus(): Promise<MemberStatusResponse> {
    return memberApiClient<MemberStatusResponse>('/api/v1/user/members/me/status', {
      method: 'GET',
      auth: true,
    });
  },
};
