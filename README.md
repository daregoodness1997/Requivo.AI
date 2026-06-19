# Requivo AI

Autonomous ERP Operations Agent — natural language → executable ERP workflows.

## Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 19 + TypeScript + Vite      |
| Backend    | ASP.NET Core (.NET 10)            |
| AI         | Qwen LLM (hosted endpoint)        |
| Database   | PostgreSQL 17                     |
| Cache      | Redis 7                           |
| Notify     | SendGrid + Slack API              |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend  (React + Vite + Nginx)     → http://localhost:80  │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│  Backend  (ASP.NET Core .NET 10)      → http://localhost:8080│
│  Workflow Engine │ Qwen AI │ 6 ERP Tools │ HITL │ Audit      │
└───────────┬──────────────────────────────┬───────────────────┘
            │                              │
┌───────────▼───────────┐    ┌────────────▼──────────────────┐
│  PostgreSQL 17        │    │  Redis 7                      │
│  :5432                │    │  :6379                        │
└───────────────────────┘    └───────────────────────────────┘
```

## Quick Start — Docker (Recommended)

All services (Postgres, Redis, backend, frontend) start with a single command:

```bash
# 1. Set required secrets
export QWEN_API_KEY=your_qwen_key
export SENDGRID_API_KEY=your_sendgrid_key
export SLACK_WEBHOOK_URL=your_slack_webhook

# 2. Launch everything
docker compose up -d

# Backend → http://localhost:8080
# Frontend → http://localhost:80
# Swagger → http://localhost:8080/swagger (Development only)
```

### Docker images

Images are published on Docker Hub under `daregoodness/requivo.ai`:

- **`daregoodness/requivo.ai:api`** — backend API
- **`daregoodness/requivo.ai:web`** — frontend (Nginx)

### Seeding test users

Test users (admin, operator, approver, auditor) are **not seeded by default in Production**. Enable explicitly:

```yaml
# In docker-compose.yml, add under api.environment:
- Auth__SeedTestUsers=true
```

Or via command line:

```bash
docker compose run -e Auth__SeedTestUsers=true api
```

Test user credentials: `admin.test@requivo.ai` / `Pass@1234` (same for all roles).

## Quick Start — Local Development

### Backend

```bash
cd backend/src/Requivo.Api
dotnet restore
dotnet ef database update   # requires local PostgreSQL
dotnet run                  # https://localhost:7001 (launchSettings.json)
```

### Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The frontend reads API base URL from `VITE_API_BASE_URL` in `.env`. Default: `http://localhost:8080` (Docker). For local `dotnet run`, change to `http://localhost:5000`.

### Environment variables

| Variable                    | Where          | Description                              |
|-----------------------------|----------------|------------------------------------------|
| `QWEN_API_KEY`              | docker-compose  | Qwen LLM API key                        |
| `SENDGRID_API_KEY`          | docker-compose  | SendGrid email API key                  |
| `SLACK_WEBHOOK_URL`         | docker-compose  | Slack notification webhook              |
| `ConnectionStrings__Postgres` | .env / docker  | PostgreSQL connection string            |
| `ConnectionStrings__Redis`    | .env / docker  | Redis connection string                 |
| `JWT_SECRET_KEY`             | .env           | JWT signing key                         |
| `Auth__SeedTestUsers`        | docker-compose  | Seed dev users on startup (default: false) |
| `VITE_API_BASE_URL`          | frontend/.env  | Backend URL for frontend API calls      |
| `VITE_SSE_URL`               | frontend/.env  | SSE event stream URL                    |

> **⚠️ Never hardcode `ASPNETCORE_URLS` or `ASPNETCORE_ENVIRONMENT` in `.env`.** These are deployment-specific: local dev uses `launchSettings.json`, Docker uses the `Dockerfile` ENV and `docker-compose.yml` environment section.

## RBAC Roles

| Role              | Capabilities                                        |
|-------------------|-----------------------------------------------------|
| `Admin`           | Full access to all endpoints                         |
| `WorkflowOperator`| Start and read workflows                             |
| `Approver`        | View and decide approval requests                   |
| `Auditor`         | Read audit logs                                      |

## Project Structure

```
backend/
  src/
    Requivo.Api/           — Controllers, auth, Dockerfile, .env
    Requivo.Core/          — Models, interfaces
    Requivo.Infrastructure/— EF Core, Redis, integrations
    Requivo.Orchestration/ — Workflow engine, HITL
    Requivo.AI/            — Qwen client, prompt orchestrator
    Requivo.Tools/         — 6 ERP business tools
  tests/
frontend/
  src/
    api/                   — Axios client + endpoint modules
    components/            — UI components (shadcn/ui)
    config/                — Typed env helpers
    pages/                 — Chat, Approvals, Audit, Login
    store/                 — Zustand stores
  Dockerfile               — Multi-stage: Vite build → Nginx
docker-compose.yml         — Full stack orchestration
```

## API Endpoints (key routes)

| Route                          | Auth    | Description                |
|--------------------------------|---------|----------------------------|
| `POST /api/auth/login`         | Public  | Email + password login     |
| `POST /api/auth/mfa/verify`    | JWT     | MFA TOTP verification      |
| `POST /api/workflows`          | JWT+MFA | Start a new workflow       |
| `GET  /api/workflows/:id`      | JWT+MFA | Get workflow status        |
| `POST /api/approvals/:id`      | JWT+MFA | Approve or reject          |
| `GET  /api/audit`              | JWT+MFA | Query audit log            |

All authenticated endpoints require both a valid JWT and an MFA claim (`amr = mfa`).

## License

Private — Lumenware Technologies
