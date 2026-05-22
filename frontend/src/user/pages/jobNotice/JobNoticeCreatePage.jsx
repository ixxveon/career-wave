import { ClipboardList, FilePlus2, UsersRound } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function JobNoticeCreatePage() {
  return (
    <ServicePage
      eyebrow="CREATE NOTICE"
      title="공고 등록"
      description="기업 담당자가 채용공고를 작성하고, 필요한 역량과 채용 조건을 구조화해 지원자에게 정확히 전달합니다."
      primaryAction="새 공고 작성"
      secondaryAction="임시저장 불러오기"
      metrics={[
        { value: '3단계', label: '공고 작성 흐름' },
        { value: 'AI', label: '문구 개선 지원' },
        { value: '즉시', label: '게시 전 미리보기' },
      ]}
      cards={[
        { icon: FilePlus2, title: '기본 정보 입력', text: '직무명, 근무지, 고용 형태와 같은 핵심 정보를 입력합니다.' },
        { icon: ClipboardList, title: '요구 역량 정리', text: '기술 스택과 우대 조건을 지원자가 이해하기 쉽게 구성합니다.' },
        { icon: UsersRound, title: '지원자 매칭', text: '등록된 공고를 기반으로 적합한 후보군을 추천받습니다.' },
      ]}
      steps={['공고 정보 입력', 'AI 문구 점검', '게시 및 매칭 시작']}
    />
  );
}

export default JobNoticeCreatePage;
