import {
  LayoutDashboard,
  UserRound,
  Building2,
  BriefcaseBusiness,
  FileCheck2,
  BarChart3,
  Sparkles,
  MessagesSquare,
  CreditCard,
  Mic,
} from 'lucide-react';

export const navigationItems = [
  {
    label: '대시보드',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    label: '회원/인증',
    path: '/auth/login',
    icon: UserRound,
  },
  {
    label: '기업 관리',
    path: '/company/profile',
    icon: Building2,
  },
  {
    label: '채용 공고',
    path: '/jobs',
    icon: BriefcaseBusiness,
  },
  {
    label: '지원 관리',
    path: '/applications/status',
    icon: FileCheck2,
  },
  {
    label: '서류 AI 분석',
    path: '/documents/resume',
    icon: Sparkles,
  },
  {
    label: 'AI 모의면접',
    path: '/interview',
    icon: Mic,
  },
  {
    label: '커뮤니티',
    path: '/community',
    icon: MessagesSquare,
  },
  {
    label: '결제/구독',
    path: '/billing/pricing',
    icon: CreditCard,
  },
];

export const dashboardTabs = [
  {
    label: '구직자',
    path: '/',
    icon: BarChart3,
  },
  {
    label: '기업',
    path: '/dashboard/company',
    icon: Building2,
  },
];
