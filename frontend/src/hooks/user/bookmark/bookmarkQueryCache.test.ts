import { describe, expect, it, vi } from 'vitest';
import { dashboardQueryKeys } from '../dashboard/queryKeys';
import { jobNoticeQueryKeys } from '../jobNotice/useJobNoticeList';
import { invalidateBookmarkQueries } from './bookmarkQueryCache';

describe('invalidateBookmarkQueries', () => {
  it('invalidates job notice and saved job caches together', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);

    await invalidateBookmarkQueries({ invalidateQueries });

    expect(invalidateQueries).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, {
      queryKey: jobNoticeQueryKeys.all,
    });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, {
      queryKey: dashboardQueryKeys.bookmarkLists(),
    });
  });
});
