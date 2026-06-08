import { describe, it, expect } from 'vitest';
import {
  filterFeedbackScores,
  computeHybridScores,
  getVoiceQualityLabel,
  VOICE_QUALITY_THRESHOLD,
  SCORE_WEIGHTS,
} from './voiceQuality';
import type { FeedbackItem } from '../../../types/user/interview';

// ── 테스트용 FeedbackItem 팩토리 ───────────────────
function makeFeedback(overrides: Partial<FeedbackItem> = {}): FeedbackItem {
  return {
    questionOrder:     1,
    questionText:      '질문',
    answerText:        '답변',
    relevanceScore:    80,
    depthScore:        75,
    deliveryScore:     70,
    fluencyScore:      65,
    voiceQualityRatio: 80,
    aiFeedback:        '피드백',
    ...overrides,
  };
}

// ══════════════════════════════════════════════════
// filterFeedbackScores
// ══════════════════════════════════════════════════
describe('filterFeedbackScores', () => {

  it('voiceQualityRatio가 50% 미만이면 delivery/fluency를 null로 처리한다', () => {
    const input = [makeFeedback({ voiceQualityRatio: 49.9 })];
    const result = filterFeedbackScores(input);
    expect(result[0].deliveryScore).toBeNull();
    expect(result[0].fluencyScore).toBeNull();
  });

  it('경계값 50.0은 통과 — delivery/fluency를 유지한다', () => {
    const input = [makeFeedback({ voiceQualityRatio: VOICE_QUALITY_THRESHOLD })];
    const result = filterFeedbackScores(input);
    expect(result[0].deliveryScore).toBe(70);
    expect(result[0].fluencyScore).toBe(65);
  });

  it('voiceQualityRatio가 null이면 점수를 그대로 유지한다 (텍스트 면접)', () => {
    const input = [makeFeedback({ voiceQualityRatio: null })];
    const result = filterFeedbackScores(input);
    expect(result[0].deliveryScore).toBe(70);
    expect(result[0].fluencyScore).toBe(65);
  });

  it('relevance/depth는 voiceQualityRatio와 무관하게 항상 유지된다', () => {
    const input = [makeFeedback({ voiceQualityRatio: 10 })];
    const result = filterFeedbackScores(input);
    expect(result[0].relevanceScore).toBe(80);
    expect(result[0].depthScore).toBe(75);
  });

  it('여러 문항 중 일부만 품질 미달이면 해당 문항만 null 처리된다', () => {
    const input = [
      makeFeedback({ questionOrder: 1, voiceQualityRatio: 30 }),
      makeFeedback({ questionOrder: 2, voiceQualityRatio: 90 }),
    ];
    const result = filterFeedbackScores(input);
    expect(result[0].deliveryScore).toBeNull();
    expect(result[1].deliveryScore).toBe(70);
  });

  it('원본 배열을 변경하지 않는다 (불변성)', () => {
    const input = [makeFeedback({ voiceQualityRatio: 20 })];
    filterFeedbackScores(input);
    expect(input[0].deliveryScore).toBe(70);
  });
});

// ══════════════════════════════════════════════════
// computeHybridScores
// ══════════════════════════════════════════════════
describe('computeHybridScores', () => {

  it('정상 데이터 — 각 지표 평균을 반올림해서 반환한다', () => {
    const input = [
      makeFeedback({ relevanceScore: 80, depthScore: 70, deliveryScore: 60, fluencyScore: 50, voiceQualityRatio: 80 }),
      makeFeedback({ relevanceScore: 90, depthScore: 80, deliveryScore: 70, fluencyScore: 60, voiceQualityRatio: 80 }),
    ];
    const result = computeHybridScores(input);
    expect(result.relevance).toBe(85);
    expect(result.depth).toBe(75);
    expect(result.delivery).toBe(65);
    expect(result.fluency).toBe(55);
  });

  it('음성 품질 미달 문항은 delivery/fluency 평균에서 제외된다', () => {
    const input = [
      makeFeedback({ deliveryScore: 80, fluencyScore: 80, voiceQualityRatio: 20 }), // 미달 → null
      makeFeedback({ deliveryScore: 60, fluencyScore: 60, voiceQualityRatio: 90 }), // 통과
    ];
    const result = computeHybridScores(input);
    expect(result.delivery).toBe(60);
    expect(result.fluency).toBe(60);
  });

  it('모든 문항이 음성 품질 미달이면 delivery/fluency는 null을 반환한다', () => {
    const input = [
      makeFeedback({ voiceQualityRatio: 10 }),
      makeFeedback({ voiceQualityRatio: 20 }),
    ];
    const result = computeHybridScores(input);
    expect(result.delivery).toBeNull();
    expect(result.fluency).toBeNull();
  });

  it('빈 배열이면 모든 지표와 total이 null을 반환한다', () => {
    const result = computeHybridScores([]);
    expect(result.relevance).toBeNull();
    expect(result.depth).toBeNull();
    expect(result.delivery).toBeNull();
    expect(result.fluency).toBeNull();
    expect(result.total).toBeNull();
  });

  it('total — 4개 지표 모두 유효할 때 가중치 평균을 반환한다', () => {
    // relevance:80 * 0.35 + depth:80 * 0.35 + delivery:80 * 0.15 + fluency:80 * 0.15 = 80
    const input = [makeFeedback({ relevanceScore: 80, depthScore: 80, deliveryScore: 80, fluencyScore: 80, voiceQualityRatio: 80 })];
    const result = computeHybridScores(input);
    expect(result.total).toBe(80);
  });

  it('total — delivery/fluency null 시 relevance+depth 가중치로 재정규화', () => {
    // relevance:80 * 0.35 + depth:60 * 0.35 = 49, 총가중치 0.70 → 49/0.70 = 70
    const input = [makeFeedback({ relevanceScore: 80, depthScore: 60, voiceQualityRatio: 10 })];
    const result = computeHybridScores(input);
    expect(result.total).toBe(70);
  });

  it('SCORE_WEIGHTS 합이 1.0이다', () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0);
  });

  it('relevanceScore가 이미 null인 문항은 평균에서 제외된다', () => {
    const input = [
      makeFeedback({ relevanceScore: null }),
      makeFeedback({ relevanceScore: 80 }),
    ];
    const result = computeHybridScores(input);
    expect(result.relevance).toBe(80);
  });
});

// ══════════════════════════════════════════════════
// getVoiceQualityLabel
// ══════════════════════════════════════════════════
describe('getVoiceQualityLabel', () => {

  it('ratio가 null이면 "측정불가"를 반환한다', () => {
    expect(getVoiceQualityLabel(null)).toBe('측정불가');
  });

  it('ratio가 50 이상이면 "양호"를 반환한다', () => {
    expect(getVoiceQualityLabel(50)).toBe('양호');
    expect(getVoiceQualityLabel(100)).toBe('양호');
  });

  it('ratio가 50 미만이면 "부족"을 반환한다', () => {
    expect(getVoiceQualityLabel(49.9)).toBe('부족');
    expect(getVoiceQualityLabel(0)).toBe('부족');
  });
});
