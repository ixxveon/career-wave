import type { AiModelNameFields } from '../api/aiMetricsApi';

export const AI_MODEL_DISPLAY = {
  NO_MODEL_INFO: '모델 정보 없음',
} as const;

export function getAiDisplayModelName(model: AiModelNameFields): string {
  return model.displayModelName || model.actualModelName || AI_MODEL_DISPLAY.NO_MODEL_INFO;
}
