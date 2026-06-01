import type {
  CheckLoginIdResponse,
  CompanyRegisterRequest,
  CompanyRegisterResponse,
  EmploymentCertificateUploadResponse,
  UserRegisterRequest,
  UserRegisterResponse,
} from '../../types/member';
import { memberApiClient } from './memberApiClient';

export const memberRegisterApi = {
  checkLoginId(loginId: string): Promise<CheckLoginIdResponse> {
    const params = new URLSearchParams({ loginId });
    return memberApiClient<CheckLoginIdResponse>(`/api/v1/members/login-id/check?${params.toString()}`);
  },

  registerUser(payload: UserRegisterRequest): Promise<UserRegisterResponse> {
    return memberApiClient<UserRegisterResponse>('/api/v1/members/register/user', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  registerCompany(payload: CompanyRegisterRequest): Promise<CompanyRegisterResponse> {
    return memberApiClient<CompanyRegisterResponse>('/api/v1/members/register/company', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadEmploymentCertificate(file: File): Promise<EmploymentCertificateUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return memberApiClient<EmploymentCertificateUploadResponse>('/api/v1/members/company/employment-certificate', {
      method: 'POST',
      body: formData,
    });
  },
};
