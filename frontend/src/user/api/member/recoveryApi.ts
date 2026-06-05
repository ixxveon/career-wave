import type {
  FindIdRequest,
  FindIdResponse,
  PasswordTokenRequest,
  PasswordTokenResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '../../types/member';
import { memberApiClient } from './memberApiClient';

export const memberRecoveryApi = {
  findId(payload: FindIdRequest): Promise<FindIdResponse> {
    return memberApiClient<FindIdResponse>('/api/v1/user/members/recovery/find-id', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  issuePasswordToken(payload: PasswordTokenRequest): Promise<PasswordTokenResponse> {
    return memberApiClient<PasswordTokenResponse>('/api/v1/user/members/recovery/password-token', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    return memberApiClient<ResetPasswordResponse>('/api/v1/user/members/recovery/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
