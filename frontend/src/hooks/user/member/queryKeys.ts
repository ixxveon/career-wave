import type { MemberType, VerificationChannel, VerificationPurpose } from '../../../types/user/member';

export const memberQueryKeys = {
  all: ['member'] as const,
  me: () => [...memberQueryKeys.all, 'me'] as const,
  status: () => [...memberQueryKeys.me(), 'status'] as const,
  loginId: (loginId: string) => [...memberQueryKeys.all, 'login-id', loginId] as const,
  verification: (channel: VerificationChannel, purpose: VerificationPurpose, target: string) =>
    [...memberQueryKeys.all, 'verification', channel, purpose, target] as const,
  recovery: (memberType: MemberType) => [...memberQueryKeys.all, 'recovery', memberType] as const,
};
