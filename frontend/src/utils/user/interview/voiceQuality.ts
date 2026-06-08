/**
 * 음성 품질 유효성 필터링 유틸 (constitution.md §점수 산정 정책)
 *
 * - voiceQualityRatio 50% 미만 문항: deliveryScore / fluencyScore → null
 * - 음성 인식 유효 비율은 서버가 계산하여 내려주며,
 *   이 모듈은 프론트엔드 보정 및 표시 레이블을 담당한다.
 */

import type { FeedbackItem } from '../../../types/user/interview';

/** 음성 품질 유효 기준 임계값 (constitution.md §4 불변 규칙) */
export const VOICE_QUALITY_THRESHOLD = 50;

/**
 * voiceQualityRatio 기반 delivery/fluency 스코어 보정
 * 서버가 null로 내려주지 않은 경우를 대비한 클라이언트 측 방어 처리
 */
export function filterFeedbackScores(feedbacks: FeedbackItem[]): FeedbackItem[] {
  return feedbacks.map(fb => {
    const ratio = fb.voiceQualityRatio;
    if (ratio !== null && ratio < VOICE_QUALITY_THRESHOLD) {
      return { ...fb, deliveryScore: null, fluencyScore: null };
    }
    return fb;
  });
}

/** 음성 품질 레이블 */
export function getVoiceQualityLabel(ratio: number | null): '양호' | '부족' | '측정불가' {
  if (ratio === null) return '측정불가';
  return ratio >= VOICE_QUALITY_THRESHOLD ? '양호' : '부족';
}

/**
 * 4대 지표 가중치 (spec §FR-007)
 *
 * 텍스트 면접: 음성 지표 없으므로 relevance + depth 합산 후 재정규화
 * 음성/영상 면접: 4개 지표 모두 반영
 *
 * 가중치 합 = 1.0
 */
export const SCORE_WEIGHTS = {
  relevance: 0.35,
  depth:     0.35,
  delivery:  0.15,
  fluency:   0.15,
} as const;

export interface HybridScores {
  relevance: number | null;
  depth:     number | null;
  delivery:  number | null;
  fluency:   number | null;
  /** 가중치 반영 종합 점수 (null 지표는 유효 가중치로 재정규화) */
  total:     number | null;
}

function average(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, v) => sum + v, 0) / valid.length);
}

/**
 * 가중치 평균 종합 점수 계산
 * null 지표는 제외하고 유효 지표의 가중치 합으로 재정규화
 * 전체 null이면 null 반환
 */
function computeWeightedTotal(scores: Omit<HybridScores, 'total'>): number | null {
  const entries = [
    { value: scores.relevance, weight: SCORE_WEIGHTS.relevance },
    { value: scores.depth,     weight: SCORE_WEIGHTS.depth },
    { value: scores.delivery,  weight: SCORE_WEIGHTS.delivery },
    { value: scores.fluency,   weight: SCORE_WEIGHTS.fluency },
  ].filter(e => e.value !== null) as { value: number; weight: number }[];

  if (entries.length === 0) return null;

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  const weighted    = entries.reduce((sum, e) => sum + e.value * e.weight, 0);
  return Math.round(weighted / totalWeight);
}

export function computeHybridScores(feedbacks: FeedbackItem[]): HybridScores {
  const filtered = filterFeedbackScores(feedbacks);
  const scores = {
    relevance: average(filtered.map(fb => fb.relevanceScore)),
    depth:     average(filtered.map(fb => fb.depthScore)),
    delivery:  average(filtered.map(fb => fb.deliveryScore)),
    fluency:   average(filtered.map(fb => fb.fluencyScore)),
  };
  return { ...scores, total: computeWeightedTotal(scores) };
}
