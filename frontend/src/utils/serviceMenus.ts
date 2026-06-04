export interface MenuChild {
  label: string;
  href: string;
  comingSoon?: boolean;
}

export interface MenuItem {
  label: string;
  href: string;
  children?: MenuChild[];
}

export const serviceMenus: MenuItem[] = [
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
      { label: '이력서 분석',    href: '/documents/resume' },
      { label: '자기소개서 분석', href: '/documents/cover-letter' },
      { label: '분석 이력',      href: '/documents/history' },
      // { label: '서류 분석 리포트', href: '/documents/report' }, // TODO: 백엔드 연동 후 활성화
    ],
  },
  {
    label: 'AI 면접',
    href: '/interview',
    children: [
      { label: '면접 홈',            href: '/interview' },
      { label: 'AI 텍스트 · 음성 면접', href: '/interview/text' },
      { label: 'AI 화상 면접',       href: '/interview/media', comingSoon: true },
      { label: '면접 리포트',        href: '/interview/report' },
    ],
  },
  {
    label: '지원 관리',
    href: '/applications/applicants',
    children: [
      { label: '지원자 관리', href: '/applications/applicants' },
      { label: '진단 상세',   href: '/career-diagnosis/detail/backend-20260522' },
    ],
  },
  {
    label: '커뮤니티',
    href: '/community',
    children: [
      { label: '커뮤니티 홈', href: '/community' },
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
];
