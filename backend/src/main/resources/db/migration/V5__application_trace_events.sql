CREATE TABLE application_trace_events (
    id UUID PRIMARY KEY,
    trace_id VARCHAR(120) NOT NULL,
    protocol VARCHAR(20) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    source VARCHAR(120) NOT NULL,
    destination VARCHAR(120) NOT NULL,
    status VARCHAR(20) NOT NULL,
    duration_ms BIGINT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_trace_events_trace_id ON application_trace_events(trace_id, occurred_at);
CREATE INDEX idx_trace_events_occurred_at ON application_trace_events(occurred_at DESC);
