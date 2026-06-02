import { useEffect, useState } from 'react';
import type { MemberApiError } from '../../utils/member/errorMapping';

export interface VerificationState {
  verificationId: string;
  verificationToken: string;
  expiresAt: string;
  resendAvailableAt: string;
  remainingAttempts: number;
}

export interface ResetSessionState {
  resetToken: string;
  expiresAt: string;
}

export const EMPTY_VERIFICATION: VerificationState = {
  verificationId: '',
  verificationToken: '',
  expiresAt: '',
  resendAvailableAt: '',
  remainingAttempts: 0,
};

export const EMPTY_RESET_SESSION: ResetSessionState = {
  resetToken: '',
  expiresAt: '',
};

export function useVerificationNow() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  return now;
}

export function getRemainingSeconds(target: string, now: number): number {
  if (!target) return 0;
  return Math.max(0, Math.ceil((new Date(target).getTime() - now) / 1000));
}

export function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const nextSeconds = seconds % 60;
  return `${minutes}:${String(nextSeconds).padStart(2, '0')}`;
}

export function getRecoveryErrorMessage(error: unknown, fallback: string, field?: string): string {
  if (error && typeof error === 'object' && 'fieldErrors' in error && field) {
    const fieldErrors = (error as MemberApiError).fieldErrors;
    if (fieldErrors?.[field]) return fieldErrors[field];
  }

  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : fallback;
}
