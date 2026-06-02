import { apiClient } from '../../../utils/apiClient';
import type { StartSessionRequest, StartSessionResponse } from '../../types/interview';

export function startSession(
  params: StartSessionRequest,
  signal?: AbortSignal,
): Promise<StartSessionResponse> {
  return apiClient('/api/v1/user/interview/sessions', {
    method: 'POST',
    body: JSON.stringify(params),
    signal,
  }).then((res: { data: StartSessionResponse }) => res.data);
}
