-- Admin domain demo seed.
-- Run after db/init.sql and db/seed-local.sql.
-- RAG data is intentionally excluded because the feature is not ready for demo.

-- Remove only records owned by this demo seed so the script can be rerun safely.
DELETE FROM ai_usage_logs
WHERE member_id IN (
    SELECT member_id FROM members WHERE login_id LIKE 'admin-demo-user-%'
)
OR admin_id IN (
    SELECT admin_id FROM admins WHERE login_id IN ('admin_ops_demo', 'admin_cs_demo', 'admin_backend_demo', 'admin_locked_demo')
);

DELETE FROM interview_sessions
WHERE member_id IN (
    SELECT member_id FROM members WHERE login_id LIKE 'admin-demo-user-%'
);

DELETE FROM payments
WHERE order_id LIKE 'ADMIN-DEMO-%';

DELETE FROM audit_logs
WHERE search_text LIKE '[DEMO] admin-domain%';

DELETE FROM scraping_logs
WHERE error_message LIKE '[DEMO] admin-domain%';

-- Additional accounts make the admin management filters and summary meaningful.
INSERT INTO admins (
    login_id, email, password_hash, name, admin_role, status,
    last_login_at, last_login_ip, created_at, updated_at
)
VALUES
    ('admin_ops_demo', 'ops-demo@career-wave.local', '$2b$10$NPp0Acje.rj.VrDuRiPT2u.dXnCKzYGmxZn7Ro2BOw4qGDZIPr34W', 'Operations Admin', 'MASTER', 'ACTIVE', NOW() - INTERVAL '12 minutes', '10.20.0.11', NOW() - INTERVAL '40 days', NOW()),
    ('admin_cs_demo', 'cs-demo@career-wave.local', '$2b$10$NPp0Acje.rj.VrDuRiPT2u.dXnCKzYGmxZn7Ro2BOw4qGDZIPr34W', 'Customer Support', 'CS', 'ACTIVE', NOW() - INTERVAL '36 minutes', '10.20.0.21', NOW() - INTERVAL '30 days', NOW()),
    ('admin_backend_demo', 'backend-demo@career-wave.local', '$2b$10$NPp0Acje.rj.VrDuRiPT2u.dXnCKzYGmxZn7Ro2BOw4qGDZIPr34W', 'Platform Engineer', 'BACKEND', 'ACTIVE', NOW() - INTERVAL '3 hours', '10.20.0.31', NOW() - INTERVAL '20 days', NOW()),
    ('admin_locked_demo', 'locked-demo@career-wave.local', '$2b$10$NPp0Acje.rj.VrDuRiPT2u.dXnCKzYGmxZn7Ro2BOw4qGDZIPr34W', 'Locked Demo Account', 'CS', 'LOCKED', NOW() - INTERVAL '8 days', '10.20.0.22', NOW() - INTERVAL '12 days', NOW())
ON CONFLICT (login_id) DO UPDATE SET
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name,
    admin_role = EXCLUDED.admin_role,
    status = EXCLUDED.status,
    last_login_at = EXCLUDED.last_login_at,
    last_login_ip = EXCLUDED.last_login_ip,
    updated_at = NOW();

-- Seven days of new-user data drives the dashboard signup chart and AI heavy-user ranking.
INSERT INTO members (
    login_id, email, password, name, role_type, member_status, subscription_status,
    warning_count, last_login_at, created_at, updated_at
)
SELECT
    'admin-demo-user-' || LPAD(day_offset::TEXT, 2, '0'),
    'admin-demo-user-' || LPAD(day_offset::TEXT, 2, '0') || '@career-wave.local',
    '$2b$10$ZjFpVBbyD9p.j4ZzCznhQultNGDWlje5i0AvrrgZi8pZCzxmDKEgS',
    'Demo User ' || LPAD(day_offset::TEXT, 2, '0'),
    'USER',
    'ACTIVE',
    CASE WHEN day_offset % 3 = 0 THEN 'PREMIUM' ELSE 'FREE' END,
    0,
    NOW() - (day_offset || ' hours')::INTERVAL,
    date_trunc('day', NOW()) - (day_offset || ' days')::INTERVAL + INTERVAL '10 hours',
    NOW()
FROM generate_series(0, 6) AS day_offset
ON CONFLICT (login_id) DO UPDATE SET
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    name = EXCLUDED.name,
    role_type = EXCLUDED.role_type,
    member_status = EXCLUDED.member_status,
    subscription_status = EXCLUDED.subscription_status,
    warning_count = EXCLUDED.warning_count,
    last_login_at = EXCLUDED.last_login_at,
    updated_at = NOW();

