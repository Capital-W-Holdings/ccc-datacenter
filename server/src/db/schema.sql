-- CCC Summit Intelligence Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core prospects table
CREATE TABLE IF NOT EXISTS prospects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT,
    last_name TEXT,
    full_name TEXT NOT NULL,
    title TEXT,
    company TEXT,
    company_type TEXT CHECK (company_type IN (
        'Hyperscaler', 'Developer/Operator', 'Investor', 'Broker',
        'Contractor', 'Engineering', 'Consulting', 'Legal', 'Finance', 'Other'
    )),
    email TEXT,
    email_verified BOOLEAN DEFAULT false,
    email_source TEXT CHECK (email_source IN ('hunter', 'pattern', 'manual', 'scraped')),
    hunter_confidence INTEGER DEFAULT 0 CHECK (hunter_confidence >= 0 AND hunter_confidence <= 100),
    phone TEXT,
    linkedin_url TEXT,
    website TEXT,
    location_city TEXT,
    location_state TEXT,
    location_country TEXT DEFAULT 'US',
    ccc_verticals JSONB DEFAULT '[]', -- ["Development", "Investment", ...]
    target_roles JSONB DEFAULT '[]', -- ["Attendee", "Sponsor", "Speaker"]
    relevance_score INTEGER DEFAULT 0 CHECK (relevance_score >= 0 AND relevance_score <= 100),
    ai_summary TEXT,
    status TEXT DEFAULT 'New' CHECK (status IN (
        'New', 'Qualified', 'Contacted', 'Engaged', 'Nurturing', 'Archived'
    )),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_company ON prospects(company);
CREATE INDEX IF NOT EXISTS idx_prospects_relevance ON prospects(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_updated ON prospects(updated_at DESC);

-- Track where each prospect was found
CREATE TABLE IF NOT EXISTS prospect_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN (
        'conference', 'directory', 'news', 'company', 'cre_deal', 'manual'
    )),
    source_name TEXT,
    source_url TEXT,
    raw_data JSONB DEFAULT '{}',
    scraped_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_sources_prospect ON prospect_sources(prospect_id);

-- Scraper configurations
CREATE TABLE IF NOT EXISTS scrapers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'conference', 'directory', 'news', 'company', 'cre_deal', 'manual', 'ai_research'
    )),
    description TEXT,
    config JSONB DEFAULT '{}', -- { urls: [], keywords: [], selectors: {}, pagination: {} }
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMPTZ,
    last_result_count INTEGER DEFAULT 0,
    schedule TEXT, -- cron expression or null
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Target companies to prioritize
CREATE TABLE IF NOT EXISTS target_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT CHECK (category IN (
        'Hyperscaler', 'Developer/Operator', 'Investor', 'Construction', 'Broker'
    )),
    website TEXT,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL CHECK (action IN (
        'scrape_started', 'scrape_completed', 'enrichment_run',
        'export', 'status_change', 'prospect_added', 'prospect_deleted'
    )),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- Export history
CREATE TABLE IF NOT EXISTS exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    format TEXT CHECK (format IN ('xlsx', 'csv', 'pdf')),
    filters JSONB DEFAULT '{}',
    record_count INTEGER,
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App settings
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
    ('anthropic_api_key', NULL),
    ('hunter_api_key', NULL),
    ('scraping_delay_ms', '3000'),
    ('enrichment_batch_size', '25'),
    ('auto_enrich_on_import', 'false')
ON CONFLICT (key) DO NOTHING;

-- Scrape jobs (for tracking running jobs)
CREATE TABLE IF NOT EXISTS scrape_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scraper_id UUID REFERENCES scrapers(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    results_count INTEGER DEFAULT 0,
    results JSONB DEFAULT '[]',
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Enrichment jobs
CREATE TABLE IF NOT EXISTS enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prospect_ids JSONB NOT NULL, -- array of prospect IDs
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    results JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_prospects_updated_at ON prospects;
CREATE TRIGGER update_prospects_updated_at
    BEFORE UPDATE ON prospects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scrapers_updated_at ON scrapers;
CREATE TRIGGER update_scrapers_updated_at
    BEFORE UPDATE ON scrapers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Hunter.io API cache (avoid duplicate lookups)
CREATE TABLE IF NOT EXISTS hunter_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key TEXT UNIQUE NOT NULL, -- hash of first_name + last_name + domain
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    domain TEXT NOT NULL,
    email TEXT,
    confidence INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    linkedin_url TEXT,
    position TEXT,
    sources INTEGER DEFAULT 0,
    raw_response JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_hunter_cache_key ON hunter_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_hunter_cache_expires ON hunter_cache(expires_at);

-- Hunter.io quota tracking
CREATE TABLE IF NOT EXISTS hunter_quota (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    used INTEGER DEFAULT 0,
    limit_total INTEGER DEFAULT 0,
    reset_at TIMESTAMPTZ,
    last_checked TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default quota record
INSERT INTO hunter_quota (used, limit_total) VALUES (0, 0)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (optional, for multi-tenant)
-- ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scrapers ENABLE ROW LEVEL SECURITY;

-- =====================
-- EVENTS SYSTEM
-- =====================

-- Events table - CCC events across the USA
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    location_city TEXT NOT NULL,
    location_state TEXT NOT NULL,
    venue TEXT,
    date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    expected_attendees INTEGER,
    website_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- Prospect-Event relationship (pipeline tracking)
CREATE TABLE IF NOT EXISTS prospect_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    target_role TEXT NOT NULL CHECK (target_role IN ('Attendee', 'Sponsor', 'Speaker')),
    status TEXT DEFAULT 'Identified' CHECK (status IN (
        'Identified', 'Invited', 'Registered', 'Confirmed', 'Attended', 'No Show', 'Declined'
    )),
    notes TEXT,
    invited_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, prospect_id)
);

CREATE INDEX IF NOT EXISTS idx_prospect_events_event ON prospect_events(event_id);
CREATE INDEX IF NOT EXISTS idx_prospect_events_prospect ON prospect_events(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_events_status ON prospect_events(status);

-- Trigger for events updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for prospect_events updated_at
DROP TRIGGER IF EXISTS update_prospect_events_updated_at ON prospect_events;
CREATE TRIGGER update_prospect_events_updated_at
    BEFORE UPDATE ON prospect_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
