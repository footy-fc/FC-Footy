# Database Scripts

This directory contains database migration and setup scripts.

## Daily Rankings Cache

### `create_daily_rankings_table.sql`

Creates a table to cache daily FPL league standings to reduce API calls to the Fantasy Premier League API.

**Purpose:**
- Store daily snapshots of league rankings
- Reduce API calls to FPL (only fetch once per day)
- Improve app performance and reduce rate limiting

**Table Structure:**
- `id` - Primary key
- `date` - Date of the rankings (YYYY-MM-DD)
- `league_id` - FPL league ID (e.g., 18526)
- `rankings_data` - JSONB containing all standings data
- `created_at` - When the record was created
- `updated_at` - When the record was last updated

**Features:**
- Unique constraint on (date, league_id) to prevent duplicates
- Indexes for fast lookups
- Automatic timestamp updates
- Cleanup function for old data (30+ days)

**Usage:**
```sql
-- Run in Supabase SQL editor
\i create_daily_rankings_table.sql
```

**How it works:**
1. First user of the day requests rankings
2. API checks if data exists for today
3. If not found, fetches from FPL API and stores in DB
4. Subsequent users get cached data
5. Next day, process repeats with fresh data

 