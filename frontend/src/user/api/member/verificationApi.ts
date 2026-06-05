import type {
  ConfirmVerificationRequest,
  ConfirmVerificationResponse,
  SendVerificationRequest,
  SendVerificationResponse,
} from '../../types/member';
import { memberApiClient } from './memberApiClient';

export const memberVerificationApi = {
  send(payload: SendVerificationRequest): Promise<SendVerificationResponse> {
    return memberApiClient<SendVerificationResponse>('/api/v1/user/members/verifications/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  confirm(payload: ConfirmVerificationRequest): Promise<ConfirmVerificationResponse> {
    return memberApiClient<ConfirmVerificationResponse>('/api/v1/user/members/verifications/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
