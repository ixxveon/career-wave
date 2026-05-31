import { apiClient } from '../../../utils/apiClient';
import type { EndSessionResponse } from '../../types/interview';

export function endSession(sessionId: string): Promise<EndSessionResponse> {
  return apiClient(`/v1/interview/sessions/${sessionId}/end`, {
    method: 'POST',
  }).then((res: { data: EndSessionResponse }) => res.data);
}
