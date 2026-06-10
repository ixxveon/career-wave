-- ============================================================
-- Career Wave 로컬 개발용 테스트 데이터 시드
-- 실행 방법: psql -U careerwave -d careerwave -f seed-local.sql
-- 비밀번호: 모든 계정 공통 Test1234! (관리자만 1234)
-- ============================================================

-- 기존 테스트 데이터 초기화 (재실행 안전)
DELETE FROM members WHERE login_id IN ('testuser01','testuser02','testuser03','testuser04','testcompany01');
DELETE FROM admins  WHERE login_id = 'admin';

-- ────────────────────────────────────────────
-- 일반 회원 (ROLE_USER / 비밀번호: Test1234!)
-- ────────────────────────────────────────────
INSERT INTO members (member_id, login_id, email, password, name, role_type, member_status, subscription_status, warning_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'testuser01', 'testuser01@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트유저(구독없음)', 'ROLE_USER', 'ACTIVE', 'FREE',    0, NOW(), NOW()),

  (gen_random_uuid(), 'testuser02', 'testuser02@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트유저(면접구독)', 'ROLE_USER', 'ACTIVE', 'PREMIUM', 0, NOW(), NOW()),

  (gen_random_uuid(), 'testuser03', 'testuser03@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트유저(서류구독)', 'ROLE_USER', 'ACTIVE', 'FREE',    0, NOW(), NOW()),

  (gen_random_uuid(), 'testuser04', 'testuser04@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트유저(전체구독)', 'ROLE_USER', 'ACTIVE', 'PREMIUM', 0, NOW(), NOW());

-- ────────────────────────────────────────────
-- 기업 회원 (ROLE_COMPANY / 비밀번호: Test1234!)
-- ────────────────────────────────────────────
INSERT INTO members (member_id, login_id, email, password, name, role_type, member_status, subscription_status, warning_count, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'testcompany01', 'testcompany01@test.com',
   '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
   '테스트기업담당자', 'ROLE_COMPANY', 'ACTIVE', 'FREE', 0, NOW(), NOW());

-- ────────────────────────────────────────────
-- 관리자 (loginId=admin / 비밀번호: 1234)
-- ────────────────────────────────────────────
INSERT INTO admins (login_id, password_hash, name, admin_role, status, created_at, updated_at)
VALUES
  ('admin',
   '$2b$10$NPp0Acje.rj.VrDuRiPT2u.dXnCKzYGmxZn7Ro2BOw4qGDZIPr34W',
   '슈퍼관리자', 'MASTER', 'ACTIVE', NOW(), NOW());

-- 결과 확인
SELECT login_id, name, role_type, member_status, subscription_status FROM members ORDER BY login_id;
SELECT login_id, name, admin_role, status FROM admins;
