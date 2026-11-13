# Development Setup

## Environment

Copy `.env.example` to `.env`. Never commit `.env`.

Set `INSTITUTIONAL_EMAIL_DOMAINS` to the approved domains for your institution. `application.yml` falls back to `vit.edu,vit.ac.in` when the variable is unset, but `.env.example` ships `example.edu`, which overrides it; set your real domains in `.env`.

To enable Gemini, set `GEMINI_API_KEY` in the ignored local `.env` file and use a model enabled for that key's Google AI Studio project (for example `gemini-2.0-flash`); `GEMINI_MODEL` is empty in `.env.example`, so the assistant runs in deterministic retrieval-fallback mode until you set one. The assistant never reads the key from browser variables. Restart `ai-service` after changing the environment. If you already pasted a key into chat, revoke that key and configure a replacement locally.

To provision an initial administrator, set `BOOTSTRAP_ADMIN_EMAIL` to an approved institutional address and `BOOTSTRAP_ADMIN_PASSWORD` to a unique password of at least 14 characters in `.env`, then restart the backend. The backend creates an `ADMIN` account only if that address does not already exist. It does not promote or reset an existing account. Administrator sign-in is at `/admin/login`.

## Database

Start Docker Desktop, then start PostgreSQL with:

```powershell
$docker = "C:\Users\HP\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"
& $docker compose up -d postgres
```

The initial scaffold expects PostgreSQL at `localhost:5432`.

If `docker` is already on your `PATH`, this shorter command is equivalent:

```powershell
docker compose up -d postgres
```

## Service order

1. PostgreSQL
2. Spring Boot backend
3. AI service
4. Node gateway
5. Emergency receiver
6. React frontend

Health checks:

- Backend: `http://localhost:8080/api/v1/health`
- Gateway: `http://localhost:3001/health`
- AI service: `http://localhost:5000/health`
- PostgreSQL: `docker compose ps`

The emergency receiver listens for UDP on port `41234` and TCP events on port `41235`.

## First working workflow

After the backend, gateway, and frontend are running:

1. Open `http://localhost:5173`.
2. Register with an approved institutional email.
3. Sign in.
4. Create a ticket.
5. Refresh or mark the ticket resolved from the dashboard.

The assistant can answer the included demo Wi-Fi question from `knowledge-base/it/wifi-troubleshooting.md`.

## Stop services

Stop the JavaScript and Java processes with `Ctrl+C` in their respective terminals. Stop PostgreSQL without deleting its data:

```powershell
& $docker compose stop postgres
```

Do not use `docker compose down -v` unless you intentionally want to delete the local PostgreSQL volume.
