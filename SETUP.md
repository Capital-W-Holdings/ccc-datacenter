# CCC Summit Intelligence - Setup Guide

This guide walks you through setting up the CCC Summit Intelligence application for development or production.

## Prerequisites

- **Node.js 18+** - Required for both client and server
- **Redis** - Required for background job processing (scrapers, enrichment, exports)
- **Supabase Account** - For database and file storage

## Quick Start

```bash
# 1. Clone and install dependencies
cd ccc-datacenter
npm install          # Install root dependencies
cd client && npm install && cd ..
cd server && npm install && cd ..

# 2. Configure environment (see sections below)
cp server/.env.example server/.env
# Edit server/.env with your values

# 3. Set up database (see Supabase Setup section)

# 4. Start Redis (required for background jobs)
docker run -p 6379:6379 redis:alpine

# 5. Start development servers
cd server && npm run dev    # Terminal 1
cd client && npm run dev    # Terminal 2
```

---

## Environment Variables

### Server (`server/.env`)

```bash
# Required - Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Required - Redis (for background jobs)
REDIS_URL=redis://localhost:6379

# Required - Security
APP_SECRET=your-random-secret-key-at-least-32-chars

# Optional - Encryption (for storing API keys securely)
ENCRYPTION_KEY=your-64-character-hex-encryption-key

# Optional - Server config
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### Client (`client/.env`)

```bash
# API URL (points to server)
VITE_API_URL=http://localhost:3001

# WebSocket URL (same as API for development)
VITE_WS_URL=http://localhost:3001

# API Key for authentication
VITE_APP_SECRET=your-random-secret-key-at-least-32-chars
```

---

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned
3. Note your project URL and API keys from Settings > API

### 2. Run Database Schema

1. Go to your Supabase Dashboard > SQL Editor
2. Create a new query
3. Copy the contents of `server/src/db/schema.sql` and run it
4. Optionally run `server/src/db/seed.sql` for sample data

### 3. Create Storage Bucket

Exports are stored in Supabase Storage. You need to create a bucket:

1. Go to Storage in your Supabase Dashboard
2. Click "New Bucket"
3. Name: `exports`
4. Make it **private** (files will be accessed via signed URLs)
5. Click "Create bucket"

### 4. Configure Storage Policies (Optional)

For service-role access (server-side), the default policies work. If you need custom policies:

```sql
-- Allow authenticated uploads
CREATE POLICY "Allow service role uploads"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'exports');

-- Allow service role reads
CREATE POLICY "Allow service role reads"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'exports');
```

---

## Redis Setup

Redis is **required** for background job processing. Without Redis, the following features won't work:
- Scraper jobs (will return mock data only)
- AI Enrichment (jobs will queue but never process)
- Exports (jobs will queue but never complete)

### Option 1: Docker (Recommended for Development)

```bash
docker run -p 6379:6379 redis:alpine
```

### Option 2: Local Installation

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

### Option 3: Cloud Redis

For production, use a managed Redis service:
- [Upstash](https://upstash.com) - Serverless Redis, great free tier
- [Redis Cloud](https://redis.com/cloud)
- AWS ElastiCache

Set your `REDIS_URL` accordingly:
```bash
REDIS_URL=redis://username:password@your-redis-host:6379
```

---

## Anthropic API Key (for AI Enrichment)

The AI enrichment feature uses Claude to analyze prospects. To enable it:

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. In the app, go to Settings
3. Enter your Anthropic API key
4. The key is stored encrypted in the database

Without an API key, enrichment will use mock data.

---

## Running the Application

### Development Mode

```bash
# Terminal 1: Start Redis
docker run -p 6379:6379 redis:alpine

# Terminal 2: Start server
cd server
npm run dev

# Terminal 3: Start client
cd client
npm run dev
```

The app will be available at:
- Client: http://localhost:5173
- Server: http://localhost:3001
- API Health: http://localhost:3001/api/health

### Production Build

```bash
# Build client
cd client
npm run build
# Output in client/dist/

# Build server
cd server
npm run build
# Output in server/dist/

# Start server
NODE_ENV=production npm start
```

---

## Troubleshooting

### "Workers: DISABLED" in startup banner

Redis is not configured or not running. Check:
1. Is `REDIS_URL` set in your `.env`?
2. Is Redis actually running? Try `redis-cli ping`

### "Auth: DISABLED" in startup banner

`APP_SECRET` is not set. The API will allow unauthenticated requests.
Set `APP_SECRET` in your `.env` file.

### Export downloads fail with 404

The exports storage bucket may not exist. Create it in Supabase:
1. Go to Storage in Supabase Dashboard
2. Create bucket named `exports`

### Database connection errors

Check your Supabase credentials:
1. `SUPABASE_URL` should be `https://xxx.supabase.co`
2. `SUPABASE_SERVICE_KEY` should be the `service_role` key (not `anon`)

### TypeScript errors during build

Run `npm install` in both `client/` and `server/` directories to ensure all dependencies are installed.

---

## Architecture Overview

```
ccc-datacenter/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks (WebSocket, etc.)
│   │   ├── lib/            # API client, utilities
│   │   └── stores/         # Zustand state management
│   └── ...
│
├── server/                 # Express + BullMQ backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── jobs/           # Background job system
│   │   │   ├── queue.ts    # BullMQ queue definitions
│   │   │   └── workers/    # Job processors
│   │   ├── db/             # Database schema and helpers
│   │   ├── websocket/      # Real-time updates
│   │   └── middleware/     # Auth, rate limiting
│   └── ...
│
└── SETUP.md               # This file
```

---

## Support

For issues or questions, check the following:
1. Server logs (look for error messages)
2. Browser console (for client-side errors)
3. Supabase Dashboard > Logs (for database issues)

---

## What's Next?

Once set up, you can:

1. **Add Prospects**: Use the Research tab to run scrapers
2. **Enrich Data**: Select prospects and run AI enrichment
3. **Filter & Search**: Use filters to find the right prospects
4. **Export**: Download your data as XLSX, CSV, or PDF
