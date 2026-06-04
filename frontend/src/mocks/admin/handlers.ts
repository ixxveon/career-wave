import { http, HttpResponse } from 'msw';
import type { AdminLoginRequest, AdminLoginResponse, ApiResponse } from '../../admin/api/adminAuthApi';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const adminHandlers = [
  // POST /api/v1/admin/auth/login
  http.post('/api/v1/admin/auth/login', async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as AdminLoginRequest;

    if (body.loginId === 'admin' && body.password === '1234') {
      const payload: ApiResponse<AdminLoginResponse> = {
        success: true,
        statusCode: 200,
        message: '로그인에 성공했습니다.',
        data: {
          accessToken: 'mock-admin-access-token',
          adminInfo: {
            id: 'ADM-0001',
            name: 'super_admin',
            role: 'MASTER',
          },
        },
      };
      return HttpResponse.json(payload);
    }

    return HttpResponse.json(
      {
        success: false,
        statusCode: 401,
        message: '아이디 또는 비밀번호가 올바르지 않습니다.',
        data: null,
      } as ApiResponse<null>,
      { status: 401 }
    );
  }),

  // POST /api/v1/admin/auth/logout
  http.post('/api/v1/admin/auth/logout', async () => {
    await delay(200);
    const payload: ApiResponse<null> = {
      success: true,
      statusCode: 200,
      message: '로그아웃되었습니다.',
      data: null,
    };
    return HttpResponse.json(payload);
  }),
];
