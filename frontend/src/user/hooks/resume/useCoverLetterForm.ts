import { useState, useRef, useCallback, useEffect } from 'react';
import { submitCoverLetter } from '../../api/resume/submitCoverLetter';
import { getAnalysisResult } from '../../api/resume/getAnalysisResult';
import {
  validateCoverLetterForm,
  MAX_COVER_LETTER_ITEMS,
  MAX_ANSWER_LENGTH,
} from '../../utils/resume/validation';
import { resumeStorage } from '../../utils/resume/resumeStorage';
import { useAnalysisWebSocket } from './useAnalysisWebSocket';
import type {
  ResumeUIState,
  SubmitCoverLetterResponse,
  AnalysisResultResponse,
  WsStatusMessage,
} from '../../types/resume.d';

export interface CoverLetterFormItem {
  question: string;
  answer: string;
}

export interface UseCoverLetterFormReturn {
  company: string;
  job: string;
  items: CoverLetterFormItem[];
  uiState: ResumeUIState;
  apiError: string | null;
  networkError: boolean;
  wsMessage: WsStatusMessage | null;
  submitResult: SubmitCoverLetterResponse | null;
  analysisResult: AnalysisResultResponse | null;
  canSubmit: boolean;
  setCompany: (value: string) => void;
  setJob: (value: string) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, field: keyof CoverLetterFormItem, value: string) => void;
  handleSubmit: () => Promise<void>;
  reset: () => void;
  dismissNetworkError: () => void;
}

const INITIAL_ITEM: CoverLetterFormItem = { question: '', answer: '' };

/**
 * 자기소개서 폼 훅
 *
 * constitution.md §4:
 * - 문항/답변 상태는 이 훅을 통해 일관되게 관리 (컴포넌트 개별 useState 금지)
 * - 전송 직전 validateCoverLetterForm() 재검증 필수
 * - documentId는 sessionStorage에만 저장
 *
 * sessionStorage 복원:
 * - 마운트 시 저장된 documentId + UIState === 'ANALYZING' 이면 WebSocket 재연결
 */
export function useCoverLetterForm(): UseCoverLetterFormReturn {
  const [company, setCompany]             = useState('');
  const [job, setJob]                     = useState('');
  const [items, setItems]                 = useState<CoverLetterFormItem[]>([{ ...INITIAL_ITEM }]);
  const [uiState, setUiState]             = useState<ResumeUIState>('IDLE');
  const [apiError, setApiError]           = useState<string | null>(null);
  const [networkError, setNetworkError]   = useState(false);
  const [wsMessage, setWsMessage]         = useState<WsStatusMessage | null>(null);
  const [submitResult, setSubmitResult]   = useState<SubmitCoverLetterResponse | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultResponse | null>(null);
  const abortRef                          = useRef<AbortController | null>(null);
  const documentIdRef                     = useRef<string | null>(null);

  const canSubmit =
    company.trim() !== '' &&
    job.trim() !== '' &&
    items.every(
      item =>
        item.question.trim() !== '' &&
        item.answer.trim() !== '' &&
        item.answer.length <= MAX_ANSWER_LENGTH,
    );

  const handleCompleted = useCallback(async () => {
    resumeStorage.removeUIState('COVER_LETTER');
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
    resumeStorage.removeUIState('COVER_LETTER');
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
    const savedDocumentId = resumeStorage.getDocumentId('COVER_LETTER');
    const savedUIState    = resumeStorage.getUIState('COVER_LETTER');
    if (savedDocumentId && savedUIState === 'ANALYZING') {
      documentIdRef.current = savedDocumentId;
      setUiState('ANALYZING');
      connect(savedDocumentId);
    }
    return () => { disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addItem() {
    if (items.length >= MAX_COVER_LETTER_ITEMS) return;
    setItems(prev => [...prev, { ...INITIAL_ITEM }]);
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof CoverLetterFormItem, value: string) {
    if (field === 'answer' && value.length > MAX_ANSWER_LENGTH) return;
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  async function handleSubmit() {
    if (!canSubmit || uiState === 'SUBMITTING') return;

    const validation = validateCoverLetterForm(company, job, items);
    if (!validation.valid) {
      setApiError(validation.message ?? '입력값을 확인해주세요.');
      return;
    }

    setUiState('SUBMITTING');
    setApiError(null);
    abortRef.current = new AbortController();

    try {
      const data = await submitCoverLetter(
        {
          company,
          job,
          content: items.map((item, idx) => ({
            order: idx + 1,
            question: item.question,
            answer: item.answer,
          })),
        },
        abortRef.current.signal,
      );

      resumeStorage.saveDocumentId('COVER_LETTER', data.documentId);
      resumeStorage.saveUIState('COVER_LETTER', 'ANALYZING');
      documentIdRef.current = data.documentId;
      setSubmitResult(data);
      setUiState('ANALYZING');

      // WebSocket 연결 시작
      connect(data.documentId);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setApiError(
        err instanceof Error
          ? err.message
          : '제출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      );
      setUiState('ERROR');
    }
  }

  function reset() {
    abortRef.current?.abort();
    disconnect();
    setCompany('');
    setJob('');
    setItems([{ ...INITIAL_ITEM }]);
    setUiState('IDLE');
    setApiError(null);
    setNetworkError(false);
    setWsMessage(null);
    setSubmitResult(null);
    setAnalysisResult(null);
    documentIdRef.current = null;
    resumeStorage.removeDocumentId('COVER_LETTER');
    resumeStorage.removeUIState('COVER_LETTER');
  }

  return {
    company,
    job,
    items,
    uiState,
    apiError,
    networkError,
    wsMessage,
    submitResult,
    analysisResult,
    canSubmit,
    setCompany,
    setJob,
    addItem,
    removeItem,
    updateItem,
    handleSubmit,
    reset,
    dismissNetworkError: () => setNetworkError(false),
  };
}
