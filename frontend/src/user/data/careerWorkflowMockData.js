export const careerHistoryRecords = [
  {
    id: 'history-001',
    date: '2026-05-22',
    company: '네이버클라우드',
    role: '백엔드 개발자',
    type: '기술 면접',
    score: 86,
    previousScore: 78,
    status: '분석 완료',
    summary: 'Spring Boot와 JPA 기본기는 안정적이지만, 장애 대응 경험을 수치로 설명하는 보완이 필요합니다.',
    techStack: ['Spring Boot', 'JPA', 'MySQL', 'Redis', 'AWS'],
    questions: [
      {
        question: 'JPA를 사용하는 이유와 영속성 컨텍스트의 장점을 설명해주세요.',
        answer: '객체 중심으로 데이터를 다룰 수 있고, 변경 감지와 1차 캐시로 반복적인 조회를 줄일 수 있습니다.',
        feedback: '핵심 개념은 잘 짚었습니다. 실제 프로젝트에서 어떤 쿼리 수가 줄었는지 함께 말하면 설득력이 올라갑니다.',
        improvement: 'N+1 문제를 발견한 상황, Fetch Join 적용 전후 응답 시간, 쿼리 수 변화를 함께 정리하세요.',
      },
      {
        question: 'Redis 캐시를 적용했던 경험을 말해주세요.',
        answer: '반복 조회되는 데이터를 Redis에 저장해서 API 응답 속도를 개선했습니다.',
        feedback: '개선 방향은 좋지만 캐시 만료 정책과 장애 시 fallback 전략 설명이 부족합니다.',
        improvement: 'TTL 기준, 캐시 무효화 조건, DB fallback 흐름을 30초 답변으로 준비하세요.',
      },
    ],
  },
  {
    id: 'history-002',
    date: '2026-05-20',
    company: '토스페이먼츠',
    role: '프론트엔드 개발자',
    type: '프로젝트 면접',
    score: 79,
    previousScore: 75,
    status: '피드백 완료',
    summary: 'React 상태 관리 선택 근거는 분명하지만, 성능 최적화 경험을 더 구체화하면 좋습니다.',
    techStack: ['React', 'TypeScript', 'React Query', 'Vite'],
    questions: [
      {
        question: '전역 상태와 서버 상태를 어떻게 분리했나요?',
        answer: '서버 상태는 React Query로 관리하고, UI 상태만 전역 store에 두었습니다.',
        feedback: '구조는 명확합니다. 캐시 키 설계와 stale time 기준을 추가하면 더 강한 답변이 됩니다.',
        improvement: '목록, 상세, 필터 조건별 캐시 키 예시를 준비하세요.',
      },
      {
        question: '렌더링 성능을 개선한 경험이 있나요?',
        answer: '불필요한 컴포넌트 렌더링을 줄이려고 memo를 적용했습니다.',
        feedback: '도구 사용은 맞지만 측정 지표가 부족합니다.',
        improvement: 'React DevTools Profiler로 확인한 commit 시간 변화를 숫자로 말하세요.',
      },
    ],
  },
  {
    id: 'history-003',
    date: '2026-05-18',
    company: '카카오페이',
    role: '백엔드 개발자',
    type: '인성 면접',
    score: 81,
    previousScore: 83,
    status: '복습 필요',
    summary: '협업 태도는 긍정적이나 갈등 상황에서 본인의 판단 기준과 결과를 더 선명하게 말해야 합니다.',
    techStack: ['Java', 'Spring Security', 'JWT', 'Docker'],
    questions: [
      {
        question: '동료와 기술 선택이 달랐던 경험을 설명해주세요.',
        answer: '각자 의견을 공유하고 팀 회의를 통해 더 적합한 기술을 선택했습니다.',
        feedback: '협업 태도는 보이지만 본인이 어떤 근거를 제시했는지 약합니다.',
        improvement: '성능, 유지보수, 일정 리스크 중 어떤 기준으로 판단했는지 STAR 구조로 정리하세요.',
      },
    ],
  },
];

export const reportExportSummary = {
  profile: {
    name: '고지원',
    targetRole: '백엔드 개발자',
    period: '2026.05.01 - 2026.05.26',
  },
  documentAnalysis: {
    score: 82,
    headline: '직무 경험 연결성은 좋고, 성과 수치 보강이 필요합니다.',
    points: ['프로젝트 목적과 본인 역할이 명확함', '장애 대응 결과를 수치로 보완 필요', '기술 키워드 반복 노출 양호'],
  },
  interviewAnalysis: {
    score: 84,
    headline: '기술 개념 설명은 안정적이며 사례 기반 답변을 강화해야 합니다.',
    points: ['JPA, Redis 기본 개념 설명 우수', '캐시 정책과 장애 대응 흐름 보완', '답변 길이와 결론 정리 개선'],
  },
  history: {
    totalCount: careerHistoryRecords.length,
    averageScore: 82,
    bestCompany: '네이버클라우드',
    repeatedWeaknesses: ['성과 수치화', '장애 대응 fallback', 'STAR 답변 구조'],
  },
  actionPlan: [
    { week: '1주차', title: '성과 수치 답변 정리', description: '응답 시간, 쿼리 수, 처리량 등 실제 개선 수치를 3개 답변에 연결합니다.' },
    { week: '2주차', title: 'JPA와 Redis 심화 복습', description: '영속성 컨텍스트, 캐시 만료, 장애 대응을 1분 답변으로 압축합니다.' },
    { week: '3주차', title: '프로젝트 STAR 답변 훈련', description: '상황, 행동, 결과가 드러나는 답변 카드 5개를 작성합니다.' },
  ],
};
