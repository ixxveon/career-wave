/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { JobNoticeListApiResponse, JobNoticeQueryParams } from '../../../types/user/jobNotice';
import { useJobNoticeList } from './useJobNoticeList';

const getJobNoticeList = vi.hoisted(() => vi.fn());

vi.mock('../../../api/user/jobApi', () => ({
  jobApi: { getJobNoticeList },
}));

function createListResponse(jobNoticeId: number) {
  return {
    success: true,
    message: 'ok',
    data: {
      content: [{ jobNoticeId }],
      page: 1,
      size: 18,
      totalPages: 1,
      totalElements: 1,
      filterOptions: {
        jobCategories: ['BACKEND'],
        careerLevels: ['JUNIOR'],
        jobTypes: ['FULL_TIME'],
        locations: ['SEOUL'],
        companySizes: ['SME'],
      },
      stats: {
        totalOpenCount: 1,
        todayNewCount: 0,
        todayNewDelta: 0,
        todayNewRate: 0,
      },
    },
  } as unknown as JobNoticeListApiResponse;
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function QueryWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useJobNoticeList', () => {
  it('keeps the previous list while a changed filter query is loading', async () => {
    let resolveNextResponse: (response: JobNoticeListApiResponse) => void = () => {};
    const nextResponse = new Promise<JobNoticeListApiResponse>((resolve) => {
      resolveNextResponse = resolve;
    });
    getJobNoticeList
      .mockResolvedValueOnce(createListResponse(1))
      .mockReturnValueOnce(nextResponse);

    const initialParams: JobNoticeQueryParams = { jobCategory: 'BACKEND' };
    const { result, rerender } = renderHook(
      ({ params }) => useJobNoticeList(params),
      { initialProps: { params: initialParams }, wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.data?.pages[0]?.data?.content[0]?.jobNoticeId).toBe(1));

    rerender({ params: { jobCategory: 'FRONTEND' } });

    expect(result.current.data?.pages[0]?.data?.content[0]?.jobNoticeId).toBe(1);

    resolveNextResponse(createListResponse(2));
    await waitFor(() => expect(result.current.data?.pages[0]?.data?.content[0]?.jobNoticeId).toBe(2));
  });
});
