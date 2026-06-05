import type { AiModelNameFields } from '../../admin/api/aiMetricsApi';

export function getAiDisplayModelName(model: AiModelNameFields): string {
  return model.displayModelName || model.actualModelName || '모델 정보 없음';
}
