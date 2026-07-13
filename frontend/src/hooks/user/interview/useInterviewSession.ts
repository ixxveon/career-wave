import { useReducer, useRef, useState, useCallback, useEffect } from 'react';
import { LLM_STREAM_TIMEOUT_MS, MAX_QUESTION_COUNT } from '../../../constants/user/interview';
import { useInvalidateInterviewHistory } from './useInterviewReport';
import { useSpringWebSocket }  from './useSpringWebSocket';
import { useFastApiWebSocket } from './useFastApiWebSocket';
import { useTTSQueue }         from './useTTSQueue';
import { interviewSessionApi }  from '../../../api/user/interview';
import {
  saveInterviewSession,
  clearInterviewSession,
} from '../../../utils/user/interview/sessionStorage';
import type {
  InterviewSessionState,
  Message,
  SpringWSMessage,
  FastApiWSMessage,
} from '../../../types/user/interview';
import {
  SPRING_WS_MESSAGE_TYPE,
  SPRING_WS_SYSTEM_SUBTYPE,
  FASTAPI_WS_MESSAGE_TYPE,
  SESSION_STATE,
  SESSION_TYPE,
} from '../../../types/user/interview';
import type { TTSQueueStatus } from './useTTSQueue';
import type { SpringWSStatus }  from './useSpringWebSocket';
import type { FastApiWSStatus } from './useFastApiWebSocket';

/**
 * LLM 응답 타임아웃 시 사전 정의 폴백 질문 (spec FR-005)
 * 8초 내 첫 스트리밍 토큰이 없으면 이 목록에서 순환 선택
 */
export const LLM_FALLBACK_QUESTIONS = [
  '지원 동기에 대해 좀 더 구체적으로 말씀해 주시겠어요?',
  '본인의 강점과 약점을 각각 하나씩 말씀해 주세요.',
  '팀 프로젝트에서 갈등이 생겼을 때 어떻게 해결하셨나요?',
  '가장 어려웠던 기술적 문제와 해결 방법을 설명해 주세요.',
  '5년 후 커리어 목표를 말씀해 주세요.',
];


/** DEV mock 자동 꼬리 질문 (백엔드 미연동 시) */
const DEV_MOCK_REPLIES = [
  '답변 감사합니다. 해당 기술적 선택의 근거는 무엇이었나요?',
  '좋습니다. 팀 협업 시 의견 충돌이 생겼을 때 어떻게 해결하셨나요?',
  '인상적이네요. 본인의 강점과 약점을 각각 말씀해 주세요.',
  '마지막 질문입니다. 입사 후 3년간의 커리어 목표를 말씀해 주세요.',
  '수고하셨습니다! AI가 답변을 분석하여 리포트를 생성하고 있습니다.',
];

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

export const INIT_STATE: SessionReducerState = {
  sessionState:   SESSION_STATE.READY,
  messages:       [],
  questionOrder:  1,
  isTyping:       false,
  sttLiveText:    '',
  pendingVoiceId: null,
};

/**
 * 세션 상태 머신 리듀서 (constitution.md §2)
 * 모든 상태 전이는 이 함수를 통해서만 수행
 * @internal — 테스트 전용 export
 */
