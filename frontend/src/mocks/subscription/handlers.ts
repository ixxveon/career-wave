import { http, HttpResponse } from 'msw';

// 계정별 구독 시나리오
// testuser01: 구독 없음
// testuser02: AI 모의면접만 구독
// testuser03: 서류 AI 코칭만 구독
// testuser04: 두 상품 모두 구독
// testcompany01: 구독 없음

const NOW = new Date();
const NEXT_MONTH = new Date(NOW.getFullYear(), NOW.getMonth() + 1, NOW.getDate()).toISOString();
const LAST_MONTH = new Date(NOW.getFullYear(), NOW.getMonth() - 1, NOW.getDate()).toISOString();

const MOCK_SUBSCRIPTIONS: Record<string, object[]> = {
  'mock-user-uuid-0001': [],
  'mock-user-uuid-0002': [
    {
      subscriptionId: 'sub-interview-0002',
      productCode: 'interview',
      productName: 'AI 모의면접',
      status: 'ACTIVE',
      startedAt: LAST_MONTH,
      currentPeriodStart: LAST_MONTH,
      currentPeriodEnd: NEXT_MONTH,
      nextBillingAt: NEXT_MONTH,
      cancelScheduledAt: null,
    },
  ],
  'mock-user-uuid-0003': [
    {
      subscriptionId: 'sub-document-0003',
      productCode: 'document-coaching',
      productName: '서류 AI 코칭',
      status: 'ACTIVE',
      startedAt: LAST_MONTH,
      currentPeriodStart: LAST_MONTH,
      currentPeriodEnd: NEXT_MONTH,
      nextBillingAt: NEXT_MONTH,
      cancelScheduledAt: null,
    },
  ],
  'mock-user-uuid-0004': [
    {
      subscriptionId: 'sub-interview-0004',
      productCode: 'interview',
      productName: 'AI 모의면접',
      status: 'ACTIVE',
      startedAt: LAST_MONTH,
      currentPeriodStart: LAST_MONTH,
      currentPeriodEnd: NEXT_MONTH,
      nextBillingAt: NEXT_MONTH,
      cancelScheduledAt: null,
    },
    {
      subscriptionId: 'sub-document-0004',
      productCode: 'document-coaching',
      productName: '서류 AI 코칭',
      status: 'ACTIVE',
      startedAt: LAST_MONTH,
      currentPeriodStart: LAST_MONTH,
      currentPeriodEnd: NEXT_MONTH,
      nextBillingAt: NEXT_MONTH,
      cancelScheduledAt: null,
    },
  ],
  'mock-company-uuid-0001': [],
};

const MOCK_USAGES: Record<string, object[]> = {
  'mock-user-uuid-0002': [
    { productCode: 'interview', limit: 20, used: 5, remaining: 15, unit: 'session', resetAt: NEXT_MONTH },
  ],
  'mock-user-uuid-0003': [
    { productCode: 'document-coaching', limit: 30, used: 8, remaining: 22, unit: 'analysis', resetAt: NEXT_MONTH },
  ],
  'mock-user-uuid-0004': [
    { productCode: 'interview', limit: 20, used: 3, remaining: 17, unit: 'session', resetAt: NEXT_MONTH },
    { productCode: 'document-coaching', limit: 30, used: 12, remaining: 18, unit: 'analysis', resetAt: NEXT_MONTH },
  ],
};

const MOCK_ENTITLEMENTS: Record<string, object> = {
  'mock-user-uuid-0001': { 'document-coaching': false, interview: false },
  'mock-user-uuid-0002': { 'document-coaching': false, interview: true },
  'mock-user-uuid-0003': { 'document-coaching': true, interview: false },
  'mock-user-uuid-0004': { 'document-coaching': true, interview: true },
  'mock-company-uuid-0001': { 'document-coaching': false, interview: false },
};

function getMemberId(request: Request): string {
  const auth = request.headers.get('Authorization') ?? '';
  return auth.replace('Bearer mock-access-token-', '');
}

export const subscriptionHandlers = [
  // 상품 목록
  http.get('/api/v1/billing/products', () =>
    HttpResponse.json({
      success: true, statusCode: 200, message: '요청이 성공적으로 처리되었습니다.',
      data: [
        {
          productCode: 'document-coaching', name: '서류 AI 코칭', description: '이력서와 자기소개서 AI 분석',
          price: 9900, currency: 'KRW', billingCycle: 'MONTHLY',
          features: ['서류 분석', '피드백 리포트', '개선 제안'], active: true,
        },
        {
          productCode: 'interview', name: 'AI 모의면접', description: '텍스트/음성 기반 AI 면접 연습',
          price: 12900, currency: 'KRW', billingCycle: 'MONTHLY',
          features: ['모의면접', 'AI 피드백', '리포트'], active: true,
        },
      ],
    }),
  ),

  // 내 구독 목록
  http.get('/api/v1/subscriptions/me', ({ request }) => {
    const memberId = getMemberId(request);
    const subscriptions = MOCK_SUBSCRIPTIONS[memberId] ?? [];
    return HttpResponse.json({
      success: true, statusCode: 200, message: '요청이 성공적으로 처리되었습니다.',
      data: { subscriptions },
    });
  }),

  // 사용량
  http.get('/api/v1/subscriptions/me/usages', ({ request }) => {
    const memberId = getMemberId(request);
    const usages = MOCK_USAGES[memberId] ?? [];
    return HttpResponse.json({
      success: true, statusCode: 200, message: '요청이 성공적으로 처리되었습니다.',
      data: { usages },
    });
  }),

  // 권한
  http.get('/api/v1/subscriptions/me/entitlements', ({ request }) => {
    const memberId = getMemberId(request);
    const entitlements = MOCK_ENTITLEMENTS[memberId] ?? { 'document-coaching': false, interview: false };
    return HttpResponse.json({
      success: true, statusCode: 200, message: '요청이 성공적으로 처리되었습니다.',
      data: { entitlements },
    });
  }),

  // 결제 내역
  http.get('/api/v1/billing/payments/history', ({ request }) => {
    const memberId = getMemberId(request);
    const hasSubscription = (MOCK_SUBSCRIPTIONS[memberId] ?? []).length > 0;
    const content = hasSubscription
      ? [
          {
            paymentId: `pay-${memberId}-001`, orderId: `order-${memberId}-001`,
            productCode: (MOCK_SUBSCRIPTIONS[memberId] as Array<{productCode: string}>)[0]?.productCode,
            productName: (MOCK_SUBSCRIPTIONS[memberId] as Array<{productName: string}>)[0]?.productName,
            amount: 9900, currency: 'KRW', paymentStatus: 'PAID',
            paidAt: LAST_MONTH, failureReason: null,
          },
        ]
      : [];
    return HttpResponse.json({
      success: true, statusCode: 200, message: '요청이 성공적으로 처리되었습니다.',
      data: { content, page: 0, size: 10, totalElements: content.length, totalPages: content.length > 0 ? 1 : 0 },
    });
  }),
];
