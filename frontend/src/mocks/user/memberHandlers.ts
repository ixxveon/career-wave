import { http, HttpResponse } from 'msw';
import type { LoginRequest } from '../../types/user/member';


// ── 개발용 테스트 계정 ────────────────────────────────────
// 개인 (구독 없음) : testuser01   / Test1234!
// 개인 (면접만)    : testuser02   / Test1234!
// 개인 (서류만)    : testuser03   / Test1234!
// 개인 (둘 다)     : testuser04   / Test1234!
// 기업             : testcompany01 / Test1234!
// ─────────────────────────────────────────────────────────

const MOCK_PASSWORD = 'Test1234!';

const MOCK_PASSWORD_OVERRIDES: Record<string, string> = {
  admin: '1234',
};

const MOCK_ACCOUNTS: Record<string, {
  memberId: string;
  loginId: string;
  name: string;
  roleType: 'USER' | 'COMPANY';
  companyApprovalStatus: 'NONE' | 'APPROVED';
}> = {
  testuser01: {
    memberId: 'mock-user-uuid-0001',
    loginId: 'testuser01',
    name: '테스트유저(구독없음)',
    roleType: 'USER',
    companyApprovalStatus: 'NONE',
  },
  testuser02: {
    memberId: 'mock-user-uuid-0002',
    loginId: 'testuser02',
    name: '테스트유저(면접구독)',
    roleType: 'USER',
    companyApprovalStatus: 'NONE',
  },
  testuser03: {
    memberId: 'mock-user-uuid-0003',
    loginId: 'testuser03',
    name: '테스트유저(서류구독)',
    roleType: 'USER',
    companyApprovalStatus: 'NONE',
  },
  testuser04: {
    memberId: 'mock-user-uuid-0004',
    loginId: 'testuser04',
    name: '테스트유저(전체구독)',
    roleType: 'USER',
    companyApprovalStatus: 'NONE',
  },
  testcompany01: {
    memberId: 'mock-company-uuid-0001',
    loginId: 'testcompany01',
    name: '테스트기업담당자',
    roleType: 'COMPANY',
    companyApprovalStatus: 'APPROVED',
  },
  admin: {
    memberId: 'mock-admin-uuid-0001',
    loginId: 'admin',
    name: '관리자',
    roleType: 'USER',
    companyApprovalStatus: 'NONE',
  },
};

// 이미 사용 중인 loginId 목록 (중복 확인용)
const TAKEN_LOGIN_IDS = new Set(['testuser01', 'testuser02', 'testuser03', 'testuser04', 'testcompany01', 'admin']);

// 인증 세션 mock 저장소 (verificationId → verificationToken)
const MOCK_VERIFICATION_SESSIONS: Map<string, { token: string; verified: boolean }> = new Map();

