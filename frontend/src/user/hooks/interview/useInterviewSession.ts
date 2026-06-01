import { useReducer, useRef, useState, useCallback, useEffect } from 'react';
import { useSpringWebSocket }  from './useSpringWebSocket';
import { useFastApiWebSocket } from './useFastApiWebSocket';
import { useTTSQueue }         from './useTTSQueue';
import { submitTextAnswer }    from '../../api/interview/submitTextAnswer';
import { endSession }          from '../../api/interview/endSession';
import {
  saveInterviewSession,
  clearInterviewSession,
} from '../../utils/interview/sessionStorage';
import type {
  InterviewSessionState,
  Message,
  SpringWSMessage,
  FastApiWSMessage,
} from '../../types/interview';
import type { TTSQueueStatus } from './useTTSQueue';
import type { SpringWSStatus }  from './useSpringWebSocket';
import type { FastApiWSStatus } from './useFastApiWebSocket';

// ── 리듀서 ────────────────────────────────────────────────────

interface SessionReducerState {
  sessionState:   InterviewSessionState;
  messages:       Message[];
  questionOrder:  number;
  isTyping:       boolean;
  sttLiveText:    string;
  pendingVoiceId: number | null;
}

export type SessionAction =
  | { type: 'RUNNING' }
  | { type: 'RECONNECTING' }
  | { type: 'ERROR' }
  | { type: 'FINISH' }
  | { type: 'RESET' }
  | { type: 'ADD_MESSAGE';         message: Message }
  | { type: 'UPDATE_MESSAGE';      id: number; updates: Partial<Message> }
  | { type: 'REMOVE_MESSAGE';      id: number }
  | { type: 'SET_TYPING';          typing: boolean }
  | { type: 'SET_QUESTION_ORDER';  order: number }
  | { type: 'SET_STT_LIVE';        text: string }
  | { type: 'SET_PENDING_VOICE_ID'; id: number | null };

const INIT_STATE: SessionReducerState = {
  sessionState:   'READY',
  messages:       [],
  questionOrder:  1,
  isTyping:       false,
  sttLiveText:    '',
  pendingVoiceId: null,
};

/**
 * 세션 상태 머신 리듀서 (constitution.md §2)
 * 모든 상태 전이는 이 함수를 통해서만 수행
 */
function sessionReducer(
  state: SessionReducerState,
  action: SessionAction,
): SessionReducerState {
  switch (action.type) {
    case 'RUNNING':
      return { ...state, sessionState: 'RUNNING' };
    case 'RECONNECTING':
      return state.sessionState === 'RUNNING'
        ? { ...state, sessionState: 'RECONNECTING' }
        : state;
    case 'ERROR':
      return { ...state, sessionState: 'ERROR' };
    case 'FINISH':
      return { ...state, sessionState: 'FINISHED', isTyping: false };
    case 'RESET':
      return { ...INIT_STATE };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.id ? { ...m, ...action.updates } : m,
        ),
      };
    case 'REMOVE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(m => m.id !== action.id),
      };
    case 'SET_TYPING':
      return { ...state, isTyping: action.typing };
    case 'SET_QUESTION_ORDER':
      return { ...state, questionOrder: action.order };
    case 'SET_STT_LIVE':
      return { ...state, sttLiveText: action.text };
    case 'SET_PENDING_VOICE_ID':
      return { ...state, pendingVoiceId: action.id };
    default:
      return state;
  }
}

// ── 훅 인터페이스 ──────────────────────────────────────────────

export interface UseInterviewSessionOptions {
  sessionId: string | null;
}

export interface UseInterviewSessionResult {
  sessionState:    InterviewSessionState;
  messages:        Message[];
  isTyping:        boolean;
  questionOrder:   number;
  sttLiveText:     string;
  pendingVoiceId:  number | null;
  /** LLM_STREAM RAF 배치 업데이트 텍스트 — 스트리밍 중 AI 말풍선에 표시 */
  streamingText:   string;
  ttsStatus:       TTSQueueStatus;
  springWsStatus:  SpringWSStatus;
  fastApiWsStatus: FastApiWSStatus;
  dispatch:        React.Dispatch<SessionAction>;
  sendTextAnswer:  (text: string) => Promise<void>;
  finishSession:   () => Promise<void>;
}

