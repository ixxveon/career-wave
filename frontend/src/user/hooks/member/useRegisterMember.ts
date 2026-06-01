import { useMutation } from '@tanstack/react-query';
import { memberRegisterApi } from '../../api/member';
import type { CompanyRegisterRequest, UserRegisterRequest } from '../../types/member';

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

export function useUploadEmploymentCertificate() {
  return useMutation({
    mutationFn: (file: File) => memberRegisterApi.uploadEmploymentCertificate(file),
  });
}
