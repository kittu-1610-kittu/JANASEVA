# JANASEVA OS

> **Production-grade prototype** of an AI-assisted district public-service and emergency coordination platform.
> ⚠️ **DEMO SYSTEM — Synthetic data only. Not a real government authority.**

---

## What is JANASEVA OS?

JANASEVA OS converts citizen problems and emergency situations into coordinated, trackable actions across government departments and community resources.

**Core Flow:**
```
Citizen Problem → Intake → AI Classification → Department Routing → Priority/SLA →
Field Action → Evidence → Verification → Resolution → Feedback → Analytics
```

---

## Architecture

```
janaseva-os/
├── apps/
│   ├── web/          # Next.js 15 + TypeScript + Tailwind + MapLibre
│   └── api/          # FastAPI + SQLAlchemy + Celery
├── ai/               # AI evaluation & offline classifiers
├── data/seed/        # Synthetic demo district data
├── infrastructure/   # Postgres init SQL
├── tests/            # Unit, API, integration, E2E
└── docker-compose.yml
```

**Technology Stack:**
| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, TanStack Query |
| Maps | MapLibre GL JS |
| Charts | Recharts |
| Backend | FastAPI, Pydantic v2, SQLAlchemy 2.0 (async) |
| Database | PostgreSQL 16 + PostGIS 3.4 + pgvector |
| Queue | Redis 7 + Celery |
| Storage | MinIO (S3-compatible) |
| AI | Google Gemini 2.0 Flash (with deterministic fallback) |
| Migrations | Alembic |

---

## Quick Start

### Prerequisites
- Docker Desktop ≥ 4.0
- Docker Compose V2

### 1. Clone and configure
```bash
git clone <repo>
cd janaseva-os
cp .env.example .env
# Edit .env — at minimum set POSTGRES_PASSWORD, MINIO_SECRET_KEY, JWT_SECRET_KEY, APP_SECRET_KEY
```

### 2. Start the full stack
```bash
docker compose up -d
```

Services will start at:
| Service | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |
| **MinIO Console** | http://localhost:9001 |
| **Health Check** | http://localhost:8000/health |

Optional tools (add `--profile tools`):
| Service | URL |
|---|---|
| PgAdmin | http://localhost:5050 |
| Flower (Celery) | http://localhost:5555 |

### 3. Run database migrations
```bash
docker compose exec api alembic upgrade head
```

### 4. Seed demo data
```bash
docker compose exec api python -m data.seed.seed_all
```

---

## Demo Accounts

All demo accounts use password: **`Demo@1234`**

| Role | Email | Access |
|---|---|---|
| Citizen | citizen@demo.janaseva.in | Submit/track complaints, welfare discovery |
| Department Officer | officer@demo.janaseva.in | Manage complaints, assign tasks |
| Field Worker | field@demo.janaseva.in | Task management, evidence upload |
| District Admin | admin@demo.janaseva.in | Full command center, analytics |
| Police Officer | police@demo.janaseva.in | Law enforcement dashboard |
| Health Officer | health@demo.janaseva.in | Health operations |
| NGO | ngo@demo.janaseva.in | Food rescue, volunteer coordination |
| Super Admin | super@demo.janaseva.in | Full system access |

---

## Demo District — Krishnapur

| Metric | Value |
|---|---|
| Population | 1,250,000 |
| Wards | 42 |
| Hospitals | 28 |
| Shelters | 35 |
| NGOs | 64 |
| Volunteers | 3,800 |
| Restaurants | 240 |

---

## Demo Scenarios

### Scenario A — Citizen Complaint
1. Login as `citizen@demo.janaseva.in`
2. Click "Report an Issue"
3. Describe a pothole, click "Get AI suggestion"
4. Accept or override the category
5. Submit → receives `JS-2026-XXXXXX` ID
6. Login as `officer@demo.janaseva.in` → assign to field worker
7. Login as `field@demo.janaseva.in` → mark task complete
8. Officer verifies → complaint resolved
9. Citizen submits 5-star feedback