export const memberHandlers = [
  // ── 로그인 ───────────────────────────────────────────────────────────────────
  http.post('/api/v1/user/members/login', async ({ request }) => {
    const body = await request.json() as unknown;
    if (!body || typeof body !== 'object' || !('loginId' in body)) {
      return HttpResponse.json(
        { success: false, statusCode: 400, message: '잘못된 요청입니다.' },
        { status: 400 },
      );
    }
    const { loginId, password } = body as LoginRequest;
    const account = MOCK_ACCOUNTS[loginId];
    const expectedPassword = MOCK_PASSWORD_OVERRIDES[loginId] ?? MOCK_PASSWORD;

    if (!account || password !== expectedPassword) {
      return HttpResponse.json(
        { success: false, statusCode: 401, message: '아이디 또는 비밀번호가 올바르지 않습니다.', code: 'AUTH_INVALID_CREDENTIALS' },
        { status: 401 },
      );
    }

    const sessionValue = `mock-refresh-token-${account.memberId}`;
    return HttpResponse.json(
      {
        success: true,
        statusCode: 200,
        message: '로그인되었습니다.',
        data: {
          accessToken: `mock-access-token-${account.memberId}`,
          member: {
            ...account,
            memberStatus: 'ACTIVE',
            subscriptionStatus: 'FREE',
            lastLoginAt: new Date().toISOString(),
          },
        },
      },
      {
        headers: {
          'Set-Cookie': `mock-session=${sessionValue}; Path=/; SameSite=Lax`,
        },
      },
    );
  }),

  // ── 토큰 갱신 — refreshToken은 response body에 포함하지 않음 ─────────────────
  http.post('/api/v1/user/members/token/refresh', ({ cookies }) => {
    const session = cookies['mock-session'];
    const prefix = 'mock-refresh-token-';
    if (!session || !session.startsWith(prefix)) {
      return HttpResponse.json(
        { success: false, statusCode: 401, message: '세션이 만료되었습니다.', code: 'AUTH_REFRESH_INVALID' },
        { status: 401 },
      );
    }
    const accessToken = `mock-access-token-${session.slice(prefix.length)}`;
    // spec: response body에 refreshToken 미포함, accessToken만 반환
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '토큰이 갱신되었습니다.',
      data: { accessToken },
    });
  }),

  // ── 로그아웃 ─────────────────────────────────────────────────────────────────
  http.post('/api/v1/user/members/logout', () => {
    return HttpResponse.json(
      { success: true, statusCode: 200, message: '로그아웃 되었습니다.' },
      {
        headers: {
          'Set-Cookie': 'mock-session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        },
      },
    );
  }),

  // ── 내 회원 상태 조회 ──────────────────────────────────────────────────────────
  http.get('/api/v1/user/members/me/status', ({ request }) => {
    const auth = request.headers.get('Authorization') ?? '';
    const memberId = auth.replace('Bearer mock-access-token-', '');
    const account = Object.values(MOCK_ACCOUNTS).find((a) => a.memberId === memberId);

    if (!account) {
      return HttpResponse.json(
        { success: false, statusCode: 401, message: '인증이 필요합니다.' },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '요청이 성공적으로 처리되었습니다.',
      data: {
        memberId: account.memberId,
        roleType: account.roleType,
        memberStatus: 'ACTIVE',
        companyApprovalStatus: account.companyApprovalStatus,
        restriction: null,
      },
    });
  }),

  // ── 로그인 아이디 중복 확인 ───────────────────────────────────────────────────
  http.get('/api/v1/user/members/login-id/check', ({ request }) => {
    const url = new URL(request.url);
    const loginId = url.searchParams.get('loginId') ?? '';

    if (!loginId.match(/^[A-Za-z0-9]{6,20}$/)) {
      return HttpResponse.json(
        { success: false, statusCode: 400, message: '아이디 형식이 올바르지 않습니다.', code: 'LOGIN_ID_INVALID' },
        { status: 400 },
      );
    }

    const available = !TAKEN_LOGIN_IDS.has(loginId);
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: available ? '사용 가능한 아이디입니다.' : '이미 사용 중인 아이디입니다.',
      data: { available },
    });
  }),

  // ── 개인회원 가입 ──────────────────────────────────────────────────────────────
  http.post('/api/v1/user/members/register/user', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const loginId = body?.loginId as string;

    if (TAKEN_LOGIN_IDS.has(loginId)) {
      return HttpResponse.json(
        { success: false, statusCode: 409, message: '이미 사용 중인 아이디입니다.', code: 'LOGIN_ID_ALREADY_EXISTS' },
        { status: 409 },
      );
    }

    const memberId = `mock-new-user-${Date.now()}`;
    TAKEN_LOGIN_IDS.add(loginId);
    return HttpResponse.json(
      {
        success: true,
        statusCode: 201,
        message: '회원가입이 완료되었습니다.',
        data: { memberId, roleType: 'USER', memberStatus: 'ACTIVE' },
      },
      { status: 201 },
    );
  }),

  // ── 기업회원 가입 ──────────────────────────────────────────────────────────────
  http.post('/api/v1/user/members/register/company', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const loginId = body?.loginId as string;

    if (TAKEN_LOGIN_IDS.has(loginId)) {
      return HttpResponse.json(
        { success: false, statusCode: 409, message: '이미 사용 중인 아이디입니다.', code: 'LOGIN_ID_ALREADY_EXISTS' },
        { status: 409 },
      );
    }

    const memberId = `mock-new-company-${Date.now()}`;
    const companyProfileId = `mock-company-profile-${Date.now()}`;
    TAKEN_LOGIN_IDS.add(loginId);
    return HttpResponse.json(
      {
        success: true,
        statusCode: 201,
        message: '기업회원 가입 신청이 접수되었습니다. 관리자 승인 후 이메일로 안내드립니다.',
        data: {
          memberId,
          companyProfileId,
          roleType: 'COMPANY',
          memberStatus: 'ACTIVE',
          companyApprovalStatus: 'PENDING_REVIEW',
        },
      },
      { status: 201 },
    );
  }),

  // ── 재직증명서 업로드 ──────────────────────────────────────────────────────────
  http.post('/api/v1/user/members/company/employment-certificate', async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return HttpResponse.json(
        { success: false, statusCode: 400, message: '파일이 없습니다.', code: 'EMPLOYMENT_FILE_INVALID' },
        { status: 400 },
      );
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return HttpResponse.json(
        { success: false, statusCode: 415, message: '재직증명서는 PDF 파일만 업로드할 수 있습니다.', code: 'EMPLOYMENT_FILE_UNSUPPORTED' },
        { status: 415 },
      );
    }

    const fakeFileId = `employment-certificates/mock-date/mock-uuid-${Date.now()}.pdf`;
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '파일이 업로드되었습니다.',
      data: {
        fileId: fakeFileId,
        originalName: file.name,
        mimeType: 'application/pdf',
        size: file.size,
        uploadedAt: new Date().toISOString(),
      },
    });
  }),

  // ── 사업자번호 사전 확인 ──────────────────────────────────────────────────────
  http.post('/api/v1/user/members/company/business-number/check', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const businessNumber = body?.businessNumber as string;

    if (!businessNumber || !/^\d{10}$/.test(businessNumber)) {
      return HttpResponse.json(
        {
          success: false,
          statusCode: 400,
          message: '입력값 검증에 실패했습니다.',
          data: { businessNumber: '사업자등록번호는 10자리 숫자입니다.' },
        },
        { status: 400 },
      );
    }
    // 로컬 개발용 — 1234567890은 정상, 나머지는 휴업으로 반환
    const isValid = businessNumber === '1234567890';
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: isValid ? '정상 영업 중인 사업자입니다.' : '정상 영업 중이 아닌 사업자입니다.',
      data: {
        valid: isValid,
        businessStatus: isValid ? 'CONTINUING' : 'SUSPENDED',
      },
    });
  }),

  // ── 인증번호 발송 ──────────────────────────────────────────────────────────────
  http.post('/api/v1/user/members/verifications/send', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const target = body?.target as string;
    const channel = body?.channel as string;

    if (!target || !channel) {
      return HttpResponse.json(
        { success: false, statusCode: 400, message: '인증 대상 형식이 올바르지 않습니다.', code: 'VERIFICATION_TARGET_INVALID' },
        { status: 400 },
      );
    }

    const verificationId = `mock-verification-${Date.now()}`;
    const verificationToken = `mock-token-${Date.now()}`;
    MOCK_VERIFICATION_SESSIONS.set(verificationId, { token: verificationToken, verified: false });

    const now = new Date();
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '인증번호가 발송되었습니다.',
      data: {
        verificationId,
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        resendAvailableAt: new Date(now.getTime() + 60 * 1000).toISOString(),
        remainingAttempts: 5,
      },
    });
  }),

  // ── 인증번호 확인 (mock 코드: 123456 항상 통과) ───────────────────────────────
  http.post('/api/v1/user/members/verifications/confirm', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const verificationId = body?.verificationId as string;
    const code = body?.code as string;

    if (code !== '123456') {
      return HttpResponse.json(
        { success: false, statusCode: 400, message: '인증번호가 일치하지 않습니다.', code: 'INVALID_VERIFICATION_CODE' },
        { status: 400 },
      );
    }

    const session = MOCK_VERIFICATION_SESSIONS.get(verificationId);
    const verificationToken = session?.token ?? `mock-verified-token-${Date.now()}`;
    if (session) {
      session.verified = true;
    }

    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '인증이 완료되었습니다.',
      data: {
        verificationToken,
        verifiedAt: new Date().toISOString(),
      },
    });
  }),

  // ── 아이디 찾기 ───────────────────────────────────────────────────────────────
  http.post('/api/v1/user/members/recovery/find-id', async () => {
    // mock: 항상 testuser01 마스킹 결과 반환
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '요청이 처리되었습니다.',
      data: {
        maskedLoginIds: ['tes***01'],
        found: true,
      },
    });
  }),

  // ── 비밀번호 재설정 권한 발급 ─────────────────────────────────────────────────
  http.post('/api/v1/user/members/recovery/password-token', async () => {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '비밀번호를 재설정할 수 있습니다.',
      data: {
        resetToken: `mock-reset-token-${Date.now()}`,
        expiresAt,
      },
    });
  }),

  // ── 비밀번호 재설정 ───────────────────────────────────────────────────────────
  http.post('/api/v1/user/members/recovery/reset-password', async () => {
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '비밀번호가 변경되었습니다.',
      data: { changedAt: new Date().toISOString() },
    });
  }),

  // ── OAuth authorize URL 생성 ─────────────────────────────────────────────────
  http.get('/api/v1/user/members/oauth/:provider/authorize', ({ params }) => {
    const provider = params.provider as string;
    const validProviders = ['kakao', 'naver', 'google'];

    if (!validProviders.includes(provider)) {
      return HttpResponse.json(
        { success: false, statusCode: 400, message: '지원하지 않는 소셜 로그인 provider입니다.', code: 'OAUTH_PROVIDER_INVALID' },
        { status: 400 },
      );
    }

    const state = `mock-state-${Date.now()}`;
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '소셜 인증 URL이 생성되었습니다.',
      data: {
        provider,
        authorizationUrl: `https://mock-oauth.careerwave.local/${provider}/authorize?state=${state}&mock=true`,
        state,
      },
    });
  }),

  // ── OAuth callback (mock: 항상 신규 가입 필요 응답) ────────────────────────────
  http.get('/api/v1/user/members/oauth/:provider/callback', ({ params, request }) => {
    const provider = params.provider as string;
    const url = new URL(request.url);
    const state = url.searchParams.get('state');

    if (!state || !state.startsWith('mock-state-')) {
      return HttpResponse.json(
        { success: false, statusCode: 400, message: '소셜 인증 요청이 유효하지 않습니다.', code: 'OAUTH_STATE_INVALID' },
        { status: 400 },
      );
    }

    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '추가정보 입력이 필요합니다.',
      data: {
        provider,
        socialEmail: `mock-social-${Date.now()}@example.com`,
        socialSignupToken: `mock-signup-token-${Date.now()}`,
        nextPath: '/register/social/complete',
      },
    });
  }),

  // ── 소셜 회원가입 추가정보 완료 ──────────────────────────────────────────────────
  http.post('/api/v1/user/members/register/social/complete', async () => {
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: '소셜 회원가입이 완료되었습니다.',
      data: {
        memberId: `mock-social-member-${Date.now()}`,
        roleType: 'USER',
        memberStatus: 'ACTIVE',
        nextPath: '/auth/login?registered=social',
      },
    });
  }),
];
