# Critical Notice Delivery protocol v2 (TEST MODE)

Implemented in `protocol/` (TypeScript), exercised by `emergency-receiver/`, `gateway/` and independently re-verified in Python (`ml-service/tests/test_protocol_vectors.py`).

| Concern | v1 defect | v2 behaviour | Test |
|---|---|---|---|
| Signature scope (S-03) | MAC covered only part of the message | HMAC-SHA256 over RFC 8785 canonical JSON of **every** field except `sig` (version, type, kid, test flag, body) | `protocol.test.ts` S-03 |
| ACK authenticity (S-04) | any JSON with matching fields counted | signed ACK, correlated by `(mid, rnd, cpy)`, `rid` checked | `executor.test.ts` forged ACK |
| Replay (S-05) | strictly monotonic sequence rejected reordering | 64-entry sliding window, persisted across restarts | `protocol.test.ts`, `receiver.test.ts` AT-14 |
| Sequence ownership (B-01) | server issued sequence then required `last < incoming` -> receipt could never be confirmed | sender owns sequence; backend keeps only a high-water mark | `protocol.test.ts` B-01 (model of v1 logic) |
| Size (N-01) | unbounded datagrams | <= 1200 B, text <= 400 chars, validity <= 60 s | `protocol.test.ts` N-01 |
| Sequential retries (N-02) | one socket per attempt, waited for each timeout | copies **scheduled** with spacing on one channel, cancel on first valid ACK | `executor.test.ts` N-02 |
| TCP framing (N-04) | per-chunk UTF-8 decode corrupted split characters | 4-byte length prefix, bytes accumulated, 64 KiB cap | `protocol.test.ts` N-04 |
| ACK timeout (N-05) | fixed 500 ms | RFC 6298 estimator with exponential backoff | `rto.ts` |

States reported by the gateway: `DELIVERED_CONFIRMED` (only with a verified, correlated ACK **inside the deadline**), `FAILED_TIMEOUT`, `DEGRADED_FALLBACK` (stored, explicitly unconfirmed). Never "delivered" without proof.

ACK modes: `LOCAL_DURABLE` (ACK after fsync to the receiver's SQLite WAL; backend sync is asynchronous, `wal_lag` is exposed) and `BACKEND_DURABLE` (ACK only after the backend persisted the receipt).

Out of scope here: key distribution/rotation tooling beyond a two-key keyring, TLS/DTLS, real-network validation. This is a protocol study in test mode, not an alerting system.
