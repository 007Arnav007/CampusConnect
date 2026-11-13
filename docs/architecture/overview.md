# Architecture Overview

CampusConnect uses Spring Boot as the source of truth for users, tickets, permissions, and durable records.

The Node.js gateway owns browser transport concerns:

- HTTP proxy boundary
- WebSocket sessions
- TCP event transport and acknowledgments
- UDP emergency dispatch
- transport telemetry

The AI service is isolated behind an API boundary. It may suggest content or classifications, but it cannot directly mutate application data or authorize emergency actions.

```text
React frontend
      │ HTTPS / WSS
      ▼
Node gateway ───── HTTP ───── Spring Boot ───── PostgreSQL
      │                            │
      ├── TCP event receiver       └── AI service
      └── UDP emergency receiver
```
