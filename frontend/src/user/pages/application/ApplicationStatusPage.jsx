import { CalendarCheck, FileCheck2, ListChecks } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function ApplicationStatusPage() {
  return (
    <ServicePage
      eyebrow="APPLICATION"
      title="지원 현황"
      description="지원한 공고의 진행 단계와 면접 일정, 필요한 후속 액션을 한곳에서 관리합니다."
      primaryAction="지원 현황 보기"
      secondaryAction="일정 확인"
      metrics={[
        { value: '12건', label: '진행 중 지원' },
        { value: '4건', label: '면접 예정' },
        { value: '68%', label: '평균 준비도' },
      ]}
      cards={[
        { icon: ListChecks, title: '단계별 관리', text: '지원, 서류 검토, 면접, 결과 대기 상태를 구분합니다.' },
        { icon: CalendarCheck, title: '일정 관리', text: '면접 일정과 제출 마감일을 놓치지 않도록 정리합니다.' },
        { icon: FileCheck2, title: '서류 연결', text: '지원한 공고별 제출 서류와 분석 리포트를 연결합니다.' },
      ]}
      steps={['지원 공고 등록', '진행 단계 업데이트', '다음 액션 확인']}
    />
  );
}

export default ApplicationStatusPage;