-- Paid orders produce a non-empty revenue KPI and payment-method ratio.
INSERT INTO payments (
    member_id, plan_id, product_code, order_id, payment_key, idempotency_key,
    customer_key, customer_name, customer_email, amount, currency,
    payment_status, payment_method, payment_type, attempt_sequence,
    approved_at, created_at, updated_at
)
SELECT
    m.member_id,
    p.plan_id,
    p.product_code,
    'ADMIN-DEMO-' || LPAD(row_number() OVER (ORDER BY m.login_id)::TEXT, 3, '0'),
    'ADMIN-DEMO-PAYMENT-' || LPAD(row_number() OVER (ORDER BY m.login_id)::TEXT, 3, '0'),
    'ADMIN-DEMO-IDEMPOTENCY-' || LPAD(row_number() OVER (ORDER BY m.login_id)::TEXT, 3, '0'),
    'ADMIN-DEMO-CUSTOMER-' || LPAD(row_number() OVER (ORDER BY m.login_id)::TEXT, 3, '0'),
    m.name,
    m.email,
    p.plan_price,
    'KRW',
    'PAID',
    CASE WHEN row_number() OVER (ORDER BY m.login_id) <= 5 THEN 'CARD' ELSE 'VIRTUAL_ACCOUNT' END,
    'MANUAL',
    0,
    NOW() - (row_number() OVER (ORDER BY m.login_id) || ' hours')::INTERVAL,
    NOW() - (row_number() OVER (ORDER BY m.login_id) || ' hours')::INTERVAL,
    NOW()
FROM members m
JOIN plans p ON p.product_code = CASE WHEN m.login_id IN ('admin-demo-user-01', 'admin-demo-user-03', 'admin-demo-user-05') THEN 'document-coaching' ELSE 'interview' END
WHERE m.login_id LIKE 'admin-demo-user-%';

-- Completed interview sessions are used by the dashboard's service KPI.
INSERT INTO interview_sessions (
    member_id, session_type, session_status, interview_type, target_company,
    focus_type, total_score, started_at, ended_at, created_at, updated_at
)
SELECT
    m.member_id,
    CASE WHEN row_number() OVER (ORDER BY m.login_id) % 2 = 0 THEN 'VOICE' ELSE 'TEXT' END,
    'COMPLETED',
    CASE WHEN row_number() OVER (ORDER BY m.login_id) % 2 = 0 THEN 'TECHNICAL' ELSE 'PROJECT' END,
    CASE WHEN row_number() OVER (ORDER BY m.login_id) % 2 = 0 THEN 'CareerWave' ELSE 'Demo Labs' END,
    'TECHNICAL_DEPTH',
    72 + row_number() OVER (ORDER BY m.login_id)::INTEGER,
    NOW() - (row_number() OVER (ORDER BY m.login_id) || ' hours')::INTERVAL,
    NOW() - ((row_number() OVER (ORDER BY m.login_id) || ' hours')::INTERVAL - INTERVAL '25 minutes'),
    NOW() - (row_number() OVER (ORDER BY m.login_id) || ' hours')::INTERVAL,
    NOW()
FROM members m
WHERE m.login_id LIKE 'admin-demo-user-%';

-- Member-facing AI usage gives the metrics page seven-day trends, feature splits, and heavy users.
INSERT INTO ai_usage_logs (
    member_id, ai_model_id, feature_type, input_tokens, output_tokens, cost, created_at
)
SELECT
    m.member_id,
    model.ai_model_id,
    CASE (day_offset + user_rank) % 4
        WHEN 0 THEN 'DOCUMENT'
        WHEN 1 THEN 'INTERVIEW'
        WHEN 2 THEN 'INTERVIEW_STT'
        ELSE 'INTERVIEW_TTS'
    END,
    900 + (user_rank * 130) + (day_offset * 45),
    450 + (user_rank * 85) + (day_offset * 30),
    ROUND((0.003 + user_rank * 0.0007 + day_offset * 0.0002)::NUMERIC, 6),
    date_trunc('day', NOW()) - (day_offset || ' days')::INTERVAL + ((8 + user_rank) || ' hours')::INTERVAL
FROM (
    SELECT member_id, ROW_NUMBER() OVER (ORDER BY login_id)::INTEGER AS user_rank
    FROM members
    WHERE login_id LIKE 'admin-demo-user-%'
) m
CROSS JOIN generate_series(0, 6) AS day_offset
CROSS JOIN LATERAL (
    SELECT ai_model_id FROM ai_models WHERE model_name = 'gpt-4o-mini' LIMIT 1
) model;

