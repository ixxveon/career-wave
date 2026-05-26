import {
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  UsersRound,
} from 'lucide-react';

import ServicePage from '../../../components/common/ServicePage';

function CompanyDashboardPage() {
  return (
    <ServicePage
      eyebrow="COMPANY"
      title="기업 채용 대시보드"
      description="활성 공고 수, 신규 지원자, 전형별 진행률을 한눈에 확인하고 채용 프로세스를 빠르게 관리할 수 있습니다."
      primaryAction="공고 등록"
      secondaryAction="지원자 보기"
      metrics={[
        { value: '6개', label: '활성 채용공고' },
        { value: '24명', label: '오늘 신규 지원자' },
        { value: '68%', label: '서류 심사 진행률' },
      ]}
      cards={[
        {
          icon: BriefcaseBusiness,
          title: '채용공고 관리',
          text: '현재 모집 중인 공고와 마감 예정 공고를 확인하고 수정합니다.',
        },
        {
          icon: UsersRound,
          title: '지원자 관리',
          text: '지원자 목록과 지원 상태를 확인하고 전형 단계를 관리합니다.',
        },
        {
          icon: ClipboardCheck,
          title: '전형 진행률',
          text: '서류 심사, 면접 대기, 최종 합격 등 단계별 진행률을 확인합니다.',
        },
      ]}
      steps={['공고 등록', '지원자 접수', '서류 심사', '면접 진행', '최종 합격']}
    />
  );
}

export default CompanyDashboardPage;