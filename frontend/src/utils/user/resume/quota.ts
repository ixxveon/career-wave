// 멤버십별 서류 분석 한도 — 백엔드 연동 전 임시 목업
// TODO: 백엔드 회원 정보 API 구현 후 GET /api/v1/member/quota (또는 인증 토큰 payload) 로 교체 필요

export const PLAN_LIMITS = {
  FREE:    { document: 1 },
  PREMIUM: { document: 20 },
} as const;

export type MembershipType = keyof typeof PLAN_LIMITS;

export const MOCK_QUOTA: { membership: MembershipType; documentUsed: number } = {
  membership:   'PREMIUM',
  documentUsed: 7,
};
