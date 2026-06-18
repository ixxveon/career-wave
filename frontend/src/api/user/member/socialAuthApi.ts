import type {
  OAuthAuthorizeResponse,
  OAuthCallbackLoginResponse,
  OAuthCallbackSignupRequiredResponse,
} from '../../../types/user/member';
import { memberApiClient } from './memberApiClient';

export const memberSocialAuthApi = {
  /**
   * GET /oauth/{provider}/authorize
   * provider OAuth 인증 URL과 state를 반환한다.
   * 반환된 authorizationUrl로 브라우저를 리다이렉트해 OAuth 인증을 시작한다.
   */
  authorize(provider: string): Promise<OAuthAuthorizeResponse> {
    return memberApiClient<OAuthAuthorizeResponse>(
      `/api/v1/user/members/oauth/${provider}/authorize`,
    );
  },

  /**
   * GET /oauth/{provider}/callback?code=...&state=...
   * provider 인증 코드를 검증하고 기존 계정 로그인 또는 추가정보 입력 분기를 반환한다.
   * - 기존 소셜 계정: OAuthCallbackLoginResponse (accessToken 포함)
   * - 최초 소셜 사용자: OAuthCallbackSignupRequiredResponse (socialSignupToken 포함)
   */
  callback(
    provider: string,
    code: string,
    state: string,
  ): Promise<OAuthCallbackLoginResponse | OAuthCallbackSignupRequiredResponse> {
    const params = new URLSearchParams({ code, state });
    return memberApiClient<OAuthCallbackLoginResponse | OAuthCallbackSignupRequiredResponse>(
      `/api/v1/user/members/oauth/${provider}/callback?${params.toString()}`,
    );
  },
};
