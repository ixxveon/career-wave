export interface MenuChild {
  label: string;
  href: string;
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
    label: '서류 AI 코칭',
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
      { label: '면접 홈',             href: '/interview' },
      { label: 'AI 텍스트 · 음성 면접', href: '/interview/text' },
      { label: '면접 이력',           href: '/interview/sessions' },
    ],
  },
  // QA #1140 — '지원 관리'(진단 상세) 도메인은 미완성이라 전체 회원에게 노출하지 않음
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

// QA #1140 — 기업 회원에게는 노출하지 않는 개인 전용 서비스 메뉴
const COMPANY_HIDDEN_MENU_LABELS = ['서류 AI 코칭', 'AI 면접'] as const;

export function getServiceMenus(isCompanyMember: boolean): MenuItem[] {
  if (!isCompanyMember) return serviceMenus;
  const hiddenLabels: readonly string[] = COMPANY_HIDDEN_MENU_LABELS;
  return serviceMenus.filter((menu) => !hiddenLabels.includes(menu.label));
}
