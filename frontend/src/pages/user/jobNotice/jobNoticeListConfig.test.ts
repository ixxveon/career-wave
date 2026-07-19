import { describe, expect, it } from 'vitest';
import type { JobNoticeFilterOptions } from '../../../types/user/jobNotice';
import {
  API_FILTER_PARAM_BY_LABEL,
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

    expect(groups.find((group) => group.label === '직무')?.options).toEqual(['BACKEND', 'SECURITY']);
    expect(groups.find((group) => group.label === '기업 규모')?.options).toEqual(['STARTUP', 'MID_MARKET']);
  });

  it('keeps API codes unchanged when creating the list query', () => {
    const filters = {
      ...createInitialFilters(),
      직무: ['SECURITY'],
      '기업 규모': ['MID_MARKET'],
    };

    expect(createJobNoticeQueryParams({
      filters,
      period: '기간 전체',
      searchQuery: '보안',
      sort: '추천순',
    })).toMatchObject({
      keyword: '보안',
      jobCategory: ['SECURITY'],
      companySize: ['MID_MARKET'],
    });
  });

  it('sends standardized career selections with the careerRange parameter', () => {
    const careerLabel = Object.entries(API_FILTER_PARAM_BY_LABEL)
      .find(([, parameter]) => parameter === 'careerLevel')?.[0];
    const filters = createInitialFilters();

    if (!careerLabel) {
      throw new Error('career filter label is missing');
    }
    filters[careerLabel as keyof typeof filters] = ['OVER_3'];

    const params = createJobNoticeQueryParams({
      filters,
      period: Object.keys(API_FILTER_PARAM_BY_LABEL)[0] as never,
      searchQuery: '',
      sort: Object.keys(API_FILTER_PARAM_BY_LABEL)[0] as never,
    });

    expect(params.careerRange).toEqual(['OVER_3']);
    expect(params.careerLevel).toBeUndefined();
  });

  it('resets a selected value that is no longer active', () => {
    const filters = {
      ...createInitialFilters(),
      직무: ['DATA'],
    };

    expect(normalizeFilters(filters, createFilterGroups(filterOptions)).직무).toEqual([]);
  });
});
