import type { MemberApiError } from './errorMapping';
import { RECOVERY_METHOD, type RecoveryMethod } from './recoverySchema';

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

export function createUserVerificationState(): Record<RecoveryMethod, VerificationState> {
  return {
    [RECOVERY_METHOD.EMAIL]: { ...EMPTY_VERIFICATION },
    [RECOVERY_METHOD.PHONE]: { ...EMPTY_VERIFICATION },
  };
}

export function toVerificationSnapshot(verification: VerificationState): string {
  return [
    verification.verificationId,
    verification.verificationToken,
    verification.expiresAt,
    verification.resendAvailableAt,
  ].join('|');
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
