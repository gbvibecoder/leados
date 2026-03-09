# LeadOS — Autonomous Lead Generation Agent Platform

A full-stack web application powering a 13-agent autonomous B2B service lead generation system that automates the entire go-to-market lifecycle.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, Zustand, Recharts, Lucide React
- **Backend**: Next.js API Routes, Prisma ORM (SQLite)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Real-time**: Server-Sent Events (SSE)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys. The app works with mock data even without any keys configured.

### 3. Set Up Database

```bash
npx prisma db push
npx prisma generate
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### 5. Run Tests

```bash
npm test
```

## Project Structure

```
/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── leados/             # LeadOS pipeline page
│   │   ├── leads/              # CRM / Leads view
│   │   ├── analytics/          # Analytics dashboards
│   │   ├── settings/           # Settings & API keys
│   │   ├── agents/[id]/        # Agent detail page
│   │   └── api/                # REST API endpoints
│   ├── components/
│   │   ├── ui/                 # shadcn/ui base components
│   │   ├── agents/             # Agent card, pipeline flow
│   │   ├── dashboard/          # KPI cards, charts, activity
│   │   └── layout/             # Sidebar, Navbar, PageWrapper
│   └── lib/                    # API client, store, utils
├── backend/
│   ├── agents/                 # Agent implementations
│   │   └── leados/             # 13 LeadOS agents
│   ├── orchestrator/           # Pipeline sequencing
│   ├── prompts/                # Claude system prompts
│   └── integrations/           # Third-party API wrappers
├── shared/                     # Shared types & constants
├── tests/                      # Vitest test suites
└── prisma/                     # Database schema
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | KPI cards, pipeline status, activity feed |
| LeadOS Pipeline | `/leados` | 13-agent workflow with run controls |
| Leads / CRM | `/leads` | Lead table with filters and timeline |
| Analytics | `/analytics` | Charts for LeadOS metrics |
| Settings | `/settings` | API keys, integrations, preferences |
| Agent Detail | `/agents/[id]` | Agent config, run history, output viewer |

## API Endpoints

### Pipelines
- `POST /api/pipelines` — Create pipeline
- `GET /api/pipelines` — List pipelines
- `GET /api/pipelines/:id` — Get pipeline
- `POST /api/pipelines/:id/start` — Start pipeline
- `POST /api/pipelines/:id/pause` — Pause pipeline
- `DELETE /api/pipelines/:id` — Delete pipeline

### Agents
- `GET /api/agents` — List all agents
- `GET /api/agents/:id` — Get agent details
- `POST /api/agents/:id/run` — Run single agent
- `GET /api/agents/:id/runs` — Get run history

### LeadOS
- `GET /api/leados/leads` — List leads (with filters)
- `GET /api/leados/leads/:id` — Get lead + timeline
- `PATCH /api/leados/leads/:id` — Update lead
- `GET /api/leados/analytics` — Get analytics

### Settings
- `GET /api/settings` — Get settings (keys masked)
- `PUT /api/settings` — Update settings
- `GET /api/settings/integrations` — Check integration status

### Events
- `GET /api/events` — SSE stream for real-time updates

## LeadOS Agents (13)

1. Service Research — Discover opportunities
2. Offer Engineering — Package offers
3. Validation — GO/NO-GO decision
4. Funnel Builder — Landing pages
5. Content & Creative — Ad copy, emails
6. Paid Traffic — Google/Meta Ads
7. Outbound Outreach — Cold email/LinkedIn
8. Inbound Capture — Lead scoring
9. AI Qualification — Voice calls (BANT)
10. Sales Routing — Lead routing
11. Tracking & Attribution — Analytics setup
12. Performance Optimization — Auto-optimize
13. CRM & Data Hygiene — Data cleanup

## Environment Variables

See `.env.example` for all required variables. The app runs with mock data when API keys are not configured.

## License

Proprietary
