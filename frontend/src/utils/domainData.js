export const domainCards = {
  auth: [
    {
      title: '회원가입 분기',
      description: '일반 취준생, 기업 인사담당자, 멘토 회원을 구분하여 가입합니다.',
    },
    {
      title: 'JWT 로그인',
      description: 'Access Token과 Refresh Token 기반 인증 흐름을 설계합니다.',
    },
    {
      title: '권한 기반 접근',
      description: '구직자, 기업, 어드민 페이지를 Role 기준으로 분리합니다.',
    },
  ],
  company: [
    {
      title: '기업 프로필',
      description: '회사 소개, 로고, 복지, 연봉, 근무지 정보를 관리합니다.',
    },
    {
      title: 'HR 담당자 관리',
      description: '기업에 소속된 인사담당자 계정을 등록하고 관리합니다.',
    },
    {
      title: '브랜딩 영역',
      description: '구직자가 회사 정보를 신뢰할 수 있도록 시각화합니다.',
    },
  ],
  jobs: [
    {
      title: '공고 등록',
      description: '기업이 마감일, 직무, 기술 스택을 입력하여 공고를 등록합니다.',
    },
    {
      title: 'AI 공고 분석',
      description: '공고 텍스트에서 핵심 키워드와 필수 기술을 추출합니다.',
    },
    {
      title: '통합 검색',
      description: '직무, 경력, 지역, 기술 스택별로 공고를 필터링합니다.',
    },
  ],
  application: [
    {
      title: '즉시 지원',
      description: '사용자가 작성한 이력서/자소서를 선택해 공고에 지원합니다.',
    },
    {
      title: '지원 현황',
      description: '서류 접수부터 최종 결과까지 진행 상태를 확인합니다.',
    },
    {
      title: '지원자 관리',
      description: '기업 담당자가 지원자를 열람하고 상태를 변경합니다.',
    },
  ],
  document: [
    {
      title: '이력서 분석',
      description: 'PDF/Word 텍스트를 파싱해 직무 적합성과 개선점을 제안합니다.',
    },
    {
      title: '자소서 첨삭',
      description: '문항별 논리성, 구체성, 직무 연결성을 분석합니다.',
    },
    {
      title: 'AI 문장 추천',
      description: '프로젝트 경험과 역량을 더 설득력 있게 다듬습니다.',
    },
  ],
  interview: [
    {
      title: '텍스트 모의면접',
      description: 'WebSocket 기반으로 실시간 질문과 꼬리 질문을 제공합니다.',
    },
    {
      title: '미디어 면접',
      description: 'WebRTC 기반으로 시선, 자세, 음성 톤을 분석합니다.',
    },
    {
      title: '면접 리포트',
      description: '점수, 총평, 학습 로드맵, PDF 다운로드 기능을 제공합니다.',
    },
  ],
  community: [
    {
      title: '면접 후기',
      description: '기업별/직무별 면접 질문과 후기를 공유합니다.',
    },
    {
      title: '멘토 답변',
      description: 'HR 담당자와 현업 멘토가 공식 답변을 남길 수 있습니다.',
    },
    {
      title: '댓글/대댓글',
      description: '취준생 간 정보 교류와 네트워킹을 활성화합니다.',
    },
  ],
  billing: [
    {
      title: '구직자 구독제',
      description: 'AI 면접 무제한, PDF 리포트 다운로드, 영상 분석 권한을 제공합니다.',
    },
    {
      title: '기업 유료 상품',
      description: '공고 상단 노출, 인재 검색 커스터마이징 상품을 제공합니다.',
    },
    {
      title: 'PG 연동',
      description: 'Toss Payments 등 결제 게이트웨이 연동을 고려합니다.',
    },
  ],
};
