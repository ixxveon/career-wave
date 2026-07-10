import { describe, expect, it } from 'vitest';
import { getApiStateMessage, isAllowedRagUploadFile } from './RagManagementPage';

describe('RagManagementPage RAG upload guards', () => {
  it('allows a pdf upload even when the browser omits the mime type', () => {
    expect(
      isAllowedRagUploadFile({
        name: 'faq.pdf',
        type: '',
      }),
    ).toBe(true);
  });

  it('allows markdown and text files with text mime types', () => {
    expect(
      isAllowedRagUploadFile({
        name: 'guide.md',
        type: 'text/plain',
      }),
    ).toBe(true);

    expect(
      isAllowedRagUploadFile({
        name: 'notes.txt',
        type: 'text/markdown',
      }),
    ).toBe(true);
  });

  it('rejects unsupported extensions and mismatched pdf mime types', () => {
    expect(
      isAllowedRagUploadFile({
        name: 'faq.docx',
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toBe(false);

    expect(
      isAllowedRagUploadFile({
        name: 'faq.pdf',
        type: 'text/plain',
      }),
    ).toBe(false);
  });
});

describe('RagManagementPage API error message mapping', () => {
  it('prefers the backend message when present', () => {
    expect(
      getApiStateMessage(
        {
          response: {
            status: 409,
            data: {
              message: '?? ??? ?? RAG ??? ????.',
            },
          },
        },
        'RAG ?? ???? ??????.',
      ),
    ).toBe('?? ??? ?? RAG ??? ????.');
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
        'fallback',
      ),
    ).not.toBe('ignored');
  });
});
