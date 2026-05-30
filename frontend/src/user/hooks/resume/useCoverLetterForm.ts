import { useState, useRef } from 'react';
import { submitCoverLetter } from '../../api/resume/submitCoverLetter';
import {
  validateCoverLetterForm,
  MAX_COVER_LETTER_ITEMS,
  MAX_ANSWER_LENGTH,
} from '../../utils/resume/validation';
import { resumeStorage } from '../../utils/resume/resumeStorage';
import type { ResumeUIState, SubmitCoverLetterResponse } from '../../types/resume.d';

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
  submitResult: SubmitCoverLetterResponse | null;
  canSubmit: boolean;
  setCompany: (value: string) => void;
  setJob: (value: string) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, field: keyof CoverLetterFormItem, value: string) => void;
  handleSubmit: () => Promise<void>;
  reset: () => void;
}

const INITIAL_ITEM: CoverLetterFormItem = { question: '', answer: '' };

/**
 * 자기소개서 폼 훅
 *
 * constitution.md §4 불변 규칙:
 * - 문항/답변 상태는 이 훅을 통해 일관되게 관리 (컴포넌트 개별 useState 금지)
 * - 전송 직전 validateCoverLetterForm() 재검증 필수
 * - documentId는 sessionStorage에만 저장
 * - SUBMITTING 상태 중 handleSubmit 중복 호출 무시
 */
export function useCoverLetterForm(): UseCoverLetterFormReturn {
  const [company, setCompany]           = useState('');
  const [job, setJob]                   = useState('');
  const [items, setItems]               = useState<CoverLetterFormItem[]>([{ ...INITIAL_ITEM }]);
  const [uiState, setUiState]           = useState<ResumeUIState>('IDLE');
  const [apiError, setApiError]         = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitCoverLetterResponse | null>(null);
  const abortRef                        = useRef<AbortController | null>(null);

  // 분석 버튼 활성화 조건
  const canSubmit =
    company.trim() !== '' &&
    job.trim() !== '' &&
    items.every(
      item =>
        item.question.trim() !== '' &&
        item.answer.trim() !== '' &&
        item.answer.length <= MAX_ANSWER_LENGTH,
    );

  function addItem() {
    if (items.length >= MAX_COVER_LETTER_ITEMS) return;
    setItems(prev => [...prev, { ...INITIAL_ITEM }]);
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof CoverLetterFormItem, value: string) {
    // 답변 1000자 초과 입력 차단
    if (field === 'answer' && value.length > MAX_ANSWER_LENGTH) return;
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  async function handleSubmit() {
    if (!canSubmit || uiState === 'SUBMITTING') return;

    // 전송 직전 재검증 (constitution.md §4)
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

      // documentId + uiState sessionStorage 저장 (constitution.md §3)
      resumeStorage.saveDocumentId(data.documentId);
      resumeStorage.saveUIState('ANALYZING');
      setSubmitResult(data);

      // 백엔드 UPLOADED → 프론트 ANALYZING 전이
      setUiState('ANALYZING');
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
    setCompany('');
    setJob('');
    setItems([{ ...INITIAL_ITEM }]);
    setUiState('IDLE');
    setApiError(null);
    setSubmitResult(null);
    resumeStorage.removeDocumentId();
    resumeStorage.removeUIState();
  }

  return {
    company,
    job,
    items,
    uiState,
    apiError,
    submitResult,
    canSubmit,
    setCompany,
    setJob,
    addItem,
    removeItem,
    updateItem,
    handleSubmit,
    reset,
  };
}
