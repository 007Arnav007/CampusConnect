CREATE TABLE network_nodes (
    id UUID PRIMARY KEY,
    node_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    type VARCHAR(40) NOT NULL,
    building VARCHAR(120),
    floor VARCHAR(40),
    room VARCHAR(80),
    parent_node_id UUID REFERENCES network_nodes(id),
    service_group VARCHAR(100),
    capacity DOUBLE PRECISION,
    status VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE network_links (
    id UUID PRIMARY KEY,
    source_node_id UUID NOT NULL REFERENCES network_nodes(id),
    target_node_id UUID NOT NULL REFERENCES network_nodes(id),
    link_type VARCHAR(40) NOT NULL,
    capacity DOUBLE PRECISION,
    status VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_node_id, target_node_id)
);

CREATE TABLE network_telemetry (
    id UUID PRIMARY KEY,
    observed_at TIMESTAMPTZ NOT NULL,
    node_id UUID NOT NULL REFERENCES network_nodes(id),
    rtt_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    jitter_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    packet_loss DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (packet_loss BETWEEN 0 AND 1),
    throughput_mbps DOUBLE PRECISION NOT NULL DEFAULT 0,
    active_connections INTEGER NOT NULL DEFAULT 0 CHECK (active_connections >= 0),
    tcp_ack_latency_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    udp_ack_latency_ms DOUBLE PRECISION NOT NULL DEFAULT 0,
    websocket_failure_rate DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (websocket_failure_rate BETWEEN 0 AND 1),
    gateway_load DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (gateway_load BETWEEN 0 AND 1),
    receiver_health VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',
    source VARCHAR(40) NOT NULL DEFAULT 'SIMULATOR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_network_telemetry_node_time ON network_telemetry(node_id, observed_at DESC);
CREATE INDEX idx_network_telemetry_time ON network_telemetry(observed_at DESC);

CREATE TABLE incidents (
    id UUID PRIMARY KEY,
    incident_number VARCHAR(40) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'LOW',
    impact_score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (impact_score BETWEEN 0 AND 1),
    root_cause_node_id UUID REFERENCES network_nodes(id),
    root_cause_confidence DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (root_cause_confidence BETWEEN 0 AND 1),
    propagation_probability DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (propagation_probability BETWEEN 0 AND 1),
    estimated_affected_users INTEGER NOT NULL DEFAULT 0 CHECK (estimated_affected_users >= 0),
    explanation JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ NOT NULL,
    detected_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_status_detected ON incidents(status, detected_at DESC);
CREATE INDEX idx_incidents_category ON incidents(category, detected_at DESC);

CREATE TABLE incident_tickets (
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    correlation_score DOUBLE PRECISION NOT NULL CHECK (correlation_score BETWEEN 0 AND 1),
    membership_reason JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (incident_id, ticket_id),
    UNIQUE (ticket_id)
);

CREATE TABLE incident_predictions (
    id UUID PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    model_version VARCHAR(80) NOT NULL,
    predicted_severity VARCHAR(20),
    predicted_root_cause VARCHAR(100),
    root_cause_confidence DOUBLE PRECISION CHECK (root_cause_confidence BETWEEN 0 AND 1),
    predicted_propagation DOUBLE PRECISION CHECK (predicted_propagation BETWEEN 0 AND 1),
    predicted_affected_users INTEGER,
    features_hash VARCHAR(128),
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_predictions_incident_time ON incident_predictions(incident_id, created_at DESC);

CREATE TABLE communication_policies (
    id UUID PRIMARY KEY,
    policy_version VARCHAR(80) NOT NULL,
    message_class VARCHAR(40) NOT NULL,
    transport VARCHAR(20) NOT NULL CHECK (transport IN ('HTTP', 'WEBSOCKET', 'TCP', 'UDP')),
    max_attempts INTEGER NOT NULL CHECK (max_attempts BETWEEN 1 AND 5),
    copies INTEGER NOT NULL CHECK (copies BETWEEN 1 AND 5),
    timeout_ms INTEGER NOT NULL CHECK (timeout_ms BETWEEN 50 AND 5000),
    retry_interval_ms INTEGER NOT NULL CHECK (retry_interval_ms BETWEEN 10 AND 5000),
    ack_required BOOLEAN NOT NULL,
    fallback_transport VARCHAR(20) CHECK (fallback_transport IN ('HTTP', 'WEBSOCKET', 'TCP', 'UDP')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (policy_version, message_class)
);

INSERT INTO communication_policies
    (id, policy_version, message_class, transport, max_attempts, copies, timeout_ms, retry_interval_ms, ack_required, fallback_transport)
VALUES
    (gen_random_uuid(), 'deterministic-v1', 'NORMAL', 'HTTP', 1, 1, 1000, 100, FALSE, NULL),
    (gen_random_uuid(), 'deterministic-v1', 'LIVE_UPDATE', 'WEBSOCKET', 1, 1, 500, 100, FALSE, 'HTTP'),
    (gen_random_uuid(), 'deterministic-v1', 'RELIABLE_EVENT', 'TCP', 3, 1, 500, 100, TRUE, 'HTTP'),
    (gen_random_uuid(), 'deterministic-v1', 'HIGH_PRIORITY', 'TCP', 3, 1, 300, 80, TRUE, 'HTTP'),
    (gen_random_uuid(), 'deterministic-v1', 'CRITICAL_TEST', 'UDP', 3, 2, 300, 80, TRUE, 'TCP');

CREATE TABLE delivery_events (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    transport VARCHAR(20) NOT NULL,
    policy_version VARCHAR(80),
    attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt BETWEEN 1 AND 5),
    sent_at TIMESTAMPTZ,
    ack_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL,
    latency_ms DOUBLE PRECISION,
    receiver_id VARCHAR(100),
    error_code VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (message_id, attempt, transport, event_type)
);

CREATE INDEX idx_delivery_events_message ON delivery_events(message_id, created_at);
CREATE INDEX idx_delivery_events_status ON delivery_events(status, created_at);

CREATE TABLE model_versions (
    id UUID PRIMARY KEY,
    model_name VARCHAR(80) NOT NULL,
    version VARCHAR(80) NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    training_dataset_version VARCHAR(100),
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    artifact_uri TEXT,
    checksum VARCHAR(128),
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (model_name, version)
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    aggregate_type VARCHAR(80) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED')),
    attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt BETWEEN 0 AND 5),
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    last_error VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_pending ON outbox_events(status, available_at, created_at);

CREATE TABLE emergency_receipts (
    message_id UUID PRIMARY KEY,
    sequence_number BIGINT NOT NULL,
    receiver_id VARCHAR(100) NOT NULL,
    incident_id UUID,
    nonce VARCHAR(100) NOT NULL,
    payload_hash VARCHAR(128) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(30) NOT NULL,
    duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (receiver_id, nonce)
);

CREATE TABLE receiver_sequences (
    receiver_id VARCHAR(100) PRIMARY KEY,
    last_sequence BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tcp_event_receipts (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
    receiver_id VARCHAR(100) NOT NULL,
    payload_hash VARCHAR(128) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO network_nodes (id, node_id, name, type, building, floor, room, service_group, capacity, status) VALUES
    ('10000000-0000-4000-8000-000000000001', 'CORE-01', 'Campus core', 'ROUTER', 'Main campus', NULL, NULL, 'CAMPUS_NETWORK', 10000, 'HEALTHY'),
    ('10000000-0000-4000-8000-000000000002', 'RTR-01', 'Campus distribution router', 'ROUTER', 'Main campus', NULL, NULL, 'CAMPUS_NETWORK', 8000, 'HEALTHY'),
    ('20000000-0000-4000-8000-000000000001', 'SW-01', 'Library distribution switch', 'SWITCH', 'Library', NULL, NULL, 'CAMPUS_NETWORK', 1000, 'HEALTHY'),
    ('30000000-0000-4000-8000-000000000001', 'AP-01', 'Library access point 01', 'ACCESS_POINT', 'Library', '2', 'North study area', 'WIFI', 40, 'HEALTHY'),
    ('30000000-0000-4000-8000-000000000002', 'AP-02', 'Library access point 02', 'ACCESS_POINT', 'Library', '2', 'East study area', 'WIFI', 43, 'HEALTHY'),
    ('30000000-0000-4000-8000-000000000003', 'AP-03', 'Library access point 03', 'ACCESS_POINT', 'Library', '2', 'West study area', 'WIFI', 38, 'HEALTHY'),
    ('40000000-0000-4000-8000-000000000001', 'GW-01', 'Campus gateway', 'GATEWAY', 'Main campus', NULL, NULL, 'CAMPUS_NETWORK', 5000, 'HEALTHY');

UPDATE network_nodes SET parent_node_id = '10000000-0000-4000-8000-000000000001'
WHERE node_id = 'RTR-01';

UPDATE network_nodes SET parent_node_id = '10000000-0000-4000-8000-000000000002'
WHERE node_id IN ('SW-01', 'GW-01');

UPDATE network_nodes SET parent_node_id = '20000000-0000-4000-8000-000000000001'
WHERE node_id IN ('AP-01', 'AP-02', 'AP-03');

INSERT INTO network_links (id, source_node_id, target_node_id, link_type, capacity, status)
SELECT gen_random_uuid(), source.id, target.id, 'WIRED', 1000, 'HEALTHY'
FROM network_nodes source CROSS JOIN network_nodes target
WHERE (source.node_id = 'CORE-01' AND target.node_id = 'RTR-01')
   OR (source.node_id = 'RTR-01' AND target.node_id IN ('SW-01', 'GW-01'))
   OR (source.node_id = 'SW-01' AND target.node_id IN ('AP-01', 'AP-02', 'AP-03'));
