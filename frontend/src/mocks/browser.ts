import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { memberHandlers } from './member/handlers';
import { subscriptionHandlers } from './subscription/handlers';
import { resumeHandlers } from './resume/handlers';
import { adminHandlers } from './admin/handlers';

const devAuthHandlers = [
  http.post('/api/v1/user/members/token/refresh', () =>
    HttpResponse.json({
      success: true,
      statusCode: 200,
      message: 'ok',
      data: { accessToken: 'mock-dev-token', refreshToken: 'mock-dev-refresh' },
    }),
  ),
];

export const worker = setupWorker(
  ...memberHandlers,
  ...subscriptionHandlers,
  ...devAuthHandlers,
  ...resumeHandlers,
  ...adminHandlers,
);
