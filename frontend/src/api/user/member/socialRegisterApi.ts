import type {
  SocialRegisterCompletionRequest,
  SocialRegisterCompletionResponse,
  SocialResolveRequest,
  SocialResolveResponse,
} from '../../../types/user/member';
import { memberApiClient } from './memberApiClient';

export const memberSocialRegisterApi = {
  /**
   * POST /register/social/resolve
   * 휴대폰 인증 성공 직후 호출. 인증한 번호가 기존 회원이면 소셜 계정을 연동하고 로그인(LINKED),
   * 신규 번호면 NEW_MEMBER를 반환한다. LINKED일 때만 accessToken이 포함된다.
   */
  resolve(payload: SocialResolveRequest): Promise<SocialResolveResponse> {
    return memberApiClient<SocialResolveResponse>('/api/v1/user/members/register/social/resolve', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * POST /register/social/complete
   * OAuth provider 인증 완료 후 추가정보(이름, 휴대폰, 약관)를 저장하고 소셜 계정을 연결한다.
   * socialSignupToken은 OAuth callback에서 받은 1회용 토큰이다. (신규 번호 전용)
   */
  complete(payload: SocialRegisterCompletionRequest): Promise<SocialRegisterCompletionResponse> {
    return memberApiClient<SocialRegisterCompletionResponse>('/api/v1/user/members/register/social/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
