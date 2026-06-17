import type { FileType } from '../../../types/user/resume';

export const resumeQueryKeys = {
  all: ['resume'] as const,
  feedback: (documentId: string) =>
    ['resume', 'feedback', documentId] as const,
  history: (page: number, size: number, fileType?: FileType) =>
    ['resume', 'history', page, size, fileType] as const,
  historyInfinite: (fileType?: FileType) =>
    ['resume', 'history', 'infinite', fileType] as const,
};
