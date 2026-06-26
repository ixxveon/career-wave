CREATE TABLE IF NOT EXISTS terms_documents (
    document_code  VARCHAR(40)  NOT NULL,
    version        VARCHAR(30)  NOT NULL,
    effective_from TIMESTAMPTZ  NOT NULL,
    content_hash   VARCHAR(128) NOT NULL,
    published_url  VARCHAR(500) NOT NULL,
    required       BOOLEAN      NOT NULL,

    CONSTRAINT pk_terms_documents PRIMARY KEY (document_code, version)
);

COMMENT ON TABLE  terms_documents                IS '약관 및 동의 문서 버전 정의 테이블';
COMMENT ON COLUMN terms_documents.document_code  IS '문서 코드';
COMMENT ON COLUMN terms_documents.version        IS '문서 버전';
COMMENT ON COLUMN terms_documents.effective_from IS '문서 적용 시작 일시';
COMMENT ON COLUMN terms_documents.content_hash   IS '문서 전문 식별용 해시';
COMMENT ON COLUMN terms_documents.published_url  IS '공개 문서 URL';
COMMENT ON COLUMN terms_documents.required       IS '가입 시 필수 동의 여부';

INSERT INTO terms_documents (document_code, version, effective_from, content_hash, published_url, required) VALUES
('SERVICE_TERMS', '2026-06-26', '2026-06-26T00:00:00+09:00', 'e180aceefd614676f625c7d06dc5c93131e026a90a80c3e9cf75f0947a057119', '/terms', TRUE),
('PRIVACY_COLLECTION', '2026-06-26', '2026-06-26T00:00:00+09:00', '8db0fe932d63bfefbe5ae78ff87827b9a9f2b03002df0093aa2d94dee5c53df2', '/privacy', TRUE),
('PRIVACY_POLICY', '2026-06-26', '2026-06-26T00:00:00+09:00', '457d24d5da82f1bbd972cbec3c8c3b41edbb4d55ca6cf632f123dc85965f35a5', '/privacy', FALSE),
('MARKETING', '2026-06-26', '2026-06-26T00:00:00+09:00', '5c02234e33e97d8ab4dc65c9ae79cc6bfa31fef8ac0822f23067892286d3a7b1', '/terms', FALSE),
('COMPANY_VERIFICATION', '2026-06-26', '2026-06-26T00:00:00+09:00', '9d50c632843156bcf34ddf7436fece7adaffac8feeebe5473b383489ed0363a7', '/terms', TRUE),
('SMS_TERMS', '2026-06-26', '2026-06-26T00:00:00+09:00', '615af848202df4b47b4ef00ba3da71f71c306954c54a7e471153fdcf65c7f8bd', '/terms', TRUE),
('BILLING_TERMS', '2026-06-26', '2026-06-26T00:00:00+09:00', 'ae7fc33a5b3ceb655e130dccc00e1016b716d5ceb9a3f966ad50015e6954c7b9', '/billing/terms', FALSE)
ON CONFLICT (document_code, version) DO UPDATE SET
    effective_from = EXCLUDED.effective_from,
    content_hash = EXCLUDED.content_hash,
    published_url = EXCLUDED.published_url,
    required = EXCLUDED.required;

CREATE TABLE IF NOT EXISTS member_terms_document_agreements (
    agreement_event_id BIGSERIAL    NOT NULL,
    member_id          UUID         NOT NULL,
    document_code      VARCHAR(40)  NOT NULL,
    version            VARCHAR(30)  NOT NULL,
    agreed             BOOLEAN      NOT NULL,
    agreed_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    revoked_at         TIMESTAMPTZ  NULL,
    ip_address_hash    VARCHAR(128) NULL,
    user_agent_hash    VARCHAR(128) NULL,

    CONSTRAINT pk_member_terms_document_agreements PRIMARY KEY (agreement_event_id),
    CONSTRAINT fk_terms_document_agreement_member FOREIGN KEY (member_id) REFERENCES members (member_id),
    CONSTRAINT fk_terms_document_agreement_document FOREIGN KEY (document_code, version) REFERENCES terms_documents (document_code, version)
);

CREATE INDEX IF NOT EXISTS idx_member_terms_document_agreements_member_document
    ON member_terms_document_agreements (member_id, document_code, version);

COMMENT ON TABLE  member_terms_document_agreements                    IS '회원별 약관 문서 버전 동의 증적 테이블';
COMMENT ON COLUMN member_terms_document_agreements.agreement_event_id IS '약관 문서 동의 증적 식별자';
COMMENT ON COLUMN member_terms_document_agreements.member_id          IS '회원 FK';
COMMENT ON COLUMN member_terms_document_agreements.document_code      IS '동의 문서 코드';
COMMENT ON COLUMN member_terms_document_agreements.version            IS '동의 문서 버전';
COMMENT ON COLUMN member_terms_document_agreements.agreed             IS '동의 여부';
COMMENT ON COLUMN member_terms_document_agreements.agreed_at          IS '동의 또는 거부 기록 시각';
COMMENT ON COLUMN member_terms_document_agreements.revoked_at         IS '선택 동의 철회 시각';
COMMENT ON COLUMN member_terms_document_agreements.ip_address_hash    IS '동의 요청 IP 해시';
COMMENT ON COLUMN member_terms_document_agreements.user_agent_hash    IS '동의 요청 User-Agent 해시';
