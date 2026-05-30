/// <reference types="vite/client" />

import { apiClient } from '../../utils/apiClient';
import {
  mockCareerDetails,
  mockCareerHistories,
  mockCompetencyReport,
  mockRoadmap,
} from '../data/careerDiagnosisMockData';

export interface CareerHistoryQuery {
  activityType?: string;
  companyName?: string;
  practiceDate?: string;
  jobTitle?: string;
}

export interface CareerHistory {
  id: string;
  userId: string;
  companyName: string;
  activityType: string;
  interviewType: string;
  jobTitle: string;
  title: string;
  practiceDate: string;
  status: string;
  score: number;
  previousScore?: number;
  summary?: string;
  weakness?: string;
}

const useMockData = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

function mockResponse<T>(data: T): Promise<T> {
  return Promise.resolve(structuredClone(data));
}

export const careerHistoryApi = {
  getHistories: (params: CareerHistoryQuery = {}): Promise<CareerHistory[]> => {
    if (!useMockData) {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      return apiClient(`/career-histories${query ? `?${query}` : ''}`);
    }

    const { activityType = '전체', companyName = '', practiceDate = '', jobTitle = '전체 직무' } = params;
    const companyQuery = companyName.trim().toLowerCase();
    const filtered = (mockCareerHistories as CareerHistory[]).filter((record) => {
      const matchesType = activityType === '전체' || record.activityType === activityType;
      const matchesCompany = !companyQuery || record.companyName.toLowerCase().includes(companyQuery);
      const matchesDate = !practiceDate || record.practiceDate === practiceDate;
      const matchesJob = jobTitle === '전체 직무' || record.jobTitle === jobTitle;
      return matchesType && matchesCompany && matchesDate && matchesJob;
    });

    return mockResponse(filtered);
  },

  getHistoryDetail: (historyId: string) => (
    useMockData
      ? mockResponse((mockCareerDetails as Record<string, unknown>)[historyId] || null)
      : apiClient(`/career-histories/${historyId}`)
  ),

  getCompetencyReport: () => (
    useMockData
      ? mockResponse(mockCompetencyReport)
      : apiClient('/career-histories/competency-report')
  ),

  getRoadmap: () => (
    useMockData
      ? mockResponse(mockRoadmap)
      : apiClient('/career-histories/roadmap')
  ),
};
