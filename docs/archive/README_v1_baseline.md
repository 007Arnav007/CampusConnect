# CampusConnect

CampusConnect is a campus-support and issue-resolution application built as a service-oriented monorepo. Students can submit and track support tickets, communicate with support staff, manage their profile, read campus guidance, and ask a knowledge-grounded assistant for help. Staff and administrators have role-restricted operational views. The system is also a practical Computer Networks and Telecommunications (CNT) project: it demonstrates HTTP APIs, a gateway, WebSockets, TCP sockets, UDP datagrams, ports, message framing, acknowledgments, and the limits of network delivery guarantees.

> **Project status:** this repository is an educational development foundation, not a production-ready emergency-response or campus-management system. This README distinguishes implemented behavior from planned or incomplete behavior. Do not use its emergency alert feature in place of campus security or local emergency services.

## Contents

- [Project goals](#project-goals)
- [Current features and limitations](#current-features-and-limitations)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Technology stack](#technology-stack)
- [Computer Networks and Telecommunications concepts](#computer-networks-and-telecommunications-concepts)
- [Data model](#data-model)
- [Application API](#application-api)
- [Roles and authorization](#roles-and-authorization)
- [Configuration](#configuration)
- [Run locally](#run-locally)
- [Build and test](#build-and-test)
- [Example workflows](#example-workflows)
- [Troubleshooting](#troubleshooting)
- [Security and privacy](#security-and-privacy)
- [Roadmap and known gaps](#roadmap-and-known-gaps)
- [Distributable package](#distributable-package)
- [Project documentation](#project-documentation)

## Project goals

CampusConnect is intended to provide one place for common campus-support interactions:

1. Give students a clear path to request help and follow progress.
2. Give support staff an authenticated way to review and update requests.
3. Keep ticket, user, permission, and notification records durable in PostgreSQL.
4. Make approved campus guidance searchable, with an optional server-side Gemini answer generator.
5. Demonstrate several network protocols in a small, inspectable system.
6. Make network and service failure behavior visible instead of claiming a request succeeded when delivery is unknown.

The central design rule is that **Spring Boot owns application data and authorization**. The frontend improves usability, but is not a security boundary. The gateway transports API calls and network events, but is not the canonical store for tickets. The AI service can provide information, but does not authorize users or change ticket state.

## Current features and limitations

### Implemented in the current code

- React application with landing, sign-in, registration, student dashboard, ticket list/create/detail, assistant, notifications, profile, campus services, knowledge, and administrator pages.
- Spring Boot REST backend with institutional-email registration, login, JWT authentication, PostgreSQL persistence, Flyway migrations, tickets, ticket messages, notifications, profile updates, and staff/admin user listing.
- Role-aware ticket visibility and status updates. Students can view their own tickets and mark them resolved; staff/admin users can view and manage tickets.
- Optional first-admin bootstrap using environment configuration.
- Node gateway that proxies `/api/v1/*` requests to Spring Boot, restricts browser origins, exposes role-gated network metrics, and emits a TCP event after successful ticket creation.
- Authenticated Socket.IO ticket subscriptions, with access checked against the backend before a ticket room is joined.
- A role-gated CNT Network Lab event timeline with correlation IDs, HTTP request duration/status, bounded in-memory retention, and authenticated Socket.IO updates. It is application-level instrumentation, not packet capture.
- Expanded deterministic simulator scenarios and JSON/CSV export with incident labels, plus an initial Isolation Forest training/evaluation path that compares a simple threshold baseline and reports model mode explicitly.
- Academic course, section, enrollment, faculty ownership, materials, assignments, submissions, grading, discussions, notices, and approved academic-document retrieval APIs backed by Flyway migration V4.
- Student Academics UI at `/academics` for course discovery, enrollment, materials, assignment submission, discussions, and notices.
- Academic assistant retrieval now combines approved local knowledge with approved academic documents when the authenticated user asks through the gateway.
- Durable application trace storage in PostgreSQL through Flyway migration V5. The gateway still serves its bounded live buffer when the backend is unavailable.
- An explicitly gated, local-only emergency transport test path. It signs UDP envelopes, persists receiver receipts before acknowledging them, and reports confirmed delivery only after a correlated receiver ACK.
- A durable ticket outbox with TCP receiver receipts and event-correlated acknowledgments.
- Network topology, telemetry, incident correlation, impact estimates, and a staff/admin incident dashboard.
- An isolated FastAPI ML prototype and seeded network simulator. Their outputs are explainable heuristic estimates unless a separately trained artifact is supplied.
- TCP newline-delimited JSON events and receiver acknowledgments.
- Knowledge-base retrieval with a deterministic answer when Gemini is not configured or unavailable.
- Optional Gemini generation performed server-side. The browser never needs the Gemini API key.

### Implemented, but incomplete or limited

- Assistant and knowledge requests go through the gateway and proxy to the AI service, avoiding browser-to-AI CORS failures. The AI service must be running at `AI_SERVICE_URL` for assistant answers and knowledge articles.
- Emergency transport remains a **local test demonstration only**, not a safety service. It is disabled unless `EMERGENCY_TEST_MODE=true`, and no real-world emergency alerting or responder delivery is implied.
- TCP/UDP receiver confirmations mean that a receipt was persisted by this development backend and acknowledged by the local receiver; they do not prove that a person read or acted on a message.
- Incident correlation, impact, root-cause, propagation, and adaptive-policy scores are early heuristic/ML-service prototypes. No trained-model quality or real-campus network accuracy has been established.
- The simulator exports labeled data and a repeatable training/evaluation command, but there is not yet independently validated research evidence, a scenario-balanced production dataset, or a production telemetry adapter. Trained models are optional artifacts and are never silently promoted.
- The CNT event timeline is volatile gateway memory and records only requests passing through that gateway. It is not a durable audit log, packet capture, or full cross-service distributed trace.
- Real file upload storage, malware scanning, plagiarism detection, calendar synchronization, grade appeals, and full faculty/admin authoring screens are not implemented. Materials currently use validated HTTP(S) resource links.
- The incident view and delivery events are operational prototypes; comprehensive audit workflows, live WebSocket recovery for every business event, and production-grade monitoring remain incomplete.
- Ticket attachments, email verification, assignment workflows, full audit history, rate limiting, and production observability are not implemented.

See [Networking protocol flows](docs/networking/protocols.md), the [development setup](docs/development/setup.md), and the [final innovation implementation plan](CampusConnect_FINAL_IMPLEMENTATION_PLAN.md) for protocol details, setup notes, acceptance criteria, and proposed research work.

## Architecture

```text
                         ┌──────────────────────────────┐
                         │ React + TypeScript frontend  │
                         │ REST and AI via gateway      │
                         └──────────┬─────────┬─────────┘
                                    │         │
                              HTTP/JSON        │ HTTP/JSON
                                    │         ▼
                                    ▼   ┌──────────────┐
                           ┌────────────────────┐      │ AI service  │
                           │ Node gateway       │      │ retrieval + │
                           │ HTTP + Socket.IO   │      │ optional    │
                           │ TCP/UDP transport  │      │ Gemini      │
                           └─────┬──────┬───────┘      └─────────────┘
                                 │      │
                           TCP events  UDP alert
                                 │      │
                                 ▼      ▼
                         ┌──────────────────────┐
                         │ Emergency receiver   │
                         │ TCP + UDP listeners  │
                         └──────────────────────┘

                   Gateway ──HTTP──> Spring Boot backend
                                         │
                                      JDBC/JPA
                                         │
                                         ▼
                                  PostgreSQL + Flyway
```

### Service responsibilities

| Component | Responsibility | Default address/port |
| --- | --- | --- |
| Frontend | Browser UI and client-side route handling | `http://localhost:5173` |
| Gateway | HTTP API proxy, Socket.IO connection foundation, TCP ticket-event sender, UDP emergency sender, transport metrics | `http://localhost:3001` |
| Backend | Authentication, authorization, validation, ticket and profile logic, durable records | `http://localhost:8080` |
| AI service | Knowledge retrieval, optional Gemini generation, safe fallback | `http://localhost:5000` |
| Emergency receiver | UDP emergency datagrams and TCP event receiver | UDP `41234`, TCP `41235` |
| PostgreSQL | Persistent relational data | `localhost:5432` |

The receiver does not expose an HTTP service. `EMERGENCY_RECEIVER_PORT` in the sample environment is not used by the current receiver code; its UDP and TCP ports are configured separately.

## Repository structure

```text
.
├── .env.example                 # Environment-variable template (no real credentials)
├── docker-compose.yml           # PostgreSQL development container and named volume
├── CampusConnect_FINAL_IMPLEMENTATION_PLAN.md # Proposed research/implementation roadmap
├── README.md                    # This project guide
├── ai-service/
│   └── src/index.ts             # Knowledge retrieval and assistant HTTP API
├── backend/
│   ├── pom.xml                  # Spring Boot / Maven configuration
│   └── src/
│       ├── main/java/...        # Controllers, services, entities, repositories, security
│       ├── main/resources/      # Application configuration and Flyway SQL migrations
│       └── test/java/...        # Backend unit and configuration tests
├── docs/
│   ├── architecture/            # Architecture overview
│   ├── development/             # Local setup notes
│   └── networking/              # Protocol behavior, limitations, test scenarios
├── emergency-receiver/
│   └── src/index.ts             # UDP and TCP receiver
├── frontend/
│   ├── index.html
│   └── src/
│       ├── main.reconstructed.tsx # Active Vite entry point
│       ├── AppReconstructed.tsx   # Active route tree
│       ├── api.ts                 # Browser API clients and data contracts
│       ├── components/            # Layout, navigation, shared UI
│       └── pages/                 # Feature-specific route pages
├── gateway/
│   └── src/
│       ├── index.ts              # HTTP proxy, operations endpoints, Socket.IO
│       ├── transport.ts          # TCP/UDP client transport and metrics
│       └── emergency.ts          # Emergency request validation
├── ml-service/
│   ├── src/main.py               # FastAPI heuristic inference endpoints
│   └── tests/                    # ML API/heuristic contract tests
├── network-simulator/
│   ├── src/                      # Seeded synthetic telemetry and incident scenarios
│   └── tests/                    # Determinism and scenario tests
└── knowledge-base/
    └── it/                       # Approved/sample support articles
```

The active frontend entry is `frontend/src/main.reconstructed.tsx`, loaded by `frontend/index.html`. `frontend/src/main.tsx` is a retained legacy file and is not the active entry point.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS, Lucide icons |
| Backend | Java 21-compatible Spring Boot 3.5, Spring MVC, Spring Security, Spring Data JPA, Bean Validation |
| Authentication | Signed JWT bearer tokens, BCrypt password hashing |
| Database | PostgreSQL 16, Flyway SQL migrations |
| Gateway and receiver | Node.js, TypeScript, Express 5, Socket.IO, Node `net` and `dgram` |
| AI | Node.js/Express, filesystem Markdown retrieval, optional Google Gemini API |
| Local infrastructure | Docker Compose for PostgreSQL |

## Computer Networks and Telecommunications concepts

This section connects the code to common CNT course topics. It describes what the current project demonstrates and calls out what remains conceptual or incomplete.

### 1. Client-server architecture

The browser is the client. It makes requests to application services, which listen on server ports. Spring Boot handles core application operations; the gateway sits between the browser and backend for REST APIs. Assistant and knowledge requests are also proxied through the gateway to a separate AI HTTP service.

This separation illustrates service boundaries, request/response communication, independent processes, and the need to configure each process with the correct host and port. In local development, services use loopback addresses such as `localhost`. A deployment would use service DNS names, reverse-proxy routes, and TLS.

### OSI and TCP/IP model mapping

| Course model layer | Example in this project |
| --- | --- |
| Application | HTTP/REST JSON, Socket.IO events, JSON ticket events, JSON emergency payloads |
| Transport | TCP streams for backend-facing internal events; UDP datagrams for emergency dispatch; TCP is also used by ordinary HTTP in this local setup |
| Internet/network | IPv4 loopback destinations such as `127.0.0.1`; IP routing is provided by the host operating system |
| Link/network access | Ethernet/Wi-Fi and physical transmission are provided by the machine and network; the application does not implement these layers |

In the four-layer TCP/IP model, application-layer protocols map over the transport layer, which uses the Internet layer for addressing and the link layer for local network transmission. This repository implements application behavior and socket usage; it does not implement IP, routing, Ethernet, Wi-Fi, or physical-layer signaling.

### 2. Application layer: HTTP, REST, JSON

- The frontend and services exchange JSON over HTTP.
- Application endpoints use the `/api/v1` path prefix.
- HTTP methods express intent: `GET` reads, `POST` creates/sends, and `PATCH` updates selected fields.
- HTTP status codes communicate outcomes, for example `200` success, `201` created, `400` invalid input, `401` unauthenticated, `403` forbidden, and `503` unavailable upstream/transport.
- The gateway forwards the authorization header and JSON body to Spring Boot. Backend response status and body are returned to the browser.
- A proxy timeout prevents a browser request from hanging indefinitely when the backend does not answer.

REST is the API style used here; it is not a transport protocol. HTTP currently runs over TCP in ordinary local configurations. HTTPS/TLS termination is not configured by this development project.

### 3. Transport layer: TCP

The gateway sends a ticket-created event to the receiver over TCP. TCP provides a reliable, ordered byte stream between connected sockets, but it does not preserve application message boundaries. Therefore, this project frames each JSON event as one line terminated by `\n`.

The receiver buffers incoming bytes, extracts complete lines, parses each line as JSON, and replies with a newline-delimited JSON acknowledgment containing the event ID. This demonstrates:

- client and server sockets;
- connection establishment and stream reads/writes;
- application-layer framing on top of a byte stream;
- receiver acknowledgment as a separate application-level message.

A successful TCP `write()` only confirms local write handling, not that the receiver parsed or committed the event. The current prototype waits for an ACK matching the event ID, distinguishes receiver rejection/timeouts, and uses a durable backend outbox with bounded retry. The receiver persists an idempotent receipt before ACKing.

### 4. Transport layer: UDP

Emergency messages are serialized as a single JSON datagram and sent over UDP to the configured receiver port. UDP preserves datagram boundaries and has lower connection overhead than TCP, but it does not provide a connection handshake, retransmission, in-order delivery, or receiver acknowledgment.

The local test flow reports receipt as confirmed only after the receiver validates a signed envelope, persists the receipt in the backend, and returns an ACK matching message ID, sequence, and receiver ID. This confirmation applies only to the development receiver and backend, not to a person or responder.

This remains a teaching example, not a safety-critical alert workflow. The test mode must not be used for real dispatch. Production would need independent threat modeling, deployment isolation, monitoring, operational procedures, and qualified end-to-end verification beyond this prototype.

### 5. WebSockets and real-time communication

The gateway uses Socket.IO, which provides bidirectional event communication built on an HTTP connection upgrade and WebSocket transport when available. Socket handshakes require a valid backend JWT; ticket subscriptions are checked by the backend before joining the ticket room. Ticket-created events are broadcast only after the durable outbox event receives a TCP receiver ACK. REST remains the source for initial state and recovery after reconnect; a socket notification must not replace a database record.

The intended design is to persist a change first in Spring Boot, then publish a small event to authorized connected clients. REST remains the source for initial state and recovery after reconnect; a socket notification must not replace a database record.

### 6. Network addressing and ports

A port identifies a service endpoint on a host. The default local ports are listed in [Service responsibilities](#service-responsibilities). Port collisions occur if another process already listens on one of them. For Docker, Compose maps the host's PostgreSQL port (default `5432`) to the container's `5432`.

The sample services use `127.0.0.1`/`localhost`, which limits their normal development use to the same machine. `CORS_ORIGINS` governs which browser origins may make cross-origin gateway requests; it is not authentication and does not replace backend authorization.

### 7. Network and application failure cases

The code demonstrates bounded reliability mechanisms, but is not a complete distributed-systems reliability layer:

- no independent broker or multi-worker outbox lease coordination;
- no full WebSocket replay cursor or guaranteed reconnect/resubscribe recovery;
- no multi-host deployment or authenticated remote receiver configuration;
- no production TLS, DNS, firewall, load-balancing, or multi-host deployment configuration.

Further protocol details and required emergency acceptance scenarios are in [`docs/networking/protocols.md`](docs/networking/protocols.md).

## Data model

Spring Boot and PostgreSQL own the durable application records. Flyway applies the migrations in `backend/src/main/resources/db/migration`; Hibernate validates entity/schema compatibility rather than creating the schema automatically.

| Table | Purpose | Important relationships/fields |
| --- | --- | --- |
| `users` | Accounts and roles | Unique email, BCrypt password hash, status, roles, created/updated timestamps |
| `departments` | Support department reference data | Unique name, optional description, active flag |
| `tickets` | Support requests | Ticket number, title, description, category, priority, status, location, creator, optional department and assignee, timestamps |
| `ticket_messages` | Ticket conversation entries | Ticket and sender IDs, body, timestamp; messages are deleted with their ticket |
| `notifications` | Durable user notifications | User, type, title/body, optional resource, `read_at`, timestamp |

The ticket category values accepted by the backend are `IT_NETWORK`, `ACADEMIC`, `HOSTEL`, `FINANCE`, `FACILITIES`, and `OTHER`. Priorities accepted by the backend are `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`; the current student form offers low, medium, and high. Ticket statuses accepted by the backend are `OPEN`, `IN_PROGRESS`, `RESOLVED`, `ESCALATED`, and `CLOSED`. Students can only set their own ticket to `RESOLVED`; staff/admin can manage status.

The backend persists emergency receiver receipts and TCP event receipts. Gateway transport counters are process memory and reset when the gateway restarts; the staff network page also displays persisted delivery-event records.

## Application API

All endpoints below are served by Spring Boot and normally reached through the gateway at `http://localhost:3001`. Requests other than registration, login, and health require a valid bearer token unless noted. The exact request/response fields are defined in the backend DTOs and `frontend/src/api.ts`.

| Method | Route | Purpose | Access |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Create an institutional student account | Public; domain allowlist applies |
| `POST` | `/api/v1/auth/login` | Authenticate and return a JWT | Public |
| `GET` | `/api/v1/health` | Backend application health | Public |
| `GET` | `/api/v1/users/me` | Get the current profile | Authenticated |
| `PATCH` | `/api/v1/users/me` | Update current display name | Authenticated |
| `GET` | `/api/v1/users` | List users without password hashes | Staff/admin |
| `GET` | `/api/v1/tickets` | List the caller's tickets; staff/admin see all | Authenticated |
| `POST` | `/api/v1/tickets` | Create a ticket | Authenticated |
| `GET` | `/api/v1/tickets/{ticketId}` | Get a ticket the caller may access | Owner or staff/admin |
| `PATCH` | `/api/v1/tickets/{ticketId}` | Change status under role rules | Owner or staff/admin |
| `GET` | `/api/v1/tickets/{ticketId}/messages` | Read a ticket conversation | Owner or staff/admin |
| `POST` | `/api/v1/tickets/{ticketId}/messages` | Add a conversation message | Owner or staff/admin |
| `GET` | `/api/v1/notifications` | List current user's notifications | Authenticated |
| `PATCH` | `/api/v1/notifications/{notificationId}/read` | Mark an owned notification read | Owner |
| `GET` | `/api/v1/network/metrics` | Gateway transport and socket metrics | Staff/admin JWT checked by gateway |
| `POST` | `/api/v1/network/emergency` | Validate and dispatch UDP datagram | Staff/admin JWT checked by gateway |
| `GET` | `/api/v1/network/nodes` | Read seeded network topology | Staff/admin |
| `GET` | `/api/v1/network/telemetry/latest` | Read latest per-node telemetry | Staff/admin |
| `POST` | `/api/v1/network/telemetry` | Ingest bounded telemetry | Staff/admin |
| `GET` | `/api/v1/network/delivery-events` | Read recent persisted transport delivery records | Staff/admin |
| `GET` | `/api/v1/network-lab/events?limit=100` | Read bounded gateway application events | Staff/admin JWT checked by gateway |
| `GET` | `/api/v1/network-lab/traces/{traceId}` | Filter retained events by correlation ID | Staff/admin JWT checked by gateway |
| `GET` | `/api/v1/incidents` | Read current incident candidates and evidence | Staff/admin |
| `GET` | `/api/v1/tickets/{ticketId}/incident` | Read incident linkage for an accessible ticket | Owner or staff/admin |

The AI service listens on port `5000`; browser clients use these gateway routes:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/assistant/health` | AI provider configuration and knowledge-document count |
| `GET` | `/api/v1/knowledge` | Return loaded knowledge articles |
| `POST` | `/api/v1/assistant/ask` | Ask a single question (`{"message":"..."}`) |
| `POST` | `/api/v1/assistant/chat` | Send a bounded conversation (`{"messages":[...]}`) |

### Common request and response shapes

Register and login use JSON. Registration requires a name (up to 120 characters), valid email, and password from 8 to 72 characters. The email's domain must be configured as institutional.

```json
{
  "name": "Example Student",
  "email": "student@vit.edu",
  "password": "use-a-private-local-test-password"
}
```

Successful authentication returns `token`, `userId`, `name`, `email`, and `roles`. Send the token on protected routes with:

```http
Authorization: Bearer <token>
```

Ticket creation accepts a title (up to 160 characters), description (up to 10,000 in the backend; the current form limits it to 5,000), category, optional priority, and optional location (up to 160 characters in the database/API):

```json
{
  "title": "Campus Wi-Fi unavailable",
  "description": "The device cannot connect in the library. Reconnecting did not help.",
  "category": "IT_NETWORK",
  "priority": "MEDIUM",
  "location": "Library, second floor"
}
```

A ticket response includes its `id`, `ticketNumber`, title/description, category, priority, status, location, `createdBy`, and timestamps. Status updates use `{"status":"RESOLVED"}` or one of the other allowed workflow statuses subject to role rules. A ticket message uses `{"body":"..."}`; message responses include `senderId`, `senderName`, `senderRole`, and the message timestamp. Notification records include `userId`, `type`, title/body, resource references, `readAt`, and a boolean `read`.

The single-question assistant route uses `POST`. Invalid inputs return JSON errors. The Spring exception handler maps validation errors to `400`, invalid credentials to `401`, access denial to `403`, and invalid arguments to `400`.

Gateway-only health route: `GET http://localhost:3001/health`. Backend actuator health is also available at `http://localhost:8080/actuator/health`.

## Roles and authorization

| Role | Current capabilities |
| --- | --- |
| `STUDENT` | Register, sign in, manage own display name, create/list/read own tickets, message own tickets, read/mark own notifications, use knowledge and assistant routes |
| `STAFF` | Student capabilities plus list users, view all tickets, update ticket status, access gateway network metrics and emergency dispatch |
| `ADMIN` | Staff capabilities and access to administrator UI routes |

Backend checks are authoritative for application resources. The frontend's `ProtectedRoute` hides or redirects pages for usability only. Gateway operational endpoints separately verify the JWT signature and role claim. Configure the same `JWT_SECRET` for the backend and gateway for those endpoints to accept backend-issued tokens.

## Configuration

1. If `.env` does not already exist, copy `.env.example` to `.env` in the repository root. If you already have a `.env`, preserve it and edit only the values you intend to change.
2. Review every value for the local environment. Never commit `.env`.
3. Set `JWT_SECRET` to a random secret of at least 32 characters and ensure the backend and gateway use the same value. The backend has a development fallback in `application.yml`, but the gateway's protected operations require the environment variable to be set.
4. Set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` in the repository-root `.env` (not `.env.example`) when you need an initial admin account. The email domain must be in `INSTITUTIONAL_EMAIL_DOMAINS`; the password must be at least 14 characters. Restart the backend after changing these values. Bootstrap creates a new account only; it does not promote a student or reset an existing admin's password.
5. Set a valid `GEMINI_API_KEY` and a model available to that key if you want Gemini generation. Otherwise the assistant uses its deterministic retrieval fallback.
6. Set `CORS_ORIGINS` to the exact frontend origins you use, comma-separated. The default gateway allowlist includes ports `5173` on localhost and `127.0.0.1`.

For PowerShell, generate a local random JWT secret, then paste the output into the ignored root `.env` as `JWT_SECRET=<generated-value>`:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToBase64String($bytes)
```

Do not paste the generated value into chat, source control, or `VITE_*` settings.

Relevant variables in `.env.example`:

| Variable | Default/use |
| --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Compose database name, account, password, host port |
| `BACKEND_PORT` | Spring Boot HTTP port (`8080`) |
| `GATEWAY_PORT`, `BACKEND_URL`, `CORS_ORIGINS` | Gateway listen port, backend base URL, browser-origin allowlist |
| `AI_SERVICE_PORT`, `AI_SERVICE_URL` | AI server port and gateway-to-AI upstream URL |
| `VITE_API_URL` | Browser-facing gateway URL |
| `TCP_EVENT_PORT` | TCP event receiver port (`41235`) |
| `EMERGENCY_UDP_PORT` | UDP receiver port (`41234`) |
| `INSTITUTIONAL_EMAIL_DOMAINS` | Comma-separated registration/admin-bootstrap domain allowlist |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional server-side Gemini configuration |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Optional first-admin creation settings |

Spring Boot imports `.env` from its working directory and from the repository root when started in `backend/`. The gateway reads uppercase variables from root `.env` when launched from `gateway/`. The AI service reads `GEMINI_API_KEY` and `GEMINI_MODEL` from root `.env`; `AI_SERVICE_URL` configures the gateway's upstream and defaults to `http://localhost:5000`. The emergency receiver reads its process environment and does not load root `.env`. Vite reads process variables and `frontend/.env` files, not root `.env`; browser requests default to the gateway. Only set `VITE_API_URL` in `frontend/.env.local` if the gateway uses a non-default address. Never expose Gemini credentials through `VITE_*` variables.

**Admin login:** `.env.example` is a template, not runtime configuration. Put `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` in the root `.env`, then restart the backend. If that email already belongs to a student, bootstrap will not elevate it; if an admin account already exists, bootstrap will not change its password.

## Run locally

### Prerequisites

- Windows PowerShell, macOS, or Linux shell
- Docker Desktop with Compose
- Java 21 or later and Maven
- Node.js and npm
- Network ports `5432`, `8080`, `3001`, `5000`, `5173`, `41234/UDP`, and `41235/TCP` available (or configure alternatives consistently)

### 1. Configure and start PostgreSQL

From the repository root:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Edit .env and set local values, including a shared JWT_SECRET.
docker compose up -d postgres
docker compose ps postgres
```

Wait until the container reports `healthy`. Compose stores database files in the named volume `campusconnect-postgres-data`; stopping the container does not remove that data.

### 2. Start the backend

In a new terminal:

```powershell
Set-Location backend
mvn spring-boot:run
```

Flyway validates/applies migrations during startup. The backend needs the PostgreSQL settings from the root `.env`.

### 3. Start the AI service

In a new terminal:

```powershell
Set-Location ai-service
npm install
npm run dev
```

### 4. Start the gateway

In a new terminal:

```powershell
Set-Location gateway
npm install
npm run dev
```

### 5. Start the emergency receiver

In a new terminal:

```powershell
Set-Location emergency-receiver
npm install
npm run dev
```

For the controlled emergency test path, configure the same private `INTERNAL_SERVICE_TOKEN`, `EMERGENCY_HMAC_SECRET` (at least 32 bytes), and `EMERGENCY_RECEIVER_ID` for gateway and receiver. Configure the same internal token for the backend. Set `EMERGENCY_TEST_MODE=true` only for an isolated local test. Keep that flag false otherwise.

### 6. Start the ML prototype

In a new terminal:

```powershell
Set-Location ml-service
py -3.11 -m pip install -r requirements.txt
py -3.11 -m uvicorn src.main:app --port 5100
```

The service falls back to labeled deterministic heuristics when no model artifact is configured. These outputs are not trained-model predictions or measured accuracy claims.

### 7. Start the frontend

In a new terminal:

```powershell
Set-Location frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend and gateway must use matching origins/ports; update `CORS_ORIGINS` if Vite selects another port.
Assistant and knowledge requests are proxied through the gateway. Add the browser's origin to the gateway's `CORS_ORIGINS`; the AI service does not need a browser CORS allowlist.

### Run built services

For Node services, run `npm run build`, then `npm start` from that service directory where a `start` script exists. Run `npm test` in gateway, emergency-receiver, and network-simulator. For the backend, use `mvn test` or `mvn spring-boot:run`. For a production frontend bundle, use `npm run build`; `npm run preview` serves the generated bundle locally.

### Health checks

| Service | Check |
| --- | --- |
| Frontend | `http://localhost:5173/` |
| Gateway | `http://localhost:3001/health` |
| Backend | `http://localhost:8080/api/v1/health` |
| Backend actuator | `http://localhost:8080/actuator/health` |
| AI service | `http://localhost:5000/health` |
| ML prototype | `http://localhost:5100/health` |
| PostgreSQL | `docker compose ps postgres` |

The health endpoints indicate service availability, not that every cross-service feature is configured. For example, AI health reports `provider: retrieval-fallback` when Gemini credentials are missing/invalid placeholders.

### Stop services and database

Stop each development process with `Ctrl+C` in its terminal. To stop only PostgreSQL while keeping its data:

```powershell
docker compose stop postgres
```

Do not run `docker compose down -v` unless you intentionally want to delete the PostgreSQL volume and its data.

## Build and test

Run each command from the named service directory:

```powershell
# frontend/
npm run build

# gateway/
npm run build
npm test

# ai-service/
npm run build

# emergency-receiver/
npm run build
npm test

# ml-service/
py -3.11 -m pytest

# network-simulator/
npm test

# backend/
mvn test
```

Current tests cover backend configuration/controller/service behavior, gateway emergency-request validation, receiver signed-envelope validation, ML heuristic API contracts, and deterministic simulator output. The frontend has a TypeScript + production-bundle build but no configured unit-test script. Full browser-to-database and multi-service delivery end-to-end tests remain outstanding. A successful build does not prove that credentials, ports, Gemini, or all network delivery guarantees are configured.

## Example workflows

### Student support ticket

1. Open `/register` and register using an email domain in `INSTITUTIONAL_EMAIL_DOMAINS`.
2. Sign in at `/login`.
3. Open campus services or `/tickets/new`, select a category, and submit a description.
4. The browser sends an authenticated REST request to the gateway.
5. The gateway forwards the request to Spring Boot.
6. Spring validates the JWT, input, and role, then persists the ticket and creation notification in PostgreSQL.
7. Open `/tickets` or `/tickets/{id}` to read persisted state and post messages.
8. The owner can mark a ticket resolved; staff/admin can change its workflow status.

### Administrator bootstrap

Set the approved admin email and a unique password of at least 14 characters in `.env`, restart the backend, then sign in at `/admin/login`. Keep the credentials private. If the email already belongs to a non-admin user, bootstrap fails instead of silently promoting that user.

### Knowledge assistant

Ask about a topic covered by `knowledge-base/`. The AI service finds relevant Markdown articles and returns cited article titles. If Gemini is properly configured, the service can use approved knowledge context to generate a concise answer. If not, it returns deterministic source text. Emergency-related questions receive safety guidance and must not be treated as dispatch or emergency assistance.

### Network demonstrations

- Use browser developer tools or `curl`/PowerShell `Invoke-WebRequest` to inspect HTTP requests, status codes, and JSON responses.
- Create a ticket and verify the backend outbox, correlated TCP receiver receipt, and persisted delivery event.
- Only in isolated local test mode, send a controlled test datagram and verify its persisted receiver receipt and matching ACK. Never use the demonstration for real dispatch.
- Do not send fabricated or real emergency reports to test this demo.

## Troubleshooting

| Symptom | Likely check |
| --- | --- |
| Backend cannot connect to PostgreSQL | Confirm Docker Desktop is running, `docker compose ps postgres` is healthy, `.env` database values match Compose, and port `5432` is available. |
| Flyway or Hibernate schema error | Inspect backend startup logs and migration files. Do not manually change a shared database schema without a migration. |
| Gateway returns `503 BACKEND_UNAVAILABLE` | Check that Spring Boot is listening at `BACKEND_URL` (default `http://localhost:8080`) and inspect backend logs. |
| Browser CORS error | Confirm the page's exact origin appears in `CORS_ORIGINS`; scheme, hostname, and port must match. CORS does not grant API permissions. |
| Registration rejects an email | The domain must exactly match one of `INSTITUTIONAL_EMAIL_DOMAINS`. |
| Staff network metrics/emergency API returns `401` | The gateway must have `JWT_SECRET` set to the same value used by Spring Boot; verify token expiry and sign in again. |
| Admin route redirects or access is denied | Provision an admin using bootstrap configuration; a frontend route alone does not grant an ADMIN role. |
| Assistant uses fallback | Check the AI health response, server-side `GEMINI_API_KEY`/`GEMINI_MODEL`, and the key's model access. Restart the AI service after editing environment values. |
| Assistant finds no source | Confirm the relevant Markdown article exists under `knowledge-base/` and that the AI service is running with the expected knowledge-base path. |
| TCP/UDP port already in use | Identify the owning process and change the configured sender/receiver ports together. Do not start a second listener on the same port. |
| Emergency test does not confirm receipt | Confirm explicit local test mode, matching internal token/signing secret/receiver ID, backend reachability, and receiver health. A timeout remains unconfirmed; do not treat it as delivery. |

## Security and privacy

- `.env` must remain local and ignored by Git. Never commit database credentials, JWT secrets, admin passwords, or Gemini keys.
- Use a new, random JWT signing secret of at least 32 characters; use the same value in backend and gateway. The development fallback in backend configuration is not suitable for deployment.
- Gemini access is server-side. Do not use `VITE_GEMINI_API_KEY` or otherwise expose a provider key to the browser.
- Passwords are stored as BCrypt hashes. API responses must not expose the hash.
- Backend authorization must be used for every protected resource; hiding a button or route in React is not authorization.
- The AI service validates payload sizes and uses approved local knowledge, but there is no configured rate limiter or user authentication on its HTTP API. Do not expose it publicly without further controls.
- Gateway CORS is an origin policy, not a security boundary. Use HTTPS/TLS, network controls, secure secret management, monitoring, and hardened deployment configuration before production.
- The current WebSocket event prototype has no durable replay cursor and must not be treated as the source of truth.
- Emergency transport is strictly a local protocol test, not a safety service or real dispatch channel.
- Avoid putting passwords, one-time codes, or unnecessary personal information in support tickets or AI prompts.

## Critical assessment: is this a good and useful project?

### Short verdict

CampusConnect is a useful, ambitious **course project and systems prototype**. It combines a recognizable campus problem with enough independent services and protocol behavior to support a strong Computer Networks demonstration. Its strongest potential is not the ticketing UI or chatbot by itself, but the testable path from network conditions and user reports to incident awareness and reliable event delivery.

It is **not yet a validated campus operations product, production service, or completed ML research system**. The project uses simulated network conditions and heuristic ML outputs unless model artifacts are trained and evaluated. A realistic-looking dashboard or probability is not evidence of predictive accuracy.

### What is strong

- **Relevant problem:** one place to report and track common campus support issues is easy for students and staff to understand.
- **Good CNT teaching material:** HTTP through a gateway, TCP stream framing, UDP datagrams, acknowledgments, ports, and delivery failure distinctions are visible in code and can be demonstrated.
- **Useful service boundaries:** Spring Boot owns user and ticket data; the Node gateway handles transport concerns; the receiver is independently runnable; AI and ML are separated from core authorization.
- **Reliability is discussed honestly:** the project distinguishes a successful local send from a correlated receiver acknowledgment and labels emergency transport as test-only.
- **A credible path to a research contribution:** combine ticket reports, topology, and network telemetry to group reports into incidents, then evaluate communication policies under controlled loss and latency.

### What is weak or unproven

- **Operational usefulness is hypothetical:** there is no demonstrated integration with campus identity, help-desk processes, actual access-point/router telemetry, or real support staff workflows. Synthetic data demonstrates behavior, not campus impact.
- **The ML layer is currently mostly rules and weighted scores:** the FastAPI endpoints return bounded heuristics and explicitly identify themselves as fallback. Do not call these learned predictions or report accuracy for them.
- **The research story can overreach:** adaptive transport sounds compelling, but UDP is not a reliable replacement for TCP/HTTPS. A policy must compare valid alternatives for a specific event, include ACK and idempotency behavior, and be tested against a fixed baseline.
- **Scope is large for a course project:** multiple languages, services, authentication, database, UI, AI, network transports, and planned ML create integration and maintenance cost. Implement a narrow end-to-end experiment before adding more modules.
- **Some user-facing flows are still prototype quality:** email verification, ticket assignment, attachments, complete audit history, broad automated end-to-end tests, and polished recovery/error states remain gaps.
- **Not production hardened:** development HTTP endpoints, missing comprehensive rate limits and observability, and simulated/local-only network operation are not sufficient for a public campus deployment.

### Overall rating (qualitative)

| Dimension | Assessment | Reason |
| --- | --- | --- |
| Course-project value | Strong | Demonstrates several networking concepts in a cohesive scenario. |
| Practical problem fit | Promising, unvalidated | Campus support is useful, but adoption and integrations have not been tested. |
| Current ML maturity | Early prototype | Heuristic estimates and simulator exist; model performance is not established. |
| Production readiness | Low | Security hardening, operational processes, integrations, and reliability work remain. |
| Research potential | Good if narrowed | A reproducible incident-correlation and delivery-policy experiment is measurable. |

### Best direction for extensive, practical ML

Keep **three decision layers separate**:

1. **ML recommends:** anomaly likelihood, ticket-to-incident match, likely affected nodes/users, and candidate root causes.
2. **Deterministic policy enforces:** authorization, signature checks, allowed transports, retry/copy limits, deadlines, and test-only emergency restrictions. ML must never override these.
3. **A person confirms consequential actions:** staff can accept, reject, or correct incident links and recommendations. Capture that feedback with appropriate privacy controls.

Build in this order:

1. **Improve experimental data.** The simulator now exports seeded scenario-level JSON/CSV with incident labels and supports scenario-level file splits. Add validation/calibration sets and richer realistic distributions before making research claims.
2. **Establish simple baselines.** The training script compares Isolation Forest to a basic threshold baseline. Next compare the current weighted heuristic and other interpretable models, recording model, features, data version, and parameters.
3. **Validate anomaly detection.** An initial Isolation Forest path is available. Evaluate detection delay, false alarms, scenario-held-out performance, and robustness, not just a single metric. Review model metadata before manually activating an artifact.
4. **Add incident correlation.** Combine text similarity, category, time, location/topology, and telemetry. Use precision/recall/F1 and inspect false merges and missed merges. Keep a human-review threshold for uncertain matches.
5. **Add root-cause and impact estimates only when labels support them.** Report top-1/top-3 root-cause accuracy and impact MAE; report calibrated probabilities or clearly label uncalibrated scores.
6. **Evaluate communication policies separately.** Replay identical scenarios against a fixed TCP/HTTP baseline and a bounded candidate policy. Measure confirmed delivery rate, latency percentiles, retries, duplicate rate, and bandwidth overhead under controlled network impairment. Never claim the policy caused an improvement without repeated runs and uncertainty reporting.
7. **Make predictions useful and inspectable.** Return model version, confidence, evidence/reason codes, timestamp, and fallback mode. Store predictions separately from ground truth and user corrections.

Do not start with deep learning, reinforcement learning, or an LLM deciding transport. Those add data and safety requirements without solving the current missing-label and evaluation problems. The existing simulator and interpretable baselines are a more defensible starting point.

### User-friendliness and product improvements

- **Make the first task obvious:** prominent “Report a problem” and “Track my requests” actions, minimal registration friction, and plain labels instead of internal category codes.
- **Improve ticket submission:** guided category selection, examples of useful details, location suggestions, inline validation, draft saving, and a clear confirmation with ticket number and expected next step.
- **Show understandable progress:** a human-readable status timeline, last-updated time, who should act next, and an explanation when staff request more information. Do not expose internal topology or sensitive operational details to students.
- **Design every state:** loading, empty, offline, permission denied, validation error, and retry states. Preserve a user's draft when an API call fails and avoid duplicate submissions.
- **Improve accessibility and mobile use:** keyboard navigation, visible focus, screen-reader labels, sufficient contrast, responsive forms, and clear text in addition to color-coded severity.
- **Make assistance trustworthy:** cite knowledge articles, identify generated content as AI-assisted, offer a direct path to create a ticket, and avoid implying that an answer is official or emergency support.
- **Support staff work, not only dashboards:** assignment, ownership, internal notes separated from student-visible messages, filters, bulk-safe actions, searchable history, and auditable status changes.
- **Close the feedback loop:** let students rate whether guidance solved the issue and let staff correct incident grouping. Use aggregated, minimized data for model improvement and explain retention.

### Practicality and scope recommendation

For the next milestone, do not attempt every proposal in `CampusConnect_FINAL_IMPLEMENTATION_PLAN.md`. Complete one demonstrable vertical slice:

> Generate a labeled network failure scenario → ingest telemetry → correlate multiple synthetic tickets → show a staff incident with evidence → deliver an event over a bounded transport policy → record a correlated ACK or failure → compare the result with a fixed baseline.

That slice makes the CNT concepts, practical value, and ML contribution concrete. Treat actual campus telemetry and emergency use as out of scope until permission, privacy, security, and operational ownership are established.

## Roadmap and known gaps

The detailed proposed roadmap and acceptance criteria are in [`CampusConnect_FINAL_IMPLEMENTATION_PLAN.md`](CampusConnect_FINAL_IMPLEMENTATION_PLAN.md). Major follow-up areas include:

1. Add end-to-end tests for registration/login, ticket lifecycle, messages, notifications, profile updates, and role boundaries.
2. Make message sender identity/role accurate for all staff roles and refine the support conversation experience.
3. Add WebSocket replay cursors and stronger reconnect/resubscribe recovery around REST state.
4. Add multi-process outbox coordination, backoff/jitter, dead-letter operations, and end-to-end failure-injection tests.
5. Build reproducible, ground-truth-labeled scenario evaluation, baseline/ablation comparisons, and model-artifact lifecycle before making research-performance claims.
6. Add AI rate limits, production observability, independent security review, and stronger privacy controls.
7. Add account lifecycle, email verification, staff assignment/auditing, accessibility and contrast review, CI, deployment/TLS, backup, and recovery procedures.

Use small vertical feature slices. Do not mark a roadmap feature complete because only a screen or route exists; validate persistence, permissions, errors, and recovery.

## Distributable package

A portable archive of this project can be produced with `CampusConnect_full_package.zip` as the output name. The archive contains every file needed to build and run the system from source while excluding regenerable and machine-local artifacts:

**Included:** all service source trees (`frontend`, `backend`, `gateway`, `ai-service`, `emergency-receiver`, `ml-service`, `network-simulator`), the shared `knowledge-base`, `docs`, CI/workflow files under `.github`, root configuration (`docker-compose.yml`, `.env.example`, `.gitignore`, `package-lock.json`), and all top-level Markdown documentation (this README, the implementation plan, and per-service READMEs).

**Excluded:** `.env` (local secrets), `.git/` (repository history), `node_modules/` (reinstall with `npm install` per service), `backend/target/` (Maven build output, rebuilt by `mvn`), `dist/` and `frontend/dist-reconstructed/` (build bundles regenerated by `npm run build`), `.pytest_cache`, `.pyc` files, and previously generated zip archives.

To restore a package on a new machine: extract the zip, copy `.env.example` to `.env`, fill in local values (`JWT_SECRET`, database credentials, optional `GEMINI_API_KEY`), start PostgreSQL with `docker compose up -d postgres`, and follow the [Run locally](#run-locally) service startup order. Each Node service needs a fresh `npm install` before `npm run dev`.

## Project documentation

- [`docs/architecture/overview.md`](docs/architecture/overview.md): service responsibilities and architecture diagram.
- [`docs/networking/protocols.md`](docs/networking/protocols.md): HTTP/WSS/TCP/UDP flows, delivery status, and emergency acceptance scenarios.
- [`docs/development/setup.md`](docs/development/setup.md): local environment and service startup notes.
- [`CampusConnect_FINAL_IMPLEMENTATION_PLAN.md`](CampusConnect_FINAL_IMPLEMENTATION_PLAN.md): proposed MVP definition, product principles, phased plan, and acceptance criteria.
