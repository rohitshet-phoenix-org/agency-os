# AgencyOS — Setup Guide

## Prerequisites
- Node.js >= 20
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

---

## Quick Start (Docker)

```bash
# 1. Clone and enter the project
cd agency-os

# 2. Copy env file
cp .env.example .env
# Edit .env with your values

# 3. Start everything
docker-compose up -d

# 4. Run DB migrations
docker-compose exec api npx prisma migrate deploy

# 5. Open the app
open http://localhost:3000
```

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres & Redis via Docker
docker-compose up postgres redis -d

# 3. Copy and configure env
cp .env.example .env

# 4. Generate Prisma client & push schema
npm run db:generate
npm run db:push

# 5. Start all apps in dev mode
npm run dev
```

Apps run at:
- **Web:** http://localhost:3000
- **API:** http://localhost:4000
- **Prisma Studio:** `npm run db:studio` → http://localhost:5555

---

## Architecture

```
agency-os/
├── apps/
│   ├── api/              ← Fastify REST API (port 4000)
│   │   ├── src/
│   │   │   ├── routes/   ← All API endpoints
│   │   │   ├── jobs/     ← BullMQ workers & queues
│   │   │   ├── services/ ← Business logic
│   │   │   ├── app.ts    ← Fastify app factory
│   │   │   └── server.ts ← Entry point
│   │   └── Dockerfile
│   └── web/              ← Next.js 15 frontend (port 3000)
│       ├── src/
│       │   ├── app/      ← App Router pages
│       │   ├── components/
│       │   └── lib/      ← API client, utilities
│       └── Dockerfile
├── packages/
│   └── db/               ← Prisma schema & client
│       ├── prisma/
│       │   └── schema.prisma  ← Single source of truth
│       └── src/index.ts
├── docker-compose.yml
├── turbo.json
└── package.json
```

---

## API Endpoints

| Module | Base Path |
|--------|-----------|
| Auth | `/api/v1/auth` |
| Users | `/api/v1/users` |
| CRM / Leads | `/api/v1/leads` |
| Clients | `/api/v1/clients` |
| Onboarding | `/api/v1/onboarding` |
| Projects | `/api/v1/projects` |
| Tasks | `/api/v1/tasks` |
| Analytics | `/api/v1/analytics` |
| Reports | `/api/v1/reports` |
| Social Media | `/api/v1/social` |
| Email Marketing | `/api/v1/email` |
| SEO | `/api/v1/seo` |
| Ads | `/api/v1/ads` |
| Billing | `/api/v1/billing` |
| Approvals | `/api/v1/approvals` |
| Notifications | `/api/v1/notifications` |
| Webhooks | `/api/v1/webhooks` |

---

## Background Jobs (BullMQ)

| Queue | Jobs |
|-------|------|
| `reports` | `generate-report`, `send-report` |
| `social-publish` | `publish-post` |
| `email` | `send-campaign` |
| `seo` | `check-rankings`, `run-audit` |
| `ad-sync` | `sync-account` |
| `alerts` | `evaluate-alerts` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| State | TanStack Query, Zustand |
| Backend | Fastify, TypeScript |
| Database | PostgreSQL 16 + Prisma ORM |
| Queue | BullMQ + Redis |
| Auth | JWT (Fastify JWT) |
| Monorepo | Turborepo + npm workspaces |
| Containers | Docker + Docker Compose |
