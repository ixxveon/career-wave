// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckoutStatus } from './useCheckoutStatus';

vi.mock('./useProducts', () => ({
  useProducts: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('./useCreateOrder', () => ({
  useCreateOrder: vi.fn(),
}));

vi.mock('./useSubscribedProductCodes', () => ({
  useSubscribedProductCodes: vi.fn(() => ({
    subscribedCodes: new Set<string>(),
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('@tosspayments/tosspayments-sdk', () => ({
  loadTossPayments: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams('product=document-coaching')],
}));

import { useCreateOrder } from './useCreateOrder';
import { useSubscribedProductCodes } from './useSubscribedProductCodes';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

const mockOrder = {
  orderId: 'order-1',
  amount: 9900,
  currency: 'KRW',
  productName: '서류 코칭',
  customerKey: 'cust-1',
  customerEmail: 'test@test.com',
  customerName: '홍길동',
};

function setupCreateOrder(overrides: { mutateAsync?: ReturnType<typeof vi.fn>; isPending?: boolean } = {}) {
  vi.mocked(useCreateOrder).mockReturnValue({
    mutateAsync: overrides.mutateAsync ?? vi.fn().mockResolvedValue(mockOrder),
    isPending: overrides.isPending ?? false,
  } as unknown as ReturnType<typeof useCreateOrder>);
}

function setupSubscribedCodes(codes: string[] = []) {
  vi.mocked(useSubscribedProductCodes).mockReturnValue({
    subscribedCodes: new Set(codes),
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useSubscribedProductCodes>);
}

beforeEach(() => {
  vi.clearAllMocks();
  // CI 등 .env 없는 환경에서도 결정적으로 동작하도록 Toss 클라이언트 키를 주입한다.
  // (미주입 시 handleCheckout 이 키 가드에서 조기 종료하므로, 결제 경로 테스트는 키가 있어야 한다)
  vi.stubEnv('VITE_TOSS_CLIENT_KEY', 'test_ck_dummy');
  setupCreateOrder();
  setupSubscribedCodes();
  vi.mocked(loadTossPayments).mockResolvedValue({
    payment: () => ({ requestPayment: vi.fn().mockResolvedValue(undefined) }),
  } as unknown as Awaited<ReturnType<typeof loadTossPayments>>);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─────────────────────────────────────────────
// order 생성 pending 중 중복 클릭 방지
// ─────────────────────────────────────────────
describe('order 생성 pending 중 중복 클릭 방지', () => {
  it('isCreatingOrder가 true면 버튼이 disabled 상태여야 한다', () => {
    setupCreateOrder({ isPending: true });
    const { result } = renderHook(() => useCheckoutStatus());
    expect(result.current.isCreatingOrder).toBe(true);
  });
});

// ─────────────────────────────────────────────
// isPaymentRequesting — Toss SDK 구간 재진입 방지
// ─────────────────────────────────────────────
describe('isPaymentRequesting — Toss SDK 구간 재진입 방지', () => {
  it('Toss SDK loading 중 중복 클릭해도 createOrder가 1번만 실행된다', async () => {
    let resolveSDK: ((v: unknown) => void) | undefined;
    const sdkPending = new Promise((res) => { resolveSDK = res; });
    const createOrderMock = vi.fn().mockResolvedValue(mockOrder);
    setupCreateOrder({ mutateAsync: createOrderMock });
    vi.mocked(loadTossPayments).mockReturnValue(sdkPending as ReturnType<typeof loadTossPayments>);

    const { result } = renderHook(() => useCheckoutStatus());
    act(() => { result.current.handleAgreeChange(true); });

    await act(async () => { result.current.handleCheckout(); });
    act(() => { result.current.handleCheckout(); });

    expect(createOrderMock).toHaveBeenCalledTimes(1);

    resolveSDK?.({ payment: () => ({ requestPayment: vi.fn().mockResolvedValue(undefined) }) });
  });

  it('handleCheckout 진행 중 재호출해도 createOrder가 1번만 실행된다', async () => {
    const createOrderMock = vi.fn().mockResolvedValue(mockOrder);
    const requestPaymentMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    setupCreateOrder({ mutateAsync: createOrderMock });
    vi.mocked(loadTossPayments).mockResolvedValue({
      payment: () => ({ requestPayment: requestPaymentMock }),
    } as unknown as Awaited<ReturnType<typeof loadTossPayments>>);

    const { result } = renderHook(() => useCheckoutStatus());
    act(() => { result.current.handleAgreeChange(true); });

    await act(async () => { result.current.handleCheckout(); });
    act(() => { result.current.handleCheckout(); });

    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });

  it('Toss 로컬 실패 후 isPaymentRequesting이 false로 초기화된다', async () => {
    const createOrderMock = vi.fn().mockResolvedValue(mockOrder);
    setupCreateOrder({ mutateAsync: createOrderMock });
    vi.mocked(loadTossPayments).mockRejectedValue(new Error('SDK load failed'));

    const { result } = renderHook(() => useCheckoutStatus());
    act(() => { result.current.handleAgreeChange(true); });

    await act(async () => { await result.current.handleCheckout(); });

    expect(result.current.isPaymentRequesting).toBe(false);
  });

  it('requestPayment 실패 후 isPaymentRequesting이 false로 초기화된다', async () => {
    const createOrderMock = vi.fn().mockResolvedValue(mockOrder);
    setupCreateOrder({ mutateAsync: createOrderMock });
    vi.mocked(loadTossPayments).mockResolvedValue({
      payment: () => ({ requestPayment: vi.fn().mockRejectedValue({ status: 0 }) }),
    } as unknown as Awaited<ReturnType<typeof loadTossPayments>>);

    const { result } = renderHook(() => useCheckoutStatus());
    act(() => { result.current.handleAgreeChange(true); });

    await act(async () => { await result.current.handleCheckout(); });

    expect(result.current.isPaymentRequesting).toBe(false);
  });
});

// ─────────────────────────────────────────────
// 이미 구독 중인 상품 결제 진입 방어 (이슈 #1007)
// ─────────────────────────────────────────────
describe('이미 구독 중인 상품 결제 진입 방어', () => {
  it('구독 중인 상품이면 isAlreadySubscribed가 true다', () => {
    setupSubscribedCodes(['document-coaching']);

    const { result } = renderHook(() => useCheckoutStatus());

    expect(result.current.isAlreadySubscribed).toBe(true);
  });

  it('구독 중인 상품은 handleCheckout이 createOrder를 호출하지 않고 안내 메시지를 설정한다', async () => {
    const createOrderMock = vi.fn().mockResolvedValue(mockOrder);
    setupCreateOrder({ mutateAsync: createOrderMock });
    setupSubscribedCodes(['document-coaching']);

    const { result } = renderHook(() => useCheckoutStatus());
    act(() => { result.current.handleAgreeChange(true); });

    await act(async () => { await result.current.handleCheckout(); });

    expect(createOrderMock).not.toHaveBeenCalled();
    expect(result.current.checkoutError).toBe('이미 구독 중인 상품입니다. 구독 현황을 확인해주세요.');
  });

  it('구독 중이 아니면 isAlreadySubscribed가 false다', () => {
    setupSubscribedCodes(['interview']);

    const { result } = renderHook(() => useCheckoutStatus());

    expect(result.current.isAlreadySubscribed).toBe(false);
  });
});

// ─────────────────────────────────────────────
// handleCheckout error handling — statusCode 분기
// ─────────────────────────────────────────────
describe('handleCheckout error handling — statusCode 분기', () => {
  it('createOrder가 { statusCode: 403 }로 실패하면 계정 제한 메시지가 설정된다', async () => {
    setupCreateOrder({ mutateAsync: vi.fn().mockRejectedValue({ statusCode: 403 }) });

    const { result } = renderHook(() => useCheckoutStatus());
    act(() => { result.current.handleAgreeChange(true); });

    await act(async () => { await result.current.handleCheckout(); });

    expect(result.current.checkoutError).toBe('결제가 제한된 계정입니다. 고객센터에 문의해주세요.');
  });

  it('createOrder가 { statusCode: 409 }로 실패하면 이미 구독 중 메시지가 설정된다', async () => {
    setupCreateOrder({ mutateAsync: vi.fn().mockRejectedValue({ statusCode: 409 }) });

    const { result } = renderHook(() => useCheckoutStatus());
    act(() => { result.current.handleAgreeChange(true); });

    await act(async () => { await result.current.handleCheckout(); });

    expect(result.current.checkoutError).toBe('이미 구독 중인 상품입니다. 구독 현황을 확인해주세요.');
  });

  it('createOrder가 { statusCode: 422 }로 실패하면 이메일 등록 필요 메시지가 설정된다', async () => {
    setupCreateOrder({ mutateAsync: vi.fn().mockRejectedValue({ statusCode: 422 }) });

    const { result } = renderHook(() => useCheckoutStatus());
    act(() => { result.current.handleAgreeChange(true); });

    await act(async () => { await result.current.handleCheckout(); });

    expect(result.current.checkoutError).toBe('결제를 위해 이메일 등록이 필요합니다. 마이페이지에서 이메일을 등록해주세요.');
  });

  it('VITE_TOSS_CLIENT_KEY 미주입 시 createOrder 호출 없이 환경 설정 오류 메시지가 설정된다', async () => {
    vi.stubEnv('VITE_TOSS_CLIENT_KEY', '');
    const createOrderMock = vi.fn().mockResolvedValue(mockOrder);
    setupCreateOrder({ mutateAsync: createOrderMock });

    const { result } = renderHook(() => useCheckoutStatus());
    act(() => { result.current.handleAgreeChange(true); });

    await act(async () => { await result.current.handleCheckout(); });

    expect(createOrderMock).not.toHaveBeenCalled();
    expect(result.current.checkoutError).toBe('결제 환경 설정이 올바르지 않습니다. 잠시 후 다시 시도하거나 고객센터에 문의해주세요.');
  });

  it('{ status: 0 }처럼 statusCode 없는 오류는 기본 메시지가 설정된다 (회귀 방지)', async () => {
    setupCreateOrder({ mutateAsync: vi.fn().mockRejectedValue({ status: 0 }) });

    const { result } = renderHook(() => useCheckoutStatus());
    act(() => { result.current.handleAgreeChange(true); });

    await act(async () => { await result.current.handleCheckout(); });

    expect(result.current.checkoutError).toBe('결제 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  });
});
