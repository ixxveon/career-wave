import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ScrollText } from 'lucide-react';
import DocumentResultView from './DocumentResultView';
import './styles/DocumentReportPage.css';

/* ── Mock 데이터 ──────────────────────────────────────────────
   실제 서비스에서는 documentId를 라우트 파라미터나 전역 상태로 받아
   백엔드 GET /documents/{id}/result 로 불러옵니다.
────────────────────────────────────────────────────────────── */
const MOCK_RESUME = {
  documentId: 2,
  evaluation: {
    totalScore:     82,
    jobFitnessScore: 90,
    techStackScore:  80,
    quantifiedScore: 65,
    logicalScore:    85,
    overallReview:
      '전반적으로 백엔드 역량이 우수하나 성과의 정량적 수치화가 아쉽습니다. ' +
      '기술 스택 언급과 팀 협업 경험은 긍정적으로 평가됩니다.',
  },
  feedbackDetails: [
    {
      sectionNumber: 1,
      question:      '주요 프로젝트 경험',
      originalText:  '결제 시스템 개발에 참여하였습니다. 팀원들과 협업하여 서비스를 개선했습니다.',
      goodPoint:     '백엔드 프로젝트 경험과 팀 협업 이력이 명시되어 있어 기본 역량이 확인됩니다.',
      badPoint:
        '역할, 규모, 성과가 모두 빠져 있습니다. "참여", "개선"이라는 추상적 동사 대신 수치화된 임팩트를 작성해야 합니다.',
      improvedText:
        '월 거래액 50억 규모의 결제 시스템 API를 Spring Boot로 설계 및 구현, TPS 300 처리 안정화에 기여하였습니다. ' +
        '5인 팀 스크럼 환경에서 백엔드 리드로 API 응답 속도를 평균 340ms → 80ms로 개선하였습니다.',
    },
    {
      sectionNumber: 2,
      question:      '자기소개 및 강점',
      originalText:  '다양한 경험을 통해 성장하였습니다.',
      goodPoint:     '성장 의지가 드러나는 문장 구성입니다.',
      badPoint:
        '"다양한 경험"이라는 추상적 표현만으로는 역량을 판단할 수 없습니다. ' +
        '구체적 경력 사실로 대체해야 합니다.',
      improvedText:
        '스타트업 3곳에서 백엔드 풀사이클 개발(기획→설계→배포)을 수행하며 ' +
        '서비스 런칭 5건의 경험을 쌓았습니다.',
    },
  ],
};

const MOCK_COVER = {
  documentId: 1,
  evaluation: {
    totalScore:      78,
    jobFitnessScore: 85,
    techStackScore:  75,
    quantifiedScore: 60,
    logicalScore:    82,
    overallReview:
      '직무 연관성과 논리 구조는 양호하나, 성과의 정량적 수치화가 전반적으로 부족합니다. ' +
      '구체적인 숫자와 기술 스택을 명시하면 서류 경쟁력이 크게 올라갈 것입니다.',
  },
  feedbackDetails: [
    {
      sectionNumber: 1,
      question:      '지원 동기 및 입사 후 포부를 서술하시오.',
      originalText:
        '저는 카카오의 기술력과 문화에 매력을 느껴 지원하였습니다. 입사 후에는 열심히 노력하겠습니다.',
      goodPoint:     '개발에 대한 열정과 팀원들과 소통하려는 태도가 본문에 잘 드러나 있습니다.',
      badPoint:
        '"열심히", "성공적"이라는 표현이 너무 추상적입니다. 어떤 성과(수치)를 냈는지 알 수 없습니다.',
      improvedText:
        '카카오의 대규모 트래픽 처리 아키텍처(Kakao Pub/Sub, Krane)를 기술 블로그로 꾸준히 학습해왔습니다. ' +
        '입사 후 3년 내 핵심 API 서버 개발을 담당하고, 이후 아키텍처 설계까지 성장하는 것을 목표로 합니다.',
    },
    {
      sectionNumber: 2,
      question:      '본인의 강점을 바탕으로 팀에 기여한 경험을 서술하시오.',
      originalText:
        '저는 꼼꼼한 성격으로 코드 리뷰를 꼼꼼하게 하였으며, 팀 분위기를 좋게 만들었습니다.',
      goodPoint:     'STAR 구조와 수치 기반 성과 서술이 잘 작성되어 있습니다. 역할과 기여가 명확히 드러납니다.',
      badPoint:
        '강점(코드 리뷰)과 결과(팀 분위기)의 인과관계가 불명확합니다. 성과를 수치로 표현하면 신뢰도가 높아집니다.',
      improvedText:
        '코드 리뷰 문화 정착을 주도하여 PR 사이클을 2일 → 6시간으로 단축, ' +
        '릴리즈 주기 30% 개선에 기여하였습니다.',
    },
  ],
};

const TABS = [
  { key: 'resume', label: '이력서 분석', Icon: FileText,   data: MOCK_RESUME, resetTo: '/documents/resume',       viewLabel: 'RESUME ANALYSIS', subtitle: '이력서_최종본.pdf · 백엔드 개발자' },
  { key: 'cover',  label: '자기소개서 분석', Icon: ScrollText, data: MOCK_COVER,  resetTo: '/documents/cover-letter', viewLabel: 'COVER LETTER AI', subtitle: '카카오 · 백엔드 개발자' },
];

export default function DocumentReportPage() {
  const navigate            = useNavigate();
  const [active, setActive] = useState('resume');

  const tab = TABS.find(t => t.key === active);

  /* 배너 안에 주입할 탭 슬롯 — 다크 배너 위에서 바로 눈에 띄도록 배치 */
  const typeSelector = (
    <div className="drp-type-tabs">
      {TABS.map(t => (
        <button
          key={t.key}
          className={`drp-type-tab${active === t.key ? ' drp-type-tab--active' : ''}`}
          onClick={() => setActive(t.key)}
        >
          <t.Icon size={13} />
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    /* DocumentResultView가 배너 포함 전체 레이아웃을 담당하므로 별도 래퍼 불필요 */
    <DocumentResultView
      key={active}                        /* 탭 전환 시 내부 activeSection 초기화 */
      result={tab.data}
      onReset={() => navigate(tab.resetTo)}
      label={tab.viewLabel}
      subtitle={tab.subtitle}
      typeSelector={typeSelector}         /* 배너 상단에 탭 렌더링 */
    />
  );
}
