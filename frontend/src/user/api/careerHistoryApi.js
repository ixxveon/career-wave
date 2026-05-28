import { apiClient } from '../../utils/apiClient';
import {
  mockCareerDetails,
  mockCareerHistories,
  mockCompetencyReport,
  mockRoadmap,
} from '../data/careerDiagnosisMockData';

const useMockData = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

function mockResponse(data) {
  return Promise.resolve(structuredClone(data));
}

export const careerHistoryApi = {
  getHistories: (params = {}) => {
    if (!useMockData) {
      const query = new URLSearchParams(params).toString();
      return apiClient(`/career-histories${query ? `?${query}` : ''}`);
    }

    const { activityType = '전체', companyName = '', practiceDate = '', jobTitle = '전체 직무' } = params;
    const companyQuery = companyName.trim().toLowerCase();
    const filtered = mockCareerHistories.filter((record) => {
      const matchesType = activityType === '전체' || record.activityType === activityType;
      const matchesCompany = !companyQuery || record.companyName.toLowerCase().includes(companyQuery);
      const matchesDate = !practiceDate || record.practiceDate === practiceDate;
      const matchesJob = jobTitle === '전체 직무' || record.jobTitle === jobTitle;
      return matchesType && matchesCompany && matchesDate && matchesJob;
    });

    return mockResponse(filtered);
  },

  getHistoryDetail: (historyId) => (
    useMockData
      ? mockResponse(mockCareerDetails[historyId] || null)
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
