import { Building2, Image, Settings } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function CompanyProfilePage() {
  return (
    <ServicePage
      eyebrow="COMPANY"
      title="기업 프로필"
      description="기업 소개, 채용 브랜딩, 복지와 기술 스택 정보를 관리해 지원자에게 신뢰감 있는 페이지를 제공합니다."
      primaryAction="프로필 수정"
      secondaryAction="미리보기"
      metrics={[
        { value: '85%', label: '프로필 완성도' },
        { value: '6개', label: '공개 채용공고' },
        { value: '브랜딩', label: '기업 소개 강화' },
      ]}
      cards={[
        { icon: Building2, title: '기업 정보', text: '회사 소개와 위치, 산업군 정보를 정리합니다.' },
        { icon: Image, title: '브랜딩 이미지', text: '로고와 대표 이미지를 등록해 기업 인상을 강화합니다.' },
        { icon: Settings, title: '공개 설정', text: '지원자에게 보여줄 항목과 노출 범위를 설정합니다.' },
      ]}
      steps={['기업 정보 입력', '브랜딩 요소 등록', '프로필 공개']}
    />
  );
}

export default CompanyProfilePage;
