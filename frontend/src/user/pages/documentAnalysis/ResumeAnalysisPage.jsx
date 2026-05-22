import { FileSearch, Gauge, Upload } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function ResumeAnalysisPage() {
  return (
    <ServicePage
      eyebrow="DOCUMENT AI"
      title="이력서 분석"
      description="이력서를 업로드하면 AI가 직무 적합도, 핵심 키워드, 보완해야 할 경험 표현을 분석합니다."
      primaryAction="이력서 업로드"
      secondaryAction="샘플 리포트 보기"
      metrics={[
        { value: '82%', label: '서류 완성도 예시' },
        { value: '12개', label: '개선 포인트' },
        { value: '3분', label: '평균 분석 시간' },
      ]}
      cards={[
        { icon: Upload, title: '파일 업로드', text: 'PDF 또는 문서 파일을 올려 분석을 시작합니다.' },
        { icon: FileSearch, title: '키워드 분석', text: '지원 직무와 관련된 핵심 역량 표현을 찾아냅니다.' },
        { icon: Gauge, title: '적합도 점수', text: '공고 기준으로 이력서의 강점과 부족한 부분을 점수화합니다.' },
      ]}
      steps={['이력서 업로드', 'AI 분석 진행', '개선 리포트 확인']}
    />
  );
}

export default ResumeAnalysisPage;
