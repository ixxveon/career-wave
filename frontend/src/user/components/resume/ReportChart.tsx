import { useMemo } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import type { ScoreBreakdown } from '../../types/resume.d';
import './ReportChart.css';

interface ReportChartProps {
  scores: ScoreBreakdown;
}

const AXES = [
  { key: 'jobFitness'             as const, label: '직무 적합도' },
  { key: 'techStack'              as const, label: '기술 스택'   },
  { key: 'quantifiedAchievement'  as const, label: '경험 수치화' },
  { key: 'logicalStructure'       as const, label: '논리력'      },
] as const;

const SCORE_GRADE = (score: number) => {
  if (score >= 90) return { label: '최상',  color: '#16a34a' };
  if (score >= 75) return { label: '우수',  color: '#2563eb' };
  if (score >= 60) return { label: '보통',  color: '#d97706' };
  return               { label: '개선 필요', color: '#dc2626' };
};

export default function ReportChart({ scores }: ReportChartProps) {
  const data = useMemo(
    () => AXES.map(({ key, label }) => ({ subject: label, score: scores[key] })),
    [scores],
  );

  const { label: gradeLabel, color: gradeColor } = SCORE_GRADE(scores.total);

  return (
    <div className="rc">
      {/* 종합 점수 */}
      <div className="rc-total">
        <p className="rc-total__label">종합 점수</p>
        <p className="rc-total__score" style={{ color: gradeColor }}>
          {scores.total}
          <span className="rc-total__unit">점</span>
        </p>
        <span className="rc-total__grade" style={{ background: gradeColor }}>
          {gradeLabel}
        </span>
      </div>

      {/* 레이더 차트 */}
      <div className="rc-chart">
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <Radar
              dataKey="score"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(value: number) => [`${value}점`, '점수']}
              contentStyle={{ fontSize: 13, borderRadius: 8 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 항목별 점수 */}
      <ul className="rc-breakdown">
        {AXES.map(({ key, label }) => (
          <li key={key} className="rc-breakdown__item">
            <span className="rc-breakdown__label">{label}</span>
            <div className="rc-breakdown__bar-wrap">
              <div
                className="rc-breakdown__bar"
                style={{ width: `${scores[key]}%` }}
              />
            </div>
            <span className="rc-breakdown__value">{scores[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
