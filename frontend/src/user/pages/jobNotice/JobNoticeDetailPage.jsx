import { Building2, MapPin, Star } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function JobNoticeDetailPage() {
  return (
    <ServicePage
      eyebrow="JOB DETAIL"
      title="공고 상세"
      description="선택한 채용공고의 담당 업무, 자격 요건, 우대 사항과 AI 매칭 결과를 확인합니다."
      primaryAction="지원하기"
      secondaryAction="관심 공고 저장"
      metrics={[
        { value: '89%', label: '내 프로필 매칭률' },
        { value: 'D-12', label: '지원 마감' },
        { value: '정규직', label: '고용 형태' },
      ]}
      cards={[
        { icon: Building2, title: '기업 정보', text: '기업 규모와 주요 서비스, 채용 중인 포지션을 확인합니다.' },
        { icon: MapPin, title: '근무 조건', text: '근무지, 연봉 범위, 재택 여부와 복지를 비교합니다.' },
        { icon: Star, title: 'AI 적합도', text: '나의 기술 스택과 경험이 공고 조건과 얼마나 맞는지 분석합니다.' },
      ]}
      steps={['공고 내용 확인', '내 서류 매칭 점검', '지원서 제출']}
    />
  );
}

export default JobNoticeDetailPage;
