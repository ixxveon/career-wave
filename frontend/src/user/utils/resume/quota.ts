// 멤버십별 서류 분석 한도 — 백엔드 연동 전 임시 목업
// TODO: Phase 4에서 GET /api/v1/member/quota 또는 인증 정보 응답으로 교체

export const PLAN_LIMITS = {
  FREE:    { document: 1 },
  PREMIUM: { document: 20 },
} as const;

export type MembershipType = keyof typeof PLAN_LIMITS;

export const MOCK_QUOTA: { membership: MembershipType; documentUsed: number } = {
  membership:   'PREMIUM',
  documentUsed: 7,
};
