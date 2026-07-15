import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/apiClient', () => ({
  apiClient: vi.fn().mockResolvedValue(null),
}));

vi.mock('./member/memberApiClient', () => ({
  memberApiClient: vi.fn(),
}));

import { apiClient } from '../../utils/apiClient';
import { jobApi } from './jobApi';

describe('jobApi.getJobNoticeList', () => {
  it('serializes each selected filter value as a repeated query parameter', async () => {
    await jobApi.getJobNoticeList({
      jobCategory: ['BACKEND', 'SECURITY'],
      location: ['서울', '경기'],
      period: '7d',
    });

    const [requestUrl] = vi.mocked(apiClient).mock.calls[0];
    const url = new URL(String(requestUrl), 'https://careerwave.local');

    expect(url.searchParams.getAll('jobCategory')).toEqual(['BACKEND', 'SECURITY']);
    expect(url.searchParams.getAll('location')).toEqual(['서울', '경기']);
    expect(url.searchParams.get('period')).toBe('7d');
  });
});
