// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useInterviewSession, LLM_FALLBACK_QUESTIONS } from './useInterviewSession';
import { LLM_STREAM_TIMEOUT_MS } from '../../constants/interview';

// interviewSessionApi mock — sendTextAnswer가 즉시 resolve되도록
vi.mock('../../api/interview', () => ({
  interviewSessionApi: {
    submitTextAnswer: vi.fn().mockResolvedValue({}),
    submitVoiceBlob:  vi.fn().mockResolvedValue({}),
    start:            vi.fn().mockResolvedValue({}),
    end:              vi.fn().mockResolvedValue({}),
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

/**
 * LLM 타임아웃 폴백 흐름 테스트 (spec FR-005)
 * vi.useFakeTimers()로 8초 대기 없이 검증
 * sendTextAnswer → startLlmTimeout → 8초 후 폴백 질문 삽입
 */

const DEFAULT_OPTS = { sessionId: 'test-session', sessionType: 'TEXT' };

beforeEach(() => {
  vi.useFakeTimers();
  // DEV mock 경로 우회 — import.meta.env.DEV를 false로 강제 설정
  (import.meta.env as Record<string, unknown>).DEV = false;
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  (import.meta.env as Record<string, unknown>).DEV = true;
});

/** sendTextAnswer 호출 → startLlmTimeout 트리거 헬퍼 */
async function triggerTimeout(result: ReturnType<typeof renderHook<ReturnType<typeof useInterviewSession>, typeof DEFAULT_OPTS>>['result']) {
  act(() => { result.current.dispatch({ type: 'RUNNING' }); });
  await act(async () => { await result.current.sendTextAnswer('답변 내용'); });
}

describe('LLM 타임아웃 폴백', () => {

  it('8초 내 토큰 미수신 시 폴백 질문이 채팅창에 삽입된다', async () => {
    const { result } = renderHook(() => useInterviewSession(DEFAULT_OPTS), { wrapper });

    await triggerTimeout(result);
    act(() => { vi.advanceTimersByTime(LLM_STREAM_TIMEOUT_MS); });

    const aiMessages = result.current.messages.filter(m => m.role === 'ai');
    expect(aiMessages.length).toBeGreaterThan(0);
    expect(LLM_FALLBACK_QUESTIONS).toContain(aiMessages[aiMessages.length - 1].text);
  });

  it('폴백 발동 후 isTyping이 false가 된다', async () => {
    const { result } = renderHook(() => useInterviewSession(DEFAULT_OPTS), { wrapper });

    await triggerTimeout(result);
    expect(result.current.isTyping).toBe(true);

    act(() => { vi.advanceTimersByTime(LLM_STREAM_TIMEOUT_MS); });

    expect(result.current.isTyping).toBe(false);
  });

  it('폴백 발동 후 questionOrder가 1 증가한다', async () => {
    const { result } = renderHook(() => useInterviewSession(DEFAULT_OPTS), { wrapper });

    act(() => { result.current.dispatch({ type: 'SET_QUESTION_ORDER', order: 2 }); });
    await triggerTimeout(result);
    act(() => { vi.advanceTimersByTime(LLM_STREAM_TIMEOUT_MS); });

    expect(result.current.questionOrder).toBe(3);
  });

  it('8초 이전에는 폴백이 발동되지 않는다', async () => {
    const { result } = renderHook(() => useInterviewSession(DEFAULT_OPTS), { wrapper });

    await triggerTimeout(result);
    act(() => { vi.advanceTimersByTime(LLM_STREAM_TIMEOUT_MS - 1000); });

    expect(result.current.isTyping).toBe(true);
    expect(result.current.messages.filter(m => m.role === 'ai')).toHaveLength(0);
  });

  it('isTyping이 false면 8초 경과해도 폴백이 발동되지 않는다', async () => {
    const { result } = renderHook(() => useInterviewSession(DEFAULT_OPTS), { wrapper });

    act(() => { result.current.dispatch({ type: 'RUNNING' }); });
    // sendTextAnswer 없이 타이머만 경과 → isTyping이 false이므로 폴백 미발동
    act(() => { vi.advanceTimersByTime(LLM_STREAM_TIMEOUT_MS); });

    expect(result.current.messages.filter(m => m.role === 'ai')).toHaveLength(0);
  });
});
