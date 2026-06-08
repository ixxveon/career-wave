import { http, HttpResponse } from 'msw';

// 계정별 구독 시나리오
// testuser01: 구독 없음
// testuser02: AI 모의면접만 구독
// testuser03: 서류 AI 코칭만 구독
// testuser04: 두 상품 모두 구독
// testcompany01: 구독 없음

const PRICE = 29000;

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

function monthsLater(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString();
}

const MOCK_SUBSCRIPTIONS: Record<string, object[]> = {
  'mock-user-uuid-0001': [],
  'mock-user-uuid-0002': [
    {
      subscriptionId: 'sub-interview-0002',
      productCode: 'interview',
      productName: 'AI 모의면접',
      status: 'ACTIVE',
      startedAt: monthsAgo(10),
      currentPeriodStart: monthsAgo(1),
      currentPeriodEnd: monthsLater(1),
      nextBillingAt: monthsLater(1),
      cancelScheduledAt: null,
    },
  ],
  'mock-user-uuid-0003': [
    {
      subscriptionId: 'sub-document-0003',
      productCode: 'document-coaching',
      productName: '서류 AI 코칭',
      status: 'ACTIVE',
      startedAt: monthsAgo(10),
      currentPeriodStart: monthsAgo(1),
      currentPeriodEnd: monthsLater(1),
      nextBillingAt: monthsLater(1),
      cancelScheduledAt: null,
    },
  ],
  'mock-user-uuid-0004': [
    {
      subscriptionId: 'sub-interview-0004',
      productCode: 'interview',
      productName: 'AI 모의면접',
      status: 'ACTIVE',
      startedAt: monthsAgo(10),
      currentPeriodStart: monthsAgo(1),
      currentPeriodEnd: monthsLater(1),
      nextBillingAt: monthsLater(1),
      cancelScheduledAt: null,
    },
    {
      subscriptionId: 'sub-document-0004',
      productCode: 'document-coaching',
      productName: '서류 AI 코칭',
      status: 'ACTIVE',
      startedAt: monthsAgo(10),
      currentPeriodStart: monthsAgo(1),
      currentPeriodEnd: monthsLater(1),
      nextBillingAt: monthsLater(1),
      cancelScheduledAt: null,
    },
  ],
  'mock-company-uuid-0001': [],
};

const MOCK_USAGES: Record<string, object[]> = {
  'mock-user-uuid-0002': [
    { productCode: 'interview', limit: 20, used: 5, remaining: 15, unit: 'session', resetAt: monthsLater(1) },
  ],
  'mock-user-uuid-0003': [
    { productCode: 'document-coaching', limit: 30, used: 8, remaining: 22, unit: 'analysis', resetAt: monthsLater(1) },
  ],
  'mock-user-uuid-0004': [
    { productCode: 'interview', limit: 20, used: 3, remaining: 17, unit: 'session', resetAt: monthsLater(1) },
    { productCode: 'document-coaching', limit: 30, used: 12, remaining: 18, unit: 'analysis', resetAt: monthsLater(1) },
  ],
};

const MOCK_ENTITLEMENTS: Record<string, object> = {
  'mock-user-uuid-0001': { 'document-coaching': false, interview: false },
  'mock-user-uuid-0002': { 'document-coaching': false, interview: true },
  'mock-user-uuid-0003': { 'document-coaching': true, interview: false },
  'mock-user-uuid-0004': { 'document-coaching': true, interview: true },
  'mock-company-uuid-0001': { 'document-coaching': false, interview: false },
};

// 구독 계정별 결제 내역 10개 (최신순)
const MOCK_PAYMENT_HISTORY: Record<string, object[]> = {
  'mock-user-uuid-0002': Array.from({ length: 10 }, (_, i) => ({
    paymentId: `pay-interview-0002-${String(i + 1).padStart(3, '0')}`,
    orderId: `order-interview-0002-${String(i + 1).padStart(3, '0')}`,
    productCode: 'interview',
    productName: 'AI 모의면접',
    amount: PRICE,
    currency: 'KRW',
    paymentStatus: 'PAID',
    paidAt: monthsAgo(i),
    failureReason: null,
  })),
  'mock-user-uuid-0003': Array.from({ length: 10 }, (_, i) => ({
    paymentId: `pay-document-0003-${String(i + 1).padStart(3, '0')}`,
    orderId: `order-document-0003-${String(i + 1).padStart(3, '0')}`,
    productCode: 'document-coaching',
    productName: '서류 AI 코칭',
    amount: PRICE,
    currency: 'KRW',
    paymentStatus: 'PAID',
    paidAt: monthsAgo(i),
    failureReason: null,
  })),
  'mock-user-uuid-0004': Array.from({ length: 10 }, (_, i) => ({
    paymentId: `pay-both-0004-${String(i + 1).padStart(3, '0')}`,
    orderId: `order-both-0004-${String(i + 1).padStart(3, '0')}`,
    productCode: i % 2 === 0 ? 'interview' : 'document-coaching',
    productName: i % 2 === 0 ? 'AI 모의면접' : '서류 AI 코칭',
    amount: PRICE,
    currency: 'KRW',
    paymentStatus: 'PAID',
    paidAt: monthsAgo(Math.floor(i / 2)),
    failureReason: null,
  })),
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
          price: PRICE, currency: 'KRW', billingCycle: 'MONTHLY',
          features: ['서류 분석', '피드백 리포트', '개선 제안'], active: true,
        },
        {
          productCode: 'interview', name: 'AI 모의면접', description: '텍스트/음성 기반 AI 면접 연습',
          price: PRICE, currency: 'KRW', billingCycle: 'MONTHLY',
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
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '0');
    const size = Number(url.searchParams.get('size') ?? '10');
    const allContent = MOCK_PAYMENT_HISTORY[memberId] ?? [];
    const content = allContent.slice(page * size, page * size + size);
    return HttpResponse.json({
      success: true, statusCode: 200, message: '요청이 성공적으로 처리되었습니다.',
      data: {
        content,
        page,
        size,
        totalElements: allContent.length,
        totalPages: Math.ceil(allContent.length / size),
      },
    });
  }),
];
