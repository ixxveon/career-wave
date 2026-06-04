import { useMutation } from '@tanstack/react-query';
import { memberVerificationApi } from '../../api/member';
import type { ConfirmVerificationRequest, SendVerificationRequest } from '../../types/member';

export function useSendVerificationCode() {
  return useMutation({
    mutationFn: (payload: SendVerificationRequest) => memberVerificationApi.send(payload),
  });
}

export function useConfirmVerificationCode() {
  return useMutation({
    mutationFn: (payload: ConfirmVerificationRequest) => memberVerificationApi.confirm(payload),
  });
}
