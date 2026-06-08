# Requivo AI
Autonomous ERP Operations Agent — natural language → executable ERP workflows.

## Stack
| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18 + TypeScript + Vite      |
| Backend    | ASP.NET Core (.NET 10)            |
| AI         | Qwen LLM (hosted endpoint)        |
| Database   | PostgreSQL 17                     |
| Cache      | Redis 7                           |
| Notify     | SendGrid + Slack API              |

## Quick Start
```bash
# 1. Infrastructure
docker compose up -d

# 2. Backend
cd backend/src/Requivo.Api && dotnet restore && dotnet ef database update && dotnet run

# 3. Frontend
cd frontend && npm install && npm run dev
```