-- Admin-only features must use admin_id instead of member_id by schema constraint.
INSERT INTO ai_usage_logs (
    admin_id, ai_model_id, feature_type, input_tokens, output_tokens, cost, created_at
)
SELECT
    a.admin_id,
    model.ai_model_id,
    CASE WHEN series_no % 2 = 0 THEN 'ADMIN_CS' ELSE 'ADMIN_REPORT' END,
    1200 + series_no * 70,
    500 + series_no * 35,
    ROUND((0.004 + series_no * 0.0003)::NUMERIC, 6),
    NOW() - (series_no || ' hours')::INTERVAL
FROM admins a
CROSS JOIN generate_series(1, 12) AS series_no
CROSS JOIN LATERAL (
    SELECT ai_model_id FROM ai_models WHERE model_name = 'gpt-4o' LIMIT 1
) model
WHERE a.login_id IN ('admin_ops_demo', 'admin_cs_demo');

-- Recent activity and warning entries feed both the audit screen and dashboard alerts.
INSERT INTO audit_logs (
    admin_id, log_type, action, target_type, target_id, ip_address,
    severity, detail, search_text, created_at
)
SELECT
    a.admin_id,
    seed.log_type,
    seed.action,
    seed.target_type,
    seed.target_id,
    seed.ip_address,
    seed.severity,
    seed.detail,
    '[DEMO] admin-domain ' || seed.action || ' ' || seed.target_type || ' ' || seed.target_id || ' ' || seed.detail,
    NOW() - seed.ago
FROM (
    VALUES
        ('admin_ops_demo', 'ADMIN_MANAGEMENT', 'CREATE_ADMIN', 'ADMIN', 'admin_backend_demo', '10.20.0.11', 'SUCCESS', 'Created backend administrator account.', INTERVAL '20 minutes'),
        ('admin_cs_demo', 'ADMIN_ACTIVITY', 'REPLY_INQUIRY', 'INQUIRY', 'DEMO-INQ-102', '10.20.0.21', 'SUCCESS', 'Answered a payment inquiry.', INTERVAL '45 minutes'),
        ('admin_ops_demo', 'AI_METRICS_SYSTEM', 'UPDATE_AI_BUDGET', 'AI_OPS_SETTING', '1', '10.20.0.11', 'INFO', 'Monthly AI budget threshold updated to 85 percent.', INTERVAL '2 hours'),
        ('admin_backend_demo', 'SCRAPING_SYSTEM', 'RUN_PIPELINE', 'SCRAPING_PIPELINE', 'wanted', '10.20.0.31', 'SUCCESS', 'Wanted pipeline collected 184 job postings.', INTERVAL '3 hours'),
        ('admin_backend_demo', 'SCRAPING_SYSTEM', 'PIPELINE_FAILED', 'SCRAPING_PIPELINE', 'saramin', '10.20.0.31', 'ERROR', 'Saramin response timeout requires retry.', INTERVAL '4 hours'),
        ('admin_ops_demo', 'ADMIN_MANAGEMENT', 'LOCK_ADMIN', 'ADMIN', 'admin_locked_demo', '10.20.0.11', 'WARN', 'Locked after repeated authentication failures.', INTERVAL '6 hours'),
        ('admin_cs_demo', 'ADMIN_ACTIVITY', 'PROCESS_REPORT', 'REPORT', 'DEMO-REPORT-8', '10.20.0.21', 'INFO', 'Reviewed community report and kept content visible.', INTERVAL '1 day'),
        ('admin_ops_demo', 'AI_METRICS_SYSTEM', 'RATE_LIMIT_CHECK', 'AI_OPS_SETTING', '1', '10.20.0.11', 'WARN', 'AI usage reached 82 percent of the warning threshold.', INTERVAL '2 days'),
        ('admin_backend_demo', 'SCRAPING_SYSTEM', 'RETRY_PIPELINE', 'SCRAPING_PIPELINE', 'saramin', '10.20.0.31', 'SUCCESS', 'Retry completed after source recovery.', INTERVAL '3 days'),
        ('admin_cs_demo', 'ADMIN_ACTIVITY', 'SUSPEND_MEMBER', 'MEMBER', 'admin-demo-user-06', '10.20.0.21', 'INFO', 'Demo moderation review recorded.', INTERVAL '5 days')
) AS seed(admin_login_id, log_type, action, target_type, target_id, ip_address, severity, detail, ago)
JOIN admins a ON a.login_id = seed.admin_login_id;

