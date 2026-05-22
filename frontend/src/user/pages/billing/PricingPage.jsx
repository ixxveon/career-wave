import { CreditCard, ReceiptText, WalletCards } from 'lucide-react';
import ServicePage from '../../../components/common/ServicePage';

function PricingPage() {
  return (
    <ServicePage
      eyebrow="PRICING"
      title="요금제"
      description="개인 사용자와 기업 고객에게 맞는 요금제를 비교하고 필요한 기능을 선택합니다."
      primaryAction="요금제 선택"
      secondaryAction="결제 내역 보기"
      metrics={[
        { value: '무료', label: '기본 분석 시작' },
        { value: 'Pro', label: '고급 코칭 지원' },
        { value: 'Team', label: '기업 채용 관리' },
      ]}
      cards={[
        { icon: WalletCards, title: '개인 요금제', text: '서류 분석과 면접 연습을 더 깊게 활용합니다.' },
        { icon: CreditCard, title: '기업 요금제', text: '공고 등록과 지원자 관리를 팀 단위로 사용합니다.' },
        { icon: ReceiptText, title: '결제 관리', text: '결제 수단과 영수증, 이용 내역을 확인합니다.' },
      ]}
      steps={['요금제 비교', '결제 정보 입력', '서비스 활성화']}
    />
  );
}

export default PricingPage;
