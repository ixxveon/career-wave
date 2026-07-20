-- ================================================
-- 커뮤니티 & 고객센터 데모용 더미 데이터
-- 실제 유저처럼 보이도록 작성된 시연용 데이터
-- 실행 전제: seed-local.sql (testuser01~05, admin, cs) 실행 완료 상태
-- ================================================

-- ────────────────────────────────────────────
-- 기존 더미 데이터 정리 (재실행 안전)
-- ────────────────────────────────────────────
DELETE FROM comments WHERE board_id IN (
  SELECT board_id FROM boards WHERE member_id IN (
    SELECT member_id FROM members
    WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testuser05')
  )
);
DELETE FROM boards WHERE member_id IN (
  SELECT member_id FROM members
  WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testuser05')
);
DELETE FROM inquiries WHERE member_id IN (
  SELECT member_id FROM members
  WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testuser05')
);
DELETE FROM notices WHERE title IN (
  '[공지] CareerWave 서비스 오픈 안내',
  '[업데이트] AI 면접 리포트 개선 (v1.4)',
  '[이벤트] 7월 얼리버드 구독 할인 30%',
  '[점검] 7월 22일 새벽 정기 점검 예정',
  '[공지] 커뮤니티 이용 규칙 안내',
  '[업데이트] 자기소개서 키워드 분석 기능 추가',
  '[이벤트] 합격 후기 작성 이벤트 (~7/31)',
  '[공지] 개인정보처리방침 v2.1 개정 안내'
);
DELETE FROM faqs WHERE question IN (
  '서류 AI 코칭과 AI 모의면접의 차이가 무엇인가요?',
  '구독 없이도 서비스를 이용할 수 있나요?',
  '이력서 분석 결과는 얼마나 신뢰할 수 있나요?',
  '자기소개서 코칭에서 어떤 피드백을 제공하나요?',
  'AI 면접에서 어떤 직무를 지원하나요?',
  '구독 플랜은 어떻게 되나요?',
  '결제 수단은 무엇을 지원하나요?',
  '구독을 일시 정지할 수 있나요?',
  '동일 아이디로 중복 가입이 가능한가요?',
  '아이디나 이메일을 변경할 수 있나요?',
  '면접 연습 영상은 저장되나요?',
  '분석 결과를 PDF로 내보낼 수 있나요?'
);

