import { describe, it, expect } from 'vitest';
import { sessionReducer, INIT_STATE } from './useInterviewSession';
import type { SessionAction } from './useInterviewSession';

/**
 * 세션 상태 머신 전이 테스트 (constitution.md §2)
 * 허용된 전이만 통과하고, 금지된 전이는 상태를 유지한다.
 */

// ── 헬퍼 ─────────────────────────────────────────
function reduce(state = INIT_STATE, action: SessionAction) {
  return sessionReducer(state, action);
}

function withState(sessionState: typeof INIT_STATE['sessionState']) {
  return { ...INIT_STATE, sessionState };
}

// ══════════════════════════════════════════════════
// 정상 전이
// ══════════════════════════════════════════════════
describe('정상 전이', () => {

  it('READY → RUNNING', () => {
    const next = reduce(withState('READY'), { type: 'RUNNING' });
    expect(next.sessionState).toBe('RUNNING');
  });

  it('RUNNING → RECONNECTING', () => {
    const next = reduce(withState('RUNNING'), { type: 'RECONNECTING' });
    expect(next.sessionState).toBe('RECONNECTING');
  });

  it('RECONNECTING → RUNNING', () => {
    const next = reduce(withState('RECONNECTING'), { type: 'RUNNING' });
    expect(next.sessionState).toBe('RUNNING');
  });

  it('RECONNECTING → ERROR', () => {
    const next = reduce(withState('RECONNECTING'), { type: 'ERROR' });
    expect(next.sessionState).toBe('ERROR');
  });

  it('RUNNING → FINISHED (FINISH 액션)', () => {
    const next = reduce(withState('RUNNING'), { type: 'FINISH' });
    expect(next.sessionState).toBe('FINISHED');
  });

  it('FINISH 시 isTyping이 false로 강제 전환된다', () => {
    const state = { ...withState('RUNNING'), isTyping: true };
    const next  = reduce(state, { type: 'FINISH' });
    expect(next.isTyping).toBe(false);
  });

  it('ANY → READY (RESET 액션)', () => {
    for (const s of ['RUNNING', 'RECONNECTING', 'ERROR', 'FINISHED'] as const) {
      const next = reduce(withState(s), { type: 'RESET' });
      expect(next.sessionState).toBe('READY');
    }
  });

  it('RUNNING → ERROR', () => {
    const next = reduce(withState('RUNNING'), { type: 'ERROR' });
    expect(next.sessionState).toBe('ERROR');
  });
});

// ══════════════════════════════════════════════════
// 금지된 전이 — 상태 유지 보장
// ══════════════════════════════════════════════════
describe('금지된 전이 — 상태 불변', () => {

  it('READY 상태에서 RECONNECTING 액션은 무시된다', () => {
    const next = reduce(withState('READY'), { type: 'RECONNECTING' });
    expect(next.sessionState).toBe('READY');
  });

  it('FINISHED 상태에서 RECONNECTING 액션은 무시된다', () => {
    const next = reduce(withState('FINISHED'), { type: 'RECONNECTING' });
    expect(next.sessionState).toBe('FINISHED');
  });

  it('ERROR 상태에서 RECONNECTING 액션은 무시된다', () => {
    const next = reduce(withState('ERROR'), { type: 'RECONNECTING' });
    expect(next.sessionState).toBe('ERROR');
  });
});

// ══════════════════════════════════════════════════
// 메시지 관련 액션
// ══════════════════════════════════════════════════
describe('메시지 액션', () => {

  it('ADD_MESSAGE — 메시지가 추가된다', () => {
    const msg = { id: 1, role: 'ai' as const, text: '안녕하세요.' };
    const next = reduce(INIT_STATE, { type: 'ADD_MESSAGE', message: msg });
    expect(next.messages).toHaveLength(1);
    expect(next.messages[0].text).toBe('안녕하세요.');
  });

  it('UPDATE_MESSAGE — 해당 id 메시지만 업데이트된다', () => {
    const state = reduce(INIT_STATE, {
      type: 'ADD_MESSAGE',
      message: { id: 1, role: 'user', text: '원본' },
    });
    const next = reduce(state, { type: 'UPDATE_MESSAGE', id: 1, updates: { text: '수정됨' } });
    expect(next.messages[0].text).toBe('수정됨');
  });

  it('REMOVE_MESSAGE — 해당 id 메시지가 제거된다', () => {
    const state = reduce(INIT_STATE, {
      type: 'ADD_MESSAGE',
      message: { id: 1, role: 'ai', text: '삭제될 메시지' },
    });
    const next = reduce(state, { type: 'REMOVE_MESSAGE', id: 1 });
    expect(next.messages).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════
// 기타 액션
// ══════════════════════════════════════════════════
describe('기타 액션', () => {

  it('SET_TYPING — isTyping이 변경된다', () => {
    const next = reduce(INIT_STATE, { type: 'SET_TYPING', typing: true });
    expect(next.isTyping).toBe(true);
  });

  it('SET_QUESTION_ORDER — questionOrder가 변경된다', () => {
    const next = reduce(INIT_STATE, { type: 'SET_QUESTION_ORDER', order: 3 });
    expect(next.questionOrder).toBe(3);
  });

  it('SET_STT_LIVE — sttLiveText가 변경된다', () => {
    const next = reduce(INIT_STATE, { type: 'SET_STT_LIVE', text: '안녕' });
    expect(next.sttLiveText).toBe('안녕');
  });

  it('SET_PENDING_VOICE_ID — pendingVoiceId가 변경된다', () => {
    const next = reduce(INIT_STATE, { type: 'SET_PENDING_VOICE_ID', id: 42 });
    expect(next.pendingVoiceId).toBe(42);
  });

  it('RESET — 초기 상태로 완전히 되돌아간다', () => {
    const dirty = {
      ...withState('ERROR'),
      messages:      [{ id: 1, role: 'ai' as const, text: '메시지' }],
      questionOrder: 5,
      isTyping:      true,
    };
    const next = reduce(dirty, { type: 'RESET' });
    expect(next).toEqual(INIT_STATE);
  });
});
