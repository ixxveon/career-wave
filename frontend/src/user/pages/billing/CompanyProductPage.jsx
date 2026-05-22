import { BadgeCheck, BriefcaseBusiness, Megaphone } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function CompanyProductPage() {
  return (
    <ServicePage
      eyebrow="COMPANY PRODUCT"
      title="기업 상품"
      description="채용공고 노출, 인재 추천, 브랜딩 강화를 위한 기업 전용 상품을 관리합니다."
      primaryAction="상품 둘러보기"
      secondaryAction="이용 현황"
      metrics={[
        { value: '3개', label: '이용 중 상품' },
        { value: '2.4x', label: '공고 노출 증가' },
        { value: 'AI', label: '인재 추천 포함' },
      ]}
      cards={[
        { icon: Megaphone, title: '공고 노출 강화', text: '주요 채용공고를 더 많은 지원자에게 노출합니다.' },
        { icon: BriefcaseBusiness, title: '인재 추천', text: '공고에 맞는 후보자를 AI가 추천합니다.' },
        { icon: BadgeCheck, title: '브랜드 신뢰도', text: '검증된 기업 배지와 채용 브랜딩을 제공합니다.' },
      ]}
      steps={['상품 선택', '결제 및 적용', '성과 확인']}
    />
  );
}

export default CompanyProductPage;
