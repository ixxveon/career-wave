import { memberApiClient } from '../member/memberApiClient';
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
    return memberApiClient<StartSessionResponse>('/api/v1/user/interview/sessions', {
      method: 'POST',
      auth:   true,
      body:   JSON.stringify(params),
      signal,
    });
  },

  end(sessionId: string, signal?: AbortSignal): Promise<EndSessionResponse> {
    return memberApiClient<EndSessionResponse>(`/api/v1/user/interview/sessions/${encodeURIComponent(sessionId)}/end`, {
      method: 'POST',
      auth:   true,
      signal,
    });
  },

  submitTextAnswer(
    sessionId: string,
    params: SubmitTextAnswerRequest,
    signal?: AbortSignal,
  ): Promise<SubmitTextAnswerResponse> {
    return memberApiClient<SubmitTextAnswerResponse>(
      `/api/v1/user/interview/sessions/${encodeURIComponent(sessionId)}/answer/text`,
      {
        method: 'POST',
        auth:   true,
        body:   JSON.stringify(params),
        signal,
      },
    );
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

    return memberApiClient<SubmitVoiceBlobResponse>(
      `/api/v1/user/interview/sessions/${encodeURIComponent(sessionId)}/answer/voice`,
      {
        method: 'POST',
        auth:   true,
        body:   fd,
        signal,
      },
    );
  },
};
