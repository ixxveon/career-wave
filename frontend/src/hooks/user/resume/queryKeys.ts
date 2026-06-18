export const resumeQueryKeys = {
  all: ['resume'] as const,
  feedback: (documentId: string) =>
    ['resume', 'feedback', documentId] as const,
  history: (page: number, size: number) =>
    ['resume', 'history', page, size] as const,
  historyInfinite: () =>
    ['resume', 'history', 'infinite'] as const,
};
