/* ── AI 면접 도메인 타입 정의 ─────────────────────────────────────── */
/* api-schema.md 계약 기준, constitution.md 상태 머신 포함        */

// ── as const 상수 (런타임 분기 시 문자열 하드코딩 방지) ──────────

export const SESSION_TYPE = {
  TEXT:  'TEXT',
  VOICE: 'VOICE',
  VIDEO: 'VIDEO',
} as const;

export const INTERVIEW_TYPE = {
  TECHNICAL:   'TECHNICAL',
  PERSONALITY: 'PERSONALITY',
  PROJECT:     'PROJECT',
} as const;

export const SESSION_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED:   'COMPLETED',
  FAILED:      'FAILED',
} as const;

export const SPRING_WS_MESSAGE_TYPE = {
  QUESTION: 'QUESTION',
  SYSTEM:   'SYSTEM',
  ERROR:    'ERROR',
} as const;

/** SYSTEM 메시지 하위 타입 (api-schema.md §7) */
export const SPRING_WS_SYSTEM_SUBTYPE = {
  SESSION_START: 'SESSION_START',
  REPORT_READY:  'REPORT_READY',
  SESSION_END:   'SESSION_END',
} as const;

export type SpringWSSystemSubType = typeof SPRING_WS_SYSTEM_SUBTYPE[keyof typeof SPRING_WS_SYSTEM_SUBTYPE];

export const FASTAPI_WS_MESSAGE_TYPE = {
  STT_RESULT: 'STT_RESULT',
  LLM_STREAM: 'LLM_STREAM',
  TTS_AUDIO:  'TTS_AUDIO',
  ERROR:      'ERROR',
} as const;

// ── 타입 별칭 ──────────────────────────────────────────────────────

export type SessionType         = typeof SESSION_TYPE[keyof typeof SESSION_TYPE];
export type InterviewType       = typeof INTERVIEW_TYPE[keyof typeof INTERVIEW_TYPE];
export type SessionStatus       = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];
export type SpringWSMessageType = typeof SPRING_WS_MESSAGE_TYPE[keyof typeof SPRING_WS_MESSAGE_TYPE];
export type FastApiWSMessageType = typeof FASTAPI_WS_MESSAGE_TYPE[keyof typeof FASTAPI_WS_MESSAGE_TYPE];

/** Frontend 상태 머신 상수 (SESSION_TYPE 패턴 동일, constitution.md §2) */
export const SESSION_STATE = {
  READY:        'READY',
  RUNNING:      'RUNNING',
  RECONNECTING: 'RECONNECTING',
  FINISHED:     'FINISHED',
  ERROR:        'ERROR',
} as const;

export type InterviewSessionState = typeof SESSION_STATE[keyof typeof SESSION_STATE];

// ── API Request DTOs ──────────────────────────────────────────────

export interface StartSessionRequest {
  documentId?: string | null;
  sessionType: SessionType;
  interviewType?: InterviewType | null;
  targetCompany?: string | null;
}

export interface SubmitTextAnswerRequest {
  questionOrder: number;
  messageContent: string;
}

// ── API Response DTOs ─────────────────────────────────────────────

export interface StartSessionResponse {
  sessionId: string;
  sessionStatus: SessionStatus;
  sessionType: SessionType;
  documentId: string | null;
  createdAt: string;
}

export interface SubmitTextAnswerResponse {
  messageId: number;
  createdAt: string;
}

export interface SubmitVoiceBlobResponse {
  chunkIndex: number;
  received: boolean;
}

export interface EndSessionResponse {
  sessionId: string;
  sessionStatus: SessionStatus;
  endedAt: string;
}

export interface FeedbackItem {
  questionOrder: number;
  questionText: string;
  answerText: string;
  relevanceScore: number | null;
  depthScore: number | null;
  /** 텍스트 면접 또는 voiceQualityRatio 50% 미만 시 null */
  deliveryScore: number | null;
  /** 텍스트 면접 또는 voiceQualityRatio 50% 미만 시 null */
  fluencyScore: number | null;
  /** 텍스트 면접 시 null */
  voiceQualityRatio: number | null;
  aiFeedback: string;
}

export interface InterviewReportResponse {
  sessionId: string;
  sessionStatus: SessionStatus;
  sessionType: SessionType;
  totalScore: number | null;
  feedbacks: FeedbackItem[];
  createdAt: string;
}

export interface HistoryItem {
  sessionId: string;
  sessionType: SessionType;
  interviewType: InterviewType | null;
  targetCompany: string | null;
  sessionStatus: SessionStatus;
  totalScore: number | null;
  createdAt: string;
}

export interface InterviewHistoryResponse {
  content: HistoryItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ── WebSocket 메시지 타입 ─────────────────────────────────────────

export interface SpringWSMessage {
  type: SpringWSMessageType;
  content: string;
  questionOrder: number | null;
  subType: SpringWSSystemSubType | null;
}

export interface FastApiWSMessage {
  type: FastApiWSMessageType;
  content: string | null;
  audioChunk: string | null;
  questionOrder: number;
  isFinal: boolean | null;
}

// ── UI 전용 타입 (기존 페이지 호환) ──────────────────────────────
import type { LucideIcon } from 'lucide-react';

export type Membership = 'FREE' | 'PREMIUM';
export type MicStatus  = 'idle' | 'testing' | 'ok' | 'error';
export type InputMode  = 'voice' | 'text';
export type Phase      = 'setup' | 'chat';
export type ReviewTag  = 'good' | 'improve';

/** UI 표시용 면접 방식 레이블 (SessionType과 구분) */
export type SessionDisplayType = 'video' | 'text' | 'voice';

export interface Resume {
  fileName: string;
  s3Url: string;
}

export interface Message {
  id: number;
  role: 'ai' | 'user' | 'notice';
  text: string;
  isVoice?: boolean;
  isPending?: boolean;
}

export interface PlanLimits {
  FREE:    { document: number; interview: number };
  PREMIUM: { document: number; interview: number };
}

export interface MockUser {
  name: string;
  membership: Membership;
  documentUsed: number;
  interviewUsed: number;
}

/** UI 전용 히스토리 표시 아이템 (InterviewHomePage mock 데이터용) */
export interface HistoryDisplayItem {
  date: string;
  type: SessionDisplayType;
  typeLabel: string;
  target: string;
  score: number;
}

export interface Report {
  company: string;
  job: string;
  date: string;
  type: SessionDisplayType;
  totalScore: number;
  grade: string;
  membership: Membership;
}

export interface Metric {
  Icon: LucideIcon;
  emoji: string;
  label: string;
  value: number | null;
  unit: string;
  color: string;
  desc: string;
  voiceOnly: boolean;
}

export interface Review {
  q: string;
  a: string;
  feedback: string;
  score: number;
  tag: ReviewTag;
}

export interface ImprovementItem {
  metricLabel?: string;
  title: string;
  desc: string;
  cta: string;
  to: string;
}
