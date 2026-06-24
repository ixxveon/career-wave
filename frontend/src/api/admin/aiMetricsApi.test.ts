import { describe, expect, it } from 'vitest';
import {
  RAG_INDEX_STATUS,
  mapRagDocumentDownload,
  mapRagDocumentList,
  mapRagDocumentMetric,
  mapRagDocumentStatus,
} from './aiMetricsApi';

describe('aiMetricsApi RAG document contract mapper', () => {
  const rawDocument = {
    ragDocumentId: 10,
    uploadedBy: 1,
    fileUuid: '1fb3e31e-fd5a-420d-8135-ec682ac53956',
    originalFileName: 'faq.pdf',
    mimeType: 'application/pdf',
    fileSize: 182030,
    chunkCount: 24,
    indexingProgress: 75,
    status: 'INDEXING' as const,
    createdAt: '2026-06-24T00:00:00Z',
    updatedAt: '2026-06-24T00:10:00Z',
  };

  it('maps Spring RAG document status to screen status', () => {
    expect(mapRagDocumentStatus('UPLOADED')).toBe(RAG_INDEX_STATUS.SYNCED);
    expect(mapRagDocumentStatus('COMPLETED')).toBe(RAG_INDEX_STATUS.SYNCED);
    expect(mapRagDocumentStatus('INDEXING')).toBe(RAG_INDEX_STATUS.INDEXING);
    expect(mapRagDocumentStatus('FAILED')).toBe(RAG_INDEX_STATUS.FAILED);
  });

  it('maps Spring RAG document item to screen document metric', () => {
    expect(mapRagDocumentMetric(rawDocument)).toEqual({
      documentId: '10',
      name: 'faq.pdf',
      chunkCount: 24,
      progressPercent: 75,
      status: RAG_INDEX_STATUS.INDEXING,
      updatedAt: '2026-06-24T00:10:00Z',
    });
  });

  it('maps Spring RAG document page wrapper to screen document list', () => {
    expect(
      mapRagDocumentList({
        content: [rawDocument],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      })
    ).toEqual([
      {
        documentId: '10',
        name: 'faq.pdf',
        chunkCount: 24,
        progressPercent: 75,
        status: RAG_INDEX_STATUS.INDEXING,
        updatedAt: '2026-06-24T00:10:00Z',
      },
    ]);
  });

  it('maps Spring RAG download info to screen download info', () => {
    expect(
      mapRagDocumentDownload({
        ragDocumentId: 10,
        originalFileName: 'faq.pdf',
        fileUuid: '1fb3e31e-fd5a-420d-8135-ec682ac53956',
        mimeType: 'application/pdf',
        fileSize: 182030,
        downloadUrl: '/api/v1/admin/ai-metrics/rag-documents/10/download',
      })
    ).toEqual({
      documentId: '10',
      name: 'faq.pdf',
      downloadUrl: '/api/v1/admin/ai-metrics/rag-documents/10/download',
    });
  });
});