-- ────────────────────────────────────────────
-- 더미 멤버 추가 (커뮤니티 글 작성자 다양화)
-- 비밀번호: Test1234!
-- ────────────────────────────────────────────
INSERT INTO members (member_id, login_id, email, password, name, role_type, member_status, subscription_status, warning_count, created_at, updated_at)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'demouser01', 'demouser01@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '김지원', 'USER', 'ACTIVE', 'PREMIUM', 0, NOW() - INTERVAL '120 days', NOW()),
  ('a0000001-0000-0000-0000-000000000002', 'demouser02', 'demouser02@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '이준혁', 'USER', 'ACTIVE', 'FREE', 0, NOW() - INTERVAL '90 days', NOW()),
  ('a0000001-0000-0000-0000-000000000003', 'demouser03', 'demouser03@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '박서연', 'USER', 'ACTIVE', 'PREMIUM', 0, NOW() - INTERVAL '65 days', NOW()),
  ('a0000001-0000-0000-0000-000000000004', 'demouser04', 'demouser04@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '최민준', 'USER', 'ACTIVE', 'FREE', 0, NOW() - INTERVAL '45 days', NOW()),
  ('a0000001-0000-0000-0000-000000000005', 'demouser05', 'demouser05@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '정수아', 'USER', 'ACTIVE', 'PREMIUM', 0, NOW() - INTERVAL '30 days', NOW()),
  ('a0000001-0000-0000-0000-000000000006', 'demouser06', 'demouser06@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '윤태양', 'USER', 'ACTIVE', 'PREMIUM', 0, NOW() - INTERVAL '20 days', NOW()),
  ('a0000001-0000-0000-0000-000000000007', 'demouser07', 'demouser07@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '한예슬', 'USER', 'ACTIVE', 'FREE', 0, NOW() - INTERVAL '15 days', NOW()),
  ('a0000001-0000-0000-0000-000000000008', 'demouser08', 'demouser08@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '강민서', 'USER', 'ACTIVE', 'PREMIUM', 0, NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (login_id) DO NOTHING;

DO $$
DECLARE
  v_u01 UUID; v_u02 UUID; v_u03 UUID; v_u04 UUID; v_u05 UUID;
  v_d01 UUID; v_d02 UUID; v_d03 UUID; v_d04 UUID; v_d05 UUID; v_d06 UUID; v_d07 UUID; v_d08 UUID;
  v_master_id BIGINT;
  v_cs_id     BIGINT;
  -- board IDs
  b1  BIGINT; b2  BIGINT; b3  BIGINT; b4  BIGINT; b5  BIGINT;
  b6  BIGINT; b7  BIGINT; b8  BIGINT; b9  BIGINT; b10 BIGINT;
  b11 BIGINT; b12 BIGINT; b13 BIGINT; b14 BIGINT; b15 BIGINT;
  b16 BIGINT; b17 BIGINT; b18 BIGINT; b19 BIGINT; b20 BIGINT;
  b21 BIGINT; b22 BIGINT; b23 BIGINT; b24 BIGINT; b25 BIGINT;
BEGIN
  SELECT member_id INTO v_u01 FROM members WHERE login_id = 'testuser01';
  SELECT member_id INTO v_u02 FROM members WHERE login_id = 'testuser02';
  SELECT member_id INTO v_u03 FROM members WHERE login_id = 'testuser03';
  SELECT member_id INTO v_u04 FROM members WHERE login_id = 'testuser04';
  SELECT member_id INTO v_u05 FROM members WHERE login_id = 'testuser05';
  SELECT member_id INTO v_d01 FROM members WHERE login_id = 'demouser01';
  SELECT member_id INTO v_d02 FROM members WHERE login_id = 'demouser02';
  SELECT member_id INTO v_d03 FROM members WHERE login_id = 'demouser03';
  SELECT member_id INTO v_d04 FROM members WHERE login_id = 'demouser04';
  SELECT member_id INTO v_d05 FROM members WHERE login_id = 'demouser05';
  SELECT member_id INTO v_d06 FROM members WHERE login_id = 'demouser06';
  SELECT member_id INTO v_d07 FROM members WHERE login_id = 'demouser07';
  SELECT member_id INTO v_d08 FROM members WHERE login_id = 'demouser08';
  SELECT admin_id  INTO v_master_id FROM admins WHERE login_id = 'admin';
  SELECT admin_id  INTO v_cs_id     FROM admins WHERE login_id = 'cs';

  -- ════════════════════════════════════════════
  -- 커뮤니티 게시글 25개
  -- ════════════════════════════════════════════

  -- [합격 후기] 인기글
  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d01, '합격 후기',
    '카카오 신입 최종 합격했습니다! CareerWave 덕분이에요',
    E'안녕하세요~ 드디어 카카오 신입 개발자 최종 합격 통보를 받았습니다!!\n\n작년 하반기부터 준비했는데 CareerWave AI 면접 연습을 3주 동안 매일 했어요. 처음엔 답변이 너무 두서없었는데 AI 피드백에서 "STAR 구조로 답변하면 좋겠다"는 코멘트를 받고 나서 확실히 달라졌어요.\n\n기술 면접에서 "가장 어려웠던 기술적 문제와 해결 방법"을 물어봤는데, 연습할 때 비슷한 질문을 많이 해줘서 당황하지 않고 답할 수 있었습니다.\n\n서류도 CareerWave로 3번 다듬었어요. 키워드 분석에서 "직무 연관 키워드 비중이 낮다"고 피드백 줘서 수정했더니 서류 통과율이 눈에 띄게 올라갔습니다.\n\n취준생 여러분 모두 파이팅!! 저도 작년엔 정말 힘들었는데 꼭 합격하실 거에요 :)',
    342, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
  RETURNING board_id INTO b1;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d03, '합격 후기',
    '네이버 웹툰 UX 디자이너 합격 후기 — 포트폴리오 피드백이 결정적이었어요',
    E'오래 기다렸던 네이버웹툰 UX 디자이너 합격 통보를 어제 받았어요!\n\n솔직히 포트폴리오 완성도가 낮다고 스스로도 느꼈는데, CareerWave 서류 AI 코칭에서 "프로젝트별 결과 지표가 없다"는 피드백을 받고 각 프로젝트에 정량 수치(리텐션 +18%, 이탈률 -12% 등)를 추가했어요.\n\n1차 실기 이후 임원 면접까지 총 3번 면접을 봤는데, AI 면접에서 "자신의 디자인 결정에서 데이터를 어떻게 활용하나요?" 같은 질문을 미리 연습한 게 큰 도움이 됐습니다.\n\n다들 포기하지 마세요! 저도 3번 불합격하고 이번에 합격했어요.',
    218, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
  RETURNING board_id INTO b2;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d05, '합격 후기',
    '토스 PO 인턴 합격! 자기소개서 3번 갈아엎은 후기',
    E'토스 Product Owner 인턴에 합격했습니다 🎉\n\n자기소개서를 총 4번 썼는데, CareerWave 피드백이 매번 달랐어요. 처음엔 "경험의 맥락 설명이 부족하다", 두 번째엔 "지원 직무와 연결고리가 약하다", 세 번째 버전에서야 "직무 적합도 높음" 평가를 받았어요.\n\n PT 면접에서 케이스 스터디가 나왔는데, AI 면접으로 비슷한 유형을 많이 연습해서 구조화된 답변을 빠르게 낼 수 있었어요.\n\n취업 준비하시는 모든 분들 화이팅!!',
    187, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days')
  RETURNING board_id INTO b3;

  -- [면접 후기]
  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d02, '면접 후기',
    '삼성전자 DS부문 1차 면접 후기 — 예상 못한 질문 정리',
    E'삼성전자 DS부문 공정 엔지니어 1차 면접 다녀왔습니다. 결과는 아직 모르지만 경험 공유해요!\n\n[질문 목록]\n- 반도체 공정 중 가장 관심 있는 공정과 이유\n- 팀 프로젝트에서 갈등 상황을 어떻게 해결했나요?\n- 지원 직무에서 가장 중요한 역량이 무엇이라고 생각하나요?\n- 삼성전자 DS부문에 지원한 이유\n- 5년 후 목표\n\nCareerWave AI 면접에서 "갈등 해결" 관련 질문을 미리 연습했는데 실제로 나왔어요! 덕분에 STAR로 깔끔하게 답변했습니다.\n\n한 가지 예상 못한 건 "최근 읽은 반도체 관련 뉴스"를 물어봤다는 점이에요. AI 면접은 직무 질문 위주라 이런 최신 이슈는 따로 준비하는 걸 추천해요.',
    156, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
  RETURNING board_id INTO b4;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d06, '면접 후기',
    '현대자동차 인턴 최종 면접 후기 (합격 확인 전)',
    E'현대자동차 PE 인턴 최종 면접 다녀왔어요. 긴장 많이 했는데 생각보다 분위기가 편안했습니다.\n\n[면접 구성]\n- 인성 면접 (30분, 면접관 3명)\n- 기술 면접 (20분)\n\n[실제 질문]\n- 자기소개 1분\n- 현대차를 지원한 이유, 다른 자동차 기업과 비교했을 때\n- 가장 힘들었던 경험과 극복 방법\n- 전공 수업 중 가장 기억에 남는 프로젝트\n- 인턴 종료 후 정규직 전환 의향\n\nCareerWave 면접 연습을 2주 했더니 말하는 속도를 조절하는 게 확실히 좋아졌어요. AI 피드백에서 "답변 속도가 빠르다"는 지적을 계속 받아서 의식적으로 천천히 말하려고 노력했거든요.',
    134, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
  RETURNING board_id INTO b5;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_u02, '면접 후기',
    '스타트업 개발자 면접은 대기업이랑 다르네요 — 라인플러스 후기',
    E'라인플러스 백엔드 개발자 면접 경험 공유합니다!\n\n대기업 면접이랑 확연히 다른 게, 인성 질문보다는 기술 질문이 압도적으로 많았어요.\n\n[기술 질문]\n- Redis 캐시 전략 설명해보세요\n- JVM GC 동작 방식\n- DB 인덱스 설계 시 고려할 점\n- 동시성 이슈 경험해본 적 있나요?\n- MSA에서 트랜잭션 처리를 어떻게 하나요?\n\nCareerWave AI 면접에서 기술 면접 위주로 많이 연습했는데, 막상 실전에서는 더 깊은 수준까지 파고드는 느낌이었어요. 답변 말미에 "더 설명해주세요"를 자주 하셨어요.\n\n결과는 2주 후에 나온다고 하는데 기다리는 게 제일 힘드네요 ㅠㅠ',
    98, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
  RETURNING board_id INTO b6;

  -- [이력서 팁]
  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d04, '이력서 팁',
    '개발자 이력서에서 프로젝트 설명 잘 쓰는 법 (feat. AI 피드백 반영)',
    E'CareerWave에서 이력서 코칭을 받으면서 정리한 프로젝트 설명 팁입니다!\n\n[Before / After 비교]\n\nBefore: "공공데이터 API를 활용한 날씨 앱을 개발했습니다."\n\nAfter: "공공데이터 기상청 API를 연동해 React + TypeScript 기반 날씨 앱을 개발, DAU 850명 달성. Redis 캐싱으로 API 응답 속도를 평균 1.2s → 0.3s로 개선."\n\nAI 피드백 핵심:\n1. 기술 스택을 명시하라\n2. 수치 결과를 반드시 포함하라\n3. 내가 기여한 부분을 명확히 하라 (팀 프로젝트인 경우)\n4. 문제 → 시도 → 결과 구조로 쓰라\n\n이걸 적용한 후 서류 통과율이 훨씬 올라갔어요. 참고가 되셨으면 좋겠습니다!',
    276, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days')
  RETURNING board_id INTO b7;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d01, '이력서 팁',
    '직무별 핵심 키워드 정리 — 기획/마케팅/개발/디자인',
    E'CareerWave AI 코칭 받으면서 직무별로 자주 등장하는 키워드를 정리했어요!\n\n[개발]\n- 성능 최적화, 트러블슈팅, 아키텍처 설계, 코드 리뷰, CI/CD\n\n[기획]\n- 사용자 리서치, A/B 테스트, KPI, 요구사항 정의, 로드맵\n\n[마케팅]\n- 퍼포먼스 마케팅, CTR, ROAS, CPA, 콘텐츠 전략\n\n[디자인]\n- 사용자 중심, 프로토타이핑, A11y(접근성), 데이터 기반 디자인\n\nAI가 제 이력서에서 "직무 연관 키워드 비중이 낮습니다"라고 피드백 줬을 때 이 방식으로 다듬었어요. 면접까지 연결된다는 걸 느꼈습니다.',
    203, NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days')
  RETURNING board_id INTO b8;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d08, '이력서 팁',
    '신입인데 경험이 없을 때 이력서 어떻게 써요?',
    E'저도 같은 고민을 오래 했어요. CareerWave 코칭 받으면서 알게 된 팁 공유합니다!\n\n1. 대외활동도 프로젝트처럼 기술하세요\n   → "OO 동아리 기획팀" 대신 "OO 동아리 기획팀 — 연간 행사 3회 기획, 참여자 200명, 만족도 4.3/5"\n\n2. 수업 과제도 결과물 중심으로 써요\n   → "졸업 작품 — Spring Boot 기반 중고거래 플랫폼 개발, Github 스타 47개"\n\n3. 역할 강조 vs 결과 강조\n   → 경험 없을수록 결과 중심으로 (어떤 기여를 했는지)\n\n4. AI 면접 연습으로 부족한 경험치 커버\n   → 경험은 없어도 답변 구조와 자신감은 키울 수 있어요!\n\n저는 이 방법으로 서류 3곳 통과했습니다. 신입 취준생 파이팅!',
    189, NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days')
  RETURNING board_id INTO b9;

  -- [질문]
  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_u01, '질문',
    'AI 면접 연습, 하루에 몇 번씩 하는 게 효과적인가요?',
    E'안녕하세요! CareerWave 쓴 지 2주 됐는데요,\n\n하루에 너무 많이 하는 게 좋은 건지 적당히 하는 게 좋은 건지 감이 안 잡혀서요.\n\n저는 지금 하루 3~4세션 정도 하고 있는데 같은 실수를 반복하는 것 같기도 해서요 ㅠ\n\n경험 많으신 분들 어떻게 하셨나요?',
    67, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
  RETURNING board_id INTO b10;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d07, '질문',
    '이력서 점수가 낮게 나왔는데 어떻게 해석해야 할까요?',
    E'CareerWave에서 이력서 분석 받았는데 총점이 58점 나왔어요.\n\nAI 피드백에서 "직무 연관 키워드 비중이 낮음"과 "경험 서술에 수치가 부족함"이라고 나왔는데, 솔직히 어떻게 고쳐야 할지 막막해요.\n\n60점 이하면 많이 낮은 건가요? 수정 후 다시 분석받으면 점수가 많이 달라지는 편인가요?\n\n경험 있으신 분들 조언 부탁드려요!',
    84, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
  RETURNING board_id INTO b11;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_u03, '질문',
    'AI 면접에서 카메라 꼭 켜야 하나요?',
    E'AI 면접 연습할 때 카메라를 꼭 켜야 하는지 궁금해서요!\n\n카메라 없이 음성만으로도 연습이 가능한지, 아니면 카메라가 있어야 더 정확한 피드백이 나오는지 알고 싶어요.\n\n집 환경이 좀 어수선해서 배경이 신경 쓰이거든요 ㅎㅎ',
    45, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
  RETURNING board_id INTO b12;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d02, '질문',
    '이력서와 자기소개서 분석, 어느 걸 먼저 하는 게 좋을까요?',
    E'저는 지금 이력서 완성도가 70% 정도인데요,\n\n자기소개서를 먼저 다듬어야 할지, 이력서를 완성한 다음에 자소서를 써야 할지 순서가 헷갈려요.\n\n그리고 CareerWave에서 두 가지를 같이 분석받을 수 있는 건가요? 각각 분석권이 차감되는 건지도 알고 싶어요!',
    39, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
  RETURNING board_id INTO b13;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d04, '질문',
    'AI 면접 피드백에서 "말의 속도가 빠릅니다" 어떻게 고쳐요?',
    E'AI 피드백마다 "말의 속도가 다소 빠릅니다"가 계속 나오는데 어떻게 해야 개선되는지 모르겠어요.\n\n의식적으로 천천히 말하려고 해도 긴장하면 또 빨라지는 것 같고요.\n\n비슷한 경험 있으신 분들 어떻게 극복하셨어요?',
    57, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
  RETURNING board_id INTO b14;

  -- [자유]
  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d03, '자유',
    '취준 6개월 차, 지치지 않는 나만의 루틴 공유',
    E'취준 6개월 됐는데 처음 2달은 번아웃이 심했어요.\n\n지금은 이렇게 루틴 잡고 있어요:\n\n오전 9-11시: 자소서 작성 또는 이력서 수정 (CareerWave 코칭 병행)\n오후 1-3시: 기술 공부 (코딩테스트 또는 직무 지식)\n오후 3-4시: AI 면접 연습 1세션\n저녁 6-7시: 운동 (이게 제일 중요한 것 같아요)\n\n특히 AI 면접은 하루 1세션만 하는 게 오히려 효과적이더라고요. 너무 많이 하면 기계적으로 되는 느낌?\n\n취준하면서 멘탈 관리가 제일 어려운 것 같아요. 다들 파이팅!!',
    143, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days')
  RETURNING board_id INTO b15;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_u04, '자유',
    '드디어 첫 면접 통보받았어요! 떨리는 마음 공유',
    E'취준 4개월 만에 드디어 첫 서류 합격 연락 받았습니다!\n\n작은 스타트업이지만 제가 진짜 가고 싶었던 곳이에요.\n\n이번 주 면접 준비 빡세게 하려고요. CareerWave AI 면접 집중 공략해볼 생각이에요.\n\n응원해주세요 ㅠㅠ',
    92, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days')
  RETURNING board_id INTO b16;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d06, '자유',
    '취준하면서 알게 된 것들 — 반성하며 쓰는 회고',
    E'취준 1년 돌아보면서 후회되는 점들 정리해봤어요.\n\n1. 진작 AI 도구 썼으면 좋았을 텐데\n   → 처음 6개월은 혼자 이력서 쓰고 피드백 없이 넣었어요. 지인한테 피드백 부탁하기도 민망하고. CareerWave 알았으면 더 일찍 쓸 걸...\n\n2. 면접 연습을 너무 머릿속으로만 했어요\n   → 실제로 말로 뱉어보는 게 완전히 다르더라고요. AI 면접 하면서 처음으로 내 목소리 들었을 때 충격이었어요 ㅋㅋ\n\n3. 지원 직무를 너무 넓게 잡았어요\n   → 너무 다양하게 지원했더니 자소서 어디에도 힘이 없었어요\n\n이제라도 알았으니 다행이다 싶어요. 여러분은 저처럼 돌아가지 마세요!',
    127, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days')
  RETURNING board_id INTO b17;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d08, '자유',
    '공채 시즌 스터디원 구해요 (서울/온라인 모두 가능)',
    E'안녕하세요! 9월 공채 시즌 준비하면서 같이 으쌰으쌰할 스터디원 구하고 있어요.\n\n[모집 대상]\n- IT/개발 직군 준비 중이신 분\n- 주 3회 이상 참여 가능하신 분\n- 서울 강남/판교 또는 온라인 모두 가능\n\n[스터디 내용]\n- 기술 면접 Q&A 공유\n- CareerWave AI 면접 후 피드백 공유\n- 서류 크로스 피드백\n\n관심 있으시면 댓글 달아주세요!',
    76, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days')
  RETURNING board_id INTO b18;

  -- 추가 게시글 (볼륨 확보용)
  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d05, '합격 후기',
    '카카오뱅크 데이터 애널리스트 합격 — SQL 위주 기술 면접 후기',
    E'카카오뱅크 데이터 애널리스트 최종 합격했습니다!\n\n기술 면접은 SQL 실기 위주였고 CareerWave AI 면접에서 분석 방법론 관련 질문을 미리 연습해서 도움이 됐어요. 다들 합격하세요!',
    167, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days')
  RETURNING board_id INTO b19;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d07, '면접 후기',
    'LG CNS 신입 개발 직군 면접 질문 모음',
    E'LG CNS 신입 개발 직군 면접 질문 정리해요!\n\n- 자기소개 (1분)\n- 지원 동기\n- 프로젝트 중 가장 어려웠던 기술적 문제\n- 협업 경험\n- 희망 연봉\n\n개인적으론 AI 면접 연습 덕에 프로젝트 질문에 자신 있게 답변했어요.',
    89, NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days')
  RETURNING board_id INTO b20;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d02, '이력서 팁',
    '한 페이지 이력서 vs 두 페이지 이력서, 뭐가 좋아요?',
    E'신입이면 한 페이지가 정석이라고 하는데 경험이 많으면 2페이지도 괜찮다고 하더라고요.\n\nCareerWave에 넣어봤더니 한 페이지로 요약됐을 때 AI 점수가 더 높게 나왔어요. 간결함이 중요한가봐요!',
    54, NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days')
  RETURNING board_id INTO b21;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_u02, '질문',
    'CareerWave 구독 중인데 사용 횟수가 어떻게 차감되는지 궁금해요',
    E'AI 면접 구독 중인데요, 세션 시작하면 바로 차감되는 건가요? 아니면 완료해야 차감되는 건지 헷갈려요!\n\n중간에 나가면 차감이 안 되는지도 알고 싶어요.',
    42, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
  RETURNING board_id INTO b22;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d06, '자유',
    '면접 떨어지고 힘들 때 보는 글',
    E'저도 많이 떨어졌어요. 10군데 지원해서 3군데 서류, 2군데 1차, 1군데 최종까지 갔는데 결국 최종에서도 탈락했을 때 정말 힘들었어요.\n\n근데 그 경험들이 다 쌓여서 지금 합격을 만든 것 같아요.\n\n면접 후기 커뮤니티 글 읽고, AI 면접으로 틈새를 채우고, 그렇게 조금씩 나아갔던 것 같습니다. 힘내세요.',
    198, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days')
  RETURNING board_id INTO b23;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d03, '이력서 팁',
    '포트폴리오 없는 디자이너 이력서 어떻게 쓰나요',
    E'포트폴리오를 아직 제대로 못 만든 상태인데 이력서를 어떻게 써야 할지 고민이에요.\n\nCareerWave 코칭에서 "수행 프로젝트 섹션에 사용 툴, 기간, 기여 역할을 명시하세요"라고 해서 그걸 최대한 구체적으로 쓰는 중이에요.\n\n포트폴리오 만드는 것도 병행해야겠죠?',
    73, NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days')
  RETURNING board_id INTO b24;

  INSERT INTO boards (member_id, category, title, content, view_count, created_at, updated_at)
  VALUES (v_d01, '합격 후기',
    '당근마켓 iOS 개발자 인턴 합격! 준비 과정 공유',
    E'당근마켓 iOS 개발 인턴 합격했어요!\n\nSwift 코딩 테스트 → 기술 면접 → 컬처핏 순서였는데, CareerWave AI 면접에서 "프로젝트에서 가장 기억에 남는 기술적 챌린지" 연습을 집중적으로 했어요.\n\n면접관이 정말 편안하게 대화를 이끌어주셔서 연습한 것들을 자연스럽게 얘기할 수 있었어요. 모두 화이팅!!',
    145, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days')
  RETURNING board_id INTO b25;

  -- ════════════════════════════════════════════
  -- 댓글 (board별 자연스러운 반응)
  -- ════════════════════════════════════════════

  -- b1 (카카오 합격) 댓글
  INSERT INTO comments (board_id, member_id, content, created_at, updated_at) VALUES
    (b1, v_d02, '와 진짜 축하해요!! STAR 구조가 그렇게 효과적인가요? 저도 지금 연습 중인데 참고할게요', NOW() - INTERVAL '3 days' + INTERVAL '30 min', NOW() - INTERVAL '3 days' + INTERVAL '30 min'),
    (b1, v_d05, '카카오 합격 대박이에요!! AI 피드백 반영한 게 확실히 효과 있었군요. 저도 지금 열심히 중', NOW() - INTERVAL '3 days' + INTERVAL '2 hours', NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
    (b1, v_u01, '카카오 개발자 합격 축하해요! 저도 서류 분석 세 번 넣어봤는데 매번 다른 피드백이 나오더라고요ㅎㅎ', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    (b1, v_d08, '진짜 STAR 구조 답변이 그렇게 달라지나요? 저는 아직 어색한데... 얼마나 연습하셨어요?', NOW() - INTERVAL '2 days' + INTERVAL '3 hours', NOW() - INTERVAL '2 days' + INTERVAL '3 hours');

  -- b1에 대댓글
  INSERT INTO comments (board_id, member_id, parent_id, content, created_at, updated_at)
  SELECT b1, v_d01, c.comment_id,
    '처음엔 어색한 게 맞아요! 저도 10번 이상 연습하니까 자연스러워지더라고요. 연습량이 답인 것 같아요 ㅎㅎ',
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  FROM comments c WHERE c.board_id = b1 AND c.parent_id IS NULL ORDER BY c.created_at DESC LIMIT 1;

  -- b4 (삼성 면접 후기) 댓글
  INSERT INTO comments (board_id, member_id, content, created_at, updated_at) VALUES
    (b4, v_d01, '최신 이슈 질문 나온다는 게 의외네요! 저도 면접 준비할 때 뉴스 챙겨봐야겠어요. 좋은 정보 감사해요', NOW() - INTERVAL '2 days' + INTERVAL '1 hour', NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),
    (b4, v_d03, '갈등 해결 질문 AI로 연습한 게 나왔다니 신기하네요. 결과 나오면 꼭 공유해주세요!', NOW() - INTERVAL '1 day' + INTERVAL '5 hours', NOW() - INTERVAL '1 day' + INTERVAL '5 hours'),
    (b4, v_u02, '삼성 DS 지원자인데 너무 도움됐어요! 저도 이번 주 면접인데 잘 준비해볼게요', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

  -- b7 (이력서 팁) 댓글
  INSERT INTO comments (board_id, member_id, content, created_at, updated_at) VALUES
    (b7, v_d07, 'Before/After 비교가 진짜 명확하네요. 저도 제 이력서 이렇게 바꿔봐야겠어요! 감사합니다', NOW() - INTERVAL '5 days' + INTERVAL '2 hours', NOW() - INTERVAL '5 days' + INTERVAL '2 hours'),
    (b7, v_u03, '수치화가 이렇게 중요한 줄 몰랐어요. 대외활동만 있어서 수치 뽑기가 어렵긴 한데 최대한 노력해봐야겠네요', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
    (b7, v_d04, '진짜 좋은 글이에요! 저장해뒀습니다. 이걸 좀 더 일찍 봤으면 좋았을 텐데 ㅠㅠ', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    (b7, v_d08, '기여한 부분 명확히 하는 거, 팀 프로젝트면 어떻게 쓰면 좋을까요? 예시가 있으면 좋겠어요', NOW() - INTERVAL '2 days' + INTERVAL '4 hours', NOW() - INTERVAL '2 days' + INTERVAL '4 hours');

  -- b7에 대댓글
  INSERT INTO comments (board_id, member_id, parent_id, content, created_at, updated_at)
  SELECT b7, v_d04, c.comment_id,
    '"팀 4명 중 백엔드 API 설계 및 개발 담당 (기여도 40%)" 이런 식으로 쓰면 좋아요! CareerWave 피드백에서 이렇게 하라고 했거든요',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  FROM comments c WHERE c.board_id = b7 AND c.parent_id IS NULL ORDER BY c.created_at DESC LIMIT 1;

  -- b10 (AI 면접 횟수 질문) 댓글
  INSERT INTO comments (board_id, member_id, content, created_at, updated_at) VALUES
    (b10, v_d01, '저는 하루 2세션 정도가 최적이었어요! 피드백 받고 하루 자고 나면 다음 날 더 잘 반영이 되더라고요', NOW() - INTERVAL '1 day' + INTERVAL '1 hour', NOW() - INTERVAL '1 day' + INTERVAL '1 hour'),
    (b10, v_d05, '너무 많이 하면 오히려 기계적이 되는 것 같아요. 세션 후에 피드백 꼼꼼히 읽는 시간이 더 중요한 것 같아요', NOW() - INTERVAL '1 day' + INTERVAL '3 hours', NOW() - INTERVAL '1 day' + INTERVAL '3 hours'),
    (b10, v_d03, '저도 처음엔 하루 4-5번 했는데 지치더라고요. 지금은 1-2번 + 피드백 분석 방식으로 하고 있어요', NOW() - INTERVAL '20 hours', NOW() - INTERVAL '20 hours');

  -- b11 (이력서 점수) 댓글
  INSERT INTO comments (board_id, member_id, content, created_at, updated_at) VALUES
    (b11, v_d01, '58점이면 많이 낮은 건 아니에요! 저도 처음엔 55점이었는데 피드백 2번 반영하고 78점으로 올랐어요. 키워드랑 수치 집중 공략해보세요', NOW() - INTERVAL '3 days' + INTERVAL '2 hours', NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
    (b11, v_d06, '저는 처음 62점이었다가 수정 후 81점 됐어요. 생각보다 많이 오르더라고요! 피드백 항목별로 하나씩 체크해가면서 고치세요', NOW() - INTERVAL '2 days' + INTERVAL '5 hours', NOW() - INTERVAL '2 days' + INTERVAL '5 hours');

  -- b14 (말 속도) 댓글
  INSERT INTO comments (board_id, member_id, content, created_at, updated_at) VALUES
    (b14, v_d03, '저도 같은 피드백 계속 받았어요! 저는 답변 전에 2-3초 일부러 멈추는 연습을 했어요. 생각하는 척하면서 실제로 속도 조절하는 거요ㅎㅎ', NOW() - INTERVAL '5 days' + INTERVAL '1 hour', NOW() - INTERVAL '5 days' + INTERVAL '1 hour'),
    (b14, v_d05, '연습할 때 메트로놈 앱이나 타이머 보면서 말하는 것도 도움됐어요. 좀 인위적이지만 처음엔 효과 있어요', NOW() - INTERVAL '4 days' + INTERVAL '3 hours', NOW() - INTERVAL '4 days' + INTERVAL '3 hours'),
    (b14, v_d01, '피드백 반영해서 다음 세션 하면 점수 변화 보여요. 꾸준히 하다 보면 자연스럽게 교정돼요!', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days');

  -- b22 (구독 횟수 차감) 댓글
  INSERT INTO comments (board_id, member_id, content, created_at, updated_at) VALUES
    (b22, v_d01, '세션 완료 시에 차감되는 것 같아요. 중간에 나가면 차감 안 됐던 것 같더라고요. 정확한 건 고객센터 문의가 확실할 것 같아요!', NOW() - INTERVAL '2 days' + INTERVAL '1 hour', NOW() - INTERVAL '2 days' + INTERVAL '1 hour');

  -- ════════════════════════════════════════════
  -- 공지사항 8개 (기존 5개 + 추가 8개)
  -- ════════════════════════════════════════════
  INSERT INTO notices (admin_id, category, title, content, is_pinned, is_visible, view_count, created_at, updated_at) VALUES
    (v_master_id, 'NOTICE',
     '[공지] CareerWave 서비스 오픈 안내',
     E'안녕하세요, CareerWave팀입니다.\n\nAI 기반 취업 준비 서비스 CareerWave가 정식 오픈했습니다!\n\n✅ 서비스 주요 기능\n- AI 서류 코칭: 이력서 및 자기소개서 분석 및 맞춤형 피드백\n- AI 모의면접: 직무별 맞춤 면접 질문 및 실시간 AI 피드백\n- 채용 공고: 주요 기업 채용 정보 한눈에 확인\n\n앞으로도 더 나은 서비스로 찾아뵙겠습니다.\n감사합니다.',
     TRUE, TRUE, 1247, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),

    (v_master_id, 'UPDATE',
     '[업데이트] AI 면접 리포트 개선 (v1.4)',
     E'안녕하세요. CareerWave팀입니다.\n\nAI 모의면접 리포트 기능이 v1.4로 업데이트되었습니다.\n\n[주요 개선 사항]\n- 답변 구조 분석 리포트 신설 (STAR 충족 여부)\n- 말의 속도·발음 명확도 항목 추가\n- 질문 유형별 피드백 분류 개선\n- 리포트 PDF 저장 기능 추가\n\n더 정확한 피드백으로 면접 준비를 도와드리겠습니다. 감사합니다.',
     FALSE, TRUE, 892, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),

    (v_cs_id, 'EVENT',
     '[이벤트] 7월 얼리버드 구독 할인 30%',
     E'7월 한 달간 신규 구독 회원을 대상으로 첫 달 30% 할인 이벤트를 진행합니다!\n\n[이벤트 기간] 2026년 7월 1일 ~ 7월 31일\n[대상] 신규 구독 가입 회원\n[혜택] 첫 달 구독료 30% 할인\n\n- AI 모의면접: 29,000원 → 20,300원\n- 서류 AI 코칭: 29,000원 → 20,300원\n\n지금 바로 구독하고 AI 취업 준비를 시작해보세요!',
     FALSE, TRUE, 643, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

    (v_master_id, 'MAINTENANCE',
     '[점검] 7월 22일 새벽 정기 점검 예정',
     E'안녕하세요, CareerWave팀입니다.\n\n서비스 안정성 개선을 위한 정기 서버 점검을 진행합니다.\n\n[점검 일정]\n- 일시: 2026년 7월 22일 (화) 새벽 02:00 ~ 04:00\n- 시간: 약 2시간\n\n[영향 범위]\n- 점검 시간 중 전체 서비스 이용 불가\n- 진행 중인 AI 면접 세션 자동 저장 후 종료됩니다\n\n이용에 불편을 드려 죄송합니다.',
     TRUE, TRUE, 412, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

    (v_cs_id, 'NOTICE',
     '[공지] 커뮤니티 이용 규칙 안내',
     E'CareerWave 커뮤니티를 이용하시는 회원분들께 안내드립니다.\n\n[커뮤니티 운영 원칙]\n1. 취업 관련 정보 공유와 건전한 소통을 지향합니다.\n2. 욕설, 비방, 허위정보 게시는 금지됩니다.\n3. 상업적 광고, 홍보성 게시물은 삭제 조치됩니다.\n4. 타인의 개인정보 공개를 금지합니다.\n\n위반 시 경고 → 일시 정지 → 영구 정지 순서로 제재됩니다.\n쾌적한 커뮤니티를 위해 협조 부탁드립니다.',
     FALSE, TRUE, 378, NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),

    (v_master_id, 'UPDATE',
     '[업데이트] 자기소개서 키워드 분석 기능 추가',
     E'서류 AI 코칭 기능이 업데이트되었습니다.\n\n[신규 기능]\n- 직무 연관 키워드 밀도 분석\n- 경쟁사 대비 키워드 비교 리포트\n- 키워드 개선 추천 목록 제공\n\n[개선 기능]\n- 문장 명확도 분석 정확도 향상\n- 자소서 단락별 피드백 기능 개선\n\n더 정밀한 서류 피드백으로 합격을 도와드리겠습니다!',
     FALSE, TRUE, 567, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),

    (v_cs_id, 'EVENT',
     '[이벤트] 합격 후기 작성 이벤트 (~7/31)',
     E'커뮤니티에 합격 후기를 작성해주신 회원분께 특별 혜택을 드립니다!\n\n[이벤트 기간] 2026년 7월 1일 ~ 7월 31일\n[참여 방법] 커뮤니티 > 합격 후기 카테고리에 후기 작성\n[혜택] AI 서비스 이용권 1회 지급\n\n[주의사항]\n- 실제 취업 합격 후기만 해당됩니다\n- 허위 후기 적발 시 이용권 회수 및 계정 제재됩니다\n\n여러분의 소중한 합격 경험을 나눠주세요!',
     FALSE, TRUE, 489, NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),

    (v_master_id, 'NOTICE',
     '[공지] 개인정보처리방침 v2.1 개정 안내',
     E'2026년 8월 1일부터 개인정보처리방침이 v2.1로 개정됩니다.\n\n[주요 변경 사항]\n1. AI 서비스 이용 시 음성 데이터 처리 근거 명시\n2. 데이터 보유 기간 세분화 (회원 탈퇴 후 30일 이내 삭제)\n3. 수탁업체 현황 업데이트 (OpenAI 포함)\n\n변경된 약관은 8월 1일부터 자동 적용되며, 동의하지 않으실 경우 서비스 이용을 중단하시고 탈퇴 처리해 주시기 바랍니다.\n\n자세한 내용은 개인정보처리방침 전문을 확인해주세요.',
     TRUE, TRUE, 334, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

  -- ════════════════════════════════════════════
  -- FAQ 12개 (기존 5개 + 추가 12개)
  -- ════════════════════════════════════════════
  INSERT INTO faqs (admin_id, category, question, answer, created_at, updated_at) VALUES

    -- SERVICE
    (v_cs_id, 'SERVICE',
     '서류 AI 코칭과 AI 모의면접의 차이가 무엇인가요?',
     E'서류 AI 코칭은 이력서·자기소개서를 업로드하면 AI가 직무 적합도, 키워드 분석, 문장 완성도 등을 분석하고 개선 피드백을 제공하는 서비스입니다.\n\nAI 모의면접은 카메라·마이크를 활용한 실시간 면접 연습 서비스로, 직무별 예상 질문에 답변하면 AI가 내용·전달력·태도를 분석해 피드백 리포트를 제공합니다.\n\n두 서비스는 별도로 운영되며, 각각 구독 플랜을 통해 이용하실 수 있습니다.',
     NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),

    (v_cs_id, 'SERVICE',
     '구독 없이도 서비스를 이용할 수 있나요?',
     E'네, 무료 회원도 일부 기능을 체험하실 수 있습니다.\n\n[무료 체험]\n- 서류 AI 코칭: 1회 무료 제공\n- AI 모의면접: 1회 무료 제공\n\n무료 체험 이후에는 구독 플랜 가입이 필요합니다.\n\n[구독 플랜]\n- AI 모의면접: 월 29,000원 (월 20회)\n- 서류 AI 코칭: 월 29,000원 (월 30회)\n\n구독 중 사용 가능 횟수는 마이페이지에서 확인하실 수 있습니다.',
     NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),

    (v_master_id, 'SERVICE',
     '이력서 분석 결과는 얼마나 신뢰할 수 있나요?',
     E'CareerWave AI 서류 코칭은 GPT-4o 기반으로 수만 건의 채용 공고 및 합격 이력서 데이터를 학습해 분석합니다.\n\n직무 적합도, 키워드 밀도, 문장 구조 명확도 등 정량 지표를 기반으로 피드백을 제공하며, 실제 취업 준비에 활용하기에 적합한 수준의 분석을 제공합니다.\n\n단, AI 피드백은 보조 도구이며 채용 담당자의 최종 판단을 대체하지 않습니다. 피드백을 참고하되 자신의 경험과 강점을 살려 최종 서류를 완성하시길 권장합니다.',
     NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

    (v_cs_id, 'SERVICE',
     '자기소개서 코칭에서 어떤 피드백을 제공하나요?',
     E'자기소개서 코칭에서 제공하는 주요 피드백 항목은 다음과 같습니다.\n\n1. 직무 연관성 — 지원 직무와 자소서 내용의 연결고리 분석\n2. 키워드 분석 — 직무 핵심 키워드 포함 여부 및 밀도\n3. 경험 서술 완성도 — STAR 구조(상황-과제-행동-결과) 충족 여부\n4. 문장 명확도 — 중의적 표현, 과도한 수동태 등 수정 제안\n5. 직무 적합도 종합 점수 — 100점 만점 기준 종합 평가\n\n항목별 상세 피드백 리포트를 확인하고 수정 후 재분석받으실 수 있습니다.',
     NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),

    (v_master_id, 'SERVICE',
     'AI 면접에서 어떤 직무를 지원하나요?',
     E'현재 AI 모의면접에서 지원하는 직무 카테고리는 다음과 같습니다.\n\n[개발]\n- 백엔드 개발, 프론트엔드 개발, 풀스택, 모바일(iOS/Android), 데이터 엔지니어\n\n[기획/PM]\n- 서비스 기획, 프로덕트 매니저, 사업 기획\n\n[디자인]\n- UX/UI 디자이너, 그래픽 디자이너\n\n[데이터/AI]\n- 데이터 분석, ML 엔지니어\n\n[마케팅]\n- 퍼포먼스 마케팅, 콘텐츠 마케팅, 브랜드 마케팅\n\n직무별로 맞춤화된 질문과 평가 기준이 적용됩니다.',
     NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),

    (v_cs_id, 'SERVICE',
     '면접 연습 영상은 저장되나요?',
     E'AI 모의면접 세션 중 촬영된 영상은 AI 분석 처리 후 즉시 삭제됩니다. 분석 리포트만 보관되며, 영상 파일은 별도로 저장되지 않습니다.\n\n피드백 리포트는 마이페이지 > 면접 이력에서 확인하실 수 있으며, 구독 해지 후에도 일정 기간 보관됩니다.\n\n자세한 데이터 보관 정책은 개인정보처리방침을 참고해주세요.',
     NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days'),

    (v_master_id, 'SERVICE',
     '분석 결과를 PDF로 내보낼 수 있나요?',
     E'네, AI 서류 코칭 및 AI 모의면접 리포트 모두 PDF 저장이 가능합니다.\n\n[PDF 저장 방법]\n1. 마이페이지 > 분석 이력 또는 면접 이력에서 결과 보기 선택\n2. 리포트 화면 우측 상단 "PDF 저장" 버튼 클릭\n3. 자동으로 다운로드됩니다\n\n저장된 PDF는 지원 서류 제출 시 참고 자료로 활용하실 수 있습니다.',
     NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

    -- PAYMENT
    (v_cs_id, 'PAYMENT',
     '구독 플랜은 어떻게 되나요?',
     E'CareerWave는 현재 두 가지 구독 플랜을 운영하고 있습니다.\n\n[AI 모의면접 플랜] — 월 29,000원\n- 월 20회 AI 면접 세션\n- 직무별 맞춤 질문 제공\n- 상세 피드백 리포트\n\n[서류 AI 코칭 플랜] — 월 29,000원\n- 월 30회 서류 분석\n- 이력서·자기소개서 모두 적용\n- 점수 및 항목별 피드백\n\n각 플랜은 별도 구독이며, 마이페이지 > 구독 관리에서 신청하실 수 있습니다.',
     NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),

    (v_cs_id, 'PAYMENT',
     '결제 수단은 무엇을 지원하나요?',
     E'현재 지원하는 결제 수단은 다음과 같습니다.\n\n- 신용카드 / 체크카드 (국내 전 카드사)\n- 카카오페이\n- 네이버페이\n- 토스페이\n\n모든 결제는 토스페이먼츠를 통해 안전하게 처리됩니다.\n\n기업 카드, 법인 카드도 사용 가능하며, 현금영수증은 결제 완료 후 마이페이지에서 신청하실 수 있습니다.',
     NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days'),

    (v_cs_id, 'PAYMENT',
     '구독을 일시 정지할 수 있나요?',
     E'현재 구독 일시 정지 기능은 지원하지 않습니다.\n\n구독 해지 후 남은 기간에 대한 환불을 받으시거나, 이번 달 서비스 이용 후 다음 달 자동 갱신 전에 해지하시는 방법을 이용하실 수 있습니다.\n\n[자동 갱신 해지 방법]\n마이페이지 > 구독 관리 > 구독 해지 선택\n\n구독 해지 후에도 남은 기간 동안 서비스 이용이 가능합니다.',
     NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days'),

    -- ACCOUNT
    (v_cs_id, 'ACCOUNT',
     '동일 아이디로 중복 가입이 가능한가요?',
     E'동일한 아이디, 이메일, 휴대폰 번호로는 중복 가입이 불가합니다.\n\n이미 가입된 아이디가 있는지 확인하시고, 아이디를 잊으신 경우 로그인 화면의 "아이디 찾기"를 이용해 주세요.\n\n이전에 탈퇴 처리된 계정의 아이디 및 이메일은 재사용이 불가합니다.',
     NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),

    (v_cs_id, 'ACCOUNT',
     '아이디나 이메일을 변경할 수 있나요?',
     E'아이디는 가입 후 변경이 불가합니다.\n\n이메일 주소는 마이페이지 > 계정 정보에서 변경하실 수 있습니다.\n\n[이메일 변경 방법]\n1. 마이페이지 > 계정 정보 > 이메일 변경\n2. 새 이메일 주소 입력 후 인증번호 발송\n3. 인증번호 확인 후 변경 완료\n\n이메일 변경 시 기존 이메일로 알림이 발송되며, 인증 완료 후 즉시 반영됩니다.',
     NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days');

  -- ════════════════════════════════════════════
  -- 1:1 문의 (COMPLETED/IN_PROGRESS/PENDING 혼합)
  -- ════════════════════════════════════════════
  INSERT INTO inquiries (member_id, admin_id, category, title, content, reply, inquiry_status,
    ai_summary, ai_draft, created_at, updated_at, replied_at, completed_at)
  VALUES

  -- 완료된 문의 1
  (v_u01, v_cs_id, 'SERVICE',
   'AI 면접 세션 중 네트워크 끊기면 횟수 차감되나요?',
   E'안녕하세요. 어제 AI 면접 연습 중에 인터넷이 갑자기 끊겼는데요, 이 경우에도 사용 횟수가 차감되는지 궁금합니다. 이번 달 횟수가 얼마 남지 않아서요.',
   E'안녕하세요, CareerWave CS팀입니다.\n\n네트워크 오류로 세션이 비정상 종료된 경우, 서버 측에서 정상 완료 여부를 확인 후 횟수 미차감 처리됩니다.\n\n다만 세션이 어느 정도 진행된 후 종료된 경우에는 부분 완료로 처리될 수 있습니다. 해당 세션 ID를 알려주시면 이용 내역을 직접 확인해 드리겠습니다.\n\n불편을 드려 죄송합니다. 추가 문의가 있으시면 언제든지 연락해 주세요.',
   'COMPLETED', NULL, NULL,
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),

  -- 완료된 문의 2
  (v_d03, v_cs_id, 'PAYMENT',
   '구독 자동 갱신 끄는 방법 알고 싶어요',
   E'다음 달 구독 자동 갱신을 취소하고 싶은데 어떻게 하면 되나요? 마이페이지에서 찾아봤는데 잘 모르겠어서요.',
   E'안녕하세요, CareerWave CS팀입니다.\n\n구독 자동 갱신 해지 방법 안내드립니다.\n\n1. 마이페이지 접속\n2. 구독 관리 탭 클릭\n3. 현재 구독 상품 하단 "자동 갱신 해지" 버튼 클릭\n4. 해지 사유 선택 후 확인\n\n해지 처리 후에도 현재 구독 기간 만료일까지는 정상 이용 가능합니다.\n\n도움이 되셨기를 바랍니다. 추가 문의 사항이 있으시면 언제든지 연락해 주세요.',
   'COMPLETED', NULL, NULL,
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),

  -- 완료된 문의 3
  (v_d01, v_cs_id, 'ACCOUNT',
   '이메일 인증 메일이 오지 않아요',
   E'회원가입 중 이메일 인증을 해야 하는데 인증 메일이 한 시간이 지나도 오지 않습니다. 스팸함도 확인했는데 없어요.',
   E'안녕하세요, CareerWave CS팀입니다.\n\n이메일 인증에 불편을 드려 죄송합니다.\n\n다음 사항을 확인해 주시기 바랍니다.\n\n1. 입력하신 이메일 주소가 정확한지 재확인\n2. 스팸 메일함 확인 (자동 필터링되는 경우가 있습니다)\n3. career-wave.com 도메인을 발신자 허용 목록에 추가\n4. 인증 메일 재발송 버튼 클릭\n\n위 방법으로도 해결되지 않으시면 사용하시는 이메일 주소를 알려주시면 직접 확인해 드리겠습니다.',
   'COMPLETED', NULL, NULL,
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days' + INTERVAL '3 hours', NOW() - INTERVAL '20 days' + INTERVAL '3 hours', NOW() - INTERVAL '20 days' + INTERVAL '5 hours'),

  -- 처리 중인 문의
  (v_d05, v_cs_id, 'PAYMENT',
   '환불 신청 후 처리 기간이 얼마나 걸리나요?',
   E'어제 구독 해지 및 환불 신청을 했는데요, 처리 기간이 얼마나 걸리는지 알고 싶어요. 카드사에 언제쯤 반영되는지도 궁금합니다.',
   E'안녕하세요, CareerWave CS팀입니다.\n\n환불 신청 확인되었습니다.\n\n환불은 영업일 기준 3~5일 이내에 처리되며, 카드사별로 1~3 영업일의 추가 시간이 소요될 수 있습니다.\n\n현재 신청 건을 검토 중에 있으며, 처리 완료 시 등록된 이메일로 안내 드리겠습니다.',
   'IN_PROGRESS', NULL, NULL,
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 hours', NOW() - INTERVAL '20 hours', NULL),

  -- 처리 중인 문의 2
  (v_u02, v_cs_id, 'SERVICE',
   'AI 면접 질문이 너무 비슷하게 반복됩니다',
   E'AI 면접 연습을 여러 번 했는데 같은 직무로 계속 하다 보니 질문이 계속 비슷하게 나와요. 다양한 질문 풀을 추가해주시면 좋겠어요.',
   E'안녕하세요, CareerWave CS팀입니다.\n\n소중한 피드백 감사드립니다. 말씀하신 내용 확인하고 있으며, 직무별 질문 풀 다양화 관련 개선 계획 중에 있습니다.\n\n다음 업데이트 시 반영될 수 있도록 개발팀에 전달하겠습니다.',
   'IN_PROGRESS', NULL, NULL,
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NULL),

  -- 대기 중인 문의들
  (v_d07, NULL, 'ACCOUNT',
   '소셜 로그인으로 가입했는데 비밀번호를 모릅니다',
   E'카카오 소셜 로그인으로 가입했는데 일반 이메일 로그인도 하고 싶어요. 비밀번호를 설정하는 방법이 있나요?',
   NULL, 'PENDING', NULL, NULL,
   NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours', NULL, NULL),

  (v_d08, NULL, 'PAYMENT',
   '구독 결제가 중복으로 됐어요',
   E'어제 구독 결제를 했는데 카드 내역을 보니 같은 금액이 두 번 결제된 것 같습니다. 한 건은 취소 처리 부탁드립니다. 카드사: KB국민카드, 결제일: 7월 19일',
   NULL, 'PENDING', NULL, NULL,
   NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours', NULL, NULL),

  (v_u03, NULL, 'SERVICE',
   '이력서 분석 중 오류가 발생했습니다',
   E'이력서 PDF 파일을 업로드하고 분석을 기다리는데 "분석 중" 상태에서 1시간 넘게 진행이 안 됩니다. 사용 횟수는 차감된 것 같은데 결과가 안 나와요.',
   NULL, 'PENDING', NULL, NULL,
   NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours', NULL, NULL);

END $$;

-- 결과 확인
SELECT category, COUNT(*) as cnt FROM boards GROUP BY category ORDER BY category;
SELECT COUNT(*) as total_comments FROM comments;
SELECT category, COUNT(*) as cnt FROM notices GROUP BY category ORDER BY category;
SELECT category, COUNT(*) as cnt FROM faqs GROUP BY category ORDER BY category;
SELECT inquiry_status, COUNT(*) as cnt FROM inquiries GROUP BY inquiry_status ORDER BY inquiry_status;
