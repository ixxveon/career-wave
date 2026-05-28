import { apiClient } from '../../utils/apiClient';

const useMockData = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

const mockPosts = [
  {
    id: 'board-001',
    category: '면접 후기',
    title: '백엔드 1차 기술 면접 후기',
    preview: '자료구조, OS, 네트워크, Spring 트랜잭션 질문이 많았습니다.',
    content: '면접은 50분 정도 진행됐고 CS 기본기와 프로젝트 경험을 함께 물어봤습니다.',
    author: 'spring_ready',
    createdAt: '2026-05-20',
    views: 1240,
    likes: 87,
    comments: 3,
  },
  {
    id: 'board-002',
    category: '합격 후기',
    title: 'AI 면접 리포트로 답변 구조를 고친 후기',
    preview: 'STAR 구조로 답변을 정리하니 최종 면접에서 훨씬 편했습니다.',
    content: '진단 리포트의 약점 키워드를 기준으로 답변을 다시 작성했습니다.',
    author: 'career_wave_user',
    createdAt: '2026-05-19',
    views: 980,
    likes: 64,
    comments: 2,
  },
];

const mockComments = {
  'board-001': [
    { id: 'comment-001', author: 'java_user', content: 'Transactional 질문은 어느 정도 깊이였나요?', createdAt: '2026-05-20', parentId: null },
    { id: 'comment-002', author: 'spring_ready', content: '전파 옵션과 롤백 조건까지 물어봤습니다.', createdAt: '2026-05-20', parentId: 'comment-001' },
  ],
  'board-002': [
    { id: 'comment-003', author: 'newbie', content: 'PDF 리포트 공유용으로도 괜찮나요?', createdAt: '2026-05-19', parentId: null },
  ],
};

function mockResponse(data) {
  return Promise.resolve(structuredClone(data));
}

export const communityApi = {
  getBoards: (params = {}) => {
    if (!useMockData) {
      const query = new URLSearchParams(params).toString();
      return apiClient(`/boards${query ? `?${query}` : ''}`);
    }

    const keyword = (params.keyword || '').trim().toLowerCase();
    const category = params.category || '전체';
    const filtered = mockPosts.filter((post) => {
      const matchesKeyword =
        !keyword ||
        post.title.toLowerCase().includes(keyword) ||
        post.preview.toLowerCase().includes(keyword);
      const matchesCategory = category === '전체' || post.category === category;
      return matchesKeyword && matchesCategory;
    });

    return mockResponse(filtered);
  },

  getBoardDetail: (boardId) => (
    useMockData
      ? mockResponse({ ...mockPosts.find((post) => post.id === boardId), comments: mockComments[boardId] || [] })
      : apiClient(`/boards/${boardId}`)
  ),

  createBoard: (payload) => (
    useMockData
      ? mockResponse({ id: `board-${Date.now()}`, ...payload })
      : apiClient('/boards', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
  ),

  updateBoard: (boardId, payload) => (
    useMockData
      ? mockResponse({ id: boardId, ...payload })
      : apiClient(`/boards/${boardId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
  ),

  deleteBoard: (boardId) => (
    useMockData
      ? mockResponse({ boardId, deleted: true })
      : apiClient(`/boards/${boardId}`, { method: 'DELETE' })
  ),

  createComment: (boardId, payload) => (
    useMockData
      ? mockResponse({ id: `comment-${Date.now()}`, boardId, ...payload })
      : apiClient(`/boards/${boardId}/comments`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
  ),

  reportTarget: (payload) => (
    useMockData
      ? mockResponse({ ...payload, reported: true })
      : apiClient('/reports', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
  ),
};
