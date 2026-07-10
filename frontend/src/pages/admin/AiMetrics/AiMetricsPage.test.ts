import { describe, expect, it } from 'vitest';
import { getApiStateMessage } from './AiMetricsPage';

describe('AiMetricsPage API error message mapping', () => {
  it('prefers the backend message when present', () => {
    expect(
      getApiStateMessage(
        {
          response: {
            status: 409,
            data: {
              message: '현재 인덱싱 중인 RAG 문서가 있습니다.',
            },
          },
        },
        'RAG 문서 업로드에 실패했습니다.'
      )
    ).toBe('현재 인덱싱 중인 RAG 문서가 있습니다.');
  });

  it('keeps auth-specific fallback handling', () => {
    expect(
      getApiStateMessage(
        {
          response: {
            status: 401,
            data: {
              message: 'ignored',
            },
          },
        },
        'fallback'
      )
    ).not.toBe('ignored');
  });
});
