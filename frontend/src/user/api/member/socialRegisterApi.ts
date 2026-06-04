import type { SocialRegisterCompletionRequest, SocialRegisterCompletionResponse } from '../../types/member';
import { memberApiClient } from './memberApiClient';

const SOCIAL_REGISTER_MOCK_STORAGE_KEY = 'cw:social-register:latest';

function buildMockResponse(payload: SocialRegisterCompletionRequest): SocialRegisterCompletionResponse {
  return {
    memberId: `social-${Date.now()}`,
    memberType: 'USER',
    memberStatus: 'ACTIVE',
    nextPath: '/auth/login?registered=social',
  };
}

async function completeWithMock(payload: SocialRegisterCompletionRequest): Promise<SocialRegisterCompletionResponse> {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(
      SOCIAL_REGISTER_MOCK_STORAGE_KEY,
      JSON.stringify({
        submittedAt: new Date().toISOString(),
        payload,
      }),
    );
  }

  await new Promise((resolve) => window.setTimeout(resolve, 200));
  return buildMockResponse(payload);
}

export const memberSocialRegisterApi = {
  async complete(payload: SocialRegisterCompletionRequest): Promise<SocialRegisterCompletionResponse> {
    // TODO: 백엔드 OAuth 추가정보 완료 계약이 확정되면 실제 endpoint로 전환한다.
    if (import.meta.env.VITE_USE_SOCIAL_REGISTER_MOCK !== 'false') {
      return completeWithMock(payload);
    }

    return memberApiClient<SocialRegisterCompletionResponse>('/api/v1/members/register/social/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
