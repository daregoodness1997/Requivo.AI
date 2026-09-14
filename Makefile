.PHONY: restore build test lint format clean

# ─── Backend ──────────────────────────────────────────────────────
restore:
	dotnet restore backend/Requivo.sln

build-backend:
	dotnet build backend/Requivo.sln --no-restore

test-backend:
	dotnet test backend/Requivo.sln --verbosity quiet

# ─── Frontend ─────────────────────────────────────────────────────
install-frontend:
	cd frontend && npm ci

build-frontend:
	cd frontend && npm run build

test-frontend:
	cd frontend && npm run test

lint-frontend:
	cd frontend && npm run lint

typecheck-frontend:
	cd frontend && npm run typecheck

format-frontend:
	cd frontend && npm run format

format-check-frontend:
	cd frontend && npm run format:check

# ─── Combined ─────────────────────────────────────────────────────
build: build-backend build-frontend

test: test-backend test-frontend

lint: lint-frontend typecheck-frontend

format: format-frontend

clean:
	dotnet clean backend/Requivo.sln
	rm -rf frontend/dist frontend/node_modules
