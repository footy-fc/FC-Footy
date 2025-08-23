# FPL Picks Storage Strategy

## Overview

This document outlines the storage strategy for Fantasy Premier League (FPL) manager picks data, which is critical for features like the "Worst Captain Picks" analysis.

## Current Storage Architecture

### 🏗️ **KV-Only Storage System**

```
┌─────────────────┐    ┌─────────────────┐
│   FPL API       │    │   KV Cache      │
│   (Source)      │◄──►│   (Fast Access) │
└─────────────────┘    └─────────────────┘
```

### 📊 **Storage Strategy**

#### 1. **FPL API (Source of Truth)**
- **Endpoint:** `https://fantasy.premierleague.com/api/entry/{entryId}/event/{gameweek}/picks/`
- **Purpose:** Real-time data when cache misses
- **Rate Limits:** Yes, requires careful management
- **Data Format:** Raw picks data

#### 2. **KV Database (Upstash Redis) - Primary Storage**
- **Purpose:** Fast access and long-term storage of picks data
- **Cache Duration:** 7 days (since picks don't change after deadline)
- **Key Pattern:** `fc-footy:manager-picks:{entryId}:{gameweek}`
- **Metadata Key:** `fc-footy:manager-picks:metadata:{entryId}:{gameweek}`
- **Gameweeks List:** `fc-footy:manager-gameweeks:{entryId}`

#### 3. **Data Structure**
- **Enriched Picks Data:** Complete player and team information
- **Metadata:** Cache health, pick counts, captain status
- **Gameweek Tracking:** Available gameweeks per manager
- **Bulk Operations:** Efficient batch processing

## 🚀 **Improved Storage Strategy**

### **Key Improvements**

1. **Extended Cache Duration**
   - **Before:** 1 hour cache
   - **After:** 7 days cache (since picks are immutable after deadline)

2. **Metadata Tracking**
   - Store metadata separately for faster queries
   - Track last updated, pick counts, captain/vice captain status

3. **Bulk Operations**
   - Bulk store/retrieve for multiple managers
   - Batch processing to avoid API rate limits

4. **Gameweek Tracking**
   - Track available gameweeks per manager
   - Faster discovery of available data

### **Cache Key Structure**

```
fc-footy:manager-picks:{entryId}:{gameweek}          # Main picks data (7 days)
fc-footy:manager-picks:metadata:{entryId}:{gameweek} # Metadata (1 day)
fc-footy:manager-gameweeks:{entryId}                 # Available gameweeks (30 days)
```

### **Data Flow**

```
Request → Check KV Cache → If miss → Fetch from FPL API → Enrich → Store in KV → Return
```

## 📈 **Performance Benefits**

### **Before (Old Strategy)**
- ❌ 1-hour cache = frequent API calls
- ❌ No bulk operations
- ❌ No metadata tracking
- ❌ Inefficient for historical data
- ❌ Supabase dependency for persistence

### **After (KV-Only Strategy)**
- ✅ 7-day cache = 168x fewer API calls
- ✅ Bulk operations for efficiency
- ✅ Metadata for fast queries
- ✅ Gameweek tracking for discovery
- ✅ Better error handling and fallbacks
- ✅ Simplified architecture (KV-only)
- ✅ No external database dependencies

## 🛠️ **Implementation**

### **New KV Storage Utility**
- **File:** `src/lib/kvPicksStorage.ts`
- **Functions:**
  - `storeManagerPicks()` - Store with extended cache
  - `getManagerPicks()` - Retrieve from cache
  - `bulkStoreManagerPicks()` - Bulk operations
  - `getManagerGameweeks()` - Available gameweeks
  - `getPicksCacheStats()` - Cache statistics

### **Updated API Endpoint**
- **File:** `src/app/api/manager-picks/route.ts`
- **Improvements:**
  - Uses new KV storage utility
  - Extended cache duration
  - Better error handling
  - Source tracking

### **Bulk Population Script**
- **File:** `scripts/populate-picks-cache.mjs`
- **Purpose:** Pre-populate cache for all managers
- **Features:**
  - Batch processing
  - Rate limiting
  - Error handling
  - Progress tracking

## 📊 **Usage Examples**

### **Single Manager Picks**
```typescript
import { getManagerPicks } from '~/lib/kvPicksStorage';

const picks = await getManagerPicks(entryId, gameweek);
if (picks) {
  const captain = picks.picks.find(p => p.is_captain);
  const viceCaptain = picks.picks.find(p => p.is_vice_captain);
  // Analyze captain vs vice captain performance
}
```

### **Bulk Operations**
```typescript
import { bulkGetManagerPicks } from '~/lib/kvPicksStorage';

const requests = [
  { entryId: 123, gameweek: 1 },
  { entryId: 456, gameweek: 1 },
  { entryId: 789, gameweek: 1 }
];

const results = await bulkGetManagerPicks(requests);
// Process all results efficiently
```

### **Cache Statistics**
```typescript
import { getPicksCacheStats, getCacheHealthSummary } from '~/lib/kvPicksStorage';

const stats = await getPicksCacheStats();
console.log(`Total cached picks: ${stats.totalKeys}`);

const health = await getCacheHealthSummary();
console.log(`Cache status: ${health.status} - ${health.message}`);
```

## 🔄 **Cache Population**

### **Manual Population**
```bash
# Populate cache for all managers, gameweek 1
node scripts/populate-picks-cache.mjs
```

### **Cache Monitoring**
```bash
# Monitor cache health and statistics
node scripts/monitor-picks-cache.mjs
```

### **Automatic Population**
- Cache is populated on first request
- Bulk population script for pre-loading
- Future: Scheduled population for new gameweeks

## 📋 **Data Immutability**

### **Why Picks Don't Change**
1. **Deadline Lock:** Picks are locked at gameweek deadline
2. **No Transfers:** In-game transfers don't affect picks
3. **Historical Record:** Picks represent historical decisions

### **Cache Strategy Benefits**
- **7-day cache:** Safe since data is immutable
- **No refresh needed:** Once cached, data is valid
- **Efficient storage:** Store once, read many times

## 🎯 **Use Cases**

### **Worst Captain Picks Analysis**
- Compare captain vs vice captain performance
- Rank managers by missed points
- Generate banter content for social media

### **Historical Analysis**
- Track captain choices over time
- Analyze manager decision patterns
- Generate insights and statistics

### **Real-time Features**
- Fast access to current picks
- Live updates during gameweek
- Quick comparisons and rankings

## 🔮 **Future Enhancements**

### **Planned Improvements**
1. **Extended Cache Analytics:** Enhanced cache statistics and monitoring
2. **Scheduled Population:** Auto-populate cache for new gameweeks
3. **Advanced Queries:** Complex picks analysis queries
4. **Cache Optimization:** Further optimize cache keys and data structure

### **Potential Features**
- Captain choice trends
- Manager performance analytics
- Historical comparisons
- Predictive analytics

## 📝 **Monitoring & Maintenance**

### **Cache Health Checks**
- Monitor cache hit rates
- Track API call frequency
- Alert on cache failures

### **Data Validation**
- Verify picks data integrity
- Cross-reference with FPL API
- Handle data inconsistencies

### **Performance Metrics**
- Response times
- Cache efficiency
- API usage patterns

---

*This storage strategy ensures efficient, reliable access to FPL picks data while minimizing API calls and maximizing performance.*
