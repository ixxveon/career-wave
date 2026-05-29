/* ── AI 면접 공통 타입 ─────────────────────────────────────── */

import type { LucideIcon } from 'lucide-react';

export type Membership = 'FREE' | 'PREMIUM';
export type InterviewType = 'text' | 'voice';
export type MicStatus = 'idle' | 'testing' | 'ok' | 'error';
export type InputMode = 'voice' | 'text';
export type HistoryType = 'video' | 'text';
export type ReviewTag = 'good' | 'improve';
export type Phase = 'setup' | 'chat';

export interface Resume {
  fileName: string;
  s3Url: string;
}

export interface SetupApiResponse {
  resumeFileName: string;
  resumeS3Url: string;
}

export interface StartSessionParams {
  targetJob: string;
  targetCompany: string;
  resumeS3Url: string;
}

export interface Message {
  id: number;
  role: 'ai' | 'user' | 'notice';
  text: string;
  isVoice?: boolean;
  isPending?: boolean;
}

export interface PlanLimits {
  FREE: { document: number; interview: number };
  PREMIUM: { document: number; interview: number };
}

export interface MockUser {
  name: string;
  membership: Membership;
  documentUsed: number;
  interviewUsed: number;
}

export interface HistoryItem {
  date: string;
  type: HistoryType;
  typeLabel: string;
  target: string;
  score: number;
}

export interface Report {
  company: string;
  job: string;
  date: string;
  type: InterviewType;
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
