// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckoutStatus } from './useCheckoutStatus';

vi.mock('./useProducts', () => ({
  useProducts: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('./useCreateOrder', () => ({
  useCreateOrder: vi.fn(),
}));

vi.mock('@tosspayments/tosspayments-sdk', () => ({
  loadTossPayments: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams('product=document-coaching')],
}));

import { useCreateOrder } from './useCreateOrder';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

const mockOrder = {
  orderId: 'order-1',
  amount: 9900,
  productName: '서류 코칭',
  customerEmail: 'test@test.com',
  customerName: '홍길동',
};

function setupCreateOrder(overrides: { mutateAsync?: ReturnType<typeof vi.fn>; isPending?: boolean } = {}) {
  vi.mocked(useCreateOrder).mockReturnValue({
    mutateAsync: overrides.mutateAsync ?? vi.fn().mockResolvedValue(mockOrder),
    isPending: overrides.isPending ?? false,
  } as unknown as ReturnType<typeof useCreateOrder>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupCreateOrder();
  vi.mocked(loadTossPayments).mockResolvedValue({
    payment: () => ({ requestPayment: vi.fn().mockResolvedValue(undefined) }),
  } as unknown as Awaited<ReturnType<typeof loadTossPayments>>);
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
