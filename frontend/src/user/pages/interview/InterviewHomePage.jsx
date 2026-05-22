import { ClipboardCheck, Mic, Video } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function InterviewHomePage() {
  return (
    <ServicePage
      eyebrow="AI INTERVIEW"
      title="AI 면접"
      description="텍스트 면접과 화상 면접을 연습하고, 답변 내용과 태도에 대한 리포트를 받아보세요."
      primaryAction="모의면접 시작"
      secondaryAction="리포트 보기"
      metrics={[
        { value: '30문항', label: '직무별 예상 질문' },
        { value: 'AI', label: '답변 피드백' },
        { value: '리포트', label: '면접 결과 분석' },
      ]}
      cards={[
        { icon: Mic, title: '면접 홈', text: '직무와 난이도를 선택해 면접 연습을 시작합니다.' },
        { icon: Video, title: '화상 면접', text: '카메라와 음성을 활용해 실전처럼 연습합니다.' },
        { icon: ClipboardCheck, title: '면접 리포트', text: '답변 완성도와 개선할 포인트를 확인합니다.' },
      ]}
      steps={['면접 유형 선택', '질문 답변 진행', 'AI 피드백 확인']}
    />
  );
}

export default InterviewHomePage;
