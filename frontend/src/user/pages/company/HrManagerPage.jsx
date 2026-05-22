import { ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function HrManagerPage() {
  return (
    <ServicePage
      eyebrow="HR MANAGER"
      title="HR 담당자 관리"
      description="채용 업무를 함께 진행할 담당자를 초대하고, 역할과 권한을 관리합니다."
      primaryAction="담당자 초대"
      secondaryAction="권한 설정"
      metrics={[
        { value: '8명', label: '등록 담당자' },
        { value: '3개', label: '관리 권한' },
        { value: '보안', label: '접근 제어' },
      ]}
      cards={[
        { icon: UserPlus, title: '담당자 초대', text: '이메일로 채용 담당자를 초대합니다.' },
        { icon: ShieldCheck, title: '권한 관리', text: '공고 등록, 지원자 열람, 결제 권한을 분리합니다.' },
        { icon: UsersRound, title: '활동 이력', text: '담당자별 주요 활동을 확인합니다.' },
      ]}
      steps={['담당자 초대', '권한 지정', '활동 관리']}
    />
  );
}

export default HrManagerPage;
