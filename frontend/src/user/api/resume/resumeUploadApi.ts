import type { UploadResumeResponse } from '../../types/resume.d';
import { memberApiClient } from '../member/memberApiClient';

export const resumeUploadApi = {
  upload(file: File, signal?: AbortSignal): Promise<UploadResumeResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return memberApiClient<UploadResumeResponse>('/api/v1/user/resume/upload', {
      method: 'POST',
      body: formData,
      auth: true,
      signal,
    });
  },
};
