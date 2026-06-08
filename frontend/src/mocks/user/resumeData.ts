import type {
  UploadResumeResponse,
  SubmitCoverLetterResponse,
  AnalysisResultResponse,
  ResumeHistoryResponse,
} from '../../types/user/resume';

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
  overallReview:
    '전반적으로 백엔드 역량이 우수하나 성과의 정량적 수치화가 아쉽습니다. ' +
    '기술 스택 언급과 팀 협업 경험은 긍정적으로 평가됩니다.',
  feedbackDetails: [
    {
      sectionNumber: 1,
      question: '주요 프로젝트 경험',
      originalText: '결제 시스템 개발에 참여하였습니다. 팀원들과 협업하여 서비스를 개선했습니다.',
      goodPoint: '백엔드 프로젝트 경험과 팀 협업 이력이 명시되어 있어 기본 역량이 확인됩니다.',
      badPoint:
        '역할, 규모, 성과가 모두 빠져 있습니다. "참여", "개선"이라는 추상적 동사 대신 수치화된 임팩트를 작성해야 합니다.',
      improvedText:
        '월 거래액 50억 규모의 결제 시스템 API를 Spring Boot로 설계 및 구현, TPS 300 처리 안정화에 기여하였습니다. ' +
        '5인 팀 스크럼 환경에서 백엔드 리드로 API 응답 속도를 평균 340ms → 80ms로 개선하였습니다.',
      starAnalysis: {
        s: { ok: true,  comment: '팀 내 결제 시스템 개발 상황이 배경으로 설정되어 있습니다.' },
        t: { ok: false, comment: '본인이 맡은 과제(역할)가 구체적으로 드러나지 않습니다.' },
        a: { ok: true,  comment: '참여라는 행동이 언급되었으나 더 구체적인 기술 행동이 필요합니다.' },
        r: { ok: false, comment: '"서비스를 개선"은 결과가 수치로 표현되지 않았습니다.' },
      },
      quantAnalysis: {
        numbers:   { ok: false, comment: '수치(%, 횟수, 금액 등)가 전혀 사용되지 않았습니다.' },
        timeframe: { ok: false, comment: '기간·빈도 표현이 없습니다.' },
        scale:     { ok: false, comment: '규모·범위 언급이 없습니다.' },
        impact:    { ok: false, comment: '행동의 결과가 수치로 측정되지 않았습니다.' },
      },
    },
    {
      sectionNumber: 2,
      question: '자기소개 및 강점',
      originalText: '다양한 경험을 통해 성장하였습니다.',
      goodPoint: '성장 의지가 드러나는 문장 구성입니다.',
      badPoint:
        '"다양한 경험"이라는 추상적 표현만으로는 역량을 판단할 수 없습니다. 구체적 경력 사실로 대체해야 합니다.',
      improvedText:
        '스타트업 3곳에서 백엔드 풀사이클 개발(기획→설계→배포)을 수행하며 서비스 런칭 5건의 경험을 쌓았습니다.',
      starAnalysis: {
        s: { ok: false, comment: '어떤 상황에서의 경험인지 구체적인 맥락이 없습니다.' },
        t: { ok: false, comment: '성장을 위해 설정한 구체적인 목표가 드러나지 않습니다.' },
        a: { ok: false, comment: '"다양한 경험"은 구체적인 행동으로 볼 수 없습니다.' },
        r: { ok: false, comment: '성장의 결과가 수치나 사실로 표현되지 않았습니다.' },
      },
      quantAnalysis: {
        numbers:   { ok: false, comment: '구체적인 숫자가 없습니다.' },
        timeframe: { ok: false, comment: '기간 정보가 빠져 있습니다.' },
        scale:     { ok: false, comment: '활동 범위를 가늠할 수 없습니다.' },
        impact:    { ok: false, comment: '측정 가능한 성과 지표가 없습니다.' },
      },
    },
  ],
  errorMessage: null,
  createdAt: new Date().toISOString(),
};

// 페이지네이션 테스트용 전체 목록 (12건 — 10건 페이지 기준 2페이지 생성)
export const MOCK_HISTORY_ALL = [
  { documentId: MOCK_DOCUMENT_ID,          fileType: 'RESUME'       as const, originalName: '이력서_홍길동.pdf',   company: null,      job: null,            totalScore: 76, createdAt: new Date(Date.now() - 0          ).toISOString() },
  { documentId: 'mock-uuid-2',             fileType: 'COVER_LETTER' as const, originalName: null,                 company: '카카오',   job: '백엔드 개발자',  totalScore: 81, createdAt: new Date(Date.now() - 86400000   ).toISOString() },
  { documentId: 'mock-uuid-3',             fileType: 'RESUME'       as const, originalName: '이력서_v2.pdf',      company: null,      job: null,            totalScore: 68, createdAt: new Date(Date.now() - 172800000  ).toISOString() },
  { documentId: 'mock-uuid-4',             fileType: 'COVER_LETTER' as const, originalName: null,                 company: '네이버',   job: '프론트엔드 개발자', totalScore: 74, createdAt: new Date(Date.now() - 259200000).toISOString() },
  { documentId: 'mock-uuid-5',             fileType: 'RESUME'       as const, originalName: '이력서_최종.docx',   company: null,      job: null,            totalScore: 88, createdAt: new Date(Date.now() - 345600000  ).toISOString() },
  { documentId: 'mock-uuid-6',             fileType: 'COVER_LETTER' as const, originalName: null,                 company: '라인',     job: '풀스택 개발자',  totalScore: 72, createdAt: new Date(Date.now() - 432000000  ).toISOString() },
  { documentId: 'mock-uuid-7',             fileType: 'RESUME'       as const, originalName: '이력서_수정본.pdf',  company: null,      job: null,            totalScore: 65, createdAt: new Date(Date.now() - 518400000  ).toISOString() },
  { documentId: 'mock-uuid-8',             fileType: 'COVER_LETTER' as const, originalName: null,                 company: '토스',     job: '백엔드 개발자',  totalScore: 91, createdAt: new Date(Date.now() - 604800000  ).toISOString() },
  { documentId: 'mock-uuid-9',             fileType: 'RESUME'       as const, originalName: '이력서_230501.pdf',  company: null,      job: null,            totalScore: 79, createdAt: new Date(Date.now() - 691200000  ).toISOString() },
  { documentId: 'mock-uuid-10',            fileType: 'COVER_LETTER' as const, originalName: null,                 company: '쿠팡',     job: '서버 개발자',   totalScore: 83, createdAt: new Date(Date.now() - 777600000  ).toISOString() },
  { documentId: 'mock-uuid-11',            fileType: 'RESUME'       as const, originalName: '이력서_구버전.pdf',  company: null,      job: null,            totalScore: 61, createdAt: new Date(Date.now() - 864000000  ).toISOString() },
  { documentId: 'mock-uuid-12',            fileType: 'COVER_LETTER' as const, originalName: null,                 company: '배달의민족', job: 'iOS 개발자',   totalScore: 77, createdAt: new Date(Date.now() - 950400000  ).toISOString() },
];

// handlers.ts에서 page/size를 적용해 슬라이싱하여 사용
export const MOCK_HISTORY_RESPONSE: ResumeHistoryResponse = {
  content: MOCK_HISTORY_ALL.slice(0, 10),
  page: 0,
  size: 10,
  totalElements: MOCK_HISTORY_ALL.length,
  totalPages: Math.ceil(MOCK_HISTORY_ALL.length / 10),
};
