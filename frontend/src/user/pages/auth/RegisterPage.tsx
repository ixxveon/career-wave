import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Apple, BadgeCheck, Building2, CheckCircle2, FileText, ShieldCheck, UserRound } from 'lucide-react';
import './AuthPage.css';

const socialProviders = [
  { id: 'kakao', label: '카카오', mark: 'K' },
  { id: 'naver', label: '네이버', mark: 'N' },
  { id: 'google', label: 'Google', mark: 'G' },
  { id: 'apple', label: 'Apple' },
];

const companyTypes = [
  '대기업',
  '대기업 계열사·자회사',
  '중소기업(300명 이하)',
  '중견기업(300명 이상)',
  '벤처기업',
  '외국계(외국 투자기업)',
  '외국계(외국 법인기업)',
  '국내 공공기관·공기업',
  '비영리단체·협회·교육재단',
  '외국 기관·비영리기구·단체',
];

const initialPersonalForm = {
  userId: '',
  email: '',
  password: '',
  passwordConfirm: '',
  name: '',
  phone: '',
  phoneCode: '',
};

const initialCompanyForm = {
  companyType: '',
  businessNumber: '',
  companyName: '',
  ceoName: '',
  address: '',
  addressDetail: '',
  isAgency: false,
  certificateNumber: '',
  managerId: '',
  managerPassword: '',
  managerPasswordConfirm: '',
  managerName: '',
  managerPhone: '',
  managerPhoneCode: '',
  managerEmail: '',
  managerEmailCode: '',
};

type PersonalForm = typeof initialPersonalForm;
type CompanyForm = typeof initialCompanyForm;
type PersonalFormKey = keyof PersonalForm;
type CompanyFormKey = keyof CompanyForm;

const initialTerms = {
  service: false,
  privacy: false,
  marketing: false,
};

const initialCompanyTerms = {
  service: false,
  sms: false,
  privacy: false,
  marketing: false,
};

const initialPersonalTerms = {
  age: false,
  service: false,
  privacy: false,
  marketing: false,
};

