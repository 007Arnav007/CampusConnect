# Status against `docs/V2_SPEC.md`

Legend: DONE = implemented and verified by a test or experiment run in this repository. PARTIAL = implemented but narrower than the spec. UNVERIFIED = written but not executed here. NOT DONE.

The spec estimates roughly 150-200 person-days. This delivery implements its **minimum viable research slice (section 17.4) plus the Visual Lab**; it is not the complete v2.

## Phase 0 - hygiene and security
| Item | Status | Notes |
|---|---|---|
| X1-X3 legacy files, tool residue, empty lockfile | DONE | removed; reconstructed entry points renamed |
| X11 / S-01 secret in `.env.example` | DONE in the repo | **The uploaded zip contained what looked like a real Gemini API key. Revoke it** - deleting it from the file does not make it safe. |
| S-02 hard-coded JWT fallback | DONE (gateway, tested at start-up); backend default removed, existing 32-char check in `JwtService` rejects an empty secret - **UNVERIFIED (no Maven here)** |
| X7 ML call on the delivery hot path | DONE | gateway scores from a signed local snapshot or static table |
| X8 backend sequence endpoint | DONE in source, **UNVERIFIED (not compiled)** |
| X4 merge/remove `ai-service`; M5 assistant | NOT DONE | `ai-service` untouched and still unauthenticated (S-06 only fixed for `/v1/localize`) |
| X5 academics feature flag | NOT DONE | env var reserved only |
| `network-simulator` replacement | PARTIAL | Python `netsim` is the new simulator; the old service is still in the tree |

## Phase 1 - protocol and delivery
All items in `docs/PROTOCOL.md`: DONE (protocol 14 tests, receiver 10, gateway 15, real UDP/TCP sockets). B-01 fixed in Java source - UNVERIFIED; reproduced and fixed in a TypeScript model. NTP-style offset/delay estimated from ACKs (N-07) but the receiver learns its own offset rather than consuming the sender's. Netem impairment lab and Playwright E2E: NOT DONE.

## Research modules
| Module | Status | Evidence |
|---|---|---|
| Topology (96 nodes, 24 zones) from `topology/campus.yaml` | DONE | `ml-service/src/netsim` |
| Scenario generator with informative missingness, mislocation, surges | DONE | deterministic, tested |
| M0 telemetry anomaly scorer / symptom classifier / Hinglish | NOT DONE | anomaly scores and symptom probabilities are **simulated inputs** |
| M1 Bayesian localizer, conformal sets, zone scoping, baselines, ablations | DONE (synthetic) | E3; known gaps in RESULTS.md (benign surges, MNAR) |
| M1 served via API | DONE | `/v1/localize`; backend does **not** call it yet - the ops page shows exported real outputs |
| M2 Q-RTO | PARTIAL | offline evaluation E5 only; gateway uses RFC 6298 |
| M3 selector + Shield | PARTIAL | DES evaluation E6; Shield enforced in the gateway with Python/TS golden parity; snapshot is a **linear** utility model; LinUCB and off-policy estimators written but **not validated or wired** |
| M6 audit chain | PARTIAL | library + DB columns; not wired into backend writes |
| Model gating / kill switch / drift monitoring | NOT DONE | |
| Incident feedback UI | NOT DONE | table only (V7) |

## Product / UI
Visual Lab: 6 modules (spec lists more), verified in headless Chromium. Fault Localizer page: DONE with exported real outputs. Existing ticketing, academics and assistant pages are unchanged.

## Unverified here (no Docker/Postgres in the build sandbox)
Java edits, `V7__*.sql` against real PostgreSQL (syntax-parsed only), all Dockerfiles / `docker-compose.yml`, `.github/workflows/ci.yml`.

## Post-review fixes in this tree (2026-11)
- Backend: raw `java.time.Instant` JdbcTemplate binds (all academic writes + emergency receipts) now use `Timestamp`; trace-event metadata is serialized with Jackson instead of `String.valueOf` (invalid jsonb); `AdminBootstrap` runs before `AcademicDemoBootstrap` so demo content exists on first boot; "Section is full" is 409 not 500; `GET /incidents/{id}` queries by id instead of scanning the newest 200; telemetry responses return the inserted row id; ML client logs failures; correlation scoring hoists candidate-independent queries out of the per-candidate loop.
- Gateway: outbox dispatcher maps ACK fields (`st`/`t2`/`rid`) correctly (previously recorded `undefined`/always-confirmed); Shield-decided hedge/TCP actions report the substituted UDP action; `incidentId` bounded.
- Receiver: TCP event dedup set is capped; socket-handler exceptions destroy the connection instead of crashing the process; replay-window snapshot persists after the notice row.
- ml-service: promoted-artifact sha256 is verified at load (rule-fallback on mismatch); `TypeError` from artifact schema drift falls back instead of 500; rule-fallback response carries the trained-mode schema; `promote_localizer.py`/`make_report.py` select the latest run by manifest time, not lexicographic dir name.
- Frontend: critical-notice page reads the real gateway response shape (previously every successful dispatch rendered as an error); 401 clears the session and redirects to login; logout disconnects the websocket; per-assignment submission drafts; admin academics page styles errors as errors; ESCALATED tickets appear in filters.
- Tools/compose: `campusctl env-init` syncs `DATABASE_PASSWORD` with the generated `POSTGRES_PASSWORD`; `doctor` reports versions; `network-simulator` joined `campusctl test` and CI; compose gained `ai-service`, `ML_SERVICE_URL` on the backend, healthchecks and ordered startup; frontend image bakes `VITE_WS_URL`.
- network-simulator: CSV `is_anomaly` now comes from the simulator's own degradation decision (intermittent flapping and GW-01/AP side-effects were previously mislabeled); `intermittent-connectivity` actually flaps (was identical to congestion); seed 0 no longer aliases seed 1.
