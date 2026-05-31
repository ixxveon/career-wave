/**
 * MediaRecorder MIME 타입 분기
 * Safari는 WebM 미지원 → OGG/MP4 사용 (constitution.md §3 오디오 캡처 정책)
 */

const PREFERRED_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

export function getSupportedMimeType(): string {
  for (const type of PREFERRED_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'bin';
}

export function buildVoiceChunkFormData(
  blob: Blob,
  questionOrder: number,
  chunkIndex: number,
  isFinal: boolean,
): FormData {
  const fd = new FormData();
  const ext = getFileExtension(blob.type);
  fd.append('audioChunk', blob, `chunk_q${questionOrder}_${chunkIndex}.${ext}`);
  fd.append('questionOrder', String(questionOrder));
  fd.append('chunkIndex', String(chunkIndex));
  fd.append('isFinal', String(isFinal));
  return fd;
}
