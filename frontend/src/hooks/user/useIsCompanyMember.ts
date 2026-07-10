import { useAuth } from './useAuth';
import { useDashboardProfile } from './dashboard';
import { MEMBER_TYPE } from '../../types/user/member';

/**
 * 현재 로그인한 회원이 기업(COMPANY) 회원인지 여부.
 * QA #1140 — 기업 회원에게는 개인 전용 서비스(서류 AI/AI 면접/구독·결제 등)를 노출하지 않는다.
 * 비로그인 상태이거나 프로필 로딩 전에는 false 를 반환한다.
 */
export function useIsCompanyMember(): boolean {
  const { isLoggedIn } = useAuth();
  const { data: profile } = useDashboardProfile(isLoggedIn);
  return profile?.roleType === MEMBER_TYPE.COMPANY;
}
