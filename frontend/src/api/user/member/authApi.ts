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
    // 로그인과 동일하게 cross-origin 환경에서 요청에 refreshToken 쿠키를 실어 보내고,
    // 서버의 Set-Cookie: refreshToken=; Max-Age=0 삭제 응답이 브라우저에 반영되도록
    // credentials를 포함한다. 누락 시 HttpOnly refreshToken이 남아 세션이 복구될 수 있다.
    await memberApiClient('/api/v1/user/members/logout', {
      method: 'POST',
      auth: true,
      credentials: 'include',
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