// ── 훅 구현 ────────────────────────────────────────────────────

export function useInterviewSession({
  sessionId,
}: UseInterviewSessionOptions): UseInterviewSessionResult {
  const [state, dispatch] = useReducer(sessionReducer, INIT_STATE);
  const tts = useTTSQueue();

  const [springWsStatus,  setSpringWsStatus]  = useState<SpringWSStatus>('DISCONNECTED');
  const [fastApiWsStatus, setFastApiWsStatus] = useState<FastApiWSStatus>('DISCONNECTED');

  /**
   * LLM_STREAM 타이핑 효과
   * 매 토큰마다 setState 하지 않고 RAF로 배치 처리
   * → 리렌더링 부하 방지 (plan.md §Phase 3 스트리밍 텍스트 타이핑 효과)
   */
  const [streamingText, setStreamingText] = useState('');
  const streamingAccRef = useRef('');
  const streamingRafRef = useRef<number | null>(null);

  // 리듀서 state를 ref로 보관 — WS 콜백 내부에서 최신 state 참조
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Spring WS 메시지 핸들러 ─────────────────────────────────

  const handleSpringMessage = useCallback((msg: SpringWSMessage) => {
    switch (msg.type) {
      case 'QUESTION':
        dispatch({ type: 'SET_TYPING', typing: false });
        dispatch({
          type:    'ADD_MESSAGE',
          message: { id: Date.now(), role: 'ai', text: msg.content },
        });
        if (msg.questionOrder !== null) {
          dispatch({ type: 'SET_QUESTION_ORDER', order: msg.questionOrder });
        }
        break;
      case 'SYSTEM':
        dispatch({
          type:    'ADD_MESSAGE',
          message: { id: Date.now(), role: 'notice', text: msg.content },
        });
        if (msg.content.includes('시작')) {
          dispatch({ type: 'RUNNING' });
        } else if (msg.content.includes('완료') || msg.content.includes('생성')) {
          dispatch({ type: 'FINISH' });
        }
        break;
      case 'ERROR':
        dispatch({ type: 'ERROR' });
        break;
    }
  }, []);

  const handleSpringStatusChange = useCallback((status: SpringWSStatus) => {
    setSpringWsStatus(status);
    if (status === 'RECONNECTING') dispatch({ type: 'RECONNECTING' });
    if (status === 'ERROR')        dispatch({ type: 'ERROR' });
    if (status === 'CONNECTED' && stateRef.current.sessionState === 'RECONNECTING') {
      dispatch({ type: 'RUNNING' });
    }
  }, []);

  // ── FastAPI WS 메시지 핸들러 ────────────────────────────────

  const handleFastApiMessage = useCallback((msg: FastApiWSMessage) => {
    switch (msg.type) {
      case 'STT_RESULT': {
        const text = msg.content ?? '';
        if (msg.isFinal) {
          // 최종 STT 결과 — pending 말풍선 완료 처리
          const pid = stateRef.current.pendingVoiceId;
          if (pid !== null) {
            dispatch({ type: 'UPDATE_MESSAGE', id: pid, updates: { isPending: false, text } });
            dispatch({ type: 'SET_PENDING_VOICE_ID', id: null });
          }
          dispatch({ type: 'SET_STT_LIVE', text: '' });
          dispatch({ type: 'SET_TYPING',   typing: true });
        } else {
          // 부분 STT — 실시간 미리보기 업데이트
          dispatch({ type: 'SET_STT_LIVE', text });
          const pid = stateRef.current.pendingVoiceId;
          if (pid !== null) {
            dispatch({ type: 'UPDATE_MESSAGE', id: pid, updates: { text } });
          }
        }
        break;
      }
      case 'LLM_STREAM': {
        const token = msg.content ?? '';
        streamingAccRef.current += token;
        // RAF 배치 업데이트 — 같은 프레임의 토큰들 합산 후 한 번만 setState
        if (!streamingRafRef.current) {
          streamingRafRef.current = requestAnimationFrame(() => {
            setStreamingText(streamingAccRef.current);
            streamingRafRef.current = null;
          });
        }
        if (msg.isFinal) {
          // 스트리밍 완료 — 정식 메시지로 커밋
          if (streamingRafRef.current) {
            cancelAnimationFrame(streamingRafRef.current);
            streamingRafRef.current = null;
          }
          const finalText = streamingAccRef.current;
          streamingAccRef.current = '';
          setStreamingText('');
          dispatch({ type: 'SET_TYPING',   typing: false });
          dispatch({
            type:    'ADD_MESSAGE',
            message: { id: Date.now(), role: 'ai', text: finalText },
          });
        }
        break;
      }
      case 'TTS_AUDIO':
        if (msg.audioChunk) tts.enqueue(msg.audioChunk);
        break;
      case 'ERROR':
        // STT/LLM/TTS 처리 오류 — 연결은 유지, 토스트로 표시 (api-schema.md §8)
        dispatch({
          type:    'ADD_MESSAGE',
          message: { id: Date.now(), role: 'notice', text: '⚠️ AI 처리 중 오류가 발생했습니다.' },
        });
        break;
    }
  }, [tts]);

  const handleFastApiStatusChange = useCallback((status: FastApiWSStatus) => {
    setFastApiWsStatus(status);
    if (status === 'RECONNECTING') dispatch({ type: 'RECONNECTING' });
    if (status === 'ERROR')        dispatch({ type: 'ERROR' });
  }, []);

  // ── WebSocket 이중 연결 ─────────────────────────────────────

  useSpringWebSocket({
    sessionId,
    onMessage:      handleSpringMessage,
    onStatusChange: handleSpringStatusChange,
  });

  useFastApiWebSocket({
    sessionId,
    onMessage:      handleFastApiMessage,
    onStatusChange: handleFastApiStatusChange,
  });

  // ── sessionStorage 저장 (비정상 종료 복구용, constitution.md §상태 복원력) ──

  useEffect(() => {
    if (!sessionId || state.sessionState !== 'RUNNING') return;
    saveInterviewSession({
      sessionId,
      sessionType:   'VOICE',
      questionOrder: state.questionOrder,
      startedAt:     new Date().toISOString(),
    });
  }, [sessionId, state.sessionState, state.questionOrder]);

  useEffect(() => {
    if (state.sessionState === 'FINISHED') clearInterviewSession();
  }, [state.sessionState]);

  // ── 액션 메서드 ────────────────────────────────────────────

  const sendTextAnswer = useCallback(async (text: string) => {
    if (!sessionId || !text.trim()) return;
    dispatch({
      type:    'ADD_MESSAGE',
      message: { id: Date.now(), role: 'user', text: text.trim() },
    });
    dispatch({ type: 'SET_TYPING', typing: true });
    tts.clear();
    try {
      await submitTextAnswer(sessionId, {
        questionOrder:  stateRef.current.questionOrder,
        messageContent: text.trim(),
      });
    } catch {
      dispatch({ type: 'SET_TYPING', typing: false });
    }
  }, [sessionId, tts]);

  const finishSession = useCallback(async () => {
    if (!sessionId) return;
    tts.clear();
    dispatch({ type: 'FINISH' });
    try {
      await endSession(sessionId);
    } catch { /* 클라이언트 상태는 FINISHED 유지 */ }
    clearInterviewSession();
  }, [sessionId, tts]);

  return {
    sessionState:    state.sessionState,
    messages:        state.messages,
    isTyping:        state.isTyping,
    questionOrder:   state.questionOrder,
    sttLiveText:     state.sttLiveText,
    pendingVoiceId:  state.pendingVoiceId,
    streamingText,
    ttsStatus:       tts.status,
    springWsStatus,
    fastApiWsStatus,
    dispatch,
    sendTextAnswer,
    finishSession,
  };
}
