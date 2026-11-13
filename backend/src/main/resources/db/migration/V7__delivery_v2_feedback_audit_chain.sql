-- V7 (additive; V1-V6 are never edited). Delivery engine v2, incident feedback, hash-chained audit.
-- C9: delivery_events stays as read-only history; new work writes to the tables below.

CREATE TABLE delivery_messages (
    mid UUID PRIMARY KEY,
    msg_class VARCHAR(24) NOT NULL CHECK (msg_class IN ('NORMAL','LIVE','RELIABLE','HIGH','CRITICAL_NOTICE')),
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    receiver_id VARCHAR(100) NOT NULL,
    deadline_ms INTEGER NOT NULL CHECK (deadline_ms BETWEEN 100 AND 60000),
    test_mode BOOLEAN NOT NULL DEFAULT TRUE,
    state VARCHAR(24) NOT NULL DEFAULT 'CREATED'
        CHECK (state IN ('CREATED','POLICY_SELECTED','DISPATCHING','DELIVERED_CONFIRMED','TIMEOUT','HEDGED','FAILED_TIMEOUT','FAILED_REJECTED','DEGRADED_FALLBACK')),
    unconfirmed BOOLEAN NOT NULL DEFAULT TRUE,          -- TRUE until a verified, correlated ACK exists
    payload_hash VARCHAR(64) NOT NULL,
    run_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    CHECK (state <> 'DELIVERED_CONFIRMED' OR unconfirmed = FALSE)
);
CREATE INDEX idx_delivery_messages_state ON delivery_messages(state, created_at DESC);

CREATE TABLE delivery_attempts (
    id BIGSERIAL PRIMARY KEY,
    mid UUID NOT NULL REFERENCES delivery_messages(mid) ON DELETE CASCADE,
    rnd SMALLINT NOT NULL,
    cpy SMALLINT NOT NULL,
    transport VARCHAR(8) NOT NULL CHECK (transport IN ('UDP','TCP','HTTP','WS')),
    seq BIGINT,
    bytes INTEGER NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    ack_at TIMESTAMPTZ,
    rto_ms_used INTEGER,
    ack_valid BOOLEAN,
    t1_ms BIGINT, t2_ms BIGINT, t3_ms BIGINT, t4_ms BIGINT,   -- NTP-style timestamps (offset/delay estimation)
    run_id UUID,
    UNIQUE (mid, rnd, cpy, transport)                         -- unambiguous per-copy accounting
);

CREATE TABLE policy_decisions (
    id BIGSERIAL PRIMARY KEY,
    mid UUID NOT NULL REFERENCES delivery_messages(mid) ON DELETE CASCADE,
    action_set_version VARCHAR(16) NOT NULL,
    action_id VARCHAR(8) NOT NULL,
    source VARCHAR(16) NOT NULL CHECK (source IN ('learned','static-table','refused')),
    snapshot_id VARCHAR(64),
    propensity DOUBLE PRECISION,                              -- for off-policy evaluation when exploring
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    safe_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    counterfactual_utilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    shield_trace JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE path_metrics (
    id BIGSERIAL PRIMARY KEY,
    receiver_id VARCHAR(100) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    rtt_ms DOUBLE PRECISION, jitter_ms DOUBLE PRECISION,     -- RFC 3550 interarrival jitter
    loss DOUBLE PRECISION CHECK (loss BETWEEN 0 AND 1),
    reorder DOUBLE PRECISION, mean_burst_len DOUBLE PRECISION,
    run_id UUID
);
CREATE INDEX idx_path_metrics_receiver_time ON path_metrics(receiver_id, observed_at DESC);

CREATE TABLE incident_feedback (
    id UUID PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verdict VARCHAR(16) NOT NULL CHECK (verdict IN ('CONFIRM','REJECT','CORRECT')),
    corrected_node VARCHAR(100),
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- M6: tamper-evident audit chain. hash = SHA-256(prev_hash || canonical(row)); verified by ml-service/src/audit_chain.py
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64);
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS hash VARCHAR(64);
