import type { SocialRegisterCompletionRequest, SocialRegisterCompletionResponse } from '../../../types/user/member';
import { memberApiClient } from './memberApiClient';

export const memberSocialRegisterApi = {
  /**
   * POST /register/social/complete
   * OAuth provider 인증 완료 후 추가정보(이름, 휴대폰, 약관)를 저장하고 소셜 계정을 연결한다.
   * socialSignupToken은 OAuth callback에서 받은 1회용 토큰이다.
   */
  complete(payload: SocialRegisterCompletionRequest): Promise<SocialRegisterCompletionResponse> {
    return memberApiClient<SocialRegisterCompletionResponse>('/api/v1/user/members/register/social/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
