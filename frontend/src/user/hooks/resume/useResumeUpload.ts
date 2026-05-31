import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadResume } from '../../api/resume/uploadResume';
import { getAnalysisResult } from '../../api/resume/getAnalysisResult';
import { validateResumeFile } from '../../utils/resume/validation';
import { resumeStorage } from '../../utils/resume/resumeStorage';
import { useAnalysisWebSocket } from './useAnalysisWebSocket';
import type {
  ResumeUIState,
  UploadResumeResponse,
  AnalysisResultResponse,
  WsStatusMessage,
} from '../../types/resume.d';

export interface UseResumeUploadReturn {
  file: File | null;
  uiState: ResumeUIState;
  fileError: string | null;
  apiError: string | null;
  networkError: boolean;
  wsMessage: WsStatusMessage | null;
  uploadResult: UploadResumeResponse | null;
  analysisResult: AnalysisResultResponse | null;
  handleFileSelect: (file: File) => void;
  handleFileRemove: () => void;
  handleUpload: () => Promise<void>;
  reset: () => void;
  dismissNetworkError: () => void;
}

/**
 * 이력서 업로드 훅
 *
 * 흐름: 파일 검증 → POST /upload → documentId 저장 → WebSocket 연결 → 분석 완료
 *
 * constitution.md §4:
 * - 검증은 반드시 validateResumeFile() 통과 후 API 요청
 * - documentId는 sessionStorage에만 저장 (localStorage 금지)
 * - 중복 요청 방지: SUBMITTING 상태에서 handleUpload 재호출 무시
 *
 * sessionStorage 복원:
 * - 마운트 시 저장된 documentId + UIState === 'ANALYZING' 이면 WebSocket 재연결
 */
export function useResumeUpload(): UseResumeUploadReturn {
  const [file, setFile]                       = useState<File | null>(null);
  const [uiState, setUiState]                 = useState<ResumeUIState>('IDLE');
  const [fileError, setFileError]             = useState<string | null>(null);
  const [apiError, setApiError]               = useState<string | null>(null);
  const [networkError, setNetworkError]       = useState(false);
  const [wsMessage, setWsMessage]             = useState<WsStatusMessage | null>(null);
  const [uploadResult, setUploadResult]       = useState<UploadResumeResponse | null>(null);
  const [analysisResult, setAnalysisResult]   = useState<AnalysisResultResponse | null>(null);
  const abortRef                              = useRef<AbortController | null>(null);
  const documentIdRef                         = useRef<string | null>(null);

  const handleCompleted = useCallback(async () => {
    resumeStorage.removeUIState();
    if (documentIdRef.current) {
      try {
        const result = await getAnalysisResult(documentIdRef.current);
        setAnalysisResult(result);
      } catch {
        // 결과 조회 실패 시에도 SUCCESS로 전이 — 재조회는 Phase 4 리포트 페이지에서 처리
      }
    }
    setUiState('SUCCESS');
  }, []);

  const handleFailed = useCallback((message: string) => {
    resumeStorage.removeUIState();
    setApiError(message);
    setUiState('ERROR');
  }, []);

  const handleNetworkError = useCallback(() => {
    setNetworkError(true);
  }, []);

  const { connect, disconnect } = useAnalysisWebSocket({
    onMessage: setWsMessage,
    onCompleted: handleCompleted,
    onFailed: handleFailed,
    onNetworkError: handleNetworkError,
  });

  // sessionStorage 복원 — 새로고침 후 ANALYZING 상태 복구
  useEffect(() => {
    const savedDocumentId = resumeStorage.getDocumentId();
    const savedUIState    = resumeStorage.getUIState();
    if (savedDocumentId && savedUIState === 'ANALYZING') {
      documentIdRef.current = savedDocumentId;
      setUiState('ANALYZING');
      connect(savedDocumentId);
    }
    return () => { disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!file || uiState === 'SUBMITTING') return;

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

      resumeStorage.saveDocumentId(data.documentId);
      resumeStorage.saveUIState('ANALYZING');
      documentIdRef.current = data.documentId;
      setUploadResult(data);
      setUiState('ANALYZING');

      // WebSocket 연결 시작 (UPLOADED → ANALYZING 전이)
      connect(data.documentId);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setApiError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setUiState('ERROR');
    }
  }

  function reset() {
    abortRef.current?.abort();
    disconnect();
    setFile(null);
    setUiState('IDLE');
    setFileError(null);
    setApiError(null);
    setNetworkError(false);
    setWsMessage(null);
    setUploadResult(null);
    setAnalysisResult(null);
    documentIdRef.current = null;
    resumeStorage.removeDocumentId();
    resumeStorage.removeUIState();
  }

  return {
    file,
    uiState,
    fileError,
    apiError,
    networkError,
    wsMessage,
    uploadResult,
    analysisResult,
    handleFileSelect,
    handleFileRemove,
    handleUpload,
    reset,
    dismissNetworkError: () => setNetworkError(false),
  };
}
