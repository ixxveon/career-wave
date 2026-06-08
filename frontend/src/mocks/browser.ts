import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { memberHandlers } from './user/memberHandlers';
import { subscriptionHandlers } from './user/subscriptionHandlers';
import { resumeHandlers } from './user/resumeHandlers';
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
