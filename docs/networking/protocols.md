# Networking Protocol Flow

## Intended responsibilities

| Protocol | Responsibility |
| --- | --- |
| HTTPS | Browser reads and commands enter through the gateway; the gateway proxies application APIs to Spring Boot. |
| WSS | Authenticated clients receive authorized updates after the backend has committed the related change. REST remains the recovery/read source. |
| TCP | Internal line-delimited events that require a receiver-level acknowledgment. The sender must correlate acknowledgments to event IDs and distinguish rejection, timeout, and success. |
| UDP | Low-latency emergency datagram dispatch only. A successful local `send` callback means the OS accepted the datagram, not that the receiver or a responder received it. |
| DNS | Resolves service names in deployment environments. |

Spring Boot owns users, tickets, permissions, and durable application records. The intended mutation path is:

1. The client sends an authenticated HTTPS command through the gateway.
2. Spring Boot validates the caller and request, then commits the change.
3. Only after commit, an event can be forwarded to the gateway or internal transport.
4. WSS notifies authorized clients; after disconnect or missed events, clients reload canonical state through HTTPS.

Do not use WebSocket events, TCP telemetry, or UDP datagrams as a substitute for durable state.

## Emergency protocol test status

The emergency flow is a local test-only demonstration, disabled unless `EMERGENCY_TEST_MODE=true`. The gateway signs a bounded, expiring envelope; the receiver validates the HMAC, receiver identity, sequence, and expiry; then asks the backend to persist an idempotent receipt before returning an ACK correlated by message ID and sequence. The gateway reports confirmed receipt only after matching that ACK.

This is not a real emergency service, does not alert responders, and must not be used for operational dispatch. Confirmation means only that the configured development backend persisted a receipt for the local receiver.

## Implemented prototype and remaining gaps

- The gateway authenticates WebSocket handshakes and validates ticket access against the backend before joining a ticket room. REST remains the source of truth, and clients reload after a ticket event.
- Ticket creation writes a durable outbox row in the backend transaction. The gateway claims and dispatches events over TCP, matches ACKs by event ID, and stores receiver receipts before ACKing.
- The emergency receiver uses backend-backed receipt and sequence state. Unit tests cover request validation and signed-envelope tampering/expiry.
- Full multi-service end-to-end tests, reconnect/replay recovery, independent failure-injection tests, distributed outbox worker leasing, and production deployment hardening remain to be completed.

## Required emergency acceptance scenarios

Test these independently of the Gemini assistant:

1. Valid datagram reaches the receiver and the system records a correlated receiver acknowledgment.
2. Invalid category, severity, missing location/message, oversized input, and malformed alert ID are rejected before sending.
3. Receiver unavailable or acknowledgment timeout is reported as unconfirmed/failed, never as delivered.
4. Repeated alert IDs are idempotently deduplicated, including the expected behavior after receiver restart.

The first validation tests cover request normalization and invalid input. The remaining scenarios require the acknowledgment and persistence flow before they can pass.
