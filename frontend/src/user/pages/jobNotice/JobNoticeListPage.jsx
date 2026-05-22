import { BriefcaseBusiness, Filter, Search } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function JobNoticeListPage() {
  return (
    <ServicePage
      eyebrow="JOB BOARD"
      title="채용공고"
      description="커리어 웨이브가 추천하는 IT 채용공고를 탐색하고, 내 역량과 맞는 포지션을 빠르게 찾아보세요."
      primaryAction="공고 검색하기"
      secondaryAction="추천 공고 보기"
      metrics={[
        { value: '1,240+', label: '등록된 채용공고' },
        { value: '92%', label: 'AI 매칭 정확도' },
        { value: '24h', label: '신규 공고 업데이트' },
      ]}
      cards={[
        { icon: Search, title: '공고 검색', text: '직무, 기술 스택, 근무 지역을 기준으로 원하는 공고를 찾습니다.' },
        { icon: Filter, title: '맞춤 필터', text: '경력, 고용 형태, 연봉 조건을 조합해 후보 공고를 줄입니다.' },
        { icon: BriefcaseBusiness, title: 'AI 추천', text: '프로필과 이력서 기반으로 지원 가능성이 높은 공고를 제안합니다.' },
      ]}
      steps={['프로필 등록', '관심 직무 선택', '추천 공고 확인']}
    />
  );
}

export default JobNoticeListPage;
