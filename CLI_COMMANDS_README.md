# FEPL CLI Commands

Brief reference for all FEPL (Farcaster Fantasy Premier League) CLI commands.

## 📊 Cache Management

| Command | What it does |
|---------|-------------|
| `node scripts/populate-picks-cache.mjs [start] [end] [options]` | Populate KV cache with manager picks for specified gameweek range |
| `node scripts/populate-picks-cache.mjs --incremental` | Only cache missing gameweeks (smart update with early termination) |
| `node scripts/populate-picks-cache.mjs --force` | Force refresh existing cache data |
| `node scripts/monitor-picks-cache.mjs` | Monitor KV cache health and statistics |

## 👑 Captain Analysis

| Command | What it does |
|---------|-------------|
| `node scripts/test-worst-captain-picks.mjs [gameweek]` | Analyze worst captain picks for specified gameweek |

## 🏆 Gameweek Summaries

| Command | What it does |
|---------|-------------|
| `node scripts/gameweek-summary.mjs` | Generate gameweek summary with infographic |
| `node scripts/gameweek-summary-test.mjs` | Test gameweek summary generation |

## 🧪 Testing & Development

| Command | What it does |
|---------|-------------|
| `node scripts/rag-test.mjs` | Test RAG (Retrieval-Augmented Generation) functionality |
| `node scripts/peter-drury-test.mjs` | Test Peter Drury commentary generation |
| `node scripts/test-key-moments.mjs` | Test key moments analysis |
| `node scripts/test-priority.mjs` | Test priority analysis |

## 📈 Data Analysis

| Command | What it does |
|---------|-------------|
| `node scripts/fpl-scatterplot.mjs` | Generate FPL scatterplot analysis |
| `node scripts/scoresquare-players-test.mjs` | Test ScoreSquare players data |

## 🔐 Bendystraw Queries

| Command | What it does |
|---------|-------------|
| `node scripts/bendystraw-permission-holders.mjs [projectId] [chainId] [limit]` | Query permission holders for a Juicebox project |
| `node scripts/bendystraw-project-config.mjs [projectId] [chainId]` | Get detailed project configuration |
| `node scripts/bendystraw-detailed-project.mjs [projectId] [chainId]` | Comprehensive project analysis with events |
| `node scripts/check-buyback-config.mjs [projectId] [chainId]` | Check buyback configuration status |
| `node scripts/uniswap-pool-check.mjs` | Check Uniswap V3 pools for SCORES token |
| `node scripts/check-buyback-status.mjs [projectId] [chainId]` | Check if buyback delegate is configured |
| `node scripts/basescan-buyback-config.mjs` | Get exact contract methods for manual buyback configuration on Basescan |
| `node scripts/verify-buyback-deployment.mjs` | Verify if buyback hook was deployed and configured at project creation |
| `node scripts/check-scores-balances-bendystraw.mjs` | Check SCORES token balances via Bendystraw |
| `node scripts/bendystraw-pay-events.mjs` | Get pay events from Bendystraw |

## 🔧 Setup & Build

| Command | What it does |
|---------|-------------|
| `yarn install` | Install dependencies |
| `yarn dev` | Start development server |
| `yarn run check` | Run type checking |
| `yarn build` | Build for production |

## 📊 API Endpoints

| Command | What it does |
|---------|-------------|
| `curl "http://localhost:3000/api/manager-picks?fid=4163&gameweek=1"` | Get manager picks for specific FID and gameweek |
| `curl "http://localhost:3000/api/fpl-league?leagueId=18526"` | Get FPL league standings |
| `curl "http://localhost:3000/api/cache-stats"` | Get cache statistics |
| `curl "http://localhost:3000/api/cache-stats?detailed=true"` | Get detailed cache statistics |

### 🌐 Ngrok Tunnel Setup

When using ngrok for external access, update the BASE_URL in scripts:

```bash
# Current ngrok URL (updates frequently)
export NEXT_PUBLIC_BASE_URL="https://f91db06e1b5e.ngrok.app"

# Run scripts with ngrok URL
NEXT_PUBLIC_BASE_URL="https://f91db06e1b5e.ngrok.app" node scripts/populate-picks-cache.mjs 1 5

# Or set environment variable
export NEXT_PUBLIC_BASE_URL="https://f91db06e1b5e.ngrok.app"
node scripts/monitor-picks-cache.mjs
```

**Note**: Ngrok URLs change frequently. Check your ngrok dashboard for the current URL.

## 🎯 Most Used Commands

For regular FEPL stats monitoring:

1. `node scripts/monitor-picks-cache.mjs` - Check if cache is healthy
2. `node scripts/populate-picks-cache.mjs --incremental` - Update missing gameweeks (optimized)
3. `node scripts/test-worst-captain-picks.mjs [gameweek]` - Find bad captain choices  
4. `node scripts/gameweek-summary.mjs` - Generate weekly summary
5. `curl "http://localhost:3000/api/cache-stats"` - Quick cache status

## 🔧 Troubleshooting

### Cache Issues
- **0% coverage**: Ensure KV environment variables are set in `.env`
- **Slow cache stats**: Fixed - now uses efficient sampling instead of scanning all keys
- **Cache not updating**: Use `--force` flag to refresh existing data

### Performance Optimizations
- **Early termination**: Cache population stops when gameweeks are unavailable
- **Smart incremental updates**: Only caches missing gameweeks
- **Efficient stats**: Cache health check uses sampling for fast results

## 📋 Usage Examples

```bash
# Daily cache health check
node scripts/monitor-picks-cache.mjs

# After gameweek deadline - analyze captain picks
node scripts/test-worst-captain-picks.mjs 1    # Analyze gameweek 1
node scripts/test-worst-captain-picks.mjs 5    # Analyze gameweek 5

# Generate weekly summary for social media
node scripts/gameweek-summary.mjs

# Check if cache needs repopulating
curl "http://localhost:3000/api/cache-stats" | jq '.status'

# Cache specific gameweek ranges
node scripts/populate-picks-cache.mjs 1 10        # Gameweeks 1-10
node scripts/populate-picks-cache.mjs 15 20       # Gameweeks 15-20

# Only cache missing gameweeks (incremental with early termination)
node scripts/populate-picks-cache.mjs --incremental

# Force refresh existing cache
node scripts/populate-picks-cache.mjs 1 38 --force

# Quick test with just a few gameweeks
node scripts/populate-picks-cache.mjs 1 5

# Using ngrok tunnel (when localhost not accessible)
NEXT_PUBLIC_BASE_URL="https://f91db06e1b5e.ngrok.app" node scripts/populate-picks-cache.mjs 1 5

# Bendystraw permission holders queries
node scripts/bendystraw-permission-holders.mjs 140 8453 50    # Project 140 on Base, limit 50
node scripts/bendystraw-permission-holders.mjs 53 8453        # Project 53 on Base, default limit
node scripts/bendystraw-permission-holders.mjs 140            # Project 140 on Base, default limit

## ✅ Expected Cache Health

When everything is working correctly, you should see:
- **Status**: `healthy` 
- **Coverage**: `100.0% (145/145 managers)`
- **Total Keys**: `725` (290 picks + 290 metadata + 145 gameweeks)
- **Gameweek Range**: `1-2` (or current gameweek range)
```

---

*Quick reference for FEPL CLI commands - all scripts are in the `scripts/` directory*
