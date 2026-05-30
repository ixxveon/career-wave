import { useState, useRef } from 'react';
import { uploadResume } from '../../api/resume/uploadResume';
import { validateResumeFile } from '../../utils/resume/validation';
import { resumeStorage } from '../../utils/resume/resumeStorage';
import type { ResumeUIState, UploadResumeResponse } from '../../types/resume.d';

export interface UseResumeUploadReturn {
  file: File | null;
  uiState: ResumeUIState;
  fileError: string | null;
  apiError: string | null;
  uploadResult: UploadResumeResponse | null;
  handleFileSelect: (file: File) => void;
  handleFileRemove: () => void;
  handleUpload: () => Promise<void>;
  reset: () => void;
}

/**
 * 이력서 업로드 훅
 *
 * 흐름: 파일 검증 → POST /upload → documentId sessionStorage 저장 → ANALYZING 전이
 * WebSocket 연결은 ANALYZING 전이를 감지한 상위 컴포넌트에서 시작한다.
 *
 * constitution.md §4:
 * - 검증은 반드시 validateResumeFile() 통과 후 API 요청
 * - documentId는 sessionStorage에만 저장 (localStorage 금지)
 * - 중복 요청 방지: SUBMITTING 상태에서 handleUpload 재호출 무시
 */
export function useResumeUpload(): UseResumeUploadReturn {
  const [file, setFile]               = useState<File | null>(null);
  const [uiState, setUiState]         = useState<ResumeUIState>('IDLE');
  const [fileError, setFileError]     = useState<string | null>(null);
  const [apiError, setApiError]       = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResumeResponse | null>(null);
  const abortRef                      = useRef<AbortController | null>(null);

  function handleFileSelect(f: File) {
    const result = validateResumeFile(f);
    if (!result.valid) {
      setFileError(result.message ?? '파일 검증에 실패했습니다.');
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(f);
  }

  function handleFileRemove() {
    setFile(null);
    setFileError(null);
  }

  async function handleUpload() {
    if (!file) return;
    // 중복 요청 방지 (constitution.md 체크리스트)
    if (uiState === 'SUBMITTING') return;

    // 전송 직전 재검증 (constitution.md §4 불변 규칙)
    const validation = validateResumeFile(file);
    if (!validation.valid) {
      setFileError(validation.message ?? '파일 검증에 실패했습니다.');
      return;
    }

    setUiState('SUBMITTING');
    setApiError(null);
    abortRef.current = new AbortController();

    try {
      const data = await uploadResume(file, abortRef.current.signal);

      // documentId sessionStorage 저장 (constitution.md §3)
      resumeStorage.saveDocumentId(data.documentId);
      setUploadResult(data);

      // 백엔드 UPLOADED → 프론트 ANALYZING 전이
      // (WebSocket 연결 시작은 이 상태를 감지한 상위에서 담당)
      setUiState('ANALYZING');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setApiError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setUiState('ERROR');
    }
  }

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setUiState('IDLE');
    setFileError(null);
    setApiError(null);
    setUploadResult(null);
    resumeStorage.removeDocumentId();
  }

  return {
    file,
    uiState,
    fileError,
    apiError,
    uploadResult,
    handleFileSelect,
    handleFileRemove,
    handleUpload,
    reset,
  };
}
