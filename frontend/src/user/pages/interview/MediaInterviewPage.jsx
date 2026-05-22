import { Camera, Mic2, Video } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function MediaInterviewPage() {
  return (
    <ServicePage
      eyebrow="MEDIA INTERVIEW"
      title="화상 면접"
      description="카메라와 마이크를 활용해 실제 면접 환경처럼 연습하고 말하기 흐름을 점검합니다."
      primaryAction="화상 면접 시작"
      secondaryAction="장비 점검"
      metrics={[
        { value: '영상', label: '화상 연습 지원' },
        { value: '음성', label: '답변 속도 분석' },
        { value: '태도', label: '비언어 피드백' },
      ]}
      cards={[
        { icon: Camera, title: '카메라 점검', text: '면접 전 화면과 조명을 확인합니다.' },
        { icon: Mic2, title: '음성 분석', text: '말의 속도와 멈춤 구간을 분석합니다.' },
        { icon: Video, title: '실전 연습', text: '실제 화상 면접과 비슷한 흐름으로 진행합니다.' },
      ]}
      steps={['장비 확인', '질문 답변 녹화', '피드백 리포트 확인']}
    />
  );
}

export default MediaInterviewPage;
