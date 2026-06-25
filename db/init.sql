-- ================================================
-- CareerWave 전체 DDL v4
-- ================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ================================================
-- 1. members
-- ================================================
CREATE TABLE members (
    member_id           UUID         NOT NULL DEFAULT gen_random_uuid(),
    login_id            VARCHAR(100) NOT NULL,
    email               VARCHAR(100) NULL,
    password            VARCHAR(255) NOT NULL,
    name                VARCHAR(50)  NOT NULL,
    phone               VARCHAR(20)  NULL,
    role_type           VARCHAR(20)  NOT NULL,
    member_status       VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    subscription_status VARCHAR(10)  NOT NULL DEFAULT 'FREE',
    suspend_end_date    DATE         NULL,
    warning_count       INTEGER      NOT NULL DEFAULT 0,
    locked_until        TIMESTAMPTZ  NULL,
    last_login_at       TIMESTAMPTZ  NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_members              PRIMARY KEY (member_id),
    CONSTRAINT uq_members_login_id     UNIQUE (login_id),
    CONSTRAINT uq_members_email        UNIQUE (email),
    CONSTRAINT uq_members_phone        UNIQUE (phone),
    CONSTRAINT chk_members_role        CHECK (role_type           IN ('USER', 'COMPANY')),
    CONSTRAINT chk_members_status      CHECK (member_status       IN ('ACTIVE', 'SUSPENDED', 'BANNED', 'LOCKED', 'WITHDRAWN', 'BLACKLISTED')),
    CONSTRAINT chk_subscription_status CHECK (subscription_status IN ('FREE', 'PREMIUM'))
);
COMMENT ON TABLE  members                     IS '회원 마스터 테이블';
COMMENT ON COLUMN members.member_id           IS '회원 고유 식별자';
COMMENT ON COLUMN members.login_id            IS '로그인 계정 (UNIQUE)';
COMMENT ON COLUMN members.email               IS '이메일 주소 (UNIQUE, NULL 허용)';
COMMENT ON COLUMN members.password            IS '암호화된 비밀번호';
COMMENT ON COLUMN members.name                IS '회원 이름';
COMMENT ON COLUMN members.phone               IS '휴대폰 번호 (UNIQUE, NULL 허용)';
COMMENT ON COLUMN members.role_type           IS '회원 유형 (USER / COMPANY)';
COMMENT ON COLUMN members.member_status       IS '계정 상태 (ACTIVE / SUSPENDED / BANNED / LOCKED / WITHDRAWN / BLACKLISTED)';
COMMENT ON COLUMN members.subscription_status IS '구독 상태 (FREE / PREMIUM)';
COMMENT ON COLUMN members.suspend_end_date    IS '정지 종료일 (NULL = 영구정지)';
COMMENT ON COLUMN members.warning_count       IS '경고 누적 횟수';
COMMENT ON COLUMN members.locked_until        IS '계정 잠금 해제 시간 (LOCKED 상태일 때만 사용)';
COMMENT ON COLUMN members.last_login_at       IS '마지막 로그인 일시';
COMMENT ON COLUMN members.created_at          IS '가입 일시';
COMMENT ON COLUMN members.updated_at          IS '최종 수정 일시';

-- ================================================
-- 2. personal_profiles
-- ================================================
CREATE TABLE personal_profiles (
    personal_profile_id BIGSERIAL    NOT NULL,
    member_id           UUID         NOT NULL,
    target_job          VARCHAR(100) NULL,
    github_url          VARCHAR(300) NULL,
    profile_image_url   VARCHAR(500) NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_personal_profiles  PRIMARY KEY (personal_profile_id),
    CONSTRAINT uq_personal_member_id UNIQUE (member_id),
    CONSTRAINT fk_personal_member    FOREIGN KEY (member_id) REFERENCES members (member_id)
);
COMMENT ON TABLE  personal_profiles                      IS '개인 회원 프로필 (USER)';
COMMENT ON COLUMN personal_profiles.personal_profile_id IS '개인 프로필 고유 식별자';
COMMENT ON COLUMN personal_profiles.member_id           IS '회원 FK';
COMMENT ON COLUMN personal_profiles.target_job          IS '목표 직무';
COMMENT ON COLUMN personal_profiles.github_url          IS 'GitHub 프로필 URL';
COMMENT ON COLUMN personal_profiles.profile_image_url   IS '프로필 이미지 URL (S3)';
COMMENT ON COLUMN personal_profiles.created_at          IS '생성 일시';
COMMENT ON COLUMN personal_profiles.updated_at          IS '최종 수정 일시';

-- ================================================
-- 3. company_profiles
-- ================================================
CREATE TABLE company_profiles (
    company_profile_id UUID         NOT NULL DEFAULT gen_random_uuid(),
    member_id          UUID         NOT NULL,
    company_type       VARCHAR(50)  NOT NULL,
    company_name       VARCHAR(100) NOT NULL,
    business_number    VARCHAR(20)  NOT NULL,
    ceo_name           VARCHAR(50)  NOT NULL,
    address            VARCHAR(200) NOT NULL,
    postal_code        VARCHAR(10)  NOT NULL,
    road_address       VARCHAR(200) NOT NULL,
    jibun_address      VARCHAR(200) NULL,
    address_detail     VARCHAR(200) NULL,
    is_agency          BOOLEAN      NOT NULL DEFAULT FALSE,
    certificate_number VARCHAR(50)  NOT NULL,
    cert_file_url      VARCHAR(500) NOT NULL,
    cert_file_name     VARCHAR(200) NOT NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_company_profiles  PRIMARY KEY (company_profile_id),
    CONSTRAINT uq_company_member_id UNIQUE (member_id),
    CONSTRAINT uq_business_number   UNIQUE (business_number),
    CONSTRAINT fk_company_member    FOREIGN KEY (member_id) REFERENCES members (member_id)
);
COMMENT ON TABLE  company_profiles                     IS '기업 회원 프로필 (COMPANY)';
COMMENT ON COLUMN company_profiles.company_profile_id IS '기업 프로필 고유 식별자';
COMMENT ON COLUMN company_profiles.member_id          IS '회원 FK';
COMMENT ON COLUMN company_profiles.company_type       IS '기업 규모 (대기업 / 중소기업 등)';
COMMENT ON COLUMN company_profiles.company_name       IS '회사명';
COMMENT ON COLUMN company_profiles.business_number    IS '사업자등록번호 (UNIQUE)';
COMMENT ON COLUMN company_profiles.ceo_name           IS '대표자명';
COMMENT ON COLUMN company_profiles.address            IS '회사 주소';
COMMENT ON COLUMN company_profiles.postal_code        IS '우편번호';
COMMENT ON COLUMN company_profiles.road_address       IS '도로명주소';
COMMENT ON COLUMN company_profiles.jibun_address      IS '지번주소';
COMMENT ON COLUMN company_profiles.address_detail     IS '상세 주소';
COMMENT ON COLUMN company_profiles.is_agency          IS '파견/도급/채용대행 여부 (기본값 FALSE)';
COMMENT ON COLUMN company_profiles.certificate_number IS '사업자등록증명원 발급번호';
COMMENT ON COLUMN company_profiles.cert_file_url      IS '재직증명서 파일 URL (S3)';
COMMENT ON COLUMN company_profiles.cert_file_name     IS '재직증명서 원본 파일명';
COMMENT ON COLUMN company_profiles.created_at         IS '생성 일시';
COMMENT ON COLUMN company_profiles.updated_at         IS '최종 수정 일시';

