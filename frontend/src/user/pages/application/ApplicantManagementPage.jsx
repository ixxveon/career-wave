import { ClipboardCheck, MessageSquare, UsersRound } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function ApplicantManagementPage() {
  return (
    <ServicePage
      eyebrow="APPLICANTS"
      title="지원자 관리"
      description="기업 담당자가 지원자를 검토하고, 평가 상태와 커뮤니케이션 이력을 관리하는 화면입니다."
      primaryAction="지원자 목록 보기"
      secondaryAction="평가 기준 설정"
      metrics={[
        { value: '38명', label: '신규 지원자' },
        { value: '12명', label: '검토 필요' },
        { value: '5명', label: '면접 후보' },
      ]}
      cards={[
        { icon: UsersRound, title: '지원자 목록', text: '공고별 지원자를 단계와 점수 기준으로 확인합니다.' },
        { icon: ClipboardCheck, title: '평가 관리', text: '서류 검토와 면접 평가 상태를 업데이트합니다.' },
        { icon: MessageSquare, title: '연락 이력', text: '지원자와 주고받은 안내 메시지를 기록합니다.' },
      ]}
      steps={['지원자 확인', '평가 상태 변경', '후속 연락 진행']}
    />
  );
}

export default ApplicantManagementPage;
