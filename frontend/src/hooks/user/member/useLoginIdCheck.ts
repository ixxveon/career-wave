import { useMutation } from '@tanstack/react-query';
import { memberRegisterApi } from '../../../api/user/member';

export function useLoginIdCheck() {
  return useMutation({
    mutationFn: (loginId: string) => memberRegisterApi.checkLoginId(loginId),
  });
}
