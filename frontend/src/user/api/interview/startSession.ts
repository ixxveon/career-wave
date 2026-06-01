import { apiClient } from '../../../utils/apiClient';
import type { StartSessionRequest, StartSessionResponse } from '../../types/interview';

export function startSession(params: StartSessionRequest): Promise<StartSessionResponse> {
  return apiClient('/v1/interview/sessions', {
    method: 'POST',
    body: JSON.stringify(params),
  }).then((res: { data: StartSessionResponse }) => res.data);
}
