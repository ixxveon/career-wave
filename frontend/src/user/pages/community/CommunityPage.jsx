import { MessageCircle, MessagesSquare, ThumbsUp } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function CommunityPage() {
  return (
    <ServicePage
      eyebrow="COMMUNITY"
      title="커뮤니티"
      description="취업 준비 과정에서 필요한 질문, 면접 후기, 서류 팁을 함께 나누는 공간입니다."
      primaryAction="글 작성하기"
      secondaryAction="인기 글 보기"
      metrics={[
        { value: '320개', label: '이번 주 게시글' },
        { value: '1.8k', label: '활동 중인 멤버' },
        { value: '94%', label: '답변 만족도' },
      ]}
      cards={[
        { icon: MessagesSquare, title: '질문 게시판', text: '취업 준비 중 막히는 부분을 질문하고 답변을 받습니다.' },
        { icon: MessageCircle, title: '면접 후기', text: '기업별 면접 경험과 질문 유형을 공유합니다.' },
        { icon: ThumbsUp, title: '추천 팁', text: '많은 사용자가 저장한 이력서와 면접 팁을 확인합니다.' },
      ]}
      steps={['질문 작성', '커뮤니티 답변 확인', '나만의 준비 노트 저장']}
    />
  );
}

export default CommunityPage;
