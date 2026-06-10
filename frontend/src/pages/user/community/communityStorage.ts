export interface Post {
  id: number;
  category: string;
  title: string;
  preview: string;
  content: string;
  authorId: string;
  author: string;
  createdAt: string;
  views: number;
  likes: number;
  comments: number;
  bookmarked: boolean;
  hot: boolean;
}

export const CURRENT_USER = { id: 'me', name: '나' };

export const COMMUNITY_POSTS_STORAGE_KEY = 'careerWaveCommunityPosts';

export const MOCK_POSTS = [
  {
    id: 1,
    category: '면접 후기',
    title: '카카오 백엔드 1차 면접 후기 (기술 면접 위주)',
    preview: 'CS 기초 위주로 질문이 나왔고, 자료구조 + OS + 네트워크 순서로 진행됐습니다. Spring 관련 심화 질문도...',
    content: `안녕하세요, 이번에 카카오 2025 공채 백엔드 1차 면접을 다녀온 후기를 남깁니다.

**면접 구성**
- 시간: 약 50분
- 면접관: 2명 (개발자로 보임)
- 방식: 화상 면접 (Zoom)

**질문 리스트**
1. 자기소개 (2분)
2. 자료구조 - 해시테이블 내부 동작 원리 설명
3. OS - 프로세스와 스레드 차이, 컨텍스트 스위칭
4. 네트워크 - TCP 3-way handshake, HTTP와 HTTPS 차이
5. Spring - Bean 라이프사이클, @Transactional 동작 원리
6. DB - 인덱스 구조 (B+ Tree), N+1 문제 해결법
7. 프로젝트 경험 - 기술 선택 이유, 트러블슈팅 경험
8. 역질문 시간

**후기**
전반적으로 CS 기초에 충실하면 충분히 대응 가능한 수준이었습니다. 심화 질문은 프로젝트 경험과 연계해서 물어봤고, 모르면 모른다고 솔직하게 말했을 때 힌트를 주셨습니다. 면접 분위기는 생각보다 부드러웠어요.

다음 면접을 준비하시는 분들 모두 화이팅입니다!`,
    authorId: 'user-1',
    author: '개발자지망생',
    createdAt: '2025-05-20',
    views: 1240,
    likes: 87,
    comments: 23,
    bookmarked: false,
    hot: true,
  },
  {
    id: 2,
    category: '합격 후기',
    title: '토스 프론트엔드 최종 합격 후기 + 준비 방법',
    preview: '3개월 준비 끝에 최종 합격했습니다! 코딩테스트부터 컬처핏까지 전 과정을 공유합니다.',
    content: '3개월 준비 끝에 최종 합격했습니다! 코딩테스트부터 컬처핏까지 전 과정을 공유합니다.',
    authorId: 'user-2',
    author: 'toss_fe_21',
    createdAt: '2025-05-19',
    views: 3560,
    likes: 215,
    comments: 61,
    bookmarked: true,
    hot: true,
  },
  {
    id: 3,
    category: '질문',
    title: 'Spring Boot에서 @Transactional 내부 호출 문제 해결법',
    preview: '셀프 인보케이션 이슈로 트랜잭션이 적용 안 되는 상황인데 어떻게 해결하셨나요?',
    content: '셀프 인보케이션 이슈로 트랜잭션이 적용 안 되는 상황인데 어떻게 해결하셨나요?',
    authorId: 'user-3',
    author: 'java_dev_kim',
    createdAt: '2025-05-18',
    views: 840,
    likes: 42,
    comments: 17,
    bookmarked: false,
    hot: false,
  },
  {
    id: 4,
    category: '이력서 팁',
    title: '신입 백엔드 이력서 통과율 높이는 5가지 방법',
    preview: '서류 합격률을 3배 높인 경험을 공유합니다. 프로젝트 성과 수치화가 핵심입니다.',
    content: '서류 합격률을 3배 높인 경험을 공유합니다. 프로젝트 성과 수치화가 핵심입니다.',
    authorId: 'user-4',
    author: '취준컨설턴트',
    createdAt: '2025-05-17',
    views: 2100,
    likes: 130,
    comments: 38,
    bookmarked: false,
    hot: false,
  },
  {
    id: 5,
    category: '질문',
    title: '네이버 공채 코딩테스트 난이도 어느 정도인가요?',
    preview: '이번 공채를 처음 지원하는데 어느 정도 수준으로 준비해야 할지 감이 안 잡혀서요.',
    content: '이번 공채를 처음 지원하는데 어느 정도 수준으로 준비해야 할지 감이 안 잡혀서요.',
    authorId: 'user-5',
    author: 'algo_beginner',
    createdAt: '2025-05-16',
    views: 580,
    likes: 21,
    comments: 14,
    bookmarked: false,
    hot: false,
  },
  {
    id: 6,
    category: '자유',
    title: '취준 6개월 차, 멘탈 관리하는 법 공유합니다',
    preview: '서류 탈락이 반복될 때마다 무너졌는데 이렇게 버텼습니다. 같이 힘냅시다!',
    content: '서류 탈락이 반복될 때마다 무너졌는데 이렇게 버텼습니다. 같이 힘냅시다!',
    authorId: 'user-6',
    author: '버티는중',
    createdAt: '2025-05-15',
    views: 1890,
    likes: 178,
    comments: 54,
    bookmarked: false,
    hot: false,
  },
];

export function getStoredPosts(): Post[] {
  try {
    const parsedPosts = JSON.parse(
        localStorage.getItem(COMMUNITY_POSTS_STORAGE_KEY) || '[]'
    );

    return Array.isArray(parsedPosts) ? (parsedPosts as Post[]) : [];
  } catch {
    return [];
  }
}

export function getAllCommunityPosts(): Post[] {
  return [...MOCK_POSTS, ...getStoredPosts()];
}

export function saveStoredPosts(posts: Post[]): void {
  localStorage.setItem(COMMUNITY_POSTS_STORAGE_KEY, JSON.stringify(posts));
}

export function getCommunityPost(postId: string | number | null | undefined): Post | null {
  if (!postId) return null;

  return getAllCommunityPosts().find((post) => String(post.id) === String(postId)) ?? null;
}

export function getPostPreview(content: string): string {
  const preview = content.replace(/\s+/g, ' ').trim();
  return preview.length > 90 ? `${preview.slice(0, 90)}...` : preview;
}
