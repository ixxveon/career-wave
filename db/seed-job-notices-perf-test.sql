-- ============================================================
-- 성능 테스트용 채용 공고 가짜 데이터 시드 (5,000건)
-- 로컬 전용 — commit/push 금지
-- 실행 방법: psql -U careerwave -d careerwave -f seed-job-notices-perf-test.sql
-- ============================================================

-- 기존 성능 테스트용 데이터 초기화 (재실행 안전)
DELETE FROM bookmarks
WHERE job_notice_id IN (
    SELECT job_notice_id FROM job_notices
    WHERE source IN ('saramin', 'jobkorea', 'wanted', 'linkedin', 'rocketpunch')
      AND original_url LIKE 'https://perf-test%'
);

DELETE FROM job_notices
WHERE original_url LIKE 'https://perf-test%';

-- ============================================================
-- 5,000건 채용 공고 데이터 삽입
-- ============================================================
INSERT INTO job_notices (
    company_name,
    title,
    description,
    skill_tags,
    job_type,
    company_size,
    job_category,
    career_level,
    location,
    salary,
    notice_status,
    original_url,
    source,
    view_count,
    deadline,
    created_at,
    updated_at
)
SELECT
    -- company_name
    (ARRAY[
        '삼성전자', '카카오', '네이버', '라인플러스', '쿠팡',
        '배달의민족', '토스', '당근마켓', '크래프톤', 'NC소프트',
        '넥슨', '스마일게이트', '올리브영', '현대자동차', 'LG전자',
        'SK텔레콤', 'KT', 'CJ제일제당', '롯데ON', '무신사',
        '야놀자', '마켓컬리', '직방', '센드버드', '리디',
        '하이퍼커넥트', '뱅크샐러드', '핀다', '오늘의집', '에이블리'
    ])[floor(random() * 30)::int + 1],

    -- title
    (ARRAY[
        '백엔드 개발자', '프론트엔드 개발자', '풀스택 개발자',
        'DevOps 엔지니어', '데이터 엔지니어', 'ML 엔지니어',
        'iOS 개발자', 'Android 개발자', 'QA 엔지니어', 'DBA',
        '보안 엔지니어', 'SRE', 'Spring 백엔드 개발자',
        'React 프론트엔드 개발자', 'Java 개발자', 'Python 개발자',
        'Node.js 개발자', 'Kotlin 개발자', 'Swift 개발자', '클라우드 아키텍트'
    ])[floor(random() * 20)::int + 1]
    || ' ('
    || (ARRAY['신입', '경력', '신입/경력'])[floor(random() * 3)::int + 1]
    || ')',

    -- description (긴 텍스트로 LIKE 검색 부하 재현)
    '저희 '
    || (ARRAY['개발팀', '플랫폼팀', '서비스팀', '인프라팀', '데이터팀'])[floor(random() * 5)::int + 1]
    || '에서 함께할 '
    || (ARRAY['백엔드', '프론트엔드', '풀스택', 'DevOps', '데이터'])[floor(random() * 5)::int + 1]
    || ' 개발자를 모집합니다. '
    || '주요 업무: '
    || (ARRAY[
        'REST API 설계 및 개발, 서비스 성능 최적화, 코드 리뷰 참여',
        '대용량 트래픽 처리를 위한 아키텍처 설계 및 개선',
        '클라우드 인프라 구축 및 운영, CI/CD 파이프라인 관리',
        '데이터 수집·가공·분석 파이프라인 설계 및 개발',
        '모바일 앱 신규 기능 개발 및 유지보수, 성능 최적화'
    ])[floor(random() * 5)::int + 1]
    || '. 자격 요건: '
    || (ARRAY[
        'Java/Spring Boot 2년 이상 실무 경험, JPA 이해 및 활용 가능자',
        'Python 기반 웹 프레임워크 경험, SQL 최적화 능력 보유자',
        'React/TypeScript 실무 경험, 반응형 UI 구현 경험자',
        'AWS/GCP 운영 경험, Docker/Kubernetes 실무 활용 가능자',
        'SQL 및 NoSQL 경험, 데이터 파이프라인 설계 경험자'
    ])[floor(random() * 5)::int + 1]
    || '. 우대 사항: '
    || (ARRAY[
        '오픈소스 기여 경험, 대규모 서비스 운영 경험',
        'MSA 경험, Redis/Kafka 활용 경험',
        '테스트 코드 작성 습관, 코드 리뷰 경험',
        'Elasticsearch 경험, 검색 서비스 개발 경험',
        '스타트업 경험, 빠른 환경에서의 개발 경험'
    ])[floor(random() * 5)::int + 1],

    -- skill_tags
    CASE floor(random() * 8)::int
        WHEN 0 THEN ARRAY['Java', 'Spring Boot', 'JPA', 'MySQL', 'Redis']
        WHEN 1 THEN ARRAY['Python', 'Django', 'PostgreSQL', 'Redis', 'Celery']
        WHEN 2 THEN ARRAY['React', 'TypeScript', 'Next.js', 'GraphQL', 'Tailwind']
        WHEN 3 THEN ARRAY['Kotlin', 'Spring', 'Docker', 'Kubernetes', 'AWS']
        WHEN 4 THEN ARRAY['Node.js', 'Express', 'MongoDB', 'Vue.js', 'Jest']
        WHEN 5 THEN ARRAY['Swift', 'iOS', 'Xcode', 'RxSwift', 'UIKit']
        WHEN 6 THEN ARRAY['Kotlin', 'Android', 'Jetpack Compose', 'Retrofit', 'Coroutines']
        ELSE        ARRAY['Python', 'Spark', 'Airflow', 'Kafka', 'Hadoop']
    END,

    -- job_type
    (ARRAY['FULLTIME', 'FULLTIME', 'FULLTIME', 'INTERN', 'CONTRACT'])[floor(random() * 5)::int + 1],

    -- company_size
    (ARRAY['STARTUP', 'SME', 'LARGE'])[floor(random() * 3)::int + 1],

    -- job_category
    CASE floor(random() * 8)::int
        WHEN 0 THEN ARRAY['백엔드']
        WHEN 1 THEN ARRAY['프론트엔드']
        WHEN 2 THEN ARRAY['풀스택']
        WHEN 3 THEN ARRAY['DevOps', '인프라']
        WHEN 4 THEN ARRAY['데이터엔지니어']
        WHEN 5 THEN ARRAY['모바일']
        WHEN 6 THEN ARRAY['iOS']
        ELSE        ARRAY['Android']
    END,

    -- career_level
    (ARRAY['JUNIOR', 'SENIOR', 'ANY'])[floor(random() * 3)::int + 1],

    -- location
    (ARRAY[
        '서울 강남구', '서울 마포구', '서울 영등포구', '서울 송파구', '서울 중구',
        '서울 서초구', '경기 성남시', '경기 수원시', '경기 판교', '부산 해운대구',
        '대전 유성구', '인천 연수구', '광주 광산구', '대구 수성구', '제주시'
    ])[floor(random() * 15)::int + 1],

    -- salary
    (ARRAY[
        '3,000~4,000만원', '4,000~5,000만원', '5,000~7,000만원',
        '7,000만원 이상', '협의 가능', '회사 내규에 따름'
    ])[floor(random() * 6)::int + 1],

    -- notice_status (85% ACTIVE, 15% CLOSED)
    CASE WHEN random() < 0.85 THEN 'ACTIVE' ELSE 'CLOSED' END,

    -- original_url (성능 테스트용 식별 prefix)
    'https://perf-test.careerwave.kr/job/' || gs.n,

    -- source
    (ARRAY['saramin', 'jobkorea', 'wanted', 'linkedin', 'rocketpunch'])[floor(random() * 5)::int + 1],

    -- view_count
    floor(random() * 5000)::int,

    -- deadline (오늘 기준 -10일 ~ +90일 사이)
    CURRENT_DATE + (floor(random() * 100)::int - 10),

    -- created_at (최근 90일 이내 랜덤)
    NOW() - (floor(random() * 90)::int || ' days')::interval
           - (floor(random() * 24)::int || ' hours')::interval,

    -- updated_at
    NOW() - (floor(random() * 30)::int || ' days')::interval

FROM generate_series(1, 100000) AS gs(n);

-- 결과 확인
SELECT
    notice_status,
    COUNT(*) AS 건수
FROM job_notices
WHERE original_url LIKE 'https://perf-test%'
GROUP BY notice_status;

SELECT COUNT(*) AS 전체_perf_test_데이터수
FROM job_notices
WHERE original_url LIKE 'https://perf-test%';
