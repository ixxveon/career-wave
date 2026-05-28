import { apiClient } from '../../utils/apiClient';

const useMockData = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

const mockApplicants = [
  {
    id: 'app-001',
    applicantName: '고은별',
    jobTitle: '백엔드 개발자',
    companyName: '커리어웨이브',
    appliedAt: '2026-05-22',
    status: 'APPLIED',
    experience: '신입',
    stacks: ['Java', 'Spring', 'MySQL'],
    documentScore: 84,
    interviewScore: 82,
    careerHistoryId: 'backend-20260522',
    aiFeedback: 'Spring 기반 API 설계 이해도가 좋고, 프로젝트 성과를 수치로 보완하면 더 설득력 있습니다.',
    pdfUrl: '',
  },
  {
    id: 'app-002',
    applicantName: '김민수',
    jobTitle: '프론트엔드 개발자',
    companyName: '커리어웨이브',
    appliedAt: '2026-05-21',
    status: 'PASSED',
    experience: '2년',
    stacks: ['React', 'TypeScript', 'Vite'],
    documentScore: 78,
    interviewScore: 76,
    careerHistoryId: 'frontend-20260520',
    aiFeedback: 'UI 구현 경험은 충분하나 상태 관리 선택 기준을 더 구체적으로 설명해야 합니다.',
    pdfUrl: '',
  },
  {
    id: 'app-003',
    applicantName: '박서준',
    jobTitle: '백엔드 개발자',
    companyName: '커리어웨이브',
    appliedAt: '2026-05-18',
    status: 'FINAL_PASSED',
    experience: '4년',
    stacks: ['Kotlin', 'Spring', 'AWS'],
    documentScore: 91,
    interviewScore: 88,
    careerHistoryId: 'backend-20260522',
    aiFeedback: '실무형 답변과 장애 대응 사례가 강점입니다. HR 검토 우선순위가 높습니다.',
    pdfUrl: 'https://example.com/reports/app-003.pdf',
  },
];

function mockResponse(data) {
  return Promise.resolve(structuredClone(data));
}

export const applicationApi = {
  getApplications: (params = {}) => {
    if (!useMockData) {
      const query = new URLSearchParams(params).toString();
      return apiClient(`/applications${query ? `?${query}` : ''}`);
    }

    const keyword = (params.keyword || '').trim().toLowerCase();
    const status = params.status || 'ALL';
    const filtered = mockApplicants.filter((applicant) => {
      const matchesKeyword =
        !keyword ||
        applicant.applicantName.toLowerCase().includes(keyword) ||
        applicant.jobTitle.toLowerCase().includes(keyword);
      const matchesStatus = status === 'ALL' || applicant.status === status;
      return matchesKeyword && matchesStatus;
    });

    return mockResponse(filtered);
  },

  getApplicationDetail: (applicationId) => {
    if (!useMockData) {
      return apiClient(`/applications/${applicationId}`);
    }

    return mockResponse(mockApplicants.find((applicant) => applicant.id === applicationId) || null);
  },

  updateApplicationStatus: (applicationId, status) => (
    useMockData
      ? mockResponse({ applicationId, status })
      : apiClient(`/applications/${applicationId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        })
  ),

  saveDiagnosisPdf: (applicationId, payload) => (
    useMockData
      ? mockResponse({ applicationId, pdfUrl: payload.pdfUrl || 'mock://diagnosis-report.pdf' })
      : apiClient(`/applications/${applicationId}/diagnosis-pdf`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
  ),
};