const personalTermDetails = {
  service: [
    {
      title: '제 1 조 (목적)',
      body: '본 약관은 Career Wave(이하 "회사")가 운영하는 AI 기반 취업 플랫폼 서비스(이하 "서비스")를 이용함에 있어 회사와 회원 간의 권리, 의무 및 책임사항, 서비스 이용조건 및 절차 등 기본적인 사항을 규정함을 목적으로 합니다.',
    },
    {
      title: '제 2 조 (용어의 정의)',
      body: '① "서비스"란 회사가 제공하는 AI 면접, AI 문서 분석, 맞춤 공고 추천, 기업 매칭, 이력서 관리, 채용 지원, 커뮤니티 등 취업 및 채용과 관련된 제반 서비스를 의미합니다.\n\n② "회원"이란 본 약관에 동의하고 회사와 이용계약을 체결한 자를 의미합니다.\n\n③ "개인회원"이란 구직 활동을 목적으로 서비스를 이용하는 회원을 의미합니다.\n\n④ "기업회원"이란 채용 및 인재 탐색을 목적으로 서비스를 이용하는 기업 또는 기업 담당자를 의미합니다.\n\n⑤ "아이디"란 회원 식별 및 서비스 이용을 위하여 회원이 설정한 문자 및 숫자의 조합을 의미합니다.\n\n⑥ "비밀번호"란 회원의 개인정보 보호 및 계정 보안을 위해 회원이 설정한 문자 및 숫자의 조합을 의미합니다.',
    },
    {
      title: '제 3 조 (약관의 효력 및 변경)',
      body: '① 회사는 관련 법령을 위반하지 않는 범위 내에서 본 약관을 변경할 수 있습니다.\n\n② 약관 변경 시 적용일자 및 변경 사유를 서비스 화면에 사전 공지합니다.\n\n③ 회원이 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다.',
    },
    {
      title: '제 4 조 (회원가입 및 이용계약의 성립)',
      body: '① 이용계약은 회원이 본 약관 및 개인정보처리방침에 동의하고 회원가입을 완료한 시점에 성립됩니다.\n\n② 회사는 회원가입 시 본인 인증 및 실명 확인 절차를 요구할 수 있습니다.\n\n③ 회원은 본인의 정확한 정보를 제공해야 하며 허위 정보 입력에 대한 책임은 회원 본인에게 있습니다.',
    },
    {
      title: '제 5 조 (서비스의 제공)',
      body: '회사는 아래 서비스를 제공합니다.\n\n1. AI 기반 맞춤 채용공고 추천\n2. AI 모의면접 서비스\n3. AI 자기소개서 및 문서 분석\n4. 이력서 등록 및 관리\n5. 기업 채용 관리 서비스\n6. 기업-구직자 매칭 서비스\n7. 커뮤니티 및 정보 공유 서비스\n8. 기타 회사가 제공하는 부가 서비스',
    },
    {
      title: '제 6 조 (서비스 이용 제한)',
      body: '회사는 아래 경우 회원의 서비스 이용을 제한할 수 있습니다.\n\n1. 허위 정보 입력\n2. 타인 명의 도용\n3. 서비스 운영 방해\n4. 불법적 목적 이용\n5. 비정상적 접근 및 해킹 시도\n6. 타 회원에 대한 욕설, 비방, 협박 행위\n7. 회사 정책 및 관계 법령 위반',
    },
    {
      title: '제 7 조 (AI 기반 서비스 이용)',
      body: '① 회사는 AI 기술을 활용한 분석 및 추천 결과를 제공합니다.\n\n② 회원은 AI 결과물이 실제 결과와 다를 수 있음을 이해하고 사용해야 합니다.\n\n③ 회사는 AI 결과의 정확성, 적합성, 신뢰성을 보증하지 않습니다.\n\n④ 회원은 AI 결과를 참고 자료로 활용해야 하며 최종 판단은 회원 본인에게 있습니다.',
    },
    {
      title: '제 8 조 (회원 정보 및 이력서 관리)',
      body: '① 회원이 등록한 이력서 및 프로필 정보는 회원 본인이 관리합니다.\n\n② 회원은 공개 여부를 직접 설정할 수 있습니다.\n\n③ 회원이 공개 설정한 이력서는 기업회원에게 노출될 수 있습니다.\n\n④ 회사는 서비스 품질 개선 및 추천 알고리즘 개선을 위해 데이터를 활용할 수 있습니다.',
    },
    {
      title: '제 9 조 (유료 서비스 및 결제)',
      body: '① 회사는 일부 서비스를 유료로 제공합니다.\n\n② 유료 서비스 이용 시 회원은 회사가 정한 결제 정책에 동의한 것으로 간주합니다.\n\n③ 회사는 서비스 요금 및 정책을 변경할 수 있으며 변경 시 사전 공지합니다.',
    },
    {
      title: '제 10 조 (환불 정책)',
      body: '① 회원은 관계 법령 및 회사 환불 정책에 따라 환불을 요청할 수 있습니다.\n\n② 이미 사용된 유료 서비스에 대해서는 일부 환불이 제한될 수 있습니다.\n\n③ AI 분석 및 디지털 콘텐츠 특성상 사용 완료 후 환불이 제한될 수 있습니다.',
    },
    {
      title: '제 11 조 (개인정보 보호)',
      body: '회사는 회원의 개인정보를 관련 법령에 따라 보호하며 개인정보처리방침에 따라 안전하게 관리합니다.',
    },
    {
      title: '제 12 조 (회원의 의무)',
      body: '회원은 아래 행위를 해서는 안 됩니다.\n\n1. 타인 정보 도용\n2. 불법 프로그램 사용\n3. 서비스 운영 방해\n4. 회사 지적재산권 침해\n5. 허위 채용 공고 등록\n6. 불법적 데이터 수집\n7. 음란물 및 불법 콘텐츠 게시',
    },
    {
      title: '제 13 조 (서비스 중단)',
      body: '회사는 시스템 점검, 장애, 천재지변 등의 경우 서비스 제공을 일시 중단할 수 있습니다.',
    },
    {
      title: '제 14 조 (계약 해지 및 탈퇴)',
      body: '회원은 언제든지 회원 탈퇴를 요청할 수 있습니다.\n\n회사는 아래 사유 발생 시 회원 자격을 제한 또는 해지할 수 있습니다.\n\n1. 허위 정보 등록\n2. 서비스 악용\n3. 관계 법령 위반\n4. 회사 운영 방해',
    },
    {
      title: '제 15 조 (손해배상 및 면책)',
      body: '① 회사는 회원의 귀책사유로 발생한 손해에 책임을 지지 않습니다.\n\n② 회사는 무료 서비스 이용과 관련하여 특별한 사정이 없는 한 책임을 부담하지 않습니다.\n\n③ 회사는 AI 결과물의 정확성 및 신뢰성을 보증하지 않습니다.',
    },
    {
      title: '제 16 조 (분쟁 해결)',
      body: '회사와 회원 간 발생한 분쟁은 대한민국 법령에 따라 해결하며 관할 법원은 회사 본사 소재지 관할 법원으로 합니다.',
    },
  ],
  privacy: [
    {
      title: '1. 개인정보 수집 및 이용 목적',
      body: '회사는 아래 목적을 위해 개인정보를 수집 및 이용합니다.\n\n- 회원가입 및 본인 확인\n- AI 기반 맞춤 채용공고 추천\n- AI 면접 및 문서 분석 서비스 제공\n- 채용 지원 및 기업 매칭 서비스 운영\n- 고객 문의 응대\n- 서비스 품질 개선\n- 이벤트 및 혜택 안내\n- 맞춤형 마케팅 정보 제공',
    },
    {
      title: '2. 수집하는 개인정보 항목',
      body: '회사는 아래 개인정보를 수집할 수 있습니다.\n\n- 이름\n- 아이디\n- 비밀번호\n- 이메일\n- 휴대폰번호\n- 통신사 정보\n- 이력서 및 자기소개서 정보\n- 업로드 파일 데이터\n- AI 면접 이용 기록\n- 서비스 이용 기록\n- 브라우저 및 기기 정보\n- IP 주소 및 접속 로그\n- 쿠키 및 세션 정보',
    },
    {
      title: '3. 개인정보 보유 및 이용기간',
      body: '회사는 회원 탈퇴 시 개인정보를 즉시 파기합니다.\n\n단, 관계 법령에 따라 아래 정보는 일정 기간 보관될 수 있습니다.\n\n- 계약 및 결제 기록\n- 소비자 불만 및 분쟁 처리 기록\n- 접속 로그 기록',
    },
    {
      title: '4. 동의 거부 권리 안내',
      body: '회원은 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다.\n\n다만 동의를 거부할 경우:\n- 맞춤 공고 추천\n- AI 분석 기능\n- 이벤트 안내\n등 일부 서비스 이용이 제한될 수 있습니다.',
    },
    {
      title: '5. 개인정보 보호',
      body: '회사는 회원의 개인정보를 안전하게 보호하기 위해 기술적·관리적 보호조치를 적용합니다.',
    },
    {
      title: '6. 동의 철회 방법',
      body: '회원은 언제든지:\n- 마이페이지\n- 회원정보 수정\n- 고객센터 문의\n를 통해 동의를 철회할 수 있습니다.',
    },
  ],
  marketing: [
    {
      title: '광고성 정보 수신 동의',
      body: '회원은 Career Wave가 제공하는 광고성 정보 수신에 동의합니다.\n\n회사는 아래 목적을 위해 광고성 정보를 발송할 수 있습니다.\n\n- 신규 서비스 안내\n- AI 면접 기능 업데이트\n- 맞춤 채용공고 추천\n- 이벤트 및 프로모션 안내\n- 제휴 서비스 혜택 안내\n- 할인 및 쿠폰 제공\n- 기업 추천 정보 제공\n\n광고성 정보는 아래 수단으로 발송될 수 있습니다.\n\n- 이메일\n- SMS\n- Push 알림\n- 앱 Push\n- 카카오 알림톡\n\n회원은 언제든지 광고성 정보 수신을 거부할 수 있으며:\n- 마이페이지\n- 수신설정 관리\n- 고객센터\n를 통해 변경 가능합니다.\n\n수신 거부 시 일부 혜택 및 이벤트 정보를 제공받지 못할 수 있습니다.',
    },
  ],
};

