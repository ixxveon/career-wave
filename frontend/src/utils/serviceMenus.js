export const serviceMenus = [
  {
    label: '채용공고',
    href: '/jobs',
    children: [
      { label: '채용공고 목록', href: '/jobs' },
      { label: '공고 등록', href: '/jobs/create' },
      { label: '공고 스크래핑', href: '/jobs/scraping' },
    ],
  },
  {
    label: '서류 분석',
    href: '/documents/resume',
    children: [
      { label: '이력서 분석', href: '/documents/resume' },
      { label: '자기소개서 첨삭', href: '/documents/cover-letter' },
    ],
  },
  {
    label: 'AI 면접',
    href: '/interview',
    children: [
      { label: '면접 홈', href: '/interview' },
      { label: '텍스트 면접', href: '/interview/text' },
      { label: '영상 면접', href: '/interview/media' },
      { label: '면접 리포트', href: '/interview/report' },
    ],
  },
  {
    label: '지원 관리',
    href: '/applications/status',
    children: [
      { label: '지원 현황', href: '/applications/status' },
      { label: '입사 지원', href: '/applications/apply' },
      { label: '지원자 관리', href: '/applications/applicants' },
      { label: '취업 준비 기록', href: '/interview/history' },
      { label: '면접 기록 상세', href: '/interview/detail/backend-20260522' },
      { label: '학습 로드맵', href: '/interview/roadmap' },
      { label: '진단 리포트', href: '/interview/report-export' },
    ],
  },
  {
    label: '커뮤니티',
    href: '/community',
    children: [
      { label: '커뮤니티 홈', href: '/community' },
      { label: '멘토 찾기', href: '/community/mentor' },
    ],
  },
  {
    label: '기업서비스',
    href: '/company/profile',
    children: [
      { label: '기업 프로필', href: '/company/profile' },
      { label: 'HR 담당자 관리', href: '/company/hr-managers' },
      { label: '기업 상품', href: '/billing/company-products' },
      { label: '요금제', href: '/billing/pricing' },
    ],
  },
];
