import { Keyboard, MessageCircle, Timer } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function TextInterviewPage() {
  return (
    <ServicePage
      eyebrow="TEXT INTERVIEW"
      title="텍스트 면접"
      description="질문에 글로 답변하며 논리 구조, 핵심 키워드, 직무 적합도를 차분하게 점검합니다."
      primaryAction="텍스트 면접 시작"
      secondaryAction="질문 목록 보기"
      metrics={[
        { value: '10분', label: '빠른 연습 모드' },
        { value: '직무별', label: '질문 템플릿' },
        { value: '즉시', label: '답변 피드백' },
      ]}
      cards={[
        { icon: MessageCircle, title: '질문 제시', text: '선택한 직무에 맞는 질문을 순서대로 제공합니다.' },
        { icon: Keyboard, title: '답변 작성', text: '답변을 작성하며 핵심 경험을 구조화합니다.' },
        { icon: Timer, title: '시간 관리', text: '제한 시간 안에 답변하는 연습을 할 수 있습니다.' },
      ]}
      steps={['직무 선택', '텍스트 답변 작성', 'AI 첨삭 확인']}
    />
  );
}

export default TextInterviewPage;