const companyTermDetails = {
  service: [
    {
      title: '제 1 조 (목적)',
      body: '본 약관은 Career Wave(이하 "회사")가 제공하는 기업회원 전용 채용관리 및 AI 기반 인재 매칭 서비스의 이용과 관련하여 회사와 기업회원 간의 권리, 의무, 책임사항 및 서비스 이용 절차를 규정함을 목적으로 합니다.',
    },
    {
      title: '제 2 조 (용어 정의)',
      body: '① "기업회원"이란 채용, 인재 검색, 채용 운영을 목적으로 회사와 이용계약을 체결한 사업자, 기관 또는 단체를 의미합니다.\n\n② "마스터 계정"은 기업회원 계정의 대표 권한을 가지며 좌석, 구독, 결제, 공고 운영 설정을 관리하는 계정을 의미합니다.\n\n③ "멤버 계정"은 마스터 계정의 초대를 받아 기업 서비스에 참여하는 담당자 계정을 의미합니다.\n\n④ "복수계정"은 한 기업회원이 동일한 조직 내 여러 담당자에게 발급하는 추가 좌석 계정을 의미합니다.\n\n⑤ "크레딧"이란 이력서 열람, 인재 제안, 특정 채용 기능 이용 시 차감되는 서비스 포인트를 의미합니다.',
    },
    {
      title: '제 3 조 (기업회원 가입 및 기업인증)',
      body: '① 기업회원 가입은 회사명, 사업자등록번호, 대표자명, 담당자 정보 등 필수 정보를 입력하고 약관에 동의한 후 회사가 이를 승인함으로써 완료됩니다.\n\n② 회사는 기업회원 가입 시 사업자등록번호, 기업인증 정보, 담당자 정보의 진위 여부를 확인할 수 있습니다.\n\n③ 기업회원은 정확한 사업자 정보와 회사 정보를 등록해야 하며 허위 정보 등록에 대한 책임은 기업회원에게 있습니다.',
    },
    {
      title: '제 4 조 (마스터/멤버 계정 및 복수계정)',
      body: '① 마스터 계정은 기업회원 서비스 전반의 운영 책임을 가집니다.\n\n② 마스터 계정은 멤버 계정을 초대하거나 권한을 조정할 수 있습니다.\n\n③ 회사는 구독 플랜에 따라 기본 좌석 수를 제공하며, 복수계정 사용을 위해 추가 좌석 구매를 요구할 수 있습니다.\n\n④ 동일 조직 내라도 승인되지 않은 계정 공유 또는 무단 계정 생성은 제한될 수 있습니다.',
    },
    {
      title: '제 5 조 (서비스 제공 내용)',
      body: '회사는 기업회원에게 다음 서비스를 제공합니다.\n\n1. 채용공고 등록 및 관리\n2. AI 기반 인재 추천 및 매칭\n3. 이력서 열람 및 인재 검색\n4. 지원자 관리 및 채용 파이프라인 운영\n5. 기업 전용 구독 및 좌석 관리\n6. 크레딧 충전 및 사용 기능\n7. 메시지, 알림, 공고 운영 보조 기능\n8. 기타 회사가 제공하는 기업회원 전용 부가 서비스',
    },
    {
      title: '제 6 조 (채용공고 등록 및 허위 구인광고 금지)',
      body: '① 기업회원은 실제 채용 목적에 부합하는 공고만 등록해야 합니다.\n\n② 허위 채용, 과장 광고, 불법 다단계, 차별 표현이 포함된 공고, 구직자를 오인하게 하는 공고는 등록할 수 없습니다.\n\n③ 회사는 정책 위반 공고를 사전 통지 없이 수정, 숨김 또는 삭제할 수 있습니다.',
    },
    {
      title: '제 7 조 (이력서 열람 및 AI 기반 기능)',
      body: '① 기업회원은 회사가 허용한 범위 내에서 이력서를 열람하고 인재를 검색할 수 있습니다.\n\n② AI 기반 인재 추천 및 채용 지원 기능은 참고 자료이며, 회사는 추천 결과의 정확성이나 채용 성과를 보증하지 않습니다.\n\n③ 기업회원은 열람한 이력서 및 지원자 정보를 채용 목적 외 용도로 이용할 수 없습니다.',
    },
    {
      title: '제 8 조 (유료 서비스, 좌석 기반 구독, 크레딧)',
      body: '① 회사는 일부 기능을 유료 서비스 또는 구독형 서비스로 제공합니다.\n\n② 기업회원은 선택한 플랜에 따라 월 단위 또는 별도 약정 단위로 이용요금을 납부합니다.\n\n③ 좌석 기반 구독 서비스는 기본 제공 좌석 수를 초과할 경우 추가 좌석 요금이 부과될 수 있습니다.\n\n④ 크레딧은 충전 후 특정 기능 이용 시 차감되며, 회사는 기능별 차감 기준을 서비스 화면에 고지합니다.',
    },
    {
      title: '제 9 조 (결제 및 환불 정책)',
      body: '① 기업회원은 등록된 결제수단을 통해 구독료, 좌석 요금, 크레딧 충전 금액을 결제할 수 있습니다.\n\n② 이미 사용된 구독 기간, 사용 완료된 크레딧, 실행된 디지털 서비스에 대해서는 환불이 제한될 수 있습니다.\n\n③ 환불 가능 여부 및 환불 금액은 관계 법령, 결제대행사 정책 및 회사 환불 정책에 따릅니다.',
    },
    {
      title: '제 10 조 (기업회원의 의무)',
      body: '기업회원은 다음 행위를 해서는 안 됩니다.\n\n1. 허위 회사정보 또는 타 사업자 정보 도용\n2. 허위 채용공고 등록\n3. 구직자 개인정보의 무단 수집·보관·제3자 제공\n4. 계정 공유 또는 권한 오남용\n5. 회사 서비스의 정상 운영을 방해하는 행위\n6. 관계 법령, 고용 관련 법규 및 회사 정책 위반',
    },
    {
      title: '제 11 조 (서비스 제한 및 탈퇴)',
      body: '① 회사는 약관 위반, 허위 정보 등록, 미납, 불법적 서비스 이용 등이 확인될 경우 기업회원의 서비스 이용을 제한할 수 있습니다.\n\n② 기업회원은 언제든지 탈퇴를 요청할 수 있으나, 진행 중인 결제, 정산, 공고, 계약 관계가 있는 경우 일부 절차가 선행될 수 있습니다.\n\n③ 회사는 서비스 제한 또는 해지 조치 시 필요한 경우 사전 또는 사후에 사유를 안내합니다.',
    },
    {
      title: '제 12 조 (손해배상 및 분쟁 해결)',
      body: '① 기업회원의 귀책사유로 회사 또는 제3자에게 손해가 발생한 경우 기업회원은 그 손해를 배상할 책임을 집니다.\n\n② 회사와 기업회원 간 분쟁은 대한민국 법령에 따라 해결하며, 관할 법원은 회사 본사 소재지 관할 법원으로 합니다.',
    },
  ],
  sms: [
    {
      title: '제 1 조 (문자서비스 목적)',
      body: '본 약관은 Career Wave가 기업회원에게 제공하는 문자 발송 서비스(SMS, LMS, 알림 발송 등)의 이용 조건과 책임사항을 규정합니다.',
    },
    {
      title: '제 2 조 (문자서비스 정의)',
      body: '문자서비스란 채용 관련 안내, 알림, 면접 일정, 지원자 커뮤니케이션 등을 위해 기업회원이 이용하는 SMS, LMS 및 유사 전자적 발송 서비스를 의미합니다.',
    },
    {
      title: '제 3 조 (발신번호 등록 및 인증)',
      body: '기업회원은 문자 발송에 사용할 발신번호를 적법하게 등록하고 회사가 요구하는 인증 절차를 거쳐야 합니다. 타인의 번호를 무단 사용해서는 안 됩니다.',
    },
    {
      title: '제 4 조 (스팸 및 불법 메시지 금지)',
      body: '기업회원은 스팸메시지, 문자피싱, 스미싱, 허위 광고, 불법 홍보 메시지를 발송할 수 없습니다. 광고성 정보 발송 시 관련 법령 및 사전 수신동의 의무를 준수해야 합니다.',
    },
    {
      title: '제 5 조 (서비스 이용 제한 및 발송량 제한)',
      body: '회사는 비정상적 대량 발송, 신고 누적, 법령 위반 우려가 있는 경우 발송량을 제한하거나 서비스를 일시 정지할 수 있습니다. 필요 시 계정 또는 발신번호 단위로 제한이 적용될 수 있습니다.',
    },
    {
      title: '제 6 조 (서비스 해지 및 환불)',
      body: '문자서비스 해지는 기업회원이 언제든지 요청할 수 있습니다. 이미 사용된 문자 발송 건, 실제 발송이 완료된 서비스, 법령 또는 시스템상 환불이 제한되는 건에 대해서는 환불이 제한될 수 있습니다.',
    },
  ],
  privacy: [
    {
      title: '1. 수집·이용 목적',
      body: '상품·서비스 영업, 홍보, 마케팅, 쿠폰 발송, 기업회원 맞춤 서비스 안내, 채용관리 서비스 개선, AI 기반 인재 추천 품질 개선을 목적으로 Career Wave에서 활용합니다.',
    },
    {
      title: '2. 수집하는 개인정보 항목',
      body: '담당자명, 담당자 전화번호, 담당자 이메일, 회사명, 사업자등록번호, 서비스 이용 기록, 결제 및 구독 이용 기록, 크레딧 사용 기록, 푸시토큰, 접속 로그',
    },
    {
      title: '3. 개인정보 보유 및 이용기간',
      body: '회원탈퇴 시 즉시 파기합니다. 단, 관계 법령에 따라 보존이 필요한 결제 기록, 계약 기록, 소비자 불만 및 분쟁 처리 기록은 해당 법령에서 정한 기간 동안 보관할 수 있습니다.',
    },
    {
      title: '4. 수신동의 거부 및 철회방법 안내',
      body: '본 동의는 거부하실 수 있습니다. 다만 거부 시 동의를 통해 제공 가능한 각종 혜택, 이벤트, 기업회원 전용 프로모션, 채용관리 서비스 안내를 받아보실 수 없습니다. 더 이상 상품·서비스 영업, 홍보, 마케팅, 쿠폰 발송을 원하시지 않는 경우 회원정보수정 또는 수신설정 페이지에서 수신여부를 변경하실 수 있습니다.',
    },
  ],
  marketing: [
    {
      title: '광고성 정보 수신 동의',
      body: '회원이 수집 및 이용에 동의한 개인정보를 Career Wave에서 활용하는 것에 동의하며, 해당 개인정보를 활용하여 전화 또는 전자적 전송매체(이메일/SMS/Push 등 다양한 전송매체)를 통해 서비스에 대한 개인 맞춤형 광고 정보, 뉴스레터, 신규 기능 안내, 기업회원 프로모션, 채용관리 상품 안내, 좌석 구독 플랜 안내, 크레딧 충전 혜택, 제휴 서비스 안내를 전송할 수 있습니다.\n\n광고성 정보 수신 동의를 철회하고자 할 경우에는 마이페이지 또는 광고성 동의 수신 설정 페이지에서 수신여부를 변경하실 수 있습니다.',
    },
  ],
};

type FieldProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
  wide?: boolean;
};

type TextInputProps = {
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

type SelectInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
};

type StatusPillProps = {
  active: boolean;
  children: ReactNode;
};

type AuthButtonGroupProps = {
  input: ReactNode;
  buttonLabel: string;
  onClick: () => void;
  secondButtonLabel?: string;
  onSecondClick?: () => void;
};

function Field({ label, children, required = false, wide = false }: FieldProps) {
  return (
    <label className={wide ? 'cw-register-field cw-register-field--wide' : 'cw-register-field'}>
      <span className="cw-register-label">
        {label}
        {required && <em>*</em>}
      </span>
      {children}
    </label>
  );
}

function TextInput({ type = 'text', value, onChange, placeholder }: TextInputProps) {
  return <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />;
}

function SelectInput({ value, onChange, placeholder, options }: SelectInputProps) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option value={option} key={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function StatusPill({ active, children }: StatusPillProps) {
  if (!active) return null;

  return (
    <span className="cw-register-status">
      <CheckCircle2 size={15} />
      {children}
    </span>
  );
}

function RegisterTerms({ values, onChange, marketingLabel = '선택 마케팅 정보 수신 동의' }) {
  const allChecked = values.service && values.privacy && values.marketing;

  const toggleAll = (checked) => {
    onChange({
      service: checked,
      privacy: checked,
      marketing: checked,
    });
  };

  const toggleOne = (key) => {
    onChange({
      ...values,
      [key]: !values[key],
    });
  };

  return (
    <div className="cw-register-terms">
      <label className="cw-register-check cw-register-check--all">
        <input type="checkbox" checked={allChecked} onChange={(event) => toggleAll(event.target.checked)} />
        <span>전체 동의</span>
      </label>
      <label className="cw-register-check">
        <input type="checkbox" checked={values.service} onChange={() => toggleOne('service')} />
        <span>
          <strong>[필수]</strong> 이용약관 동의
        </span>
      </label>
      <label className="cw-register-check">
        <input type="checkbox" checked={values.privacy} onChange={() => toggleOne('privacy')} />
        <span>
          <strong>[필수]</strong> 개인정보 수집 및 이용 동의
        </span>
      </label>
      <label className="cw-register-check">
        <input type="checkbox" checked={values.marketing} onChange={() => toggleOne('marketing')} />
        <span>
          <strong>[선택]</strong> {marketingLabel}
        </span>
      </label>
    </div>
  );
}

function AuthButtonGroup({ input, buttonLabel, onClick, secondButtonLabel, onSecondClick }: AuthButtonGroupProps) {
  return (
    <div className={secondButtonLabel ? 'cw-register-inline cw-register-inline--triple' : 'cw-register-inline'}>
      {input}
      <button className="cw-register-sub-button" type="button" onClick={onClick}>
        {buttonLabel}
      </button>
      {secondButtonLabel && (
        <button className="cw-register-sub-button cw-register-sub-button--ghost" type="button" onClick={onSecondClick}>
          {secondButtonLabel}
        </button>
      )}
    </div>
  );
}

function PersonalTerms({ values, onChange }) {
  const [openDetails, setOpenDetails] = useState({});
  const allChecked = values.age && values.service && values.privacy && values.marketing;

  const toggleAll = (checked) => {
    onChange({
      age: checked,
      service: checked,
      privacy: checked,
      marketing: checked,
    });
  };

  const toggleOne = (key) => {
    onChange({
      ...values,
      [key]: !values[key],
    });
  };

  const toggleDetail = (key) => {
    setOpenDetails((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const terms = [
    { key: 'age', type: 'required', label: '만 15세 이상입니다' },
    { key: 'service', type: 'required', label: '이용약관 동의', details: personalTermDetails.service },
    { key: 'privacy', type: 'optional', label: '개인정보 수집 및 이용 동의', details: personalTermDetails.privacy },
    { key: 'marketing', type: 'optional', label: '광고성 정보 수신 동의', details: personalTermDetails.marketing },
  ];

  return (
    <div className="cw-register-terms cw-register-terms--detail">
      <label className="cw-register-check cw-register-check--all">
        <input type="checkbox" checked={allChecked} onChange={(event) => toggleAll(event.target.checked)} />
        <span>전체 동의</span>
      </label>

      {terms.map((term) => (
        <div className="cw-register-term-row" key={term.key}>
          <div className="cw-register-term-line">
            <span className="cw-register-term-name">
              <strong className={`cw-register-term-type cw-register-term-type--${term.type}`}>
                {term.type === 'required' ? '[필수]' : '[선택]'}
              </strong>
              {term.label}
            </span>
            <div className="cw-register-term-actions">
              {term.details && (
                <button
                  className={`cw-register-detail-button ${openDetails[term.key] ? 'is-open' : ''}`}
                  type="button"
                  onClick={() => toggleDetail(term.key)}
                >
                  내용보기
                </button>
              )}
              <input
                aria-label={term.label}
                type="checkbox"
                checked={values[term.key]}
                onChange={() => toggleOne(term.key)}
              />
            </div>
          </div>
          {term.details && openDetails[term.key] && (
            <div className="cw-register-term-detail">
              {term.details.map((section) => (
                <section key={section.title}>
                  <h3>{section.title}</h3>
                  {section.body.split('\n').map((line, index) => (
                    <p key={`${section.title}-${index}`}>{line || '\u00a0'}</p>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CompanyTerms({ values, onChange }) {
  const [openDetails, setOpenDetails] = useState({});
  const allChecked = values.service && values.sms && values.privacy && values.marketing;

  const toggleAll = (checked) => {
    onChange({
      service: checked,
      sms: checked,
      privacy: checked,
      marketing: checked,
    });
  };

  const toggleOne = (key) => {
    onChange({
      ...values,
      [key]: !values[key],
    });
  };

  const toggleDetail = (key) => {
    setOpenDetails((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const terms = [
    { key: 'service', type: 'required', label: '이용약관 동의', details: companyTermDetails.service },
    { key: 'sms', type: 'required', label: '문자서비스 이용약관 동의', details: companyTermDetails.sms },
    { key: 'privacy', type: 'optional', label: '개인정보 수집 및 이용 동의', details: companyTermDetails.privacy },
    { key: 'marketing', type: 'optional', label: '광고성 정보 수신 동의', details: companyTermDetails.marketing },
  ];

  return (
    <div className="cw-register-terms cw-register-terms--detail">
      <label className="cw-register-check cw-register-check--all">
        <input type="checkbox" checked={allChecked} onChange={(event) => toggleAll(event.target.checked)} />
        <span>전체 동의</span>
      </label>

      {terms.map((term) => (
        <div className="cw-register-term-row" key={term.key}>
          <div className="cw-register-term-line">
            <span className="cw-register-term-name">
              <strong className={`cw-register-term-type cw-register-term-type--${term.type}`}>
                {term.type === 'required' ? '[필수]' : '[선택]'}
              </strong>
              {term.label}
            </span>
            <div className="cw-register-term-actions">
              <button
                className={`cw-register-detail-button ${openDetails[term.key] ? 'is-open' : ''}`}
                type="button"
                onClick={() => toggleDetail(term.key)}
              >
                내용보기
              </button>
              <input
                aria-label={term.label}
                type="checkbox"
                checked={values[term.key]}
                onChange={() => toggleOne(term.key)}
              />
            </div>
          </div>
          {openDetails[term.key] && (
            <div className="cw-register-term-detail">
              {term.details.map((section) => (
                <section key={section.title}>
                  <h3>{section.title}</h3>
                  {section.body.split('\n').map((line, index) => (
                    <p key={`${section.title}-${index}`}>{line || '\u00a0'}</p>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PersonalRegisterForm() {
  const [form, setForm] = useState(initialPersonalForm);
  const [terms, setTerms] = useState(initialPersonalTerms);
  const [verified, setVerified] = useState({ userId: false, email: false, phoneSent: false, phoneResent: false, phone: false });
  const passwordMismatch = form.passwordConfirm && form.password !== form.passwordConfirm;
  const canSubmit = terms.age && terms.service && terms.privacy && !passwordMismatch;

  const update = (key: PersonalFormKey, value: PersonalForm[PersonalFormKey]) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form className="cw-register-form">
      <section className="cw-register-section cw-register-section--social">
        <div>
          <h2>소셜 계정으로 간편 가입</h2>
          <p>자주 쓰는 계정으로 시작하고 필요한 정보만 추가로 입력하세요.</p>
        </div>
        <div className="cw-social-login" aria-label="소셜 회원가입">
          {socialProviders.map((provider) => (
            <a
              aria-label={`${provider.label} 회원가입`}
              className={`cw-social-login__button cw-social-login__${provider.id}`}
              href="/auth/register/verify"
              key={provider.id}
            >
              {provider.id === 'apple' ? <Apple size={24} /> : provider.mark}
            </a>
          ))}
        </div>
      </section>

      <section className="cw-register-section">
        <div className="cw-register-section__title">
          <UserRound size={22} />
          <div>
            <h2>기본 정보</h2>
            <p>Career Wave 개인회원 서비스를 이용하기 위한 필수 정보입니다.</p>
          </div>
        </div>
        <div className="cw-register-grid">
          <Field label="아이디" required wide>
            <AuthButtonGroup
              input={<TextInput value={form.userId} onChange={(value) => update('userId', value)} placeholder="아이디(영문, 숫자 조합 6~20자)" />}
              buttonLabel="중복 확인"
              onClick={() => setVerified((current) => ({ ...current, userId: true }))}
            />
            <StatusPill active={verified.userId}>사용 가능한 아이디입니다.</StatusPill>
          </Field>
          <Field label="이름" required wide>
            <TextInput value={form.name} onChange={(value) => update('name', value)} placeholder="이름(실명)" />
          </Field>
          <Field label="이메일" required wide>
            <AuthButtonGroup
              input={<TextInput type="email" value={form.email} onChange={(value) => update('email', value)} placeholder="이메일 주소 입력" />}
              buttonLabel="중복 확인"
              onClick={() => setVerified((current) => ({ ...current, email: true }))}
            />
            <StatusPill active={verified.email}>사용 가능한 이메일입니다.</StatusPill>
          </Field>
          <Field label="휴대폰 번호" required wide>
            <AuthButtonGroup
              input={<TextInput type="tel" value={form.phone} onChange={(value) => update('phone', value)} placeholder="휴대폰번호('-' 없이 숫자만 입력)" />}
              buttonLabel="인증번호 전송"
              onClick={() => setVerified((current) => ({ ...current, phoneSent: true, phoneResent: false }))}
            />
            <StatusPill active={verified.phoneSent}>인증번호가 발송되었습니다.</StatusPill>
          </Field>
          <Field label="휴대폰 인증번호" required wide>
            <AuthButtonGroup
              input={<TextInput value={form.phoneCode} onChange={(value) => update('phoneCode', value)} placeholder="인증번호 6자리 입력" />}
              buttonLabel="인증 확인"
              onClick={() => setVerified((current) => ({ ...current, phone: true }))}
              secondButtonLabel="재전송"
              onSecondClick={() => setVerified((current) => ({ ...current, phoneSent: false, phoneResent: true }))}
            />
            <StatusPill active={verified.phone}>휴대폰 인증이 완료되었습니다.</StatusPill>
            <StatusPill active={verified.phoneResent}>인증번호를 다시 전송했습니다.</StatusPill>
          </Field>
          <Field label="비밀번호" required wide>
            <TextInput
              type="password"
              value={form.password}
              onChange={(value) => update('password', value)}
              placeholder="비밀번호(8~16자의 영문, 숫자, 특수기호)"
            />
          </Field>
          <Field label="비밀번호 확인" required wide>
            <TextInput type="password" value={form.passwordConfirm} onChange={(value) => update('passwordConfirm', value)} placeholder="비밀번호 재입력" />
            {passwordMismatch && <p className="cw-register-error">비밀번호가 일치하지 않습니다.</p>}
          </Field>
        </div>
      </section>

      <section className="cw-register-section">
        <div className="cw-register-section__title">
          <BadgeCheck size={22} />
          <div>
            <h2>약관 동의</h2>
            <p>필수 약관에 동의하면 가입을 완료할 수 있습니다.</p>
          </div>
        </div>
        <PersonalTerms values={terms} onChange={setTerms} />
      </section>

      <button className="cw-register-submit" disabled={!canSubmit} type="button">
        가입하기
      </button>
    </form>
  );
}

function CompanyRegisterForm() {
  const [form, setForm] = useState<CompanyForm>(initialCompanyForm);
  const [terms, setTerms] = useState(initialCompanyTerms);
  const [employmentCertificate, setEmploymentCertificate] = useState<File | null>(null);
  const [employmentCertificateError, setEmploymentCertificateError] = useState('');
  const [isSubmitGuideOpen, setIsSubmitGuideOpen] = useState(false);
  const employmentCertificateInputRef = useRef<HTMLInputElement | null>(null);
  const [verified, setVerified] = useState({
    company: false,
    managerId: false,
    phoneSent: false,
    phoneResent: false,
    phone: false,
    emailSent: false,
    emailResent: false,
    email: false,
  });
  const passwordMismatch = form.managerPasswordConfirm && form.managerPassword !== form.managerPasswordConfirm;
  const canSubmit = terms.service && terms.sms && terms.privacy && !passwordMismatch && employmentCertificate !== null;

  const update = (key: CompanyFormKey, value: CompanyForm[CompanyFormKey]) => setForm((current) => ({ ...current, [key]: value }));
  const handleCertificateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setEmploymentCertificate(null);
      setEmploymentCertificateError('');
      return;
    }

    const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setEmploymentCertificate(null);
      setEmploymentCertificateError('PDF 형식의 파일만 업로드할 수 있습니다.');
      event.target.value = '';
      return;
    }

    setEmploymentCertificate(selectedFile);
    setEmploymentCertificateError('');
  };

  return (
    <>
      <form className="cw-register-form">
        <section className="cw-register-section">
        <div className="cw-register-section__title">
          <Building2 size={22} />
          <div>
            <h2>기업정보</h2>
            <p>채용 공고와 인재 매칭에 표시될 기업 기본 정보입니다.</p>
          </div>
        </div>
        <div className="cw-register-grid">
          <Field label="기업형태" required>
            <SelectInput value={form.companyType} onChange={(value) => update('companyType', value)} placeholder="기업형태 선택" options={companyTypes} />
          </Field>
          <Field label="사업자등록번호" required>
            <TextInput value={form.businessNumber} onChange={(value) => update('businessNumber', value)} placeholder="사업자등록번호('-' 없이 숫자만 입력)" />
          </Field>
          <Field label="회사명" required>
            <TextInput value={form.companyName} onChange={(value) => update('companyName', value)} placeholder="회사명 입력" />
          </Field>
          <Field label="대표자명" required>
            <TextInput value={form.ceoName} onChange={(value) => update('ceoName', value)} placeholder="대표자명 입력" />
          </Field>
          <Field label="회사주소" required wide>
            <AuthButtonGroup
              input={<TextInput value={form.address} onChange={(value) => update('address', value)} placeholder="주소 검색을 이용해주세요" />}
              buttonLabel="주소 검색"
              onClick={() => alert('주소 검색 API 연결 예정')}
            />
          </Field>
          <Field label="상세주소" wide>
            <TextInput value={form.addressDetail} onChange={(value) => update('addressDetail', value)} placeholder="상세주소 입력" />
          </Field>
          <label className="cw-register-check cw-register-field--wide">
            <input type="checkbox" checked={form.isAgency} onChange={() => update('isAgency', !form.isAgency)} />
            <span>파견/도급/채용대행 기업입니다.</span>
          </label>
        </div>
        </section>

        <section className="cw-register-section">
        <div className="cw-register-section__title">
          <ShieldCheck size={22} />
          <div>
            <h2>기업인증</h2>
            <p>사업자등록증명원 발급번호 기반 인증 API 연결을 고려한 영역입니다.</p>
          </div>
        </div>
        <Field label="사업자등록증명원 발급번호" required wide>
          <AuthButtonGroup
            input={
              <TextInput
                value={form.certificateNumber}
                onChange={(value) => update('certificateNumber', value)}
                placeholder="사업자등록증명원 발급번호 입력"
              />
            }
            buttonLabel="기업인증 확인"
            onClick={() => setVerified((current) => ({ ...current, company: true }))}
          />
          <StatusPill active={verified.company}>기업인증 완료</StatusPill>
        </Field>
        </section>

        <section className="cw-register-section">
        <div className="cw-register-section__title">
          <UserRound size={22} />
          <div>
            <h2>인사담당자 정보</h2>
            <p>기업 계정을 관리할 담당자 정보를 입력해주세요.</p>
          </div>
        </div>
        <div className="cw-register-grid">
          <Field label="아이디" required>
            <AuthButtonGroup
              input={
                <TextInput
                  value={form.managerId}
                  onChange={(value) => update('managerId', value)}
                  placeholder="아이디(영문, 숫자 조합 6~20자)"
                />
              }
              buttonLabel="중복 확인"
              onClick={() => setVerified((current) => ({ ...current, managerId: true }))}
            />
            <StatusPill active={verified.managerId}>사용 가능한 아이디입니다.</StatusPill>
          </Field>
          <Field label="담당자명" required>
            <TextInput value={form.managerName} onChange={(value) => update('managerName', value)} placeholder="담당자명(실명)" />
          </Field>
          <Field label="비밀번호" required>
            <TextInput
              type="password"
              value={form.managerPassword}
              onChange={(value) => update('managerPassword', value)}
              placeholder="비밀번호(8~16자의 영문, 숫자, 특수기호)"
            />
          </Field>
          <Field label="비밀번호 확인" required>
            <TextInput
              type="password"
              value={form.managerPasswordConfirm}
              onChange={(value) => update('managerPasswordConfirm', value)}
              placeholder="비밀번호 재입력"
            />
            {passwordMismatch && <p className="cw-register-error">비밀번호가 일치하지 않습니다.</p>}
          </Field>
          <Field label="담당자 전화번호" required wide>
            <AuthButtonGroup
              input={
                <TextInput
                  type="tel"
                  value={form.managerPhone}
                  onChange={(value) => update('managerPhone', value)}
                  placeholder="휴대폰번호('-' 없이 숫자만 입력)"
                />
              }
              buttonLabel="인증번호 전송"
              onClick={() => setVerified((current) => ({ ...current, phoneSent: true, phoneResent: false }))}
            />
            <StatusPill active={verified.phoneSent}>인증번호가 발송되었습니다.</StatusPill>
          </Field>
          <Field label="휴대폰 인증번호" required wide>
            <AuthButtonGroup
              input={
                <TextInput
                  value={form.managerPhoneCode}
                  onChange={(value) => update('managerPhoneCode', value)}
                  placeholder="인증번호 6자리 입력"
                />
              }
              buttonLabel="인증 확인"
              onClick={() => setVerified((current) => ({ ...current, phone: true }))}
              secondButtonLabel="재전송"
              onSecondClick={() => setVerified((current) => ({ ...current, phoneSent: false, phoneResent: true }))}
            />
            <StatusPill active={verified.phone}>휴대폰 인증이 완료되었습니다.</StatusPill>
            <StatusPill active={verified.phoneResent}>인증번호를 다시 전송했습니다.</StatusPill>
          </Field>
          <Field label="담당자 이메일" required wide>
            <AuthButtonGroup
              input={
                <TextInput
                  type="email"
                  value={form.managerEmail}
                  onChange={(value) => update('managerEmail', value)}
                  placeholder="담당자 이메일 주소 입력"
                />
              }
              buttonLabel="인증번호 전송"
              onClick={() => setVerified((current) => ({ ...current, emailSent: true, emailResent: false }))}
            />
            <StatusPill active={verified.emailSent}>인증번호가 발송되었습니다.</StatusPill>
          </Field>
          <Field label="이메일 인증번호" required wide>
            <AuthButtonGroup
              input={
                <TextInput
                  value={form.managerEmailCode}
                  onChange={(value) => update('managerEmailCode', value)}
                  placeholder="인증번호 6자리 입력"
                />
              }
              buttonLabel="인증 확인"
              onClick={() => setVerified((current) => ({ ...current, email: true }))}
              secondButtonLabel="재전송"
              onSecondClick={() => setVerified((current) => ({ ...current, emailSent: false, emailResent: true }))}
            />
            <StatusPill active={verified.email}>이메일 인증이 완료되었습니다.</StatusPill>
            <StatusPill active={verified.emailResent}>인증번호를 다시 전송했습니다.</StatusPill>
          </Field>
          <Field label="재직증명서 업로드" required wide>
            <div className="cw-register-upload">
              <div className="cw-register-upload__hint">
                <FileText size={18} />
                <p>인사담당자 재직 확인을 위한 PDF 파일을 업로드해 주세요.</p>
              </div>
              <div className="cw-register-inline">
                <input
                  className="cw-register-upload__display"
                  placeholder="선택된 PDF 파일이 없습니다."
                  readOnly
                  type="text"
                  value={employmentCertificate?.name ?? ''}
                />
                <button
                  className="cw-register-sub-button"
                  onClick={() => employmentCertificateInputRef.current?.click()}
                  type="button"
                >
                  PDF 파일 선택
                </button>
              </div>
              <input
                accept=".pdf,application/pdf"
                className="cw-register-upload__input"
                id="company-employment-certificate"
                ref={employmentCertificateInputRef}
                onChange={handleCertificateChange}
                type="file"
              />
              {employmentCertificateError && <p className="cw-register-error">{employmentCertificateError}</p>}
            </div>
          </Field>
        </div>
        </section>

        <section className="cw-register-section">
        <div className="cw-register-section__title">
          <BadgeCheck size={22} />
          <div>
            <h2>약관 동의</h2>
            <p>필수 약관에 동의하면 기업회원 가입을 완료할 수 있습니다.</p>
          </div>
        </div>
        <CompanyTerms values={terms} onChange={setTerms} />
        </section>

        <button className="cw-register-submit" disabled={!canSubmit} onClick={() => setIsSubmitGuideOpen(true)} type="button">
          기업회원 가입하기
        </button>
      </form>

      {isSubmitGuideOpen && (
        <div aria-labelledby="company-submit-guide-title" aria-modal="true" className="cw-register-modal" role="dialog">
          <button aria-label="모달 닫기" className="cw-register-modal__backdrop" onClick={() => setIsSubmitGuideOpen(false)} type="button" />
          <div className="cw-register-modal__dialog">
            <h3 id="company-submit-guide-title">가입 신청이 접수되었습니다.</h3>
            <p>제출해주신 기업 정보와 재직증명서를 검토한 후 기업회원 가입이 승인됩니다.</p>
            <p>심사는 영업일 기준 2~3일 정도 소요될 수 있으며, 승인 결과는 입력하신 담당자 이메일로 안내드릴 예정입니다.</p>
            <button className="cw-register-submit cw-register-modal__confirm" onClick={() => setIsSubmitGuideOpen(false)} type="button">
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function RegisterPage() {
  const [registerType, setRegisterType] = useState('personal');

  return (
    <section className="cw-auth-page cw-register-page">
      <div className="cw-register-shell">
        <div className="cw-register-hero">
          <p className="cw-auth-eyebrow">CAREER WAVE SIGN UP</p>
          <h1>Career Wave 회원가입</h1>
          <p>개인회원은 AI 취업 준비를, 기업회원은 채용 관리와 인재 매칭을 바로 시작할 수 있습니다.</p>
        </div>

        <div className="cw-register-tabs" role="tablist" aria-label="회원가입 유형">
          <button
            aria-selected={registerType === 'personal'}
            className={registerType === 'personal' ? 'is-active' : ''}
            onClick={() => setRegisterType('personal')}
            role="tab"
            type="button"
          >
            개인회원
          </button>
          <button
            aria-selected={registerType === 'company'}
            className={registerType === 'company' ? 'is-active' : ''}
            onClick={() => setRegisterType('company')}
            role="tab"
            type="button"
          >
            기업회원
          </button>
        </div>

        {registerType === 'personal' ? <PersonalRegisterForm /> : <CompanyRegisterForm />}

        <p className="cw-auth-bottom-text">
          이미 계정이 있나요? <a href="/auth/login">로그인</a>
        </p>
      </div>
    </section>
  );
}

export default RegisterPage;
