import { describe, expect, it } from 'vitest';
import {
  mapAiBudgetSetting,
  toUpdateAiBudgetRequestRaw,
  toUpdateAiDiscordAlertRequestRaw,
  toUpdateAiRateLimitRequestRaw,
} from './aiMetricsApi';

describe('aiMetricsApi budget contract mapper', () => {
  const rawBudget = {
    aiOpsSettingId: 1,
    selectedModelId: 7,
    monthlyBudget: '3500000',
    alertEnabled: true,
    alertChannel: 'DISCORD',
    alertThreshold: 85,
    rateLimitEnabled: false,
    updatedAt: '2026-06-24T00:00:00Z',
  };

  it('maps Spring budget response to screen budget setting', () => {
    expect(mapAiBudgetSetting(rawBudget)).toEqual({
      selectedModelId: 7,
      monthlyBudget: 3500000,
      currentSpend: null,
      forecastSpend: null,
      thresholdPercent: 85,
      discordAlertEnabled: true,
      rateLimitEnabled: false,
    });
  });

  it('maps screen budget update request to Spring request fields', () => {
    expect(
      toUpdateAiBudgetRequestRaw(
        {
          monthlyBudget: 4000000,
          thresholdPercent: 90,
        },
        mapAiBudgetSetting(rawBudget)
      )
    ).toEqual({
      selectedModelId: 7,
      monthlyBudget: 4000000,
      alertThreshold: 90,
    });
  });

  it('prefers explicit selected model id when updating budget', () => {
    expect(
      toUpdateAiBudgetRequestRaw(
        {
          selectedModelId: 11,
          monthlyBudget: 4000000,
          thresholdPercent: 90,
        },
        mapAiBudgetSetting(rawBudget)
      )
    ).toEqual({
      selectedModelId: 11,
      monthlyBudget: 4000000,
      alertThreshold: 90,
    });
  });

  it('maps alert and rate limit toggle requests to Spring request fields', () => {
    expect(toUpdateAiDiscordAlertRequestRaw({ enabled: false })).toEqual({
      alertEnabled: false,
    });
    expect(toUpdateAiRateLimitRequestRaw({ enabled: true, reason: 'budget exceeded' })).toEqual({
      rateLimitEnabled: true,
    });
  });
});
