import { apiClient } from '../../../utils/apiClient';
import type { EndSessionResponse } from '../../types/interview';

export function endSession(sessionId: string, signal?: AbortSignal): Promise<EndSessionResponse> {
  return apiClient(`/api/v1/user/interview/sessions/${sessionId}/end`, {
    method: 'POST',
    signal,
  }).then((res: { data: EndSessionResponse }) => res.data);
}
