import { http, HttpResponse } from 'msw';
import type { LoginRequest } from '../../types/user/member';


// ── 개발용 테스트 계정 ────────────────────────────────────────────
// 개인 (구독 없음) : testuser01   / Test1234!
// 개인 (면접만)    : testuser02   / Test1234!
// 개인 (서류만)    : testuser03   / Test1234!
// 개인 (둘 다)     : testuser04   / Test1234!
// 기업             : testcompany01 / Test1234!
// ─────────────────────────────────────────────────────────────────

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

export const memberHandlers = [
  // 로그인
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
        { success: false, statusCode: 401, message: '아이디 또는 비밀번호가 올바르지 않습니다.' },
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
          refreshToken: sessionValue,
          member: {
            ...account,
            memberStatus: 'ACTIVE',
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

  // 토큰 갱신 - 쿠키에 세션이 있을 때만 성공 (F5 새로고침 후에도 유지됨)
  http.post('/api/v1/user/members/token/refresh', ({ cookies }) => {
    const session = cookies['mock-session'];
    if (!session) {
      return HttpResponse.json(
        { success: false, statusCode: 401, message: '세션이 만료되었습니다.' },
        { status: 401 },
      );
    }
    const prefix = 'mock-refresh-token-';
    const accessToken = `mock-access-token-${session.slice(prefix.length)}`;
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: 'ok',
      data: { accessToken, refreshToken: session },
    });
  }),

  // 로그아웃 - 쿠키 삭제
  http.post('/api/v1/user/members/logout', () => {
    return HttpResponse.json(
      { success: true, statusCode: 200, message: '로그아웃되었습니다.' },
      {
        headers: {
          'Set-Cookie': 'mock-session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        },
      },
    );
  }),

  // 내 회원 상태 조회
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
];
