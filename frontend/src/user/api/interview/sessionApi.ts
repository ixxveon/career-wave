import { apiClient } from '../../../utils/apiClient';
import type {
  StartSessionRequest,
  StartSessionResponse,
  SubmitTextAnswerRequest,
  SubmitTextAnswerResponse,
  SubmitVoiceBlobResponse,
  EndSessionResponse,
} from '../../types/interview';

export interface SubmitVoiceBlobParams {
  blob: Blob;
  questionOrder: number;
  chunkIndex: number;
  isFinal: boolean;
}

export const interviewSessionApi = {
  start(params: StartSessionRequest, signal?: AbortSignal): Promise<StartSessionResponse> {
    return apiClient('/api/v1/user/interview/sessions', {
      method: 'POST',
      body: JSON.stringify(params),
      signal,
    }).then((res: { data: StartSessionResponse }) => res.data);
  },

  end(sessionId: string, signal?: AbortSignal): Promise<EndSessionResponse> {
    return apiClient(`/api/v1/user/interview/sessions/${sessionId}/end`, {
      method: 'POST',
      signal,
    }).then((res: { data: EndSessionResponse }) => res.data);
  },

  submitTextAnswer(
    sessionId: string,
    params: SubmitTextAnswerRequest,
    signal?: AbortSignal,
  ): Promise<SubmitTextAnswerResponse> {
    return apiClient(`/api/v1/user/interview/sessions/${sessionId}/answer/text`, {
      method: 'POST',
      body: JSON.stringify(params),
      signal,
    }).then((res: { data: SubmitTextAnswerResponse }) => res.data);
  },

  submitVoiceBlob(
    sessionId: string,
    { blob, questionOrder, chunkIndex, isFinal }: SubmitVoiceBlobParams,
    signal?: AbortSignal,
  ): Promise<SubmitVoiceBlobResponse> {
    const fd = new FormData();
    fd.append('audioChunk', blob);
    fd.append('questionOrder', String(questionOrder));
    fd.append('chunkIndex', String(chunkIndex));
    fd.append('isFinal', String(isFinal));

    return apiClient(`/api/v1/user/interview/sessions/${sessionId}/answer/voice`, {
      method: 'POST',
      body: fd,
      signal,
    }).then((res: { data: SubmitVoiceBlobResponse }) => res.data);
  },
};
