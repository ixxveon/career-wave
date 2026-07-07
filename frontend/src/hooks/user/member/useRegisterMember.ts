import { useMutation } from '@tanstack/react-query';
import { memberRegisterApi } from '../../../api/user/member';
import { memberSocialRegisterApi } from '../../../api/user/member';
import type { CheckBusinessNumberRequest, CompanyRegisterRequest, SocialRegisterCompletionRequest, SocialResolveRequest, UserRegisterRequest } from '../../../types/user/member';

export function useRegisterUser() {
  return useMutation({
    mutationFn: (payload: UserRegisterRequest) => memberRegisterApi.registerUser(payload),
  });
}

export function useRegisterCompany() {
  return useMutation({
    mutationFn: (payload: CompanyRegisterRequest) => memberRegisterApi.registerCompany(payload),
  });
}

export function useResolveSocialRegister() {
  return useMutation({
    mutationFn: (payload: SocialResolveRequest) => memberSocialRegisterApi.resolve(payload),
  });
}

export function useCompleteSocialRegister() {
  return useMutation({
    mutationFn: (payload: SocialRegisterCompletionRequest) => memberSocialRegisterApi.complete(payload),
  });
}

export function useUploadEmploymentCertificate() {
  return useMutation({
    mutationFn: (file: File) => memberRegisterApi.uploadEmploymentCertificate(file),
  });
}

export function useCheckBusinessNumber() {
  return useMutation({
    mutationFn: (payload: CheckBusinessNumberRequest) => memberRegisterApi.checkBusinessNumber(payload),
  });
}
