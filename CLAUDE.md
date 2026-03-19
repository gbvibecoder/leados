# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeadOS is a multi-agent AI platform that automates the go-to-market lifecycle for service-based businesses. It runs 13 specialized agents sequentially through a pipeline: from service research and offer packaging, through funnel building and ad campaigns, to lead qualification and CRM hygiene.

Requirements document: `../Flow/LeadOS_Requirements_Document.md`

## Commands

```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Generate Prisma client + Next.js build
npm run lint         # ESLint (Next.js core-web-vitals + TypeScript)
npm test             # Run all tests (vitest run)
npm run test:watch   # Run tests in watch mode (vitest)

# Database
npx prisma db push     # Push schema to database
npx prisma generate    # Generate Prisma client
npx prisma studio      # Open Prisma Studio GUI

# Run a single test file
npx vitest run tests/unit/store.test.ts
# Run tests matching a pattern
npx vitest run -t "should create pipeline"
```

## Architecture

### Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand, Radix UI, Recharts
- **Backend:** Next.js API Routes, Prisma 7 ORM
- **Database:** PostgreSQL via Neon serverless adapter (`@prisma/adapter-neon`)
- **AI:** Gemini (primary/free) with Anthropic Claude fallback (paid). Set `AI_ENGINE=anthropic` to reverse.
- **Auth:** JWT (jose/jsonwebtoken), 7-day token expiry, Bearer token in Authorization header
- **Real-time:** Server-Sent Events (SSE) via `/api/events`
- **Testing:** Vitest + jsdom + React Testing Library

### Path Aliases

```
@/*        → ./src/*
@backend/* → ./backend/*
@shared/*  → ./shared/*       (vitest only — not in tsconfig)
```

### Code Layout

```
src/
  app/api/          # REST API routes (agents, pipelines, leados, settings, auth, events)
  app/              # Next.js pages (dashboard, leados, leads, analytics, settings, agents/[id])
  components/
    ui/             # Radix-based primitives (button, card, input, badge, tabs, etc.)
    agents/         # Agent cards, pipeline flow, agent output renderers
    agents/outputs/ # 13 specialized output components (one per agent type)
    pipeline/       # Pipeline wizard, execution view, preview
    dashboard/      # KPI cards, charts, activity feed
    layout/         # Sidebar, Navbar, PageWrapper, ErrorBoundary
  lib/
    store.ts        # Zustand store — pipeline state, projects, blacklist, activity feed
    api.ts          # API client with Bearer token injection and 401 redirect
    prisma.ts       # Prisma singleton with Neon adapter
    auth.ts         # JWT sign/verify helpers
    utils.ts        # cn() — Tailwind class merge utility

backend/
  agents/
    base-agent.ts   # Abstract base: LLM abstraction, retry, JSON parsing, logging
    leados/         # 13 agent implementations + index.ts factory
  orchestrator/
    pipeline-orchestrator.ts  # Sequential agent execution with retry (3x exponential backoff)
    event-emitter.ts          # Node EventEmitter for SSE pipeline events
  prompts/          # System prompts for Claude/Gemini
  integrations/     # API wrappers: bland-ai, apollo, clearbit, hubspot, google-ads, meta-ads, etc.

shared/
  types.ts          # Core TypeScript types (AgentStatus, LeadStage, PipelineStatus, SSE events)
  constants.ts      # LEADOS_AGENTS array — agent metadata (id, name, description, order)

prisma/
  schema.prisma     # 10+ models: User, Pipeline, AgentRun, Lead, Campaign, etc.

tests/
  setup.ts          # Mocks: Next.js router, EventSource, global fetch
  unit/             # Store, base agent, utilities
  agents/           # Individual agent tests
  api/              # API route tests
  components/       # React component rendering tests
```

### Agent Execution Model

Agents extend `BaseAgent` (in `backend/agents/base-agent.ts`):

1. **LLM Failover:** `callClaude()` tries Gemini first, falls back to Anthropic. Hard 45-second timeout per call (fits Vercel Hobby 60s limit). Max tokens default: 16384.
2. **JSON Parsing:** `parseLLMJson<T>()` / `safeParseLLMJson<T>()` extract JSON from markdown fences.
3. **Data Integrity Rule:** Agents must zero out any LLM-fabricated numeric metrics (market sizes, revenue estimates). Only real API data or subjective LLM scores (confidence, demand) are kept. Zeroed fields get labels like `_cacEstimateLabel = 'llm_estimate'`.

### Pipeline Orchestration

`PipelineOrchestrator` runs agents sequentially. Each agent receives config + all previous agent outputs. On failure: 3 retries with exponential backoff (1s, 2s, 4s). Events emitted: `agent:started`, `agent:progress`, `agent:completed`, `agent:error`, `pipeline:completed` — consumed by SSE endpoint for real-time frontend updates.

### State Management

Zustand store (`src/lib/store.ts`) manages:
- Pipeline execution state (status, current agent index)
- Per-project agent customization (disable agents, set start-from agent)
- Project CRUD with DB-first design and localStorage fallback
- Blacklist management (company/domain exclusions)
- Activity feed (agent events)
- User-scoped localStorage keys (include userId) for multi-user isolation

### Key API Endpoints

- `POST/GET /api/pipelines` — Create/list pipelines
- `POST /api/pipelines/:id/start` — Start pipeline execution
- `POST /api/agents/:id/run` — Run single agent
- `GET /api/leados/leads` — List leads with filters
- `GET /api/events` — SSE stream for real-time updates
- `POST /api/auth/login` — JWT login

## Design Constraints

- All agents must be modular and independently deployable
- LLM providers must be swappable without changing agent business logic (model abstraction layer in `base-agent.ts`)
- AI prompts must be configurable without code deployment (see `backend/prompts/`)
- All AI scoring must provide explainability outputs (reasoning + confidence in `AgentOutput`)
- External integrations use exponential backoff retry
- GDPR, CAN-SPAM, TCPA, CASL compliance required: consent verification before voice calls, DNC list checking, unsubscribe processing, audit trail

## Environment Variables

Required: `DATABASE_URL`, `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`

Optional integrations: `SERPAPI_KEY`, `BLANDAI_API_KEY`, `APOLLO_API_KEY`, `HUBSPOT_API_KEY`, `META_ACCESS_TOKEN`, `GOOGLE_ADS_*`, `INSTANTLY_API_KEY`, `SMARTLEAD_API_KEY`

Set `AI_ENGINE=anthropic` to prefer Anthropic over Gemini. The app runs with mock data when API keys are not configured.

See `.env.example` for the full list.