-- Keep the default four sources, but give each a distinct operational state.
UPDATE scraping_pipelines
SET
    display_name = CASE source_name
        WHEN 'groupby' THEN 'GroupBy'
        WHEN 'jumpit' THEN 'Jumpit'
        WHEN 'wanted' THEN 'Wanted'
        WHEN 'saramin' THEN 'Saramin'
    END,
    pipeline_status = CASE source_name
        WHEN 'groupby' THEN 'SUCCESS'
        WHEN 'jumpit' THEN 'IDLE'
        WHEN 'wanted' THEN 'RUNNING'
        WHEN 'saramin' THEN 'FAILED'
    END,
    is_enabled = source_name <> 'jumpit',
    schedule_interval_minutes = CASE source_name WHEN 'wanted' THEN 180 ELSE 360 END,
    last_started_at = CASE source_name
        WHEN 'wanted' THEN NOW() - INTERVAL '7 minutes'
        ELSE NOW() - INTERVAL '2 hours'
    END,
    last_success_at = CASE source_name
        WHEN 'groupby' THEN NOW() - INTERVAL '2 hours'
        WHEN 'jumpit' THEN NOW() - INTERVAL '8 hours'
        WHEN 'wanted' THEN NOW() - INTERVAL '5 hours'
        ELSE NOW() - INTERVAL '2 days'
    END,
    last_failed_at = CASE WHEN source_name = 'saramin' THEN NOW() - INTERVAL '18 minutes' ELSE NULL END,
    last_duration_ms = CASE source_name
        WHEN 'groupby' THEN 18420
        WHEN 'jumpit' THEN 21070
        WHEN 'wanted' THEN 0
        WHEN 'saramin' THEN 30210
    END,
    last_total_count = CASE source_name
        WHEN 'groupby' THEN 128
        WHEN 'jumpit' THEN 94
        WHEN 'wanted' THEN 184
        WHEN 'saramin' THEN 0
    END,
    last_error_message = CASE WHEN source_name = 'saramin' THEN 'Request timeout after 30 seconds.' ELSE NULL END,
    updated_at = NOW()
WHERE source_name IN ('groupby', 'jumpit', 'wanted', 'saramin');

INSERT INTO scraping_logs (
    scraping_pipeline_id, target_site, scraping_status, total_count, error_message, executed_at
)
SELECT
    pipeline.scraping_pipeline_id,
    seed.source_name,
    seed.scraping_status,
    seed.total_count,
    '[DEMO] admin-domain ' || seed.message,
    NOW() - seed.ago
FROM (
    VALUES
        ('groupby', 'SUCCESS', 128, 'GroupBy collection completed.', INTERVAL '2 hours'),
        ('wanted', 'SUCCESS', 184, 'Wanted collection completed.', INTERVAL '5 hours'),
        ('jumpit', 'SUCCESS', 94, 'Jumpit collection completed.', INTERVAL '8 hours'),
        ('saramin', 'FAILED', NULL, 'Saramin request timeout after 30 seconds.', INTERVAL '18 minutes'),
        ('saramin', 'SUCCESS', 156, 'Saramin retry completed.', INTERVAL '3 days'),
        ('groupby', 'SUCCESS', 119, 'GroupBy collection completed.', INTERVAL '1 day'),
        ('wanted', 'SUCCESS', 172, 'Wanted collection completed.', INTERVAL '2 days'),
        ('jumpit', 'SUCCESS', 88, 'Jumpit collection completed.', INTERVAL '4 days')
) AS seed(source_name, scraping_status, total_count, message, ago)
JOIN scraping_pipelines pipeline ON pipeline.source_name = seed.source_name;

-- Quick post-run checks for DBeaver.
SELECT COUNT(*) AS demo_admin_count FROM admins WHERE login_id LIKE '%_demo';
SELECT COUNT(*) AS demo_ai_usage_count FROM ai_usage_logs WHERE member_id IN (SELECT member_id FROM members WHERE login_id LIKE 'admin-demo-user-%');
SELECT COUNT(*) AS demo_audit_log_count FROM audit_logs WHERE search_text LIKE '[DEMO] admin-domain%';
SELECT source_name, pipeline_status, is_enabled, last_total_count FROM scraping_pipelines WHERE source_name IN ('groupby', 'jumpit', 'wanted', 'saramin') ORDER BY source_name;
