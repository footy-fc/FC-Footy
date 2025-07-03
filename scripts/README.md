# Scripts Directory

This directory contains utility scripts for managing FC-Footy data and operations.

## Available Scripts

### `updatePremierLeagueLogos.mjs`

Updates the logo URLs for all Premier League teams using the Supabase storage path pattern.

**Usage:**
```bash
npm run update:premier-league-logos
```

**What it does:**
- Fetches all teams from the database
- Matches Premier League teams by name or abbreviation
- Constructs new logo URLs using the pattern: `http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/{abbreviation}.png`
- Checks if each logo URL is accessible
- Updates the team records in the database
- Provides a summary of the operation

### `updateLaLigaLogos.mjs`

Updates the logo URLs for all La Liga teams using the Supabase storage path pattern.

**Usage:**
```bash
npm run update:laliga-logos
```

**What it does:**
- Fetches all teams from the database
- Matches La Liga teams by name or abbreviation
- Constructs new logo URLs using the pattern: `http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/esp.1/{abbreviation}.png`
- Checks if each logo URL is accessible
- Updates the team records in the database
- Provides a summary of the operation

### `updateMLSLogos.mjs`

Updates the logo URLs for all MLS teams using the Supabase storage path pattern.

**Usage:**
```bash
npm run update:mls-logos
```

**What it does:**
- Fetches all teams from the database
- Matches MLS teams by name or abbreviation
- Constructs new logo URLs using the pattern: `http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/usa.1/{abbreviation}.png`
- Checks if each logo URL is accessible
- Updates the team records in the database
- Provides a summary of the operation

### `cleanupDuplicateTeams.mjs`

Cleans up duplicate teams in the database and ensures all Premier League teams have correct Supabase URLs.

**Usage:**
```bash
npm run cleanup:duplicate-teams
```

**What it does:**
- Finds duplicate teams in the database
- Keeps the oldest team record and deletes duplicates
- Updates Premier League teams with correct Supabase storage URLs
- Provides a summary of cleaned up duplicates and updates

## Requirements

- `NEXT_PUBLIC_NOTIFICATION_API_KEY` environment variable must be set
- API server must be running (default: http://localhost:3000)
- Node.js with ES modules support

## Environment Variables

- `NEXT_PUBLIC_API_URL`: Base URL for the API (default: http://localhost:3000)
- `NEXT_PUBLIC_NOTIFICATION_API_KEY`: API key for authentication

## Usage Examples

```bash
# Update Premier League team logos
npm run update:premier-league-logos

# Update La Liga team logos
npm run update:laliga-logos

# Update MLS team logos
npm run update:mls-logos

# Clean up duplicate teams
npm run cleanup:duplicate-teams
```

## Premier League Teams Covered

- Arsenal (ars)
- Aston Villa (avl)
- Bournemouth (bou)
- Brentford (bre)
- Brighton (bha)
- Burnley (bur)
- Chelsea (che)
- Crystal Palace (cry)
- Everton (eve)
- Fulham (ful)
- Ipswich (ips)
- Leicester (lei)
- Liverpool (liv)
- Luton (lut)
- Manchester City (mci)
- Manchester United (mun)
- Newcastle (new)
- Nottingham Forest (nfo)
- Southampton (sou)
- Tottenham (tot)
- West Ham (whu)
- Wolves (wol)

## Output

The script provides detailed logging of each step and a final summary showing:
- Number of teams successfully updated
- Number of teams skipped (already up to date or not found)
- Number of errors encountered

## Future Scripts

This directory can be expanded to include scripts for:
- Updating logos for other leagues (La Liga, Bundesliga, etc.)
- Bulk team creation
- Data migration scripts
- Database cleanup scripts 