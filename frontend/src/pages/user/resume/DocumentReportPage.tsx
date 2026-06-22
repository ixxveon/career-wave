import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, ScrollText, AlertCircle, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import DocumentResultView from './DocumentResultView';
import { useAnalysisResult } from '../../../hooks/user/resume/useAnalysisResult';
import type { DocumentResult } from '../../../types/user/document';
import type { AnalysisResultResponse } from '../../../types/user/resume';
import '@/styles/user/resume/DocumentReportPage.css';

// ── AnalysisResultResponse → DocumentResult 매핑 ─────────────
function toDocumentResult(res: AnalysisResultResponse): DocumentResult {
  return {
    documentId: res.documentId,
    evaluation: {
      totalScore:        res.scores?.total                 ?? 0,
      jobFitnessScore:   res.scores?.jobFitness            ?? 0,
      techStackScore:    res.scores?.techStack              ?? 0,
      quantifiedScore:   res.scores?.quantifiedAchievement ?? 0,
      logicalScore:      res.scores?.logicalStructure       ?? 0,
      overallReview:     res.overallReview ?? '',
    },
    feedbackDetails: res.feedbackDetails,
  };
}

// ── documentId 없을 때 보여줄 정적 Mock 탭 (기존 유지) ────────
const MOCK_RESUME: DocumentResult = {
  documentId: 2,
  evaluation: {
    totalScore: 82, jobFitnessScore: 90, techStackScore: 80,
    quantifiedScore: 65, logicalScore: 85,
    overallReview: '전반적으로 백엔드 역량이 우수하나 성과의 정량적 수치화가 아쉽습니다.',
  },
  feedbackDetails: [
    {
      sectionNumber: 1,
      question: '주요 프로젝트 경험',
      originalText: '결제 시스템 개발에 참여하였습니다.',
      goodPoint: '백엔드 프로젝트 경험과 팀 협업 이력이 명시되어 있어 기본 역량이 확인됩니다.',
      badPoint: '역할, 규모, 성과가 모두 빠져 있습니다.',
      improvedText: '월 거래액 50억 규모의 결제 시스템 API를 Spring Boot로 설계 및 구현하였습니다.',
    },
  ],
};

const MOCK_COVER: DocumentResult = {
  documentId: 1,
  evaluation: {
    totalScore: 78, jobFitnessScore: 85, techStackScore: 75,
    quantifiedScore: 60, logicalScore: 82,
    overallReview: '직무 연관성과 논리 구조는 양호하나, 성과의 정량적 수치화가 전반적으로 부족합니다.',
  },
  feedbackDetails: [
    {
      sectionNumber: 1,
      question: '지원 동기 및 입사 후 포부를 서술하시오.',
      originalText: '저는 카카오의 기술력과 문화에 매력을 느껴 지원하였습니다.',
      goodPoint: '개발에 대한 열정과 소통하려는 태도가 잘 드러나 있습니다.',
      badPoint: '"열심히"라는 표현이 너무 추상적입니다.',
      improvedText: '카카오의 대규모 트래픽 처리 아키텍처를 기술 블로그로 꾸준히 학습해왔습니다.',
    },
  ],
};

type TabKey = 'resume' | 'cover';
interface Tab { key: TabKey; label: string; Icon: LucideIcon; data: DocumentResult; resetTo: string; viewLabel: string; subtitle: string; }

const TABS: Tab[] = [
  { key: 'resume', label: '이력서 분석',    Icon: FileText,   data: MOCK_RESUME, resetTo: '/documents/resume',       viewLabel: 'RESUME ANALYSIS', subtitle: '이력서_최종본.pdf · 백엔드 개발자' },
  { key: 'cover',  label: '자기소개서 분석', Icon: ScrollText, data: MOCK_COVER,  resetTo: '/documents/cover-letter', viewLabel: 'COVER LETTER AI', subtitle: '카카오 · 백엔드 개발자' },
];

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function DocumentReportPage() {
  const navigate               = useNavigate();
  const [searchParams]         = useSearchParams();
  const documentId             = searchParams.get('documentId');
  const [active, setActive]    = useState<TabKey>('resume');

  const { data, isLoading, isError } = useAnalysisResult(documentId);

  // documentId가 있을 때 — 실제 분석 결과 조회
  if (documentId) {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '80px 20px' }}>
          <Loader2 size={40} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
          <p style={{ margin: 0, fontSize: 15, color: 'var(--color-text-secondary)' }}>리포트를 불러오는 중...</p>
        </div>
      );
    }

    if (isError || !data) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '80px 20px', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: '#dc2626', opacity: 0.5 }} />
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>리포트를 불러올 수 없습니다</p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>유효하지 않은 문서이거나 접근 권한이 없습니다.</p>
          <button
            type="button"
            onClick={() => navigate('/documents/history')}
            style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontWeight: 600 }}
          >
            분석 이력으로 돌아가기
          </button>
        </div>
      );
    }

    return (
      <DocumentResultView
        result={toDocumentResult(data)}
        onReset={() => navigate('/documents/history')}
        label={data.feedbackDetails.length > 0 ? 'RESUME ANALYSIS' : 'COVER LETTER AI'}
        interviewDocumentId={documentId}
      />
    );
  }

  // documentId 없을 때 — 기존 Mock 탭 화면
  const tab = TABS.find(t => t.key === active)!;
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
    <DocumentResultView
      key={active}
      result={tab.data}
      onReset={() => navigate(tab.resetTo)}
      label={tab.viewLabel}
      subtitle={tab.subtitle}
      typeSelector={typeSelector}
    />
  );
}
