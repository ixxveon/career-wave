import { FileText, ScrollText, Calendar, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ResumeHistoryItem } from '../../types/resume.d';
import './HistoryItem.css';

interface HistoryItemProps {
  item: ResumeHistoryItem;
}

const SCORE_COLOR = (score: number) =>
  score >= 80 ? '#16a34a' : score >= 65 ? '#7c3aed' : '#dc2626';

const SCORE_LABEL = (score: number) =>
  score >= 80 ? '우수' : score >= 65 ? '양호' : '개선 필요';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function HistoryItem({ item }: HistoryItemProps) {
  const navigate = useNavigate();
  const isResume = item.fileType === 'RESUME';

  const title = isResume
    ? (item.originalName ?? '이력서')
    : `${item.company ?? ''} · ${item.job ?? ''}`;

  const score = item.totalScore;

  return (
    <div className="hi">
      <div className="hi-icon" aria-hidden="true">
        {isResume
          ? <FileText size={20} />
          : <ScrollText size={20} />
        }
      </div>

      <div className="hi-info">
        <p className="hi-info__type">{isResume ? '이력서' : '자기소개서'}</p>
        <p className="hi-info__title" title={title}>{title}</p>
        <p className="hi-info__date">
          <Calendar size={11} aria-hidden="true" />
          {formatDate(item.createdAt)}
        </p>
      </div>

      <div className="hi-score">
        {score !== null ? (
          <>
            <span className="hi-score__value" style={{ color: SCORE_COLOR(score) }}>
              {score}
            </span>
            <span className="hi-score__label" style={{ color: SCORE_COLOR(score) }}>
              {SCORE_LABEL(score)}
            </span>
          </>
        ) : (
          <span className="hi-score__pending">분석 중</span>
        )}
      </div>

      <button
        type="button"
        className="hi-btn"
        onClick={() => navigate(`/documents/report?documentId=${item.documentId}`)}
        aria-label={`${title} 결과 보기`}
      >
        결과 보기 <ChevronRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
