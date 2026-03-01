# CCC Summit Intelligence

**Data Center Dealmakers Summit - Intelligence Research Platform**

A production-grade research and data aggregation platform for the CCC (Contractors, Closers & Connections) organization's upcoming Data Center Dealmakers Summit (October 2026).

## Features

- **Dashboard** - Command center with pipeline funnel, metrics, and activity feed
- **Prospects Database** - Virtualized table supporting 10k+ rows with advanced filtering
- **Research Engine** - Configurable scrapers for conferences, directories, news, and company pages
- **AI Enrichment** - Claude-powered categorization, scoring, and summary generation
- **Export System** - Multi-sheet Excel, CSV, and PDF report generation with CCC branding

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API
- **Export**: ExcelJS, jsPDF

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase account (free tier works)

### 1. Clone and Install

```bash
cd ccc-datacenter
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema:
   - Copy contents of `server/src/db/schema.sql`
   - Run the query
3. Seed the data:
   - Copy contents of `server/src/db/seed.sql`
   - Run the query
4. Get your credentials from Settings > API

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### 4. Run Development Server

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Project Structure

```
ccc-datacenter/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # AppShell, Sidebar, TopBar
│   │   │   ├── dashboard/     # Command center components
│   │   │   ├── prospects/     # Prospect table and panels
│   │   │   ├── research/      # Scraper configuration
│   │   │   ├── enrichment/    # AI enrichment UI
│   │   │   ├── export/        # Export wizard
│   │   │   ├── settings/      # Settings page
│   │   │   └── ui/            # Shared components
│   │   ├── hooks/
│   │   ├── stores/            # Zustand state
│   │   ├── lib/               # API client, utilities
│   │   └── types/
│   └── ...
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   ├── db/                # Schema and queries
│   │   └── ...
│   └── ...
└── ...
```

## CCC Verticals

The platform categorizes prospects into CCC's 5 core verticals:

1. **Development** - Real estate developers, land acquisition, entitlements
2. **Investment** - Equity, debt, capital markets, family offices
3. **Brokerage** - Commercial real estate brokers, advisors
4. **Management** - Asset management, property management
5. **Construction** - General contractors, MEP, engineering

## Target Roles

Prospects are assigned one or more target roles:

- **Attendee** - General summit participant
- **Sponsor** - Company sponsorship opportunity
- **Speaker** - Industry expert/thought leader

## AI Enrichment

When you add your Anthropic API key in Settings, the enrichment pipeline will use Claude to:

1. Classify company types (Hyperscaler, Developer, Investor, etc.)
2. Map prospects to CCC verticals
3. Assign target roles based on seniority
4. Generate relevance scores (1-100)
5. Create AI summaries explaining relevance

Without an API key, the system uses rule-based mock enrichment for demo purposes.

## Seed Data

The platform comes pre-loaded with:

- 60+ target companies across all categories
- 12 pre-configured scraper templates
- Default settings

## Scripts

```bash
# Development (runs both client and server)
npm run dev

# Client only
npm run client

# Server only
npm run server

# Build for production
npm run build

# Type checking
npm run typecheck
```

## License

Private - CCC (Contractors, Closers & Connections)
