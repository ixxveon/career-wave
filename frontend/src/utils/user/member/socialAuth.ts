export const SOCIAL_PROVIDER_LABELS = {
  kakao: '카카오',
  naver: '네이버',
  google: 'Google',
} as const;

export type SocialProviderId = keyof typeof SOCIAL_PROVIDER_LABELS;

export const SOCIAL_PROVIDERS: ReadonlyArray<{
  id: SocialProviderId;
  label: (typeof SOCIAL_PROVIDER_LABELS)[SocialProviderId];
  mark?: string;
}> = [
  { id: 'kakao', label: SOCIAL_PROVIDER_LABELS.kakao, mark: 'K' },
  { id: 'naver', label: SOCIAL_PROVIDER_LABELS.naver, mark: 'N' },
  { id: 'google', label: SOCIAL_PROVIDER_LABELS.google, mark: 'G' },
] as const;

export function getSocialProviderLabel(provider: string | null | undefined): string | null {
  if (!provider) return null;

  return SOCIAL_PROVIDER_LABELS[provider as SocialProviderId] ?? null;
}
