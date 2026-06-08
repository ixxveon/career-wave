import { useMutation } from '@tanstack/react-query';
import { memberRecoveryApi } from '../../../api/user/member';
import type { FindIdRequest, PasswordTokenRequest, ResetPasswordRequest } from '../../../types/user/member';

export function useFindId() {
  return useMutation({
    mutationFn: (payload: FindIdRequest) => memberRecoveryApi.findId(payload),
  });
}

export function useIssuePasswordToken() {
  return useMutation({
    mutationFn: (payload: PasswordTokenRequest) => memberRecoveryApi.issuePasswordToken(payload),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordRequest) => memberRecoveryApi.resetPassword(payload),
  });
}
