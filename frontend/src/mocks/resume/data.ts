import type {
  UploadResumeResponse,
  SubmitCoverLetterResponse,
  AnalysisResultResponse,
  ResumeHistoryResponse,
} from '../../user/types/resume.d';

export const MOCK_DOCUMENT_ID = 'mock-document-uuid-1234';

export const MOCK_UPLOAD_RESPONSE: UploadResumeResponse = {
  documentId: MOCK_DOCUMENT_ID,
  status: 'UPLOADED',
  fileUrl: 'https://s3.example.com/resume/mock.pdf',
  originalName: '이력서_홍길동.pdf',
  fileType: 'RESUME',
  createdAt: new Date().toISOString(),
};

export const MOCK_COVER_LETTER_RESPONSE: SubmitCoverLetterResponse = {
  documentId: MOCK_DOCUMENT_ID,
  status: 'UPLOADED',
  fileType: 'COVER_LETTER',
  createdAt: new Date().toISOString(),
};

export const MOCK_ANALYSIS_RESULT: AnalysisResultResponse = {
  documentId: MOCK_DOCUMENT_ID,
  status: 'COMPLETED',
  scores: {
    jobFitness: 82,
    techStack: 75,
    quantifiedAchievement: 60,
    logicalStructure: 88,
    total: 76,
  },
  feedback: {
    good: [
      '논리적인 문장 구조가 돋보입니다.',
      '기술 스택 언급과 팀 협업 경험이 긍정적으로 평가됩니다.',
    ],
    bad: [
      '"열심히", "성공적"이라는 추상적 표현이 사용되었습니다.',
      '직무 연관성을 구체적인 수치로 보완할 필요가 있습니다.',
    ],
    fix: [
      '성과를 "API 응답 속도 30% 단축"처럼 수치화하여 표현해보세요.',
      '3번 문항을 두괄식으로 수정하면 가독성이 높아집니다.',
    ],
  },
  errorMessage: null,
  createdAt: new Date().toISOString(),
};

export const MOCK_HISTORY_RESPONSE: ResumeHistoryResponse = {
  content: [
    {
      documentId: MOCK_DOCUMENT_ID,
      fileType: 'RESUME',
      originalName: '이력서_홍길동.pdf',
      company: null,
      job: null,
      totalScore: 76,
      createdAt: new Date().toISOString(),
    },
    {
      documentId: 'mock-document-uuid-5678',
      fileType: 'COVER_LETTER',
      originalName: null,
      company: '카카오',
      job: '백엔드 개발자',
      totalScore: 81,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  page: 0,
  size: 10,
  totalElements: 2,
  totalPages: 1,
};
