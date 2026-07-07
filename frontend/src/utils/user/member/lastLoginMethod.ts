import { SOCIAL_PROVIDER_LABELS, type SocialProviderId } from './socialAuth';

// 마지막 로그인 방식 — 소셜(provider) 또는 로컬(아이디/비밀번호)
export type LastLoginMethod = SocialProviderId | 'local';

const STORAGE_KEY = 'cw:last-login-method';

const SOCIAL_IDS = Object.keys(SOCIAL_PROVIDER_LABELS) as SocialProviderId[];

function isLastLoginMethod(value: string | null): value is LastLoginMethod {
  return value === 'local' || SOCIAL_IDS.includes(value as SocialProviderId);
}

// localStorage 접근은 브라우저 정책(프라이빗 모드 등)으로 예외가 날 수 있어 방어적으로 처리한다.
export function setLastLoginMethod(method: LastLoginMethod): void {
  try {
    localStorage.setItem(STORAGE_KEY, method);
  } catch {
    /* 저장 실패는 조용히 무시 — 안내 기능이라 치명적이지 않다. */
  }
}

export function getLastLoginMethod(): LastLoginMethod | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLastLoginMethod(value) ? value : null;
  } catch {
    return null;
  }
}

// 마지막 로그인이 소셜일 때만 provider id를 돌려준다(로컬/미기록이면 null).
export function getLastSocialLoginProvider(): SocialProviderId | null {
  const method = getLastLoginMethod();
  return method && method !== 'local' ? method : null;
}

export function clearLastLoginMethod(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}
