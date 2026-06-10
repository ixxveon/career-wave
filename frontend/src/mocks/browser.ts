import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { memberHandlers } from './user/memberHandlers';
import { subscriptionHandlers } from './user/subscriptionHandlers';
import { resumeHandlers } from './user/resumeHandlers';
import { adminHandlers } from './admin/handlers';

const devAuthHandlers = [
  http.post('/api/v1/user/members/token/refresh', async ({ request }) => {
    const body = await request.json().catch(() => null);
    const refreshToken =
      body && typeof body === 'object' && 'refreshToken' in body
        ? String(body.refreshToken)
        : '';
    const prefix = 'mock-refresh-token-';
    const accessToken = refreshToken.startsWith(prefix)
      ? `mock-access-token-${refreshToken.slice(prefix.length)}`
      : 'mock-dev-token';
    return HttpResponse.json({
      success: true,
      statusCode: 200,
      message: 'ok',
      data: { accessToken, refreshToken: refreshToken || 'mock-dev-refresh' },
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
