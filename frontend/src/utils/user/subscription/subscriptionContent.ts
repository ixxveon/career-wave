import { FileText, Headphones, Mic, RefreshCw, Sparkles } from 'lucide-react';
import { PAYMENT_HISTORY_PERIOD, PRODUCT_CODE, type PaymentHistoryPeriod } from '../../../types/user/subscription';

export const PAYMENT_HISTORY_PERIOD_OPTIONS: Array<{ label: string; value: PaymentHistoryPeriod }> = [
  { label: '최근 1개월', value: PAYMENT_HISTORY_PERIOD.ONE_MONTH },
  { label: '최근 3개월', value: PAYMENT_HISTORY_PERIOD.THREE_MONTHS },
  { label: '최근 6개월', value: PAYMENT_HISTORY_PERIOD.SIX_MONTHS },
  { label: '최근 1년', value: PAYMENT_HISTORY_PERIOD.TWELVE_MONTHS },
] as const;

export const BILLING_NOTICE_ITEMS = [
  '결제 관련 사항(결제일시, 결제 수단, 취소, 미납 여부 등)은 관련 법령에 따라 보관되며, 결제일로부터 최대 5년간 조회 가능합니다.',
  '마일리지 등 적립받은 지급 수단으로 전액 결제하는 경우 현금영수증은 발급되지 않습니다.',
  '결제 취소 및 환불 요청 시 아래 기준이 적용됩니다.',
  '상품 이용기간 동안 해당 상품 전부를 이용하지 않은 경우에만 결제 취소 또는 환불이 가능할 수 있습니다.',
  '상품 이용기간은 상품 상세 페이지 및 유의사항 등에서 안내한 상품 이용 가능 기간을 의미합니다.',
  '구매한 상품의 일부라도 열람, 다운로드, 응시, 접속 등의 방법으로 확인했거나 이용 가능한 상태로 변경된 경우 상품 이용이 시작된 것으로 봅니다.',
  '상품 이용이 시작되면 결제 취소 및 환불 여부는 상품 특성 및 안내사항에 따라 제한될 수 있습니다.',
  '결제 및 취소/환불 관련 상세 문의는 고객센터를 통해 접수할 수 있습니다.',
] as const;

export const SERVICE_CARDS = [
  {
    key: 'document',
    productCode: PRODUCT_CODE.DOCUMENT_COACHING,
    title: '서류 AI 코칭',
    description: '가이드와 피드백을 보면서 차근차근 서류 완성도를 끌어올릴 수 있어요.',
    href: '/billing/checkout?product=document-coaching',
    icon: FileText,
    accent: 'document',
    highlights: ['답변 전에 가이드 보고', '답변하고 바로 코칭 받고', '리포트개선 포인트 확인'],
    footer: '서류 준비가 처음이거나, 자기소개서를 더 정교하게 다듬고 싶은 분',
    bullets: ['자기소개서 AI 분석', '이력서 피드백', '맞춤 개선 제안', 'PDF 리포트 제공'],
  },
  {
    key: 'interview',
    productCode: PRODUCT_CODE.INTERVIEW,
    title: 'AI 모의면접',
    description: '가이드 없이 실전처럼 연습하고, 답변 분석과 리포트까지 한 번에 확인할 수 있어요.',
    href: '/billing/checkout?product=interview',
    icon: Mic,
    accent: 'interview',
    highlights: ['다양한 꼬리질문 대응', '분석 리포트로 합격 진단', '답변 준비 시간 2분 30초 제한'],
    footer: '실전 감각을 익히고 싶은 분, 돌발 질문 대응력을 키우고 싶은 분',
    bullets: ['실전 면접 연습', '답변 분석', 'AI 피드백 리포트', '면접 결과 저장'],
  },
] as const;

export const NOTICE_SECTIONS = [
  {
    title: 'AI 서비스 이용 안내',
    icon: Sparkles,
    items: [
      'AI 서비스는 결제 완료 후 즉시 이용할 수 있습니다.',
      '서류 AI 코칭과 AI 모의면접은 각각 별도의 구독 상품으로 운영됩니다.',
      '월 제공 횟수는 상품별로 다르게 제공되며, 매월 결제일을 기준으로 새롭게 갱신됩니다.',
      '사용하지 않은 제공 횟수는 다음 결제 주기로 이월되지 않습니다.',
      'AI 분석 결과는 입력한 정보와 답변 내용을 기반으로 생성되며, 실제 채용 결과를 보장하지 않습니다.',
      'AI 모의면접 이용 시 마이크 권한 허용이 필요할 수 있습니다.',
    ],
  },
  {
    title: '자동 결제 및 구독 해지 안내',
    icon: RefreshCw,
    items: [
      '구독 상품은 매월 결제일에 자동으로 정기 결제됩니다.',
      '결제일은 최초 구독 결제가 완료된 날짜를 기준으로 설정됩니다.',
      '구독 해지는 이 페이지의 내 구독 내역 영역에서 신청할 수 있습니다.',
      '구독 해지 버튼을 누르면 다음 결제일부터 자동 결제가 중단됩니다.',
      '구독을 해지하더라도 이미 결제된 이용 기간 동안은 서비스를 계속 이용할 수 있습니다.',
      '결제 후 서비스를 전혀 이용하지 않은 경우에 한해 환불이 가능할 수 있습니다.',
      '제공 횟수를 일부 사용한 경우 환불이 제한되거나 부분 환불 기준이 적용될 수 있습니다.',
      '결제 오류, 중복 결제 등 시스템 문제로 발생한 결제 건은 확인 후 별도 처리됩니다.',
    ],
  },
  {
    title: '문의 및 유의사항',
    icon: Headphones,
    items: [
      '서비스 이용 중 오류가 발생한 경우 고객센터를 통해 문의해주세요.',
      '문의 시 결제일, 상품명, 오류 화면 또는 발생 상황을 함께 전달하면 더 빠르게 확인할 수 있습니다.',
      'AI 서비스에서 제공되는 피드백은 학습 및 취업 준비 보조 목적으로 제공됩니다.',
      '부정확한 입력 정보나 불완전한 답변을 제출한 경우 분석 결과의 정확도가 낮아질 수 있습니다.',
      '타인의 개인정보, 허위 정보, 부적절한 내용 입력은 제한될 수 있습니다.',
      '서비스 점검 또는 외부 API 장애 상황에서는 일시적으로 이용이 제한될 수 있습니다.',
    ],
  },
] as const;