-- ================================================
-- 4. hr_managers
-- ================================================
CREATE TABLE hr_managers (
    hr_manager_id      BIGSERIAL   NOT NULL,
    member_id          UUID        NOT NULL,
    company_profile_id UUID        NOT NULL,
    permission_level   VARCHAR(10) NOT NULL DEFAULT 'FULL',
    hr_status          VARCHAR(20) NOT NULL DEFAULT 'PENDING_REVIEW',
    reject_reason      TEXT        NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at        TIMESTAMPTZ NULL,

    CONSTRAINT pk_hr_managers       PRIMARY KEY (hr_manager_id),
    CONSTRAINT uq_hr_member_id      UNIQUE (member_id),
    CONSTRAINT fk_hr_member         FOREIGN KEY (member_id)          REFERENCES members (member_id),
    CONSTRAINT fk_hr_company        FOREIGN KEY (company_profile_id) REFERENCES company_profiles (company_profile_id),
    CONSTRAINT chk_permission_level CHECK (permission_level IN ('FULL', 'NOTICE', 'VIEWER')),
    CONSTRAINT chk_hr_status        CHECK (hr_status        IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION', 'REMOVED'))
);
COMMENT ON TABLE  hr_managers                    IS '기업 HR 담당자 테이블';
COMMENT ON COLUMN hr_managers.hr_manager_id      IS 'HR 담당자 고유 식별자';
COMMENT ON COLUMN hr_managers.member_id          IS '회원 FK';
COMMENT ON COLUMN hr_managers.company_profile_id IS '소속 기업 FK';
COMMENT ON COLUMN hr_managers.permission_level   IS '권한 (FULL / NOTICE / VIEWER)';
COMMENT ON COLUMN hr_managers.hr_status          IS '상태 (PENDING_REVIEW / APPROVED / REJECTED / NEEDS_REVISION / REMOVED)';
COMMENT ON COLUMN hr_managers.reject_reason      IS '반려 또는 보완 요청 사유';
COMMENT ON COLUMN hr_managers.created_at         IS '가입 신청 일시';
COMMENT ON COLUMN hr_managers.approved_at        IS '관리자 승인 일시';

-- ================================================
-- 5. member_verifications
-- ================================================
CREATE TABLE member_verifications (
    verification_id     UUID        NOT NULL DEFAULT gen_random_uuid(),
    channel             VARCHAR(10) NOT NULL,
    target              VARCHAR(100) NOT NULL,
    purpose             VARCHAR(30) NOT NULL,
    code_hash           VARCHAR(255) NOT NULL,
    verification_token  VARCHAR(255) NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'SENT',
    remaining_attempts  INTEGER     NOT NULL DEFAULT 5,
    expires_at          TIMESTAMPTZ NOT NULL,
    resend_available_at TIMESTAMPTZ NOT NULL,
    verified_at         TIMESTAMPTZ NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_member_verifications         PRIMARY KEY (verification_id),
    CONSTRAINT uq_member_verification_token    UNIQUE      (verification_token),
    CONSTRAINT chk_verification_channel        CHECK (channel             IN ('EMAIL', 'PHONE')),
    CONSTRAINT chk_verification_purpose        CHECK (purpose             IN ('REGISTER', 'FIND_ID', 'RESET_PASSWORD')),
    CONSTRAINT chk_verification_status         CHECK (verification_status IN ('SENT', 'VERIFIED', 'EXPIRED', 'FAILED', 'RATE_LIMITED'))
);
COMMENT ON TABLE  member_verifications                      IS '이메일/휴대폰 인증 테이블 (회원 FK 없음 - 가입 전 인증)';
COMMENT ON COLUMN member_verifications.verification_id     IS '인증 요청 고유 식별자';
COMMENT ON COLUMN member_verifications.channel             IS '인증 채널 (EMAIL / PHONE)';
COMMENT ON COLUMN member_verifications.target              IS '인증 대상 (이메일 주소 또는 휴대폰 번호)';
COMMENT ON COLUMN member_verifications.purpose             IS '인증 목적 (REGISTER / FIND_ID / RESET_PASSWORD)';
COMMENT ON COLUMN member_verifications.code_hash           IS '인증번호 해시값';
COMMENT ON COLUMN member_verifications.verification_token  IS '인증 완료 후 발급되는 단기 토큰';
COMMENT ON COLUMN member_verifications.verification_status IS '인증 상태 (SENT / VERIFIED / EXPIRED / FAILED / RATE_LIMITED)';
COMMENT ON COLUMN member_verifications.remaining_attempts  IS '남은 인증 시도 횟수 (기본값 5)';
COMMENT ON COLUMN member_verifications.expires_at          IS '인증번호 만료 시간';
COMMENT ON COLUMN member_verifications.resend_available_at IS '재발송 가능 시간';
COMMENT ON COLUMN member_verifications.verified_at         IS '인증 완료 시간';
COMMENT ON COLUMN member_verifications.created_at          IS '생성 일시';

-- ================================================
-- 6. password_reset_tokens
-- ================================================
CREATE TABLE password_reset_tokens (
    reset_token_id UUID        NOT NULL DEFAULT gen_random_uuid(),
    member_id      UUID        NOT NULL,
    token_hash     VARCHAR(255) NOT NULL,
    expires_at     TIMESTAMPTZ NOT NULL,
    used_at        TIMESTAMPTZ NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_password_reset_tokens        PRIMARY KEY (reset_token_id),
    CONSTRAINT uq_password_reset_token_hash    UNIQUE      (token_hash),
    CONSTRAINT fk_reset_token_member           FOREIGN KEY (member_id) REFERENCES members (member_id)
);
COMMENT ON TABLE  password_reset_tokens                IS '비밀번호 재설정 토큰 테이블';
COMMENT ON COLUMN password_reset_tokens.reset_token_id IS '비밀번호 재설정 토큰 고유 식별자';
COMMENT ON COLUMN password_reset_tokens.member_id      IS '회원 FK';
COMMENT ON COLUMN password_reset_tokens.token_hash     IS '재설정 토큰 해시값';
COMMENT ON COLUMN password_reset_tokens.expires_at     IS '토큰 만료 시간';
COMMENT ON COLUMN password_reset_tokens.used_at        IS '토큰 사용 완료 시간 (1회 사용 후 기록)';
COMMENT ON COLUMN password_reset_tokens.created_at     IS '생성 일시';

-- ================================================
-- 7. member_terms_agreements
-- ================================================
CREATE TABLE member_terms_agreements (
    agreement_id                 BIGSERIAL   NOT NULL,
    member_id                    UUID        NOT NULL,
    service_agreed               BOOLEAN     NOT NULL,
    privacy_agreed               BOOLEAN     NOT NULL,
    marketing_agreed             BOOLEAN     NOT NULL DEFAULT FALSE,
    company_verification_agreed  BOOLEAN     NULL,
    sms_agreed                   BOOLEAN     NULL,
    agreed_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_member_terms_agreements PRIMARY KEY (agreement_id),
    CONSTRAINT fk_terms_member            FOREIGN KEY (member_id) REFERENCES members (member_id)
);
COMMENT ON TABLE  member_terms_agreements                              IS '회원가입 약관 동의 테이블';
COMMENT ON COLUMN member_terms_agreements.agreement_id                IS '약관 동의 고유 식별자';
COMMENT ON COLUMN member_terms_agreements.member_id                   IS '회원 FK';
COMMENT ON COLUMN member_terms_agreements.service_agreed              IS '서비스 이용약관 동의 여부';
COMMENT ON COLUMN member_terms_agreements.privacy_agreed              IS '개인정보 처리방침 동의 여부';
COMMENT ON COLUMN member_terms_agreements.marketing_agreed            IS '마케팅 수신 동의 여부 (기본값 FALSE)';
COMMENT ON COLUMN member_terms_agreements.company_verification_agreed IS '기업 인증 약관 동의 여부 (기업 회원 필수, 개인 회원 NULL)';
COMMENT ON COLUMN member_terms_agreements.sms_agreed                  IS 'SMS 수신 동의 여부 (기업 회원 필수, 개인 회원 NULL)';
COMMENT ON COLUMN member_terms_agreements.agreed_at                   IS '약관 동의 일시';

-- ================================================
-- 8. social_accounts
-- ================================================
CREATE TABLE social_accounts (
    social_account_id UUID         NOT NULL DEFAULT gen_random_uuid(),
    member_id         UUID         NOT NULL,
    provider          VARCHAR(20)  NOT NULL,
    provider_user_id  VARCHAR(255) NOT NULL,
    provider_email    VARCHAR(255) NULL,
    linked_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_social_accounts            PRIMARY KEY (social_account_id),
    CONSTRAINT fk_social_accounts_member     FOREIGN KEY (member_id) REFERENCES members (member_id) ON DELETE CASCADE,
    CONSTRAINT uq_social_provider_user       UNIQUE (provider, provider_user_id),
    CONSTRAINT uq_social_member_provider     UNIQUE (member_id, provider),
    CONSTRAINT chk_social_provider           CHECK (provider IN ('KAKAO', 'NAVER', 'GOOGLE'))
);
COMMENT ON TABLE  social_accounts                    IS '소셜 provider 계정 연결 테이블';
COMMENT ON COLUMN social_accounts.social_account_id  IS '소셜 계정 연결 고유 식별자';
COMMENT ON COLUMN social_accounts.member_id          IS '회원 FK';
COMMENT ON COLUMN social_accounts.provider           IS '소셜 provider (KAKAO / NAVER / GOOGLE)';
COMMENT ON COLUMN social_accounts.provider_user_id   IS 'provider가 제공하는 고유 사용자 ID';
COMMENT ON COLUMN social_accounts.provider_email     IS 'provider에서 받은 이메일 (NULL 허용)';
COMMENT ON COLUMN social_accounts.linked_at          IS '소셜 계정 연결 일시';
COMMENT ON COLUMN social_accounts.created_at         IS '생성 일시';
COMMENT ON COLUMN social_accounts.updated_at         IS '최종 수정 일시';
CREATE INDEX idx_social_accounts_member_id ON social_accounts(member_id);

-- ================================================
-- 9. documents
-- ================================================
CREATE TABLE documents (
    document_id   UUID         NOT NULL DEFAULT gen_random_uuid(),
    member_id     UUID         NOT NULL,
    file_type     VARCHAR(20)  NOT NULL,
    file_url      VARCHAR(500) NULL,
    original_name VARCHAR(200) NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'UPLOADED',
    error_message TEXT         NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_documents        PRIMARY KEY (document_id),
    CONSTRAINT fk_documents_member FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT chk_file_type       CHECK (file_type IN ('RESUME', 'COVER_LETTER')),
    CONSTRAINT chk_doc_status      CHECK (status    IN ('UPLOADED', 'PENDING', 'ANALYZING', 'COMPLETED', 'FAILED'))
);
COMMENT ON TABLE  documents               IS '회원 업로드 서류 (이력서 및 자기소개서)';
COMMENT ON COLUMN documents.document_id   IS '문서 고유 식별자';
COMMENT ON COLUMN documents.member_id     IS '회원 FK';
COMMENT ON COLUMN documents.file_type     IS '문서 유형 (RESUME / COVER_LETTER)';
COMMENT ON COLUMN documents.file_url      IS 'S3 저장 파일 URL';
COMMENT ON COLUMN documents.original_name IS '업로드 원본 파일명';
COMMENT ON COLUMN documents.status        IS '처리 상태 (UPLOADED / PENDING / ANALYZING / COMPLETED / FAILED)';
COMMENT ON COLUMN documents.error_message IS '분석 실패 시 에러 사유 기록';
COMMENT ON COLUMN documents.created_at    IS '업로드 일시';

-- ================================================
-- 10. document_feedbacks
-- ================================================
CREATE TABLE document_feedbacks (
    document_feedback_id BIGSERIAL   NOT NULL,
    document_id          UUID        NOT NULL,
    score_job_fitness    INTEGER     NULL,
    score_tech_stack     INTEGER     NULL,
    score_quantified     INTEGER     NULL,
    score_logical        INTEGER     NULL,
    score_total          INTEGER     NULL,
    overall_review       TEXT        NULL,
    feedback_text        TEXT        NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_document_feedbacks PRIMARY KEY (document_feedback_id),
    CONSTRAINT fk_feedback_document  FOREIGN KEY (document_id) REFERENCES documents (document_id)
);
COMMENT ON TABLE  document_feedbacks                      IS 'AI 서류 피드백 결과 테이블';
COMMENT ON COLUMN document_feedbacks.document_feedback_id IS '피드백 고유 식별자';
COMMENT ON COLUMN document_feedbacks.document_id          IS '문서 FK';
COMMENT ON COLUMN document_feedbacks.score_job_fitness    IS '직무 적합도 점수 (0~100)';
COMMENT ON COLUMN document_feedbacks.score_tech_stack     IS '기술 스택 점수 (0~100)';
COMMENT ON COLUMN document_feedbacks.score_quantified     IS '경험 수치화 점수 (0~100)';
COMMENT ON COLUMN document_feedbacks.score_logical        IS '논리력 점수 (0~100)';
COMMENT ON COLUMN document_feedbacks.score_total          IS '종합 점수 (0~100)';
COMMENT ON COLUMN document_feedbacks.overall_review       IS 'AI 종합 총평';
COMMENT ON COLUMN document_feedbacks.feedback_text        IS 'AI 상세 첨삭 결과 (JSON 문자열)';
COMMENT ON COLUMN document_feedbacks.created_at           IS '생성 일시';

-- ================================================
-- 11. cover_letter_meta
-- ================================================
CREATE TABLE cover_letter_meta (
    letter_meta_id BIGSERIAL    NOT NULL,
    document_id    UUID         NOT NULL,
    company        VARCHAR(100) NOT NULL,
    job            VARCHAR(100) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_cover_letter_meta  PRIMARY KEY (letter_meta_id),
    CONSTRAINT uq_clm_document_id   UNIQUE      (document_id),
    CONSTRAINT fk_clm_document      FOREIGN KEY (document_id) REFERENCES documents (document_id)
);
COMMENT ON TABLE  cover_letter_meta                IS '자기소개서 기본 정보 (지원 회사 및 직무)';
COMMENT ON COLUMN cover_letter_meta.letter_meta_id IS '자소서 고유 식별자';
COMMENT ON COLUMN cover_letter_meta.document_id    IS '문서 FK';
COMMENT ON COLUMN cover_letter_meta.company        IS '지원 회사명';
COMMENT ON COLUMN cover_letter_meta.job            IS '지원 직무명';
COMMENT ON COLUMN cover_letter_meta.created_at     IS '생성 일시';

-- ================================================
-- 12. cover_letter_contents
-- ================================================
CREATE TABLE cover_letter_contents (
    content_id  BIGSERIAL   NOT NULL,
    document_id UUID        NOT NULL,
    order_num   INTEGER     NOT NULL,
    question    TEXT        NOT NULL,
    answer      TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_cover_letter_contents PRIMARY KEY (content_id),
    CONSTRAINT uq_clc_document_order    UNIQUE      (document_id, order_num),
    CONSTRAINT fk_clc_document          FOREIGN KEY (document_id) REFERENCES documents (document_id),
    CONSTRAINT chk_clc_order_num        CHECK       (order_num BETWEEN 1 AND 5)
);
COMMENT ON TABLE  cover_letter_contents             IS '자기소개서 문항 및 답변 테이블';
COMMENT ON COLUMN cover_letter_contents.content_id  IS '문항 고유 식별자';
COMMENT ON COLUMN cover_letter_contents.document_id IS '문서 FK';
COMMENT ON COLUMN cover_letter_contents.order_num   IS '문항 순서 (1~5)';
COMMENT ON COLUMN cover_letter_contents.question    IS '문항 내용';
COMMENT ON COLUMN cover_letter_contents.answer      IS '답변 내용 (max 1000자)';
COMMENT ON COLUMN cover_letter_contents.created_at  IS '생성 일시';

-- ================================================
-- 13. interview_sessions
-- ================================================
CREATE TABLE interview_sessions (
    session_id     UUID         NOT NULL DEFAULT gen_random_uuid(),
    member_id      UUID         NOT NULL,
    document_id    UUID         NULL,
    session_type   VARCHAR(10)  NOT NULL,
    session_status VARCHAR(20)  NOT NULL DEFAULT 'IN_PROGRESS',
    interview_type VARCHAR(20)  NULL,
    target_company VARCHAR(100) NULL,
    total_score    INTEGER      NULL,
    started_at     TIMESTAMPTZ  NULL,
    ended_at       TIMESTAMPTZ  NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_interview_sessions PRIMARY KEY (session_id),
    CONSTRAINT fk_interview_member   FOREIGN KEY (member_id)   REFERENCES members (member_id),
    CONSTRAINT fk_interview_document FOREIGN KEY (document_id) REFERENCES documents (document_id),
    CONSTRAINT chk_session_type      CHECK (session_type   IN ('TEXT', 'VOICE', 'VIDEO')),
    CONSTRAINT chk_session_status    CHECK (session_status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
    CONSTRAINT chk_interview_type    CHECK (interview_type IN ('TECHNICAL', 'PERSONALITY', 'PROJECT'))
);
COMMENT ON TABLE  interview_sessions                IS 'AI 모의 면접 세션 테이블';
COMMENT ON COLUMN interview_sessions.session_id     IS '면접 세션 고유 식별자';
COMMENT ON COLUMN interview_sessions.member_id      IS '회원 FK';
COMMENT ON COLUMN interview_sessions.document_id    IS '연결 서류 FK (RAG 컨텍스트용, NULL 허용)';
COMMENT ON COLUMN interview_sessions.session_type   IS '면접 형식 (TEXT / VOICE / VIDEO)';
COMMENT ON COLUMN interview_sessions.session_status IS '진행 상태 (IN_PROGRESS / COMPLETED / FAILED)';
COMMENT ON COLUMN interview_sessions.interview_type IS '면접 내용 유형 (TECHNICAL / PERSONALITY / PROJECT)';
COMMENT ON COLUMN interview_sessions.target_company IS '준비 대상 기업명';
COMMENT ON COLUMN interview_sessions.total_score    IS '면접 종합 점수';
COMMENT ON COLUMN interview_sessions.started_at     IS '면접 시작 일시';
COMMENT ON COLUMN interview_sessions.ended_at       IS '면접 종료 일시';
COMMENT ON COLUMN interview_sessions.created_at     IS '세션 생성 일시';
COMMENT ON COLUMN interview_sessions.updated_at     IS '상태 및 점수 변경 일시';

-- ================================================
-- 14. interview_messages
-- ================================================
CREATE TABLE interview_messages (
    message_id      BIGSERIAL   NOT NULL,
    session_id      UUID        NOT NULL,
    sender          VARCHAR(10) NOT NULL,
    message_type    VARCHAR(20) NOT NULL,
    message_content TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_interview_messages    PRIMARY KEY (message_id),
    CONSTRAINT fk_interview_msg_session FOREIGN KEY (session_id) REFERENCES interview_sessions (session_id),
    CONSTRAINT chk_interview_sender     CHECK (sender       IN ('AI', 'USER')),
    CONSTRAINT chk_message_type         CHECK (message_type IN ('QUESTION', 'ANSWER', 'SYSTEM'))
);
COMMENT ON TABLE  interview_messages                 IS 'AI 면접 채팅 내역 테이블';
COMMENT ON COLUMN interview_messages.message_id      IS '메시지 고유 식별자';
COMMENT ON COLUMN interview_messages.session_id      IS '면접 세션 FK';
COMMENT ON COLUMN interview_messages.sender          IS '발신자 구분 (AI / USER)';
COMMENT ON COLUMN interview_messages.message_type    IS '메시지 유형 (QUESTION / ANSWER / SYSTEM)';
COMMENT ON COLUMN interview_messages.message_content IS '메시지 본문';
COMMENT ON COLUMN interview_messages.created_at      IS '메시지 전송 일시';

-- ================================================
-- 15. ai_interview_feedbacks
-- ================================================
CREATE TABLE ai_interview_feedbacks (
    interview_feedback_id BIGSERIAL    NOT NULL,
    session_id            UUID         NOT NULL,
    question_order        INTEGER      NOT NULL,
    question_text         TEXT         NOT NULL,
    answer_text           TEXT         NOT NULL,
    relevance_score       INTEGER      NULL,
    depth_score           INTEGER      NULL,
    delivery_score        INTEGER      NULL,
    fluency_score         INTEGER      NULL,
    voice_quality_ratio   DECIMAL(5,2) NULL,
    ai_feedback           TEXT         NULL,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ai_interview_feedbacks PRIMARY KEY (interview_feedback_id),
    CONSTRAINT fk_aif_session            FOREIGN KEY (session_id) REFERENCES interview_sessions (session_id),
    CONSTRAINT chk_aif_relevance_score   CHECK (relevance_score     BETWEEN 0 AND 100),
    CONSTRAINT chk_aif_depth_score       CHECK (depth_score         BETWEEN 0 AND 100),
    CONSTRAINT chk_aif_delivery_score    CHECK (delivery_score      BETWEEN 0 AND 100),
    CONSTRAINT chk_aif_fluency_score     CHECK (fluency_score       BETWEEN 0 AND 100),
    CONSTRAINT chk_aif_voice_quality     CHECK (voice_quality_ratio BETWEEN 0.00 AND 100.00)
);
COMMENT ON TABLE  ai_interview_feedbacks                        IS 'AI 면접 피드백 결과 테이블';
COMMENT ON COLUMN ai_interview_feedbacks.interview_feedback_id IS '피드백 고유 식별자';
COMMENT ON COLUMN ai_interview_feedbacks.session_id            IS '면접 세션 FK';
COMMENT ON COLUMN ai_interview_feedbacks.question_order        IS '질문 순서 (1, 2, 3...)';
COMMENT ON COLUMN ai_interview_feedbacks.question_text         IS '질문 내용';
COMMENT ON COLUMN ai_interview_feedbacks.answer_text           IS '사용자 답변';
COMMENT ON COLUMN ai_interview_feedbacks.relevance_score       IS '직무 연관성 점수 (0~100)';
COMMENT ON COLUMN ai_interview_feedbacks.depth_score           IS '답변 깊이 점수 (0~100)';
COMMENT ON COLUMN ai_interview_feedbacks.delivery_score        IS '전달력 점수 (0~100, 음성 전용)';
COMMENT ON COLUMN ai_interview_feedbacks.fluency_score         IS '유창성 점수 (0~100, 음성 전용)';
COMMENT ON COLUMN ai_interview_feedbacks.voice_quality_ratio   IS '음성 인식 유효 비율 (0.00~100.00, 음성 전용)';
COMMENT ON COLUMN ai_interview_feedbacks.ai_feedback           IS '질문별 AI 피드백';
COMMENT ON COLUMN ai_interview_feedbacks.created_at            IS '생성 일시';

-- ================================================
-- 16. career_histories
-- ================================================
CREATE TABLE career_histories (
    career_history_id BIGSERIAL    NOT NULL,
    member_id         UUID         NOT NULL,
    session_id        UUID         NOT NULL,
    document_id       UUID         NULL,
    total_score       INTEGER      NULL,
    feedback          TEXT         NULL,
    pdf_url           VARCHAR(500) NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_career_histories PRIMARY KEY (career_history_id),
    CONSTRAINT fk_career_member    FOREIGN KEY (member_id)   REFERENCES members (member_id),
    CONSTRAINT fk_career_session   FOREIGN KEY (session_id)  REFERENCES interview_sessions (session_id),
    CONSTRAINT fk_career_document  FOREIGN KEY (document_id) REFERENCES documents (document_id)
);
COMMENT ON TABLE  career_histories                   IS '면접 기록 누적 보관 테이블';
COMMENT ON COLUMN career_histories.career_history_id IS '기록 고유 식별자';
COMMENT ON COLUMN career_histories.member_id         IS '회원 FK';
COMMENT ON COLUMN career_histories.session_id        IS '면접 세션 FK';
COMMENT ON COLUMN career_histories.document_id       IS '연결 서류 FK (NULL 허용)';
COMMENT ON COLUMN career_histories.total_score       IS '최종 종합 점수';
COMMENT ON COLUMN career_histories.feedback          IS 'AI 종합 피드백';
COMMENT ON COLUMN career_histories.pdf_url           IS '종합 진단 PDF URL (S3)';
COMMENT ON COLUMN career_histories.created_at        IS '기록 생성 일시';

-- ================================================
-- 17. job_notices
-- ================================================
CREATE TABLE job_notices (
    job_notice_id BIGSERIAL    NOT NULL,
    company_name  VARCHAR(100) NULL,
    title         VARCHAR(200) NOT NULL,
    description   TEXT         NULL,
    skill_tags    TEXT[]       NULL,
    job_type      VARCHAR(20)  NULL,
    company_size  VARCHAR(20)  NULL,
    job_category  TEXT[]       NULL,
    career_level  VARCHAR(10)  NULL,
    location      VARCHAR(100) NULL,
    salary        VARCHAR(50)  NULL,
    notice_status VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
    original_url  TEXT         NOT NULL,
    source        VARCHAR(20)  NOT NULL,
    view_count    INTEGER      NOT NULL DEFAULT 0,
    deadline      DATE         NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_job_notices    PRIMARY KEY (job_notice_id),
    CONSTRAINT chk_job_type      CHECK (job_type      IN ('FULLTIME', 'INTERN', 'CONTRACT')),
    CONSTRAINT chk_company_size  CHECK (company_size  IN ('STARTUP', 'SME', 'LARGE')),
    CONSTRAINT chk_career_level  CHECK (career_level  IN ('JUNIOR', 'SENIOR', 'ANY')),
    CONSTRAINT chk_notice_status CHECK (notice_status IN ('ACTIVE', 'CLOSED')),
    CONSTRAINT chk_view_count    CHECK (view_count >= 0)
);
COMMENT ON TABLE  job_notices               IS '채용 공고 테이블 (직접 등록 및 스크래핑 공고 통합)';
COMMENT ON COLUMN job_notices.job_notice_id IS '공고 고유 식별자';
COMMENT ON COLUMN job_notices.company_name  IS '공고 게시 기업명';
COMMENT ON COLUMN job_notices.title         IS '공고 제목';
COMMENT ON COLUMN job_notices.description   IS '공고 상세 내용';
COMMENT ON COLUMN job_notices.skill_tags    IS '요구 기술 스택 (다중 선택, TEXT[])';
COMMENT ON COLUMN job_notices.job_type      IS '채용 유형 (FULLTIME / INTERN / CONTRACT)';
COMMENT ON COLUMN job_notices.company_size  IS '기업 규모 (STARTUP / SME / LARGE)';
COMMENT ON COLUMN job_notices.job_category  IS '직무 카테고리 (다중 선택, TEXT[])';
COMMENT ON COLUMN job_notices.career_level  IS '경력 조건 (JUNIOR / SENIOR / ANY)';
COMMENT ON COLUMN job_notices.location      IS '근무지';
COMMENT ON COLUMN job_notices.salary        IS '급여 정보';
COMMENT ON COLUMN job_notices.notice_status IS '공고 상태 (ACTIVE / CLOSED)';
COMMENT ON COLUMN job_notices.original_url  IS '원문 공고 링크';
COMMENT ON COLUMN job_notices.source        IS '공고 출처';
COMMENT ON COLUMN job_notices.view_count    IS '조회수';
COMMENT ON COLUMN job_notices.deadline      IS '지원 마감일';
COMMENT ON COLUMN job_notices.created_at    IS '공고 등록 일시';
COMMENT ON COLUMN job_notices.updated_at    IS '공고 수정 일시 (재스크래핑 포함)';

-- ================================================
-- 18. bookmarks
-- ================================================
CREATE TABLE bookmarks (
    bookmark_id   BIGSERIAL   NOT NULL,
    member_id     UUID        NOT NULL,
    job_notice_id BIGINT      NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_bookmarks       PRIMARY KEY (bookmark_id),
    CONSTRAINT uq_bookmark        UNIQUE (member_id, job_notice_id),
    CONSTRAINT fk_bookmark_member FOREIGN KEY (member_id)     REFERENCES members (member_id),
    CONSTRAINT fk_bookmark_job    FOREIGN KEY (job_notice_id) REFERENCES job_notices (job_notice_id)
);
COMMENT ON TABLE  bookmarks               IS '북마크 테이블';
COMMENT ON COLUMN bookmarks.bookmark_id   IS '북마크 고유 식별자';
COMMENT ON COLUMN bookmarks.member_id     IS '회원 FK';
COMMENT ON COLUMN bookmarks.job_notice_id IS '공고 FK';
COMMENT ON COLUMN bookmarks.created_at    IS '북마크 일시';

-- ================================================
-- 19. plans
-- ================================================
CREATE TABLE plans (
    plan_id               BIGSERIAL    NOT NULL,
    product_code          VARCHAR(30)  NOT NULL,
    plan_name             VARCHAR(50)  NOT NULL,
    plan_price            INTEGER      NOT NULL,
    monthly_usage_limit   INTEGER      NOT NULL DEFAULT 0,
    currency              VARCHAR(10)  NOT NULL DEFAULT 'KRW',
    billing_cycle         VARCHAR(20)  NOT NULL DEFAULT 'MONTHLY',
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_plans          PRIMARY KEY (plan_id),
    CONSTRAINT uq_product_code   UNIQUE (product_code),
    CONSTRAINT chk_billing_cycle CHECK (billing_cycle IN ('MONTHLY', 'YEARLY'))
);
COMMENT ON TABLE  plans                       IS '구독 플랜 목록';
COMMENT ON COLUMN plans.plan_id               IS '플랜 고유 식별자';
COMMENT ON COLUMN plans.product_code          IS '상품 코드 (UNIQUE, document-coaching / interview)';
COMMENT ON COLUMN plans.plan_name             IS '플랜명';
COMMENT ON COLUMN plans.plan_price            IS '월 결제 금액';
COMMENT ON COLUMN plans.monthly_usage_limit   IS '월 최대 이용 횟수 (0은 미확정 placeholder, Phase 1에서 확정값으로 UPDATE 필요)';
COMMENT ON COLUMN plans.currency              IS '통화 (기본값 KRW)';
COMMENT ON COLUMN plans.billing_cycle         IS '결제 주기 (MONTHLY / YEARLY)';
COMMENT ON COLUMN plans.is_active             IS '현재 판매 여부 (기본값 TRUE)';
COMMENT ON COLUMN plans.created_at            IS '생성 일시';
COMMENT ON COLUMN plans.updated_at            IS '수정 일시';

-- ================================================
-- 20. billing_profiles
-- ================================================
CREATE TABLE billing_profiles (
    billing_profile_id      UUID         NOT NULL DEFAULT gen_random_uuid(),
    member_id               UUID         NOT NULL,
    customer_key            VARCHAR(100) NOT NULL,
    encrypted_billing_key   TEXT         NOT NULL,
    card_company            VARCHAR(50)  NULL,
    card_number_masked      VARCHAR(30)  NULL,
    billing_profile_status  VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    authenticated_at        TIMESTAMPTZ  NOT NULL,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_billing_profiles       PRIMARY KEY (billing_profile_id),
    CONSTRAINT uq_customer_key           UNIQUE (customer_key),
    CONSTRAINT fk_billing_profile_member FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT chk_billing_status        CHECK (billing_profile_status IN ('ACTIVE', 'REVOKED'))
);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_member_status_created
    ON billing_profiles (member_id, billing_profile_status, created_at DESC);
COMMENT ON TABLE  billing_profiles                        IS 'Toss billingKey 기반 자동결제 수단';
COMMENT ON COLUMN billing_profiles.billing_profile_id     IS '결제 수단 고유 식별자';
COMMENT ON COLUMN billing_profiles.member_id              IS '회원 FK';
COMMENT ON COLUMN billing_profiles.customer_key           IS '서버 발급 Toss 고객 키 (UNIQUE)';
COMMENT ON COLUMN billing_profiles.encrypted_billing_key  IS 'AES-256 암호화된 billingKey (평문 저장 금지)';
COMMENT ON COLUMN billing_profiles.card_company           IS '카드사명';
COMMENT ON COLUMN billing_profiles.card_number_masked     IS '마스킹 카드번호';
COMMENT ON COLUMN billing_profiles.billing_profile_status IS '결제 수단 상태 (ACTIVE / REVOKED)';
COMMENT ON COLUMN billing_profiles.authenticated_at       IS 'billingKey 인증 완료 일시';
COMMENT ON COLUMN billing_profiles.created_at             IS '생성 일시';
COMMENT ON COLUMN billing_profiles.updated_at             IS '수정 일시';

-- ================================================
-- 21. subscriptions
-- ================================================
CREATE TABLE subscriptions (
    subscription_id      UUID        NOT NULL DEFAULT gen_random_uuid(),
    member_id            UUID        NOT NULL,
    plan_id              BIGINT      NOT NULL,
    billing_profile_id   UUID        NULL,
    subscription_status  VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    started_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end   TIMESTAMPTZ NOT NULL,
    next_billing_at      TIMESTAMPTZ NULL,
    payment_failed_at    TIMESTAMPTZ NULL,
    retry_count          INTEGER     NOT NULL DEFAULT 0,
    cancel_scheduled_at  TIMESTAMPTZ NULL,
    cancelled_at         TIMESTAMPTZ NULL,
    auto_renew           BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_subscriptions                    PRIMARY KEY (subscription_id),
    CONSTRAINT fk_subscriptions_member             FOREIGN KEY (member_id)           REFERENCES members (member_id),
    CONSTRAINT fk_subscriptions_plan               FOREIGN KEY (plan_id)             REFERENCES plans (plan_id),
    CONSTRAINT fk_subscriptions_billing_profile    FOREIGN KEY (billing_profile_id)  REFERENCES billing_profiles (billing_profile_id),
    CONSTRAINT chk_subscription_status             CHECK (subscription_status IN ('ACTIVE', 'CANCEL_SCHEDULED', 'EXPIRED', 'PAYMENT_FAILED', 'REFUND_PENDING', 'REFUNDED')),
    CONSTRAINT chk_retry_count                     CHECK (retry_count BETWEEN 0 AND 2),
    CONSTRAINT chk_period_order                    CHECK (current_period_start < current_period_end),
    CONSTRAINT chk_payment_failed_at               CHECK (subscription_status != 'PAYMENT_FAILED' OR payment_failed_at IS NOT NULL)
);
COMMENT ON TABLE  subscriptions                      IS '구독 정보 테이블';
COMMENT ON COLUMN subscriptions.subscription_id      IS '구독 고유 식별자';
COMMENT ON COLUMN subscriptions.member_id            IS '구독 회원 FK';
COMMENT ON COLUMN subscriptions.plan_id              IS '플랜 FK';
COMMENT ON COLUMN subscriptions.billing_profile_id   IS 'Toss 자동결제 수단 FK (Phase 4 이전 생성된 row는 NULL)';
COMMENT ON COLUMN subscriptions.subscription_status  IS '구독 상태 (ACTIVE / CANCEL_SCHEDULED / EXPIRED 등 6종)';
COMMENT ON COLUMN subscriptions.started_at           IS '구독 시작 일시';
COMMENT ON COLUMN subscriptions.current_period_start IS '현재 이용 기간 시작';
COMMENT ON COLUMN subscriptions.current_period_end   IS '구독 만료 일시';
COMMENT ON COLUMN subscriptions.next_billing_at      IS '다음 자동 결제 예정일';
COMMENT ON COLUMN subscriptions.payment_failed_at    IS '최초 자동결제 실패 일시';
COMMENT ON COLUMN subscriptions.retry_count          IS '완료된 자동 재시도 횟수 (기본값 0)';
COMMENT ON COLUMN subscriptions.cancel_scheduled_at  IS '해지 예약 시간';
COMMENT ON COLUMN subscriptions.cancelled_at         IS '최종 해지 시간';
COMMENT ON COLUMN subscriptions.auto_renew           IS '자동 갱신 여부 (기본값 TRUE)';
COMMENT ON COLUMN subscriptions.created_at           IS '생성 일시';
COMMENT ON COLUMN subscriptions.updated_at           IS '구독 상태 변경 일시';

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_billing ON subscriptions (subscription_status, next_billing_at);

-- ================================================
-- 21. payments
-- ================================================
CREATE TABLE payments (
    payment_id      UUID         NOT NULL DEFAULT gen_random_uuid(),
    member_id       UUID         NOT NULL,
    subscription_id UUID         NULL,
    plan_id         BIGINT       NOT NULL,
    product_code    VARCHAR(30)  NOT NULL,
    order_id        VARCHAR(100) NOT NULL,
    payment_key     VARCHAR(200) NULL,
    idempotency_key VARCHAR(100) NOT NULL,
    customer_key    VARCHAR(100) NOT NULL,
    customer_name   VARCHAR(100) NOT NULL,
    customer_email  VARCHAR(200) NOT NULL,
    amount          INTEGER      NOT NULL,
    currency        VARCHAR(10)  NOT NULL DEFAULT 'KRW',
    payment_status  VARCHAR(20)  NOT NULL DEFAULT 'READY',
    failure_reason  VARCHAR(30)  NULL,
    payment_method  VARCHAR(30)  NULL,
    payment_type      VARCHAR(20)  NOT NULL DEFAULT 'MANUAL',
    attempt_sequence  INTEGER      NOT NULL DEFAULT 0,
    approved_at       TIMESTAMPTZ  NULL,
    expires_at        TIMESTAMPTZ  NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_payments           PRIMARY KEY (payment_id),
    CONSTRAINT uq_payment_key        UNIQUE (payment_key),
    CONSTRAINT uq_order_id           UNIQUE (order_id),
    CONSTRAINT uq_idempotency_key    UNIQUE (idempotency_key),
    CONSTRAINT fk_payments_member    FOREIGN KEY (member_id)       REFERENCES members (member_id),
    CONSTRAINT fk_payments_sub       FOREIGN KEY (subscription_id) REFERENCES subscriptions (subscription_id),
    CONSTRAINT fk_payments_plan      FOREIGN KEY (plan_id)         REFERENCES plans (plan_id),
    CONSTRAINT chk_payment_status    CHECK (payment_status IN ('READY', 'AUTHORIZED', 'CONFIRMING', 'PAID', 'FAILED', 'CANCELED', 'RECONCILING', 'REFUNDED')),
    CONSTRAINT chk_failure_reason    CHECK (failure_reason IN ('USER_CANCELED', 'CARD_DECLINED', 'TIMEOUT', 'DUPLICATE_ORDER', 'CONFIRM_FAILED', 'FORBIDDEN', 'UNKNOWN')),
    CONSTRAINT chk_payment_type      CHECK (payment_type IN ('MANUAL', 'AUTO_RENEWAL')),
    CONSTRAINT chk_paid_approved_at  CHECK (payment_status != 'PAID' OR approved_at IS NOT NULL),
    CONSTRAINT chk_payment_amount    CHECK (amount > 0),
    CONSTRAINT chk_attempt_sequence  CHECK (attempt_sequence IN (0, 1, 2))
);
COMMENT ON TABLE  payments                  IS '결제 내역 테이블 (토스페이먼츠 연동)';
COMMENT ON COLUMN payments.payment_id       IS '결제 고유 식별자';
COMMENT ON COLUMN payments.member_id        IS '결제 회원 FK';
COMMENT ON COLUMN payments.subscription_id  IS '연결 구독 FK (FREE 플랜 또는 결제 전 READY 상태는 NULL)';
COMMENT ON COLUMN payments.plan_id          IS '결제 당시 플랜 FK';
COMMENT ON COLUMN payments.product_code     IS '결제 상품 식별자 (document-coaching / interview) — 결제 시점 스냅샷';
COMMENT ON COLUMN payments.order_id         IS 'Toss 주문 번호 (UNIQUE)';
COMMENT ON COLUMN payments.payment_key      IS 'Toss 결제 키 (UNIQUE, FAILED 시 NULL)';
COMMENT ON COLUMN payments.idempotency_key  IS '중복 결제 방지 키';
COMMENT ON COLUMN payments.customer_key     IS '주문 생성 시 서버 발급 고객 식별자 — Toss 본인 검증에 사용';
COMMENT ON COLUMN payments.customer_name    IS '회원 이름 — Toss 결제 API 요청 시 전송 (결제 시점 스냅샷)';
COMMENT ON COLUMN payments.customer_email   IS '회원 이메일 — Toss 결제 API 요청 시 전송 (결제 시점 스냅샷)';
COMMENT ON COLUMN payments.amount           IS '최종 결제 금액 (부가세 포함)';
COMMENT ON COLUMN payments.currency         IS '통화 (기본값 KRW)';
COMMENT ON COLUMN payments.payment_status   IS '결제 상태 (READY / CONFIRMING / PAID / FAILED / CANCELED / REFUNDED)';
COMMENT ON COLUMN payments.failure_reason   IS '결제 실패 사유 (FAILED 상태일 때만 사용, USER_CANCELED 등 7종)';
COMMENT ON COLUMN payments.payment_method   IS '결제 수단 (CARD / VIRTUAL_ACCOUNT 등)';
COMMENT ON COLUMN payments.payment_type      IS '결제 방식 (MANUAL / AUTO_RENEWAL)';
COMMENT ON COLUMN payments.attempt_sequence  IS '결제 시도 순번 (최초=0, 재시도=1/2)';
COMMENT ON COLUMN payments.approved_at       IS '결제 승인 일시';
COMMENT ON COLUMN payments.expires_at        IS 'READY 주문 만료 시각 (MANUAL 주문만 설정, created_at + 30분)';
COMMENT ON COLUMN payments.created_at        IS '결제 요청 생성 일시';
COMMENT ON COLUMN payments.updated_at        IS '결제 상태 변경 일시';

CREATE INDEX IF NOT EXISTS idx_payments_status_created  ON payments (payment_status, created_at DESC);

-- ================================================
-- 22. admins
-- ================================================
CREATE TABLE admins (
    admin_id      BIGSERIAL    NOT NULL,
    login_id      VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(50)  NOT NULL,
    admin_role    VARCHAR(20)  NOT NULL,
    status        VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ  NULL,
    last_login_ip VARCHAR(45)  NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_admins         PRIMARY KEY (admin_id),
    CONSTRAINT uq_admins_login_id UNIQUE (login_id),
    CONSTRAINT uq_admins_email    UNIQUE (email),
    CONSTRAINT chk_admin_role    CHECK (admin_role IN ('MASTER', 'CS', 'BACKEND')),
    CONSTRAINT chk_admin_status  CHECK (status     IN ('ACTIVE', 'LOCKED'))
);
COMMENT ON TABLE  admins                IS '관리자 계정 테이블';
COMMENT ON COLUMN admins.admin_id       IS '관리자 고유 식별자';
COMMENT ON COLUMN admins.login_id       IS '관리자 로그인 ID (UNIQUE)';
COMMENT ON COLUMN admins.password_hash  IS '해시 처리된 비밀번호';
COMMENT ON COLUMN admins.name           IS '관리자 이름';
COMMENT ON COLUMN admins.admin_role     IS '관리자 권한 (MASTER / CS / BACKEND)';
COMMENT ON COLUMN admins.status         IS '계정 상태 (ACTIVE / LOCKED)';
COMMENT ON COLUMN admins.last_login_at  IS '마지막 로그인 일시';
COMMENT ON COLUMN admins.last_login_ip  IS '마지막 접속 IP';
COMMENT ON COLUMN admins.created_at     IS '계정 생성 일시';
COMMENT ON COLUMN admins.updated_at     IS '최종 수정 일시';

-- ================================================
-- 23. refunds
-- ================================================
CREATE TABLE refunds (
    refund_id     BIGSERIAL   NOT NULL,
    payment_id    UUID        NOT NULL,
    admin_id      BIGINT      NULL,
    amount        INTEGER     NOT NULL,
    reason        TEXT        NOT NULL,
    refund_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reject_reason TEXT        NULL,
    refunded_at   TIMESTAMPTZ NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_refunds         PRIMARY KEY (refund_id),
    CONSTRAINT fk_refunds_payment FOREIGN KEY (payment_id) REFERENCES payments (payment_id),
    CONSTRAINT fk_refunds_admin   FOREIGN KEY (admin_id)   REFERENCES admins (admin_id),
    CONSTRAINT chk_refund_status  CHECK (refund_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REJECTED')),
    CONSTRAINT chk_reject_reason  CHECK (refund_status != 'REJECTED'  OR reject_reason IS NOT NULL),
    CONSTRAINT chk_refunded_at    CHECK (refund_status != 'COMPLETED' OR refunded_at   IS NOT NULL)
);
COMMENT ON TABLE  refunds               IS '환불 내역 테이블';
COMMENT ON COLUMN refunds.refund_id     IS '환불 고유 식별자';
COMMENT ON COLUMN refunds.payment_id    IS '결제 FK';
COMMENT ON COLUMN refunds.admin_id      IS '처리 관리자 FK (자동 환불 = NULL)';
COMMENT ON COLUMN refunds.amount        IS '환불 금액';
COMMENT ON COLUMN refunds.reason        IS '환불 사유';
COMMENT ON COLUMN refunds.refund_status IS '환불 상태 (PENDING / COMPLETED / FAILED / REJECTED)';
COMMENT ON COLUMN refunds.reject_reason IS '거절 사유 (REJECTED 상태일 때 필수)';
COMMENT ON COLUMN refunds.refunded_at   IS '환불 완료 일시';
COMMENT ON COLUMN refunds.created_at    IS '환불 요청 일시';

-- ================================================
-- 24. boards
-- ================================================
CREATE TABLE boards (
    board_id   BIGSERIAL    NOT NULL,
    member_id  UUID         NOT NULL,
    category   VARCHAR(30)  NOT NULL,
    title      VARCHAR(200) NOT NULL,
    content    TEXT         NOT NULL,
    view_count INTEGER      NOT NULL DEFAULT 0,
    is_blind   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_boards        PRIMARY KEY (board_id),
    CONSTRAINT fk_boards_member FOREIGN KEY (member_id) REFERENCES members (member_id)
);
COMMENT ON TABLE  boards            IS '커뮤니티 게시글 테이블';
COMMENT ON COLUMN boards.board_id   IS '게시글 고유 식별자';
COMMENT ON COLUMN boards.member_id  IS '작성 회원 FK';
COMMENT ON COLUMN boards.category   IS '게시판 카테고리';
COMMENT ON COLUMN boards.title      IS '게시글 제목';
COMMENT ON COLUMN boards.content    IS '게시글 본문';
COMMENT ON COLUMN boards.view_count IS '조회수 (기본값 0)';
COMMENT ON COLUMN boards.is_blind   IS '블라인드 처리 여부 (기본값 FALSE)';
COMMENT ON COLUMN boards.created_at IS '작성 일시';
COMMENT ON COLUMN boards.updated_at IS '최종 수정 일시';

-- ================================================
-- 25. comments
-- ================================================
CREATE TABLE comments (
    comment_id BIGSERIAL   NOT NULL,
    board_id   BIGINT      NOT NULL,
    member_id  UUID        NOT NULL,
    parent_id  BIGINT      NULL,
    content    TEXT        NOT NULL,
    is_blind   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_comments        PRIMARY KEY (comment_id),
    CONSTRAINT fk_comments_board  FOREIGN KEY (board_id)  REFERENCES boards (board_id),
    CONSTRAINT fk_comments_member FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments (comment_id)
);
COMMENT ON TABLE  comments            IS '게시글 댓글 및 대댓글 테이블 (셀프 참조)';
COMMENT ON COLUMN comments.comment_id IS '댓글 고유 식별자';
COMMENT ON COLUMN comments.board_id   IS '게시글 FK';
COMMENT ON COLUMN comments.member_id  IS '작성 회원 FK';
COMMENT ON COLUMN comments.parent_id  IS '부모 댓글 FK (대댓글인 경우)';
COMMENT ON COLUMN comments.content    IS '댓글 본문';
COMMENT ON COLUMN comments.is_blind   IS '블라인드 처리 여부 (기본값 FALSE)';
COMMENT ON COLUMN comments.created_at IS '작성 일시';
COMMENT ON COLUMN comments.updated_at IS '댓글 수정 일시';

-- ================================================
-- 26. suspend_histories
-- ================================================
CREATE TABLE suspend_histories (
    suspend_history_id BIGSERIAL   NOT NULL,
    member_id          UUID        NOT NULL,
    admin_id           BIGINT      NOT NULL,
    sanction_type      VARCHAR(20) NOT NULL,
    duration           VARCHAR(20) NULL,
    reason             TEXT        NOT NULL,
    start_date         DATE        NULL,
    end_date           DATE        NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_suspend_histories PRIMARY KEY (suspend_history_id),
    CONSTRAINT fk_suspend_member    FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT fk_suspend_admin     FOREIGN KEY (admin_id)  REFERENCES admins (admin_id),
    CONSTRAINT chk_sanction_type    CHECK (sanction_type IN ('WARNING', 'SUSPEND', 'BLACKLIST')),
    CONSTRAINT chk_duration         CHECK (duration IS NULL OR duration IN ('THREE_DAYS', 'SEVEN_DAYS', 'THIRTY_DAYS', 'PERMANENT'))
);
COMMENT ON TABLE  suspend_histories                    IS '회원 활동 정지 이력 테이블';
COMMENT ON COLUMN suspend_histories.suspend_history_id IS '제재 이력 고유 식별자';
COMMENT ON COLUMN suspend_histories.member_id          IS '제재 대상 회원 FK';
COMMENT ON COLUMN suspend_histories.admin_id           IS '처리 관리자 FK';
COMMENT ON COLUMN suspend_histories.sanction_type      IS '제재 유형 (WARNING / SUSPEND / BLACKLIST)';
COMMENT ON COLUMN suspend_histories.duration           IS '정지 기간 (THREE_DAYS / SEVEN_DAYS / THIRTY_DAYS / PERMANENT), SUSPEND일 때만 사용';
COMMENT ON COLUMN suspend_histories.reason             IS '제재 사유';
COMMENT ON COLUMN suspend_histories.start_date         IS '정지 시작일 (SUSPEND일 때만 사용)';
COMMENT ON COLUMN suspend_histories.end_date           IS '정지 종료일 (NULL = 영구정지)';
COMMENT ON COLUMN suspend_histories.created_at         IS '제재 처리 일시';

-- ================================================
-- 27. audit_logs
-- ================================================
CREATE TABLE audit_logs (
    audit_log_id BIGSERIAL    NOT NULL,
    admin_id     BIGINT       NULL,
    log_type     VARCHAR(30)  NOT NULL,
    action       VARCHAR(50)  NOT NULL,
    target_type  VARCHAR(30)  NULL,
    target_id    VARCHAR(100) NULL,
    ip_address   VARCHAR(45)  NULL,
    severity     VARCHAR(10)  NOT NULL,
    detail       TEXT         NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_audit_logs  PRIMARY KEY (audit_log_id),
    CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admins (admin_id),
    CONSTRAINT chk_log_type   CHECK (log_type  IN ('ADMIN_ACTIVITY', 'ADMIN_MANAGEMENT', 'AI_METRICS_SYSTEM', 'SCRAPING_SYSTEM')),
    CONSTRAINT chk_severity   CHECK (severity  IN ('INFO', 'WARN', 'ERROR', 'SUCCESS'))
);
COMMENT ON TABLE  audit_logs              IS '관리자 작업 감사 로그 테이블';
COMMENT ON COLUMN audit_logs.audit_log_id IS '로그 고유 식별자';
COMMENT ON COLUMN audit_logs.admin_id     IS '작업 관리자 FK';
COMMENT ON COLUMN audit_logs.log_type     IS '로그 타입 (ADMIN_ACTIVITY / ADMIN_MANAGEMENT / AI_METRICS_SYSTEM / SCRAPING_SYSTEM)';
COMMENT ON COLUMN audit_logs.action       IS '수행 액션 (SUSPEND / REFUND / BLIND 등)';
COMMENT ON COLUMN audit_logs.target_type  IS '대상 유형 (MEMBER / BOARD / PAYMENT 등)';
COMMENT ON COLUMN audit_logs.target_id    IS '대상 레코드 ID';
COMMENT ON COLUMN audit_logs.ip_address   IS '요청 IP 주소';
COMMENT ON COLUMN audit_logs.severity     IS '로그 등급 (INFO / WARN / ERROR / SUCCESS)';
COMMENT ON COLUMN audit_logs.detail       IS '변경 상세 내용 (변경 전후 값)';
COMMENT ON COLUMN audit_logs.created_at   IS '로그 기록 일시';

-- ================================================
-- 28. ip_acl
-- ================================================
CREATE TABLE ip_acl (
    ip_acl_id   BIGSERIAL    NOT NULL,
    label       VARCHAR(100) NOT NULL,
    ip_range    VARCHAR(50)  NOT NULL,
    ip_active   VARCHAR(10)  NOT NULL DEFAULT 'ON',
    is_enabled  BOOLEAN      NOT NULL DEFAULT TRUE,
    description VARCHAR(200) NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ip_acl         PRIMARY KEY (ip_acl_id),
    CONSTRAINT uq_ip_acl_range   UNIQUE (ip_range),
    CONSTRAINT chk_ip_acl_active CHECK (ip_active IN ('ON', 'OFF'))
);
COMMENT ON TABLE  ip_acl              IS '관리자 IP 접근 제어 테이블';
COMMENT ON COLUMN ip_acl.ip_acl_id   IS '설정 고유 식별자';
COMMENT ON COLUMN ip_acl.label       IS '규칙명 (예: 본사 사내망)';
COMMENT ON COLUMN ip_acl.ip_range    IS '허용 IP 대역 (CIDR 형식)';
COMMENT ON COLUMN ip_acl.ip_active   IS 'IP 활성/비활성 상태 (ON / OFF)';
COMMENT ON COLUMN ip_acl.is_enabled  IS '활성화 여부 (기본값 TRUE)';
COMMENT ON COLUMN ip_acl.description IS '설정 설명';
COMMENT ON COLUMN ip_acl.created_at  IS '등록 일시';
COMMENT ON COLUMN ip_acl.updated_at  IS '수정 일시';

-- ================================================
-- 29. reports
-- ================================================
CREATE TABLE reports (
    report_id     BIGSERIAL   NOT NULL,
    member_id     UUID        NOT NULL,
    reporter_id   UUID        NOT NULL,
    target_type   VARCHAR(20) NOT NULL,
    target_id     BIGINT      NOT NULL,
    reason        VARCHAR(30) NOT NULL,
    report_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ai_suggestion TEXT        NULL,
    processed_by  BIGINT      NULL,
    processed_at  TIMESTAMPTZ NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_reports          PRIMARY KEY (report_id),
    CONSTRAINT fk_reports_member   FOREIGN KEY (member_id)    REFERENCES members (member_id),
    CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id)  REFERENCES members (member_id),
    CONSTRAINT fk_reports_admin    FOREIGN KEY (processed_by) REFERENCES admins (admin_id),
    CONSTRAINT chk_target_type     CHECK (target_type   IN ('BOARD', 'COMMENT', 'MEMBER')),
    CONSTRAINT chk_report_reason   CHECK (reason        IN ('SPAM', 'ABUSE', 'AD', 'INAPPROPRIATE', 'OTHER')),
    CONSTRAINT chk_report_status   CHECK (report_status IN ('PENDING', 'BLINDED', 'DISMISSED'))
);
COMMENT ON TABLE  reports               IS '신고 내역 테이블';
COMMENT ON COLUMN reports.report_id     IS '신고 고유 식별자';
COMMENT ON COLUMN reports.member_id     IS '신고당한 회원 FK';
COMMENT ON COLUMN reports.reporter_id   IS '신고한 회원 FK';
COMMENT ON COLUMN reports.target_type   IS '신고 대상 유형 (BOARD / COMMENT / MEMBER)';
COMMENT ON COLUMN reports.target_id     IS '신고 대상 레코드 ID (FK 없음 - 폴리모픽)';
COMMENT ON COLUMN reports.reason        IS '신고 사유 (SPAM / ABUSE / AD / INAPPROPRIATE / OTHER)';
COMMENT ON COLUMN reports.report_status IS '처리 상태 (PENDING / BLINDED / DISMISSED)';
COMMENT ON COLUMN reports.ai_suggestion IS 'AI 검토 의견';
COMMENT ON COLUMN reports.processed_by  IS '처리 관리자 FK';
COMMENT ON COLUMN reports.processed_at  IS '처리 완료 일시';
COMMENT ON COLUMN reports.created_at    IS '신고 접수 일시';
COMMENT ON COLUMN reports.updated_at    IS '처리 상태 변경 일시';

-- ================================================
-- 30. inquiries
-- ================================================
CREATE TABLE inquiries (
    inquiry_id     BIGSERIAL    NOT NULL,
    member_id      UUID         NOT NULL,
    admin_id       BIGINT       NULL,
    category       VARCHAR(20)  NOT NULL,
    title          VARCHAR(200) NOT NULL,
    content        TEXT         NOT NULL,
    reply          TEXT         NULL,
    inquiry_status VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    ai_summary     TEXT         NULL,
    ai_draft       TEXT         NULL,
    version        BIGINT       NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    replied_at     TIMESTAMPTZ  NULL,
    completed_at   TIMESTAMPTZ  NULL,

    CONSTRAINT pk_inquiries        PRIMARY KEY (inquiry_id),
    CONSTRAINT fk_inquiries_member FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT fk_inquiries_admin  FOREIGN KEY (admin_id)  REFERENCES admins (admin_id),
    CONSTRAINT chk_inquiry_status  CHECK (inquiry_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    CONSTRAINT chk_replied_at      CHECK (inquiry_status =  'PENDING'   OR replied_at   IS NOT NULL),
    CONSTRAINT chk_completed_at    CHECK (inquiry_status != 'COMPLETED' OR completed_at IS NOT NULL)
);
COMMENT ON TABLE  inquiries                IS '1:1 고객 문의 테이블';
COMMENT ON COLUMN inquiries.inquiry_id     IS '문의 고유 식별자';
COMMENT ON COLUMN inquiries.member_id      IS '문의 회원 FK';
COMMENT ON COLUMN inquiries.admin_id       IS '담당 관리자 FK (PENDING 시 NULL)';
COMMENT ON COLUMN inquiries.category       IS '문의 카테고리 (REFUND / PAYMENT_ERROR / SERVICE / ACCOUNT / ETC)';
COMMENT ON COLUMN inquiries.title          IS '문의 제목';
COMMENT ON COLUMN inquiries.content        IS '문의 본문';
COMMENT ON COLUMN inquiries.reply          IS '관리자 답변';
COMMENT ON COLUMN inquiries.inquiry_status IS '처리 상태 (PENDING / IN_PROGRESS / COMPLETED)';
COMMENT ON COLUMN inquiries.ai_summary     IS 'AI 문의 요약';
COMMENT ON COLUMN inquiries.ai_draft       IS 'AI 답변 초안';
COMMENT ON COLUMN inquiries.version        IS '낙관적 락 버전 (동시 수정 충돌 감지)';
COMMENT ON COLUMN inquiries.created_at     IS '문의 접수 일시';
COMMENT ON COLUMN inquiries.updated_at     IS '처리 상태 변경 일시';
COMMENT ON COLUMN inquiries.replied_at     IS '최초 답변 일시';
COMMENT ON COLUMN inquiries.completed_at   IS '처리 완료 일시';

-- ================================================
-- 31. notices
-- ================================================
CREATE TABLE notices (
    notice_id  BIGSERIAL    NOT NULL,
    admin_id   BIGINT       NOT NULL,
    category   VARCHAR(20)  NOT NULL,
    title      VARCHAR(200) NOT NULL,
    content    TEXT         NOT NULL,
    is_pinned  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_visible BOOLEAN      NOT NULL DEFAULT TRUE,
    view_count INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_notices          PRIMARY KEY (notice_id),
    CONSTRAINT fk_notices_admin    FOREIGN KEY (admin_id) REFERENCES admins (admin_id),
    CONSTRAINT chk_notice_category CHECK (category IN ('NOTICE', 'UPDATE', 'EVENT', 'MAINTENANCE'))
);
COMMENT ON TABLE  notices            IS '공지사항 테이블';
COMMENT ON COLUMN notices.notice_id  IS '공지 고유 식별자';
COMMENT ON COLUMN notices.admin_id   IS '작성 관리자 FK';
COMMENT ON COLUMN notices.category   IS '카테고리 (NOTICE / UPDATE / EVENT / MAINTENANCE)';
COMMENT ON COLUMN notices.title      IS '공지 제목';
COMMENT ON COLUMN notices.content    IS '공지 본문';
COMMENT ON COLUMN notices.is_pinned  IS '상단 고정 여부 (기본값 FALSE)';
COMMENT ON COLUMN notices.is_visible IS '노출 여부 (기본값 TRUE)';
COMMENT ON COLUMN notices.view_count IS '조회수 (기본값 0)';
COMMENT ON COLUMN notices.created_at IS '작성 일시';
COMMENT ON COLUMN notices.updated_at IS '최종 수정 일시';

-- ================================================
-- 32. faqs
-- ================================================
CREATE TABLE faqs (
    faq_id     BIGSERIAL    NOT NULL,
    admin_id   BIGINT       NOT NULL,
    category   VARCHAR(20)  NOT NULL,
    question   VARCHAR(500) NOT NULL,
    answer     TEXT         NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_faqs          PRIMARY KEY (faq_id),
    CONSTRAINT fk_faqs_admin    FOREIGN KEY (admin_id) REFERENCES admins (admin_id),
    CONSTRAINT chk_faq_category CHECK (category IN ('ACCOUNT', 'PAYMENT', 'SERVICE', 'ETC'))
);
COMMENT ON TABLE  faqs            IS 'FAQ 테이블';
COMMENT ON COLUMN faqs.faq_id     IS 'FAQ 고유 식별자';
COMMENT ON COLUMN faqs.admin_id   IS '작성 관리자 FK';
COMMENT ON COLUMN faqs.category   IS '카테고리 (ACCOUNT / PAYMENT / SERVICE / ETC)';
COMMENT ON COLUMN faqs.question   IS '질문';
COMMENT ON COLUMN faqs.answer     IS '답변';
COMMENT ON COLUMN faqs.created_at IS '작성 일시';
COMMENT ON COLUMN faqs.updated_at IS '최종 수정 일시';

-- ================================================
-- 33. ai_models
-- ================================================
CREATE TABLE ai_models (
    ai_model_id        BIGSERIAL    NOT NULL,
    model_name         VARCHAR(100) NOT NULL,
    display_type       VARCHAR(100) NOT NULL,
    provider           VARCHAR(50)  NOT NULL DEFAULT 'OPENAI',
    input_token_price  NUMERIC(12,6) NOT NULL DEFAULT 0,
    output_token_price NUMERIC(12,6) NOT NULL DEFAULT 0,
    is_enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ai_models           PRIMARY KEY (ai_model_id),
    CONSTRAINT uq_ai_models_name      UNIQUE (model_name),
    CONSTRAINT chk_input_token_price  CHECK (input_token_price  >= 0),
    CONSTRAINT chk_output_token_price CHECK (output_token_price >= 0)
);
COMMENT ON TABLE  ai_models                    IS 'AI 모델 테이블';
COMMENT ON COLUMN ai_models.ai_model_id        IS '모델 고유 식별자';
COMMENT ON COLUMN ai_models.model_name         IS '실제 API 호출에 사용하는 모델 이름';
COMMENT ON COLUMN ai_models.display_type       IS '관리자 화면에 표시되는 모델 유형';
COMMENT ON COLUMN ai_models.provider           IS 'AI 모델 제공 기업 이름';
COMMENT ON COLUMN ai_models.input_token_price  IS '입력 토큰 단가';
COMMENT ON COLUMN ai_models.output_token_price IS '출력 토큰 단가';
COMMENT ON COLUMN ai_models.is_enabled         IS '모델 활성화 여부';
COMMENT ON COLUMN ai_models.created_at         IS '모델 등록 시간';
COMMENT ON COLUMN ai_models.updated_at         IS '모델 수정 시간';

-- ================================================
-- 34. ai_usage_logs
-- ================================================
CREATE TABLE ai_usage_logs (
    ai_usage_log_id BIGSERIAL   NOT NULL,
    member_id       UUID        NOT NULL,
    session_id      UUID        NULL,
    ai_model_id     BIGINT      NOT NULL,
    feature_type    VARCHAR(20) NOT NULL,
    input_tokens    INTEGER     NOT NULL,
    output_tokens   INTEGER     NOT NULL,
    cost            NUMERIC(15,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ai_usage_logs     PRIMARY KEY (ai_usage_log_id),
    CONSTRAINT fk_ai_usage_member   FOREIGN KEY (member_id)   REFERENCES members (member_id),
    CONSTRAINT fk_ai_usage_session  FOREIGN KEY (session_id)  REFERENCES interview_sessions (session_id),
    CONSTRAINT fk_ai_usage_model    FOREIGN KEY (ai_model_id) REFERENCES ai_models (ai_model_id),
    CONSTRAINT chk_ai_usage_feature CHECK (feature_type IN ('DOCUMENT', 'INTERVIEW'))
);
COMMENT ON TABLE  ai_usage_logs                 IS 'AI API 사용량 로그 테이블';
COMMENT ON COLUMN ai_usage_logs.ai_usage_log_id IS '사용량 로그 고유 식별자';
COMMENT ON COLUMN ai_usage_logs.member_id       IS '사용 회원 FK';
COMMENT ON COLUMN ai_usage_logs.session_id      IS '면접 세션 FK (NULL 허용)';
COMMENT ON COLUMN ai_usage_logs.ai_model_id     IS '모델 FK';
COMMENT ON COLUMN ai_usage_logs.feature_type    IS '기능 유형 (DOCUMENT / INTERVIEW)';
COMMENT ON COLUMN ai_usage_logs.input_tokens    IS '입력 토큰 수';
COMMENT ON COLUMN ai_usage_logs.output_tokens   IS '출력 토큰 수';
COMMENT ON COLUMN ai_usage_logs.cost            IS '소모 비용 (원 단위)';
COMMENT ON COLUMN ai_usage_logs.created_at      IS '사용 기록 일시';

-- ================================================
-- 35. ai_ops_settings  ※ 싱글톤 테이블 (row = 1개)
-- ================================================
CREATE TABLE ai_ops_settings (
    ai_ops_setting_id  BIGINT      NOT NULL DEFAULT 1,
    selected_model_id  BIGINT      NOT NULL,
    monthly_budget     NUMERIC(15,2) NOT NULL,
    alert_enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
    alert_channel      VARCHAR(20) NOT NULL DEFAULT 'DISCORD',
    alert_threshold    INTEGER     NOT NULL DEFAULT 85,
    rate_limit_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_ai_ops_settings   PRIMARY KEY (ai_ops_setting_id),
    CONSTRAINT fk_ai_ops_model      FOREIGN KEY (selected_model_id) REFERENCES ai_models (ai_model_id),
    CONSTRAINT chk_ai_ops_singleton CHECK (ai_ops_setting_id = 1),
    CONSTRAINT chk_monthly_budget   CHECK (monthly_budget  > 0),
    CONSTRAINT chk_alert_channel    CHECK (alert_channel   IN ('DISCORD', 'SLACK', 'EMAIL')),
    CONSTRAINT chk_alert_threshold  CHECK (alert_threshold BETWEEN 1 AND 100)
);
COMMENT ON TABLE  ai_ops_settings                    IS 'AI 운영 설정 테이블 (싱글톤)';
COMMENT ON COLUMN ai_ops_settings.ai_ops_setting_id  IS '운영 설정 고유 식별자 (항상 1)';
COMMENT ON COLUMN ai_ops_settings.selected_model_id  IS '현재 적용할 AI 모델 FK';
COMMENT ON COLUMN ai_ops_settings.monthly_budget     IS '월간 AI API 예산';
COMMENT ON COLUMN ai_ops_settings.alert_enabled      IS '알림 사용 여부';
COMMENT ON COLUMN ai_ops_settings.alert_channel      IS '알림 채널 (DISCORD / SLACK / EMAIL)';
COMMENT ON COLUMN ai_ops_settings.alert_threshold    IS '알림 발생 임계치 (1~100)';
COMMENT ON COLUMN ai_ops_settings.rate_limit_enabled IS '속도 제한 제어 활성화 여부';
COMMENT ON COLUMN ai_ops_settings.updated_at         IS '운영 설정 수정 일시';

-- ================================================
-- 36. rag_documents
-- ================================================
CREATE TABLE rag_documents (
    rag_document_id    BIGSERIAL    NOT NULL,
    uploaded_by        BIGINT       NOT NULL,
    file_uuid          UUID         NOT NULL DEFAULT gen_random_uuid(),
    original_file_name VARCHAR(255) NOT NULL,
    file_path          TEXT         NOT NULL,
    mime_type          VARCHAR(100) NULL,
    file_size          BIGINT       NULL,
    chunk_count        INTEGER      NOT NULL DEFAULT 0,
    indexing_progress  INTEGER      NOT NULL DEFAULT 0,
    status             VARCHAR(20)  NOT NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_rag_documents    PRIMARY KEY (rag_document_id),
    CONSTRAINT uq_rag_file_uuid    UNIQUE (file_uuid),
    CONSTRAINT fk_rag_admin        FOREIGN KEY (uploaded_by) REFERENCES admins (admin_id),
    CONSTRAINT chk_rag_file_size   CHECK (file_size IS NULL OR file_size >= 0),
    CONSTRAINT chk_rag_chunk_count CHECK (chunk_count       >= 0),
    CONSTRAINT chk_rag_indexing    CHECK (indexing_progress BETWEEN 0 AND 100),
    CONSTRAINT chk_rag_status      CHECK (status IN ('UPLOADED', 'INDEXING', 'SYNCED', 'FAILED'))
);
COMMENT ON TABLE  rag_documents                    IS 'RAG 문서 테이블 (AI 컨텍스트용 관리자 업로드 문서)';
COMMENT ON COLUMN rag_documents.rag_document_id    IS 'RAG 문서 고유 식별자';
COMMENT ON COLUMN rag_documents.uploaded_by        IS '업로드한 관리자 FK';
COMMENT ON COLUMN rag_documents.file_uuid          IS '시스템 내부 파일 식별자 (UNIQUE)';
COMMENT ON COLUMN rag_documents.original_file_name IS '업로드 당시 원본 파일명';
COMMENT ON COLUMN rag_documents.file_path          IS '실제 파일 저장 경로';
COMMENT ON COLUMN rag_documents.mime_type          IS '파일 MIME 타입';
COMMENT ON COLUMN rag_documents.file_size          IS '파일 크기 (byte)';
COMMENT ON COLUMN rag_documents.chunk_count        IS '문서 청크 개수';
COMMENT ON COLUMN rag_documents.indexing_progress  IS '문서 인덱싱 진행률 (0~100)';
COMMENT ON COLUMN rag_documents.status             IS '문서 상태 (UPLOADED / INDEXING / SYNCED / FAILED)';
COMMENT ON COLUMN rag_documents.created_at         IS '문서 등록 시간';
COMMENT ON COLUMN rag_documents.updated_at         IS '문서 수정 시간';

-- ================================================
-- 37. scraping_pipelines
-- ================================================
CREATE TABLE scraping_pipelines (
    scraping_pipeline_id BIGSERIAL    NOT NULL,
    source_name          VARCHAR(50)  NOT NULL,
    display_name         VARCHAR(100) NOT NULL,
    pipeline_status      VARCHAR(20)  NOT NULL DEFAULT 'IDLE',
    is_enabled           BOOLEAN      NOT NULL DEFAULT TRUE,
    last_started_at      TIMESTAMPTZ  NULL,
    last_success_at      TIMESTAMPTZ  NULL,
    last_failed_at       TIMESTAMPTZ  NULL,
    last_duration_ms     INTEGER      NULL,
    last_total_count     INTEGER      NULL,
    last_error_message   TEXT         NULL,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_scraping_pipelines              PRIMARY KEY (scraping_pipeline_id),
    CONSTRAINT uq_scraping_source_name            UNIQUE (source_name),
    CONSTRAINT chk_pipeline_status                CHECK (pipeline_status IN ('IDLE', 'RUNNING', 'SUCCESS', 'FAILED')),
    CONSTRAINT chk_pipeline_last_duration_ms      CHECK (last_duration_ms IS NULL OR last_duration_ms >= 0),
    CONSTRAINT chk_pipeline_last_total_count      CHECK (last_total_count IS NULL OR last_total_count >= 0)
);
COMMENT ON TABLE  scraping_pipelines                      IS '스크래핑 파이프라인 테이블';
COMMENT ON COLUMN scraping_pipelines.scraping_pipeline_id IS '파이프라인 고유 식별자';
COMMENT ON COLUMN scraping_pipelines.source_name         IS '스크래핑 대상 사이트 식별자';
COMMENT ON COLUMN scraping_pipelines.display_name        IS '파이프라인 표시 이름';
COMMENT ON COLUMN scraping_pipelines.pipeline_status     IS '파이프라인 현재 상태 (IDLE / RUNNING / SUCCESS / FAILED)';
COMMENT ON COLUMN scraping_pipelines.is_enabled          IS '파이프라인 활성화 여부 (기본값 TRUE)';
COMMENT ON COLUMN scraping_pipelines.last_started_at     IS '마지막 실행 시작 시각';
COMMENT ON COLUMN scraping_pipelines.last_success_at     IS '마지막 성공 시각';
COMMENT ON COLUMN scraping_pipelines.last_failed_at      IS '마지막 실패 시각';
COMMENT ON COLUMN scraping_pipelines.last_duration_ms    IS '마지막 실행 소요 시간 (ms)';
COMMENT ON COLUMN scraping_pipelines.last_total_count    IS '마지막 실행 시 수집된 공고 수';
COMMENT ON COLUMN scraping_pipelines.last_error_message  IS '최근 실행 시 발생한 오류 메시지';
COMMENT ON COLUMN scraping_pipelines.created_at          IS '생성 일시';
COMMENT ON COLUMN scraping_pipelines.updated_at          IS '수정 일시';

-- ================================================
-- 38. scraping_logs
-- ================================================
CREATE TABLE scraping_logs (
    scraping_log_id      BIGSERIAL   NOT NULL,
    scraping_pipeline_id BIGINT      NULL,
    target_site          VARCHAR(50) NOT NULL,
    scraping_status VARCHAR(10) NOT NULL,
    total_count     INTEGER     NULL,
    error_message   TEXT        NULL,
    executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_scraping_logs          PRIMARY KEY (scraping_log_id),
    CONSTRAINT chk_scraping_status      CHECK (scraping_status IN ('SUCCESS', 'FAILED')),
    CONSTRAINT fk_scraping_logs_pipeline FOREIGN KEY (scraping_pipeline_id) REFERENCES scraping_pipelines (scraping_pipeline_id)
);
CREATE INDEX idx_scraping_logs_pipeline_id ON scraping_logs (scraping_pipeline_id);
COMMENT ON TABLE  scraping_logs                 IS '채용 공고 스크래핑 실행 로그 테이블';
COMMENT ON COLUMN scraping_logs.scraping_log_id      IS '스크래핑 로그 고유 식별자';
COMMENT ON COLUMN scraping_logs.scraping_pipeline_id IS '연결된 파이프라인 ID (NULL 허용)';
COMMENT ON COLUMN scraping_logs.target_site          IS '스크래핑 대상 사이트 (WANTED / JUMPIT 등)';
COMMENT ON COLUMN scraping_logs.scraping_status IS '수행 결과 (SUCCESS / FAILED)';
COMMENT ON COLUMN scraping_logs.total_count     IS '수집된 공고 수';
COMMENT ON COLUMN scraping_logs.error_message   IS '실패 시 오류 메시지';
COMMENT ON COLUMN scraping_logs.executed_at     IS '스크래핑 실행 일시';

-- ================================================
-- 39. member_product_entitlements
-- ================================================
CREATE TABLE member_product_entitlements (
    entitlement_id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    member_id              UUID        NOT NULL,
    product_code           VARCHAR(30) NOT NULL,
    plan_type              VARCHAR(20) NOT NULL DEFAULT 'FREE',
    free_remaining         INTEGER     NOT NULL DEFAULT 1,
    free_usage_status      VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    active_subscription_id UUID        NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_entitlements             PRIMARY KEY (entitlement_id),
    CONSTRAINT uq_member_product           UNIQUE (member_id, product_code),
    CONSTRAINT fk_entitlement_member       FOREIGN KEY (member_id)              REFERENCES members (member_id),
    CONSTRAINT fk_entitlement_subscription FOREIGN KEY (active_subscription_id) REFERENCES subscriptions (subscription_id),
    CONSTRAINT chk_plan_type               CHECK (plan_type IN ('FREE', 'PREMIUM')),
    CONSTRAINT chk_free_usage_status       CHECK (free_usage_status IN ('AVAILABLE', 'RESERVED', 'USED', 'FORFEITED')),
    CONSTRAINT chk_free_remaining          CHECK (free_remaining BETWEEN 0 AND 1),
    CONSTRAINT chk_available_remaining     CHECK (free_usage_status != 'AVAILABLE' OR free_remaining = 1),
    CONSTRAINT chk_consumed_remaining      CHECK (free_usage_status NOT IN ('USED', 'FORFEITED') OR free_remaining = 0)
);
COMMENT ON TABLE  member_product_entitlements                        IS '회원별 상품 등급 및 무료 이용권 상태';
COMMENT ON COLUMN member_product_entitlements.entitlement_id         IS '권한 고유 식별자';
COMMENT ON COLUMN member_product_entitlements.member_id              IS '회원 FK';
COMMENT ON COLUMN member_product_entitlements.product_code           IS '상품 코드 (document-coaching / interview)';
COMMENT ON COLUMN member_product_entitlements.plan_type              IS '현재 등급 (FREE / PREMIUM)';
COMMENT ON COLUMN member_product_entitlements.free_remaining         IS '무료 이용권 잔여 횟수 (0 또는 1)';
COMMENT ON COLUMN member_product_entitlements.free_usage_status      IS '무료 이용권 상태 (AVAILABLE / RESERVED / USED / FORFEITED)';
COMMENT ON COLUMN member_product_entitlements.active_subscription_id IS '현재 연결된 구독 ID (PREMIUM인 경우)';
COMMENT ON COLUMN member_product_entitlements.created_at             IS '생성 일시';
COMMENT ON COLUMN member_product_entitlements.updated_at             IS '수정 일시';

-- ================================================
-- 40. subscription_usage_periods
-- ================================================
CREATE TABLE subscription_usage_periods (
    usage_period_id   UUID        NOT NULL DEFAULT gen_random_uuid(),
    subscription_id   UUID        NOT NULL,
    product_code      VARCHAR(30) NOT NULL,
    period_start      TIMESTAMPTZ NOT NULL,
    period_end        TIMESTAMPTZ NOT NULL,
    limit_count       INTEGER     NOT NULL,
    used_count        INTEGER     NOT NULL DEFAULT 0,
    reserved_count    INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_usage_periods       PRIMARY KEY (usage_period_id),
    CONSTRAINT uq_sub_period_start    UNIQUE (subscription_id, period_start),
    CONSTRAINT fk_usage_period_sub    FOREIGN KEY (subscription_id) REFERENCES subscriptions (subscription_id),
    CONSTRAINT chk_usage_count        CHECK (used_count + reserved_count <= limit_count),
    CONSTRAINT chk_limit_count        CHECK (limit_count > 0),
    CONSTRAINT chk_used_count         CHECK (used_count >= 0),
    CONSTRAINT chk_reserved_count     CHECK (reserved_count >= 0),
    CONSTRAINT excl_sub_period_no_overlap EXCLUDE USING gist (
        subscription_id WITH =,
        tstzrange(period_start, period_end) WITH &&
    )
);
COMMENT ON TABLE  subscription_usage_periods                    IS '구독 월별 제공량 및 사용량';
COMMENT ON COLUMN subscription_usage_periods.usage_period_id   IS '사용 기간 고유 식별자';
COMMENT ON COLUMN subscription_usage_periods.subscription_id   IS '구독 FK';
COMMENT ON COLUMN subscription_usage_periods.product_code      IS '상품 코드';
COMMENT ON COLUMN subscription_usage_periods.period_start      IS '기간 시작 일시';
COMMENT ON COLUMN subscription_usage_periods.period_end        IS '기간 종료 일시';
COMMENT ON COLUMN subscription_usage_periods.limit_count       IS '월 최대 제공 횟수';
COMMENT ON COLUMN subscription_usage_periods.used_count        IS '확정된 사용 횟수';
COMMENT ON COLUMN subscription_usage_periods.reserved_count    IS '진행 중 예약 횟수';
COMMENT ON COLUMN subscription_usage_periods.created_at        IS '생성 일시';
COMMENT ON COLUMN subscription_usage_periods.updated_at        IS '수정 일시';

-- ================================================
-- 41. service_usage_records
-- ================================================
CREATE TABLE service_usage_records (
    usage_record_id   UUID        NOT NULL DEFAULT gen_random_uuid(),
    member_id         UUID        NOT NULL,
    product_code      VARCHAR(30) NOT NULL,
    resource_type     VARCHAR(20) NOT NULL,
    resource_id       UUID        NOT NULL,
    usage_source      VARCHAR(20) NOT NULL,
    usage_status      VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    usage_period_id   UUID        NULL,
    reserved_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumed_at       TIMESTAMPTZ NULL,
    released_at       TIMESTAMPTZ NULL,

    CONSTRAINT pk_usage_records        PRIMARY KEY (usage_record_id),
    CONSTRAINT uq_resource             UNIQUE (resource_type, resource_id),
    CONSTRAINT fk_usage_record_member  FOREIGN KEY (member_id)        REFERENCES members (member_id),
    CONSTRAINT fk_usage_record_period  FOREIGN KEY (usage_period_id)  REFERENCES subscription_usage_periods (usage_period_id),
    CONSTRAINT chk_resource_type       CHECK (resource_type IN ('DOCUMENT', 'INTERVIEW_SESSION')),
    CONSTRAINT chk_usage_source        CHECK (usage_source IN ('FREE', 'SUBSCRIPTION')),
    CONSTRAINT chk_usage_status        CHECK (usage_status IN ('RESERVED', 'CONSUMED', 'RELEASED'))
);
COMMENT ON TABLE  service_usage_records                  IS '무료·구독 서비스 사용 이력 통합 관리';
COMMENT ON COLUMN service_usage_records.usage_record_id  IS '사용 기록 고유 식별자';
COMMENT ON COLUMN service_usage_records.member_id        IS '회원 FK';
COMMENT ON COLUMN service_usage_records.product_code     IS '상품 코드';
COMMENT ON COLUMN service_usage_records.resource_type    IS '리소스 유형 (DOCUMENT / INTERVIEW_SESSION)';
COMMENT ON COLUMN service_usage_records.resource_id      IS 'documentId 또는 sessionId';
COMMENT ON COLUMN service_usage_records.usage_source     IS '사용 출처 (FREE / SUBSCRIPTION)';
COMMENT ON COLUMN service_usage_records.usage_status     IS '사용 상태 (RESERVED / CONSUMED / RELEASED)';
COMMENT ON COLUMN service_usage_records.usage_period_id  IS '구독 사용인 경우 연결된 사용 기간 FK';
COMMENT ON COLUMN service_usage_records.reserved_at      IS '예약 일시';
COMMENT ON COLUMN service_usage_records.consumed_at      IS '확정 일시';
COMMENT ON COLUMN service_usage_records.released_at      IS '해제 일시';

-- ================================================
-- 42. billing_consents
-- ================================================
CREATE TABLE billing_consents (
    billing_consent_id UUID        NOT NULL DEFAULT gen_random_uuid(),
    member_id          UUID        NOT NULL,
    plan_id            BIGINT      NOT NULL,
    terms_version      VARCHAR(30) NOT NULL,
    agreed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at         TIMESTAMPTZ NULL,

    CONSTRAINT pk_billing_consents     PRIMARY KEY (billing_consent_id),
    CONSTRAINT fk_consent_member       FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT fk_consent_plan         FOREIGN KEY (plan_id)   REFERENCES plans (plan_id)
);
CREATE INDEX IF NOT EXISTS idx_billing_consents_member_plan_active_agreed
    ON billing_consents (member_id, plan_id, agreed_at DESC)
    WHERE revoked_at IS NULL;
COMMENT ON TABLE  billing_consents                    IS '자동결제 약관 동의 이력';
COMMENT ON COLUMN billing_consents.billing_consent_id IS '동의 고유 식별자';
COMMENT ON COLUMN billing_consents.member_id          IS '회원 FK';
COMMENT ON COLUMN billing_consents.plan_id            IS '동의 대상 플랜 FK';
COMMENT ON COLUMN billing_consents.terms_version      IS '동의한 약관 버전';
COMMENT ON COLUMN billing_consents.agreed_at          IS '동의 일시';
COMMENT ON COLUMN billing_consents.revoked_at         IS '동의 철회 일시';

-- ================================================
-- SEED DATA (로컬 개발·테스트용)
-- 비밀번호: Test1234! (BCrypt $2b$12$...)
-- ================================================

-- plans
INSERT INTO plans (product_code, plan_name, plan_price, monthly_usage_limit, currency, billing_cycle)
VALUES
    ('document-coaching', '서류 AI 코칭 PREMIUM', 9900,  30, 'KRW', 'MONTHLY'),
    ('interview',         'AI 면접 PREMIUM',       9900,  20, 'KRW', 'MONTHLY')
ON CONFLICT (product_code) DO NOTHING;

-- members
INSERT INTO members (member_id, login_id, email, password, name, role_type, member_status, subscription_status)
VALUES
    ('aaaaaaaa-0001-0001-0001-000000000001', 'testuser01', 'testuser01@careerwave.test', '$2b$12$8MqNOftEy6rMJIwO9YjL5.IT3U3/71kRcDSVf0zT5hgOA7FKBKwjq', '테스트유저01', 'USER', 'ACTIVE',    'FREE'),
    ('aaaaaaaa-0002-0002-0002-000000000002', 'testuser02', 'testuser02@careerwave.test', '$2b$12$8MqNOftEy6rMJIwO9YjL5.IT3U3/71kRcDSVf0zT5hgOA7FKBKwjq', '테스트유저02', 'USER', 'ACTIVE',    'PREMIUM'),
    ('aaaaaaaa-0003-0003-0003-000000000003', 'testuser03', 'testuser03@careerwave.test', '$2b$12$8MqNOftEy6rMJIwO9YjL5.IT3U3/71kRcDSVf0zT5hgOA7FKBKwjq', '테스트유저03', 'USER', 'ACTIVE',    'PREMIUM'),
    ('aaaaaaaa-0004-0004-0004-000000000004', 'testuser04', 'testuser04@careerwave.test', '$2b$12$8MqNOftEy6rMJIwO9YjL5.IT3U3/71kRcDSVf0zT5hgOA7FKBKwjq', '테스트유저04', 'USER', 'ACTIVE',    'PREMIUM'),
    ('aaaaaaaa-0005-0005-0005-000000000005', 'testuser05', 'testuser05@careerwave.test', '$2b$12$8MqNOftEy6rMJIwO9YjL5.IT3U3/71kRcDSVf0zT5hgOA7FKBKwjq', '테스트유저05', 'USER', 'SUSPENDED', 'FREE')
ON CONFLICT (login_id) DO NOTHING;

-- subscriptions (testuser02: 면접 PREMIUM, testuser03: 서류 PREMIUM, testuser04: 전체 PREMIUM)
INSERT INTO subscriptions (subscription_id, member_id, plan_id, subscription_status, started_at, current_period_start, current_period_end, auto_renew)
VALUES
    ('bbbbbbbb-0002-0002-0002-000000000001', 'aaaaaaaa-0002-0002-0002-000000000002', (SELECT plan_id FROM plans WHERE product_code = 'interview'),         'ACTIVE', NOW(), NOW(), NOW() + INTERVAL '1 month', TRUE),
    ('bbbbbbbb-0003-0003-0003-000000000001', 'aaaaaaaa-0003-0003-0003-000000000003', (SELECT plan_id FROM plans WHERE product_code = 'document-coaching'), 'ACTIVE', NOW(), NOW(), NOW() + INTERVAL '1 month', TRUE),
    ('bbbbbbbb-0004-0004-0004-000000000001', 'aaaaaaaa-0004-0004-0004-000000000004', (SELECT plan_id FROM plans WHERE product_code = 'interview'),         'ACTIVE', NOW(), NOW(), NOW() + INTERVAL '1 month', TRUE),
    ('bbbbbbbb-0004-0004-0004-000000000002', 'aaaaaaaa-0004-0004-0004-000000000004', (SELECT plan_id FROM plans WHERE product_code = 'document-coaching'), 'ACTIVE', NOW(), NOW(), NOW() + INTERVAL '1 month', TRUE)
ON CONFLICT DO NOTHING;

-- member_product_entitlements
INSERT INTO member_product_entitlements (member_id, product_code, plan_type, free_remaining, free_usage_status, active_subscription_id)
VALUES
    -- testuser01: FREE (무료 이용권 각 1회)
    ('aaaaaaaa-0001-0001-0001-000000000001', 'document-coaching', 'FREE',    1, 'AVAILABLE', NULL),
    ('aaaaaaaa-0001-0001-0001-000000000001', 'interview',         'FREE',    1, 'AVAILABLE', NULL),
    -- testuser02: 면접 PREMIUM
    ('aaaaaaaa-0002-0002-0002-000000000002', 'interview',         'PREMIUM', 0, 'USED',      'bbbbbbbb-0002-0002-0002-000000000001'),
    ('aaaaaaaa-0002-0002-0002-000000000002', 'document-coaching', 'FREE',    1, 'AVAILABLE', NULL),
    -- testuser03: 서류 PREMIUM
    ('aaaaaaaa-0003-0003-0003-000000000003', 'document-coaching', 'PREMIUM', 0, 'USED',      'bbbbbbbb-0003-0003-0003-000000000001'),
    ('aaaaaaaa-0003-0003-0003-000000000003', 'interview',         'FREE',    1, 'AVAILABLE', NULL),
    -- testuser04: 전체 PREMIUM
    ('aaaaaaaa-0004-0004-0004-000000000004', 'interview',         'PREMIUM', 0, 'USED',      'bbbbbbbb-0004-0004-0004-000000000001'),
    ('aaaaaaaa-0004-0004-0004-000000000004', 'document-coaching', 'PREMIUM', 0, 'USED',      'bbbbbbbb-0004-0004-0004-000000000002'),
    -- testuser05: SUSPENDED FREE
    ('aaaaaaaa-0005-0005-0005-000000000005', 'document-coaching', 'FREE',    1, 'AVAILABLE', NULL),
    ('aaaaaaaa-0005-0005-0005-000000000005', 'interview',         'FREE',    1, 'AVAILABLE', NULL)
ON CONFLICT (member_id, product_code) DO NOTHING;
