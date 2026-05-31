import { apiClient } from '../../../utils/apiClient';
import type { SubmitVoiceBlobResponse } from '../../types/interview';

export interface SubmitVoiceBlobParams {
  blob: Blob;
  questionOrder: number;
  chunkIndex: number;
  isFinal: boolean;
}

export function submitVoiceBlob(
  sessionId: string,
  { blob, questionOrder, chunkIndex, isFinal }: SubmitVoiceBlobParams,
): Promise<SubmitVoiceBlobResponse> {
  const fd = new FormData();
  fd.append('audioChunk', blob);
  fd.append('questionOrder', String(questionOrder));
  fd.append('chunkIndex', String(chunkIndex));
  fd.append('isFinal', String(isFinal));

  return apiClient(`/v1/interview/sessions/${sessionId}/answer/voice`, {
    method: 'POST',
    body: fd,
  }).then((res: { data: SubmitVoiceBlobResponse }) => res.data);
}
