import { MessageSquareText, PenLine, Sparkles } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function CoverLetterAnalysisPage() {
  return (
    <ServicePage
      eyebrow="COVER LETTER"
      title="자기소개서 첨삭"
      description="문항 의도에 맞는 답변 구조와 표현을 점검하고, 더 설득력 있는 자기소개서로 다듬습니다."
      primaryAction="자소서 첨삭 시작"
      secondaryAction="작성 가이드 보기"
      metrics={[
        { value: '4개', label: '문항별 구조 분석' },
        { value: 'AI', label: '표현 개선 제안' },
        { value: '즉시', label: '피드백 제공' },
      ]}
      cards={[
        { icon: MessageSquareText, title: '문항 의도 파악', text: '지원 문항이 요구하는 경험과 역량을 먼저 정리합니다.' },
        { icon: PenLine, title: '문장 첨삭', text: '모호한 표현과 반복되는 문장을 더 선명하게 바꿉니다.' },
        { icon: Sparkles, title: '합격 포인트 강화', text: '직무와 연결되는 성과 중심 표현을 추천합니다.' },
      ]}
      steps={['문항 입력', '초안 분석', '개선 문장 확인']}
    />
  );
}

export default CoverLetterAnalysisPage;
