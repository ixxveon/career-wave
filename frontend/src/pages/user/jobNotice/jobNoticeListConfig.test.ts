import { describe, expect, it } from 'vitest';
import type { JobNoticeFilterOptions } from '../../../types/user/jobNotice';
import {
  createFilterGroups,
  createInitialFilters,
  createJobNoticeQueryParams,
  normalizeFilters,
} from './jobNoticeListConfig';

const filterOptions: JobNoticeFilterOptions = {
  jobType: ['FULLTIME'],
  jobCategory: ['BACKEND', 'SECURITY'],
  careerLevel: ['JUNIOR'],
  location: ['서울', '부산'],
  companySize: ['STARTUP', 'MID_MARKET'],
};

describe('job notice dynamic filters', () => {
  it('builds filter groups from the API filter options', () => {
    const groups = createFilterGroups(filterOptions);

    expect(groups.find((group) => group.label === '직무')?.options).toEqual(['전체', 'BACKEND', 'SECURITY']);
    expect(groups.find((group) => group.label === '기업 규모')?.options).toEqual(['전체', 'STARTUP', 'MID_MARKET']);
  });

  it('keeps API codes unchanged when creating the list query', () => {
    const filters = {
      ...createInitialFilters(),
      직무: 'SECURITY',
      '기업 규모': 'MID_MARKET',
    };

    expect(createJobNoticeQueryParams({
      filters,
      period: '기간 전체',
      searchQuery: '보안',
      sort: '추천순',
    })).toMatchObject({
      keyword: '보안',
      jobCategory: 'SECURITY',
      companySize: 'MID_MARKET',
    });
  });

  it('resets a selected value that is no longer active', () => {
    const filters = {
      ...createInitialFilters(),
      직무: 'DATA',
    };

    expect(normalizeFilters(filters, createFilterGroups(filterOptions)).직무).toBe('전체');
  });
});