export function sessionReducer(
  state: SessionReducerState,
  action: SessionAction,
): SessionReducerState {
  switch (action.type) {
    case 'RUNNING':
      return { ...state, sessionState: SESSION_STATE.RUNNING };
    case 'RECONNECTING':
      return state.sessionState === SESSION_STATE.RUNNING
        ? { ...state, sessionState: SESSION_STATE.RECONNECTING }
        : state;
    case 'ERROR':
      return { ...state, sessionState: SESSION_STATE.ERROR };
    case 'FINISH':
      return { ...state, sessionState: SESSION_STATE.FINISHED, isTyping: false };
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
  sessionId:            string | null;
  sessionType:          string;
  /** sessionStorage 복구 시 이전 questionOrder 주입 (constitution §상태 복원력) */
  initialQuestionOrder?: number;
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
  /** QUESTION 수신 ~ TTS 재생 완료 사이 마이크 잠금 (음성 면접 전용) */
  awaitingTts:     boolean;
  springWsStatus:  SpringWSStatus;
  fastApiWsStatus: FastApiWSStatus;
  dispatch:        React.Dispatch<SessionAction>;
  sendTextAnswer:  (text: string, skipAddMessage?: boolean) => Promise<void>;
  finishSession:   () => Promise<void>;
}

function mergeTtsChunks(chunks: string[]): string {
  const binaries = chunks.map(b64 => atob(b64));
  const combined = binaries.join('');
  return btoa(combined);
}

// ── 훅 구현 ────────────────────────────────────────────────────

export function useInterviewSession({
  sessionId,
  sessionType,
  initialQuestionOrder,
}: UseInterviewSessionOptions): UseInterviewSessionResult {
  const [state, dispatch] = useReducer(
    sessionReducer,
    initialQuestionOrder && initialQuestionOrder > 1
      ? { ...INIT_STATE, questionOrder: initialQuestionOrder }
      : INIT_STATE,
  );
  const tts = useTTSQueue({
    onError: () => dispatch({
      type:    'ADD_MESSAGE',
      message: { id: Date.now(), role: 'notice', text: '⚠️ 음성 재생에 실패했습니다. 면접은 계속 진행됩니다.' },
    }),
  });

  const [awaitingTts, setAwaitingTts] = useState(false);

  // TTS 재생이 완전히 끝나면(idle) 잠금 해제
  useEffect(() => {
    if (tts.status === 'idle') setAwaitingTts(false);
  }, [tts.status]);

  const [springWsStatus,  setSpringWsStatus]  = useState<SpringWSStatus>('DISCONNECTED');
  const [fastApiWsStatus, setFastApiWsStatus] = useState<FastApiWSStatus>('DISCONNECTED');
  const springWsStatusRef  = useRef<SpringWSStatus>('DISCONNECTED');
  const fastApiWsStatusRef = useRef<FastApiWSStatus>('DISCONNECTED');

  /**
   * LLM_STREAM 타이핑 효과
   * 매 토큰마다 setState 하지 않고 RAF로 배치 처리
   * → 리렌더링 부하 방지 (plan.md §Phase 3 스트리밍 텍스트 타이핑 효과)
   */
  const [streamingText, setStreamingText] = useState('');
  const streamingAccRef    = useRef('');
  const streamingRafRef    = useRef<number | null>(null);
  const sendTextAnswerRef  = useRef<(text: string, skipAddMessage?: boolean) => Promise<void>>(async () => {});
  /**
   * 폴백이 발동된 questionOrder — turn 범위로 중복 메시지 방지
   * null: 폴백 미발동 / 숫자: 해당 questionOrder turn의 isFinal 무시
   */
  const llmFallbackFiredRef  = useRef<number | null>(null);
  const ttsChunkBufferRef    = useRef<string[]>([]);

  // 리듀서 state를 ref로 보관 — WS 콜백 내부에서 최신 state 참조
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  /**
   * LLM 응답 타임아웃 (spec FR-005 / constitution.md §7)
   * SET_TYPING(true) 후 LLM_STREAM_TIMEOUT_MS 내 첫 토큰 미수신 시
   * 사전 정의 폴백 질문을 채팅창에 삽입하고 타이핑 상태를 해제한다.
   */

  const llmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearLlmTimeout() {
    if (llmTimeoutRef.current !== null) {
      clearTimeout(llmTimeoutRef.current);
      llmTimeoutRef.current = null;
    }
  }

  function startLlmTimeout() {
    clearLlmTimeout();
    // 새 turn 시작 — 이전 turn의 폴백 플래그 초기화 (voice/text 경로 공통)
    llmFallbackFiredRef.current = null;
    llmTimeoutRef.current = setTimeout(() => {
      // 아직 typing 중이고 스트리밍이 시작 안 된 경우에만 폴백
      if (!stateRef.current.isTyping) return;
      if (streamingAccRef.current.length > 0) return;

      streamingAccRef.current = '';
      // 현재 questionOrder를 기록 — 이 turn의 늦은 isFinal만 suppress
      llmFallbackFiredRef.current = stateRef.current.questionOrder;
      const nextOrder = stateRef.current.questionOrder + 1;
      dispatch({ type: 'SET_TYPING', typing: false });
      dispatch({
        type:    'ADD_MESSAGE',
        message: {
          id:   Date.now(),
          role: 'ai',
          text: LLM_FALLBACK_QUESTIONS[
            stateRef.current.questionOrder % LLM_FALLBACK_QUESTIONS.length
          ],
        },
      });
      dispatch({ type: 'SET_QUESTION_ORDER', order: nextOrder });
    }, LLM_STREAM_TIMEOUT_MS);
  }

  // ── Spring WS 메시지 핸들러 ─────────────────────────────────

  const handleSpringMessage = useCallback((msg: SpringWSMessage) => {
    switch (msg.type) {
      case SPRING_WS_MESSAGE_TYPE.QUESTION:
        dispatch({ type: 'SET_TYPING', typing: false });
        dispatch({
          type:    'ADD_MESSAGE',
          message: { id: Date.now(), role: 'ai', text: msg.content },
        });
        if (msg.questionOrder !== null) {
          dispatch({ type: 'SET_QUESTION_ORDER', order: msg.questionOrder });
          if (msg.questionOrder > MAX_QUESTION_COUNT) {
            if (sessionId) interviewSessionApi.end(sessionId).catch(() => {});
            clearInterviewSession();
            dispatch({ type: 'FINISH' });
          }
        }
        // 음성 면접: QUESTION 수신 ~ TTS 재생 완료 사이 마이크 잠금
        // ttsStatus는 TTS_AUDIO_END 수신 후에야 loading으로 바뀌므로 별도 플래그 필요
        if (sessionType === SESSION_TYPE.VOICE) setAwaitingTts(true);
        break;
      case SPRING_WS_MESSAGE_TYPE.SYSTEM:
        dispatch({
          type:    'ADD_MESSAGE',
          message: { id: Date.now(), role: 'notice', text: msg.content },
        });
        // subType 기반 상태 전이 (api-schema.md §7)
        if (msg.subType === SPRING_WS_SYSTEM_SUBTYPE.SESSION_START) {
          dispatch({ type: 'RUNNING' });
        } else if (msg.subType === SPRING_WS_SYSTEM_SUBTYPE.REPORT_READY) {
          dispatch({ type: 'FINISH' });
        }
        break;
      case SPRING_WS_MESSAGE_TYPE.ERROR:
        dispatch({ type: 'ERROR' });
        break;
    }
  }, [sessionType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpringStatusChange = useCallback((status: SpringWSStatus) => {
    springWsStatusRef.current = status;
    setSpringWsStatus(status);
    if (status === 'RECONNECTING') dispatch({ type: 'RECONNECTING' });
    // DEV 모드: 백엔드 없을 때 WS ERROR를 무시하고 RUNNING으로 유지
    if (status === 'ERROR') {
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') return;
      dispatch({ type: 'ERROR' });
    }
    if (
      status === 'CONNECTED' &&
      fastApiWsStatusRef.current === 'CONNECTED' &&
      stateRef.current.sessionState === SESSION_STATE.RECONNECTING
    ) {
      dispatch({ type: 'RUNNING' });
    }
  }, []);

  // ── FastAPI WS 메시지 핸들러 ────────────────────────────────

  const handleFastApiMessage = useCallback((msg: FastApiWSMessage) => {
    switch (msg.type) {
      case FASTAPI_WS_MESSAGE_TYPE.STT_RESULT:
      case FASTAPI_WS_MESSAGE_TYPE.STT_FINAL: {
        const text = msg.content ?? '';
        const pid = stateRef.current.pendingVoiceId;
        if (pid !== null) {
          if (text) {
            dispatch({ type: 'UPDATE_MESSAGE', id: pid, updates: { isPending: false, text } });
          } else {
            // 무음/hallucination → pending 말풍선 제거 (ANSWER_HINT가 notice로 대체)
            dispatch({ type: 'REMOVE_MESSAGE', id: pid });
          }
          dispatch({ type: 'SET_PENDING_VOICE_ID', id: null });
        }
        dispatch({ type: 'SET_STT_LIVE', text: '' });
        // 음성 경로: pending 말풍선이 이미 있으므로 ADD_MESSAGE 없이 서버 전송만
        // 빈 transcript는 Spring에 제출하지 않음 — 다음 질문으로 넘어가는 것을 방지
        if (text) sendTextAnswerRef.current(text, true);
        break;
      }
      case FASTAPI_WS_MESSAGE_TYPE.STT_PARTIAL: {
        const text = msg.content ?? '';
        dispatch({ type: 'SET_STT_LIVE', text });
        const pid = stateRef.current.pendingVoiceId;
        if (pid !== null) {
          dispatch({ type: 'UPDATE_MESSAGE', id: pid, updates: { text } });
        }
        break;
      }
      case FASTAPI_WS_MESSAGE_TYPE.LLM_STREAM: {
        const token = msg.content ?? '';
        // 첫 토큰 수신 → 타임아웃 취소 (정상 응답 진행)
        if (streamingAccRef.current.length === 0) clearLlmTimeout();
        streamingAccRef.current += token;
        // RAF 배치 업데이트 — 같은 프레임의 토큰들 합산 후 한 번만 setState
        if (!streamingRafRef.current) {
          streamingRafRef.current = requestAnimationFrame(() => {
            setStreamingText(streamingAccRef.current);
            streamingRafRef.current = null;
          });
        }
        if (msg.isFinal) {
          // 스트리밍 완료 — 타임아웃 취소 후 정식 메시지로 커밋
          clearLlmTimeout();
          if (streamingRafRef.current) {
            cancelAnimationFrame(streamingRafRef.current);
            streamingRafRef.current = null;
          }
          const finalText = streamingAccRef.current;
          streamingAccRef.current = '';
          setStreamingText('');
          // 이 turn에 폴백이 발동됐으면 늦게 도착한 isFinal은 무시 (turn 범위 suppress)
          if (llmFallbackFiredRef.current === msg.questionOrder) {
            llmFallbackFiredRef.current = null;
            break;
          }
          dispatch({ type: 'SET_TYPING',   typing: false });
          dispatch({
            type:    'ADD_MESSAGE',
            message: { id: Date.now(), role: 'ai', text: finalText },
          });
        }
        break;
      }
      case FASTAPI_WS_MESSAGE_TYPE.TTS_AUDIO:
        if (msg.audioChunk) ttsChunkBufferRef.current.push(msg.audioChunk);
        break;
      case FASTAPI_WS_MESSAGE_TYPE.TTS_AUDIO_END: {
        if (ttsChunkBufferRef.current.length > 0) {
          const merged = mergeTtsChunks(ttsChunkBufferRef.current);
          ttsChunkBufferRef.current = [];
          tts.enqueue(merged);
        } else {
          // 청크 미도착 = TTS 생성 실패 — tts.status가 idle 그대로이므로 수동 해제
          setAwaitingTts(false);
        }
        break;
      }
      case FASTAPI_WS_MESSAGE_TYPE.ANSWER_HINT:
        if (msg.content) {
          dispatch({
            type:    'ADD_MESSAGE',
            message: { id: Date.now(), role: 'notice', text: msg.content },
          });
        }
        break;
      case FASTAPI_WS_MESSAGE_TYPE.ERROR:
        // STT/LLM/TTS 처리 오류 — 연결은 유지, 토스트로 표시 (api-schema.md §8)
        dispatch({
          type:    'ADD_MESSAGE',
          message: { id: Date.now(), role: 'notice', text: '⚠️ AI 처리 중 오류가 발생했습니다.' },
        });
        break;
    }
  }, [tts]);

  const handleFastApiStatusChange = useCallback((status: FastApiWSStatus) => {
    fastApiWsStatusRef.current = status;
    setFastApiWsStatus(status);
    if (status === 'RECONNECTING') dispatch({ type: 'RECONNECTING' });
    if (
      status === 'CONNECTED' &&
      springWsStatusRef.current === 'CONNECTED' &&
      stateRef.current.sessionState === SESSION_STATE.RECONNECTING
    ) {
      dispatch({ type: 'RUNNING' });
    }
    if (status === 'ERROR') {
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') return;
      dispatch({ type: 'ERROR' });
    }
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
    if (!sessionId || state.sessionState !== SESSION_STATE.RUNNING) return;
    saveInterviewSession({
      sessionId,
      sessionType,
      questionOrder: state.questionOrder,
      startedAt:     new Date().toISOString(),
    });
  }, [sessionId, state.sessionState, state.questionOrder]);

  useEffect(() => {
    if (state.sessionState === SESSION_STATE.FINISHED) {
      clearInterviewSession();
      clearLlmTimeout();
    }
  }, [state.sessionState]);

  // 언마운트 시 타임아웃 정리
  useEffect(() => () => clearLlmTimeout(), []);

  // ── 액션 메서드 ────────────────────────────────────────────

  const sendTextAnswer = useCallback(async (text: string, skipAddMessage = false) => {
    if (!sessionId) return;
    if (!skipAddMessage && text.trim()) {
      dispatch({
        type:    'ADD_MESSAGE',
        message: { id: Date.now(), role: 'user', text: text.trim() },
      });
    }
    dispatch({ type: 'SET_TYPING', typing: true });
    tts.clear();
    llmFallbackFiredRef.current = null;
    if (import.meta.env.VITE_USE_MOCK_DATA !== 'true') startLlmTimeout();

    // DEV mock: API 호출 없이 다음 질문 자동 생성
    if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      const currentQ = stateRef.current.questionOrder;
      setTimeout(() => {
        if (currentQ >= 5) {
          dispatch({ type: 'FINISH' });
          return;
        }
        dispatch({ type: 'SET_TYPING', typing: false });
        dispatch({
          type:    'ADD_MESSAGE',
          message: { id: Date.now(), role: 'ai', text: DEV_MOCK_REPLIES[Math.min(currentQ - 1, DEV_MOCK_REPLIES.length - 1)] },
        });
        dispatch({ type: 'SET_QUESTION_ORDER', order: currentQ + 1 });
      }, 1200);
      return;
    }

    try {
      // 빈 답변(무음·STT 실패)도 서버에 전송하여 FastAPI 폴백 질문 트리거를 보장
      await interviewSessionApi.submitTextAnswer(sessionId, {
        questionOrder:  stateRef.current.questionOrder,
        messageContent: text.trim(),
      });
    } catch {
      dispatch({ type: 'SET_TYPING', typing: false });
    }
  }, [sessionId, tts]); // eslint-disable-line react-hooks/exhaustive-deps

  sendTextAnswerRef.current = sendTextAnswer;

  const invalidateHistory = useInvalidateInterviewHistory();

  const finishSession = useCallback(async () => {
    if (!sessionId) return;
    tts.clear();
    dispatch({ type: 'FINISH' });
    try {
      await interviewSessionApi.end(sessionId);
    } catch { /* 클라이언트 상태는 FINISHED 유지 */ }
    clearInterviewSession();
    invalidateHistory();
  }, [sessionId, tts, invalidateHistory]);

  return {
    sessionState:    state.sessionState,
    messages:        state.messages,
    isTyping:        state.isTyping,
    questionOrder:   state.questionOrder,
    sttLiveText:     state.sttLiveText,
    pendingVoiceId:  state.pendingVoiceId,
    streamingText,
    ttsStatus:       tts.status,
    awaitingTts,
    springWsStatus,
    fastApiWsStatus,
    dispatch,
    sendTextAnswer,
    finishSession,
  };
}
