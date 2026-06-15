import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { memberHandlers } from './user/memberHandlers';
import { subscriptionHandlers } from './user/subscriptionHandlers';
import { resumeHandlers } from './user/resumeHandlers';
import { adminHandlers } from './admin/handlers';

const devAuthHandlers = [
  http.post('/api/v1/user/members/token/refresh', () => {
    // spec: refreshToken은 HttpOnly cookie로만 전달. body에 refreshToken 없음.
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: 'ok',
      data: { accessToken: 'mock-dev-access-token' },
    });
  }),
];

export const worker = setupWorker(
  ...memberHandlers,
  ...subscriptionHandlers,
  ...devAuthHandlers,
  ...resumeHandlers,
  ...adminHandlers,
);
