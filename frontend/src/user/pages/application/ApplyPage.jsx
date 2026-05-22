import { FileUp, Send, ShieldCheck } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function ApplyPage() {
  return (
    <ServicePage
      eyebrow="APPLY"
      title="입사지원"
      description="저장된 이력서와 자기소개서를 선택하고, 지원 공고에 맞게 최종 점검한 뒤 제출합니다."
      primaryAction="지원서 작성"
      secondaryAction="저장 문서 보기"
      metrics={[
        { value: '2개', label: '연결 문서' },
        { value: 'AI', label: '제출 전 점검' },
        { value: '완료', label: '지원 기록 저장' },
      ]}
      cards={[
        { icon: FileUp, title: '문서 선택', text: '분석이 완료된 이력서와 자소서를 지원서에 연결합니다.' },
        { icon: ShieldCheck, title: '제출 전 확인', text: '공고 요구 조건과 서류 누락 여부를 확인합니다.' },
        { icon: Send, title: '지원 완료', text: '지원 내역을 저장하고 현황 페이지에서 추적합니다.' },
      ]}
      steps={['공고 선택', '지원 문서 연결', '지원서 제출']}
    />
  );
}

export default ApplyPage;
