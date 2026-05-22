import { Handshake, MessageSquareHeart, Star } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function MentorPage() {
  return (
    <ServicePage
      eyebrow="MENTOR"
      title="멘토 찾기"
      description="현직자와 멘토를 찾아 직무, 이직, 포트폴리오에 대한 조언을 받을 수 있습니다."
      primaryAction="멘토 찾기"
      secondaryAction="상담 신청 내역"
      metrics={[
        { value: '120명', label: '활동 멘토' },
        { value: '4.8', label: '평균 평점' },
        { value: '24h', label: '평균 응답 시간' },
      ]}
      cards={[
        { icon: Handshake, title: '멘토 매칭', text: '직무와 경력 목표에 맞는 멘토를 추천합니다.' },
        { icon: MessageSquareHeart, title: '상담 요청', text: '궁금한 내용을 정리해 멘토에게 상담을 신청합니다.' },
        { icon: Star, title: '후기 확인', text: '다른 사용자의 상담 후기와 평점을 확인합니다.' },
      ]}
      steps={['멘토 탐색', '상담 요청', '피드백 정리']}
    />
  );
}

export default MentorPage;
