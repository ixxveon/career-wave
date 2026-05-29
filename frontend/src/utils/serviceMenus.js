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
      { label: '서류 분석 리포트', href: '/documents/report' },
    ],
  },
  {
    label: '취업 준비',
    href: '/career-history',
    children: [
      { label: 'Career History', href: '/career-history' },
      { label: 'Report Export', href: '/report-export' },
    ],
  },
  {
    label: '지원 관리',
    href: '/applications/status',
    children: [
      { label: '지원 현황', href: '/applications/status' },
      { label: '입사 지원', href: '/applications/apply' },
      { label: '지원자 관리', href: '/applications/applicants' },
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
    label: '고객센터',
    href: '/support/notices',
    children: [
      { label: '공지사항', href: '/support/notices' },
      { label: 'FAQ',      href: '/support/faq' },
      { label: '1:1 문의', href: '/support/inquiry' },
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
