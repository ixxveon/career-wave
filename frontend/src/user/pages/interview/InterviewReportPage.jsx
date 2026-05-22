import { BarChart3, FileText, Lightbulb } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function InterviewReportPage() {
  return (
    <ServicePage
      eyebrow="INTERVIEW REPORT"
      title="면접 리포트"
      description="모의면접 결과를 종합해 답변 완성도, 직무 적합성, 개선 포인트를 한눈에 확인합니다."
      primaryAction="최근 리포트 보기"
      secondaryAction="다시 연습하기"
      metrics={[
        { value: '76%', label: '답변 완성도' },
        { value: '8개', label: '개선 제안' },
        { value: '3회', label: '최근 연습' },
      ]}
      cards={[
        { icon: BarChart3, title: '점수 요약', text: '답변 구조와 내용 완성도를 지표로 확인합니다.' },
        { icon: FileText, title: '답변 기록', text: '질문별 답변과 AI 피드백을 다시 볼 수 있습니다.' },
        { icon: Lightbulb, title: '개선 과제', text: '다음 연습에서 집중할 포인트를 추천합니다.' },
      ]}
      steps={['면접 결과 수집', 'AI 분석', '개선 액션 확인']}
    />
  );
}

export default InterviewReportPage;
