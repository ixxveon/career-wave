export const serviceMenus = [
  {
    label: '채용공고',
    href: '/jobs',
    children: [
      { label: '채용공고 목록', href: '/jobs' },
    ],
  },
  {
    label: '서류 분석',
    href: '/documents/resume',
    children: [
      { label: '이력서 분석', href: '/documents/resume' },
      { label: '자기소개서 분석', href: '/documents/cover-letter' },
      // { label: '서류 분석 리포트', href: '/documents/report' }, // TODO: 백엔드 연동 후 활성화
    ],
  },
  {
    label: 'AI 면접',
    href: '/interview',
    children: [
      { label: '면접 홈', href: '/interview' },
      { label: 'AI 텍스트 · 음성 면접', href: '/interview/text' },
      { label: 'AI 화상 면접', href: '/interview/media', comingSoon: true },
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
      { label: '취업 준비 기록', href: '/career-diagnosis/history' },
      { label: '진단 상세', href: '/career-diagnosis/detail/backend-20260522' },
      { label: '학습 로드맵', href: '/career-diagnosis/roadmap' },
      { label: '종합 진단 리포트', href: '/career-diagnosis/report' },
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
    href: '/dashboard/company',
    children: [
      { label: '기업 대시보드', href: '/dashboard/company' },
      { label: '기업 프로필', href: '/company/profile' },
      { label: 'HR 담당자 관리', href: '/company/hr-managers' },
      { label: '기업 상품', href: '/billing/company-products' },
      { label: '요금제', href: '/billing/pricing' },
    ],
  },
];
