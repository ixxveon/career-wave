// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memberSocialAuthApi } from './socialAuthApi';
import type {
  OAuthAuthorizeResponse,
  OAuthCallbackLoginResponse,
  OAuthCallbackSignupRequiredResponse,
  MemberSummary,
} from '../../../types/user/member';

vi.mock('../../../utils/user/member/authSession', () => ({
  authSession: {
    getAccessToken: vi.fn().mockReturnValue(null),
    setAccessToken: vi.fn(),
    clear: vi.fn(),
  },
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const stubMember: MemberSummary = {
  memberId: '1',
  loginId: 'social01',
  name: '홍길동',
  roleType: 'USER',
  memberStatus: 'ACTIVE',
  subscriptionStatus: 'FREE',
  companyApprovalStatus: 'NONE',
  lastLoginAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── authorize ───────────────────────────────────────────────────────────────

describe('memberSocialAuthApi.authorize', () => {
  it('GET /api/v1/user/members/oauth/{provider}/authorize 를 호출하고 authorizationUrl을 반환한다', async () => {
    const body: OAuthAuthorizeResponse = {
      provider: 'kakao',
      authorizationUrl: 'https://kauth.kakao.com/oauth/authorize?client_id=xxx&state=abc',
      state: 'abc',
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ data: body }));

    const result = await memberSocialAuthApi.authorize('kakao');

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/oauth/kakao/authorize');
    expect(result.authorizationUrl).toContain('kauth.kakao.com');
    expect(result.state).toBe('abc');
    expect(result.provider).toBe('kakao');
  });

  it('naver provider로 authorize 호출 시 URL에 naver가 포함된다', async () => {
    const body: OAuthAuthorizeResponse = {
      provider: 'naver',
      authorizationUrl: 'https://nid.naver.com/oauth2.0/authorize?...',
      state: 'xyz',
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ data: body }));

    await memberSocialAuthApi.authorize('naver');

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/oauth/naver/authorize');
  });
});

// ─── callback — 기존 계정 로그인 분기 ────────────────────────────────────────────

describe('memberSocialAuthApi.callback — 기존 계정 로그인', () => {
  it('기존 소셜 계정이면 accessToken을 포함한 OAuthCallbackLoginResponse를 반환한다', async () => {
    const body: OAuthCallbackLoginResponse = {
      accessToken: 'bearer-access-token',
      member: stubMember,
      nextPath: '/',
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ data: body }));

    const result = await memberSocialAuthApi.callback('kakao', 'code-abc', 'state-xyz');

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('/oauth/kakao/callback');
    expect(String(url)).toContain('code=code-abc');
    expect(String(url)).toContain('state=state-xyz');
    expect('accessToken' in result).toBe(true);
    expect((result as OAuthCallbackLoginResponse).accessToken).toBe('bearer-access-token');
  });

  it('OAuthCallbackLoginResponse에는 refreshToken 필드가 포함되지 않는다', async () => {
    const body: OAuthCallbackLoginResponse = {
      accessToken: 'access-only',
      member: stubMember,
      nextPath: '/',
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ data: body }));

    const result = await memberSocialAuthApi.callback('kakao', 'code', 'state');

    expect('refreshToken' in result).toBe(false);
  });
});

// ─── callback — 최초 소셜 사용자 추가정보 필요 분기 ──────────────────────────────────

describe('memberSocialAuthApi.callback — 최초 소셜 사용자', () => {
  it('최초 소셜 사용자이면 socialSignupToken을 포함한 OAuthCallbackSignupRequiredResponse를 반환한다', async () => {
    const body: OAuthCallbackSignupRequiredResponse = {
      provider: 'naver',
      socialEmail: 'user@naver.com',
      socialSignupToken: 'signup-token-xyz',
      nextPath: '/register/social',
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ data: body }));

    const result = await memberSocialAuthApi.callback('naver', 'code-naver', 'state-naver');

    expect('socialSignupToken' in result).toBe(true);
    expect((result as OAuthCallbackSignupRequiredResponse).socialSignupToken).toBe('signup-token-xyz');
    expect((result as OAuthCallbackSignupRequiredResponse).provider).toBe('naver');
  });

  it('provider email이 null이어도 OAuthCallbackSignupRequiredResponse를 정상 반환한다', async () => {
    const body: OAuthCallbackSignupRequiredResponse = {
      provider: 'google',
      socialEmail: null,
      socialSignupToken: 'signup-token-google',
      nextPath: '/register/social',
    };
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ data: body }));

    const result = await memberSocialAuthApi.callback('google', 'code-google', 'state-google');

    const typed = result as OAuthCallbackSignupRequiredResponse;
    expect(typed.socialEmail).toBeNull();
    expect(typed.socialSignupToken).toBe('signup-token-google');
  });
});

// ─── callback — invalid state (서버 400) ─────────────────────────────────────

describe('memberSocialAuthApi.callback — invalid state', () => {
  it('state 불일치 시 서버 400 응답에서 예외가 전파된다', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          statusCode: 400,
          message: 'OAuth state가 유효하지 않습니다.',
          code: 'OAUTH_STATE_INVALID',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(
      memberSocialAuthApi.callback('kakao', 'code-x', 'wrong-state'),
    ).rejects.toThrow();
  });
});