### Scenario B — Emergency
1. Login as any user → report emergency (flood)
2. Admin → Emergency Command Center
3. View affected area on GIS map
4. Check shelter capacity
5. Assign resources

### Scenario C — Welfare Discovery
1. Login as citizen
2. Go to Schemes section
3. Enter age, occupation, income bracket
4. View matched schemes with criteria explanation
5. Note the disclaimer: "may qualify — verify officially"

### Scenario D — AI Command Assistant
1. Login as admin
2. Open AI Assistant
3. Ask: *"Show unresolved water complaints older than 48 hours"*
4. System calls `get_complaints()` tool → summarizes results

---

## Running Tests

```bash
# Backend unit tests (no DB needed)
docker compose exec api pytest tests/unit/ -v

# API tests (requires running DB)
docker compose exec api pytest tests/api/ -v

# All tests with coverage
docker compose exec api pytest --cov=app --cov-report=term-missing

# Frontend type check
docker compose exec web npm run type-check

# E2E (Playwright) — requires running stack
cd apps/web && npx playwright test
```

---

## Environment Variables

See [`.env.example`](.env.example) for all variables with descriptions.

Critical variables to set before running:
```env
POSTGRES_PASSWORD=strong_password_here
MINIO_SECRET_KEY=strong_minio_password
APP_SECRET_KEY=openssl_rand_hex_32
JWT_SECRET_KEY=another_random_secret
GEMINI_API_KEY=from_aistudio_google_com  # Optional — falls back to rules
NEXT_PUBLIC_MAPTILER_KEY=from_maptiler_com  # Optional — for map tiles
```

---

## API Documentation

Interactive API docs available at http://localhost:8000/docs (development mode only).

Key endpoints:
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me

POST   /api/v1/complaints
GET    /api/v1/complaints
GET    /api/v1/complaints/{id}
POST   /api/v1/complaints/{id}/assign
POST   /api/v1/complaints/{id}/resolve
POST   /api/v1/complaints/{id}/feedback

POST   /api/v1/emergency
GET    /api/v1/emergency

GET    /api/v1/map/complaints
GET    /api/v1/map/resources
GET    /api/v1/map/heatmap

POST   /api/v1/ai/classify
POST   /api/v1/ai/chat

POST   /api/v1/welfare/match
GET    /api/v1/welfare/schemes
```

---

## Security Considerations

- **RBAC enforced server-side** — every endpoint independently authorizes
- **JWT with refresh token rotation** — old tokens invalidated on refresh
- **Bcrypt password hashing** — no plain-text passwords stored
- **Audit logging** — all sensitive operations recorded immutably
- **AI output validated** — LLM cannot arbitrarily mutate the database
- **File upload validation** — MIME type, extension, size, ownership checked
- **Rate limiting** via SlowAPI
- **Security headers** on all responses
- **No real PII** — demo system uses synthetic data only

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| Modular monolith | Simpler to develop/deploy for MVP; domain boundaries allow future extraction |
| Deterministic priority engine | Transparent, auditable, no LLM hallucination risk for consequential decisions |
| Controlled AI tools | LLM cannot run arbitrary SQL — all data access goes through typed, authorized functions |
| Status machine for complaints | Enforces valid transitions; immutable history for every state change |
| pgvector for RAG | Keeps embeddings co-located with data; no separate vector DB for prototype |
| Celery for SLA | SLA checks run on schedule; not on every request — avoids N+1 performance issues |

---

## Limitations (Prototype)

- WebSocket real-time layer stubbed (polling fallback)
- RAG pipeline requires knowledge documents to be seeded
- SMS/Push notifications are stubs — wire to provider in production
- No multi-tenancy across multiple districts yet
- File uploads use local MinIO — configure S3 for production
- Face recognition, predictive policing, citizen scoring: **intentionally not implemented**

---

## License

Demo/prototype — not for production government deployment without proper security audit,
legal review, and data protection compliance.
