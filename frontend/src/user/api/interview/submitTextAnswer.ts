import { apiClient } from '../../../utils/apiClient';
import type { SubmitTextAnswerRequest, SubmitTextAnswerResponse } from '../../types/interview';

export function submitTextAnswer(
  sessionId: string,
  params: SubmitTextAnswerRequest,
): Promise<SubmitTextAnswerResponse> {
  return apiClient(`/v1/interview/sessions/${sessionId}/answer/text`, {
    method: 'POST',
    body: JSON.stringify(params),
  }).then((res: { data: SubmitTextAnswerResponse }) => res.data);
}
