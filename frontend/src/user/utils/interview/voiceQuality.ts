/**
 * 음성 품질 유효성 필터링 유틸 (constitution.md §점수 산정 정책)
 *
 * - voiceQualityRatio 50% 미만 문항: deliveryScore / fluencyScore → null
 * - 음성 인식 유효 비율은 서버가 계산하여 내려주며,
 *   이 모듈은 프론트엔드 보정 및 표시 레이블을 담당한다.
 */

import type { FeedbackItem } from '../../types/interview';

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
 * 하이브리드 점수 산정 유틸 (spec §FR-007)
 *
 * - relevance / depth: 전체 문항 평균 (null 문항 제외)
 * - delivery / fluency: 음성 품질 통과 문항만 평균 (null 문항 제외)
 * - 전체 문항이 null이면 해당 지표 null 반환
 */
export interface HybridScores {
  relevance: number | null;
  depth:     number | null;
  delivery:  number | null;
  fluency:   number | null;
}

function average(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, v) => sum + v, 0) / valid.length);
}

export function computeHybridScores(feedbacks: FeedbackItem[]): HybridScores {
  const filtered = filterFeedbackScores(feedbacks);
  return {
    relevance: average(filtered.map(fb => fb.relevanceScore)),
    depth:     average(filtered.map(fb => fb.depthScore)),
    delivery:  average(filtered.map(fb => fb.deliveryScore)),
    fluency:   average(filtered.map(fb => fb.fluencyScore)),
  };
}
