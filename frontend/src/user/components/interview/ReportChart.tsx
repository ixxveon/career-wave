import { memo } from 'react';
import {
  RadarChart, Radar, PolarGrid,
  PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { HybridScores } from '../../utils/interview/voiceQuality';
import './ReportChart.css';

interface ReportChartProps {
  scores: HybridScores;
  sessionType: 'TEXT' | 'VOICE' | 'VIDEO';
}

interface ChartEntry {
  label:    string;
  value:    number;
  isNull:   boolean;
  fullMark: number;
}

function buildChartData(scores: HybridScores, sessionType: string): ChartEntry[] {
  const isVoice = sessionType !== 'TEXT';
  return [
    {
      label:    '답변 일치도',
      value:    scores.relevance ?? 0,
      isNull:   scores.relevance === null,
      fullMark: 100,
    },
    {
      label:    '기술적 깊이',
      value:    scores.depth ?? 0,
      isNull:   scores.depth === null,
      fullMark: 100,
    },
    {
      label:    '전달력',
      value:    isVoice ? (scores.delivery ?? 0) : 0,
      isNull:   !isVoice || scores.delivery === null,
      fullMark: 100,
    },
    {
      label:    '유창성',
      value:    isVoice ? (scores.fluency ?? 0) : 0,
      isNull:   !isVoice || scores.fluency === null,
      fullMark: 100,
    },
  ];
}

/** null 지표 툴팁 커스텀 */
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartEntry }[] }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rc-tooltip">
      <p className="rc-tooltip__label">{entry.label}</p>
      <p className="rc-tooltip__value">
        {entry.isNull ? '데이터 부족' : `${entry.value}점`}
      </p>
    </div>
  );
}

/**
 * 역량 지표 레이더 차트 (plan.md §Phase 4, constitution.md §7)
 * memo 필수 — 리포트 화면 리렌더링 방지
 */
const ReportChart = memo(function ReportChart({ scores, sessionType }: ReportChartProps) {
  const data = buildChartData(scores, sessionType);
  const hasAnyScore = data.some(d => !d.isNull && d.value > 0);

  if (!hasAnyScore) {
    return (
      <div className="rc-empty">
        <p>분석 데이터가 충분하지 않아 차트를 표시할 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rc-wrap">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="var(--color-border, #e5e7eb)" />
          <PolarAngleAxis
            dataKey="label"
            tick={({ x, y, payload }) => {
              const entry = data.find(d => d.label === payload.value);
              return (
                <text
                  x={x} y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={12}
                  fill={entry?.isNull ? '#9ca3af' : '#374151'}
                >
                  {payload.value}
                  {entry?.isNull && ' *'}
                </text>
              );
            }}
          />
          <Radar
            dataKey="value"
            stroke="var(--color-primary, #6366f1)"
            fill="var(--color-primary, #6366f1)"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* null 지표 안내 (spec FR-008) */}
      {data.some(d => d.isNull) && (
        <p className="rc-null-notice">
          * 표시된 지표는 텍스트 면접이거나 음성 품질이 부족하여 측정되지 않았습니다.
        </p>
      )}
    </div>
  );
});

export default ReportChart;
