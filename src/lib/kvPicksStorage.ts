import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL!,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN!,
});

export interface EnrichedPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  element_type: number;
  player?: {
    id: number;
    name: string;
    web_name: string;
    code: number;
    team?: {
      id: number;
      name: string;
      short_name: string;
    } | null;
    element_type: number;
    form: number;
    selected_by_percent: number;
    expected_goals: number;
    expected_assists: number;
    total_points: number;
    points_per_game: number;
  } | null;
}

export interface ManagerPicksData {
  entry_id: number;
  gameweek: number;
  picks: EnrichedPick[];
  entry_history?: {
    event: number;
    points: number;
    total_points: number;
    rank?: number;
    rank_sort?: number;
    overall_rank?: number;
    bank?: number;
    value?: number;
    event_transfers?: number;
    event_transfers_cost?: number;
    points_on_bench?: number;
  };
  fetched_at: string;
  source: 'fpl_api' | 'kv_cache';
}

interface PicksMetadata {
  last_updated: string;
  gameweek: number;
  entry_id: number;
  picks_count: number;
  has_captain: boolean;
  has_vice_captain: boolean;
  source: 'fpl_api' | 'kv_cache';
  cache_duration: string;
}

interface CacheStats {
  totalKeys: number;
  sampleKeys: string[];
  memoryUsage: {
    picksKeys: number;
    metadataKeys: number;
    gameweeksKeys: number;
  };
  cacheHealth: {
    picksData: number;
    metadata: number;
    gameweeks: number;
    totalManagers: number;
    averagePicksPerManager: number;
    maxGameweek: number;
    gameweekRange: string;
  };
}

interface CacheHealthSummary {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  stats: CacheStats | null;
}

/**
 * Get the KV key for manager picks
 */
function getPicksKey(entryId: number, gameweek: number): string {
  return `fc-footy:manager-picks:${entryId}:${gameweek}`;
}

/**
 * Get the KV key for manager picks metadata (last updated, etc.)
 */
function getPicksMetadataKey(entryId: number, gameweek: number): string {
  return `fc-footy:manager-picks:metadata:${entryId}:${gameweek}`;
}

/**
 * Get the KV key for all gameweeks for a manager
 */
function getManagerGameweeksKey(entryId: number): string {
  return `fc-footy:manager-gameweeks:${entryId}`;
}

/**
 * Store manager picks in KV with extended cache duration
 * Since picks don't change after deadline, we can cache for much longer
 */
export async function storeManagerPicks(
  entryId: number, 
  gameweek: number, 
  picksData: ManagerPicksData
): Promise<void> {
  const picksKey = getPicksKey(entryId, gameweek);
  const metadataKey = getPicksMetadataKey(entryId, gameweek);
  
  try {
    // Store picks data with extended cache (7 days since picks don't change)
    await redis.setex(picksKey, 7 * 24 * 3600, picksData);
    
    // Store metadata with extended cache (7 days for consistency)
    const metadata = {
      last_updated: new Date().toISOString(),
      gameweek,
      entry_id: entryId,
      picks_count: picksData.picks.length,
      has_captain: picksData.picks.some(p => p.is_captain),
      has_vice_captain: picksData.picks.some(p => p.is_vice_captain),
      source: picksData.source,
      cache_duration: '7 days'
    };
    
    await redis.setex(metadataKey, 7 * 24 * 3600, metadata);
    
    // Update manager's available gameweeks list
    await updateManagerGameweeks(entryId, gameweek);
    
    console.log(`✅ Stored picks for entry ${entryId}, gameweek ${gameweek} in KV`);
  } catch (error) {
    console.error(`❌ Error storing picks in KV:`, error);
    throw error;
  }
}

/**
 * Retrieve manager picks from KV cache
 */
export async function getManagerPicks(
  entryId: number, 
  gameweek: number
): Promise<ManagerPicksData | null> {
  const picksKey = getPicksKey(entryId, gameweek);
  
  try {
    const picksData = await redis.get(picksKey);
    if (picksData) {
      console.log(`✅ Retrieved picks for entry ${entryId}, gameweek ${gameweek} from KV cache`);
      return picksData as ManagerPicksData;
    }
    return null;
  } catch (error) {
    console.error(`❌ Error retrieving picks from KV:`, error);
    return null;
  }
}

/**
 * Get metadata for manager picks
 */
export async function getManagerPicksMetadata(
  entryId: number, 
  gameweek: number
): Promise<PicksMetadata | null> {
  const metadataKey = getPicksMetadataKey(entryId, gameweek);
  
  try {
    const metadata = await redis.get(metadataKey);
    return metadata as PicksMetadata;
  } catch (error) {
    console.error(`❌ Error retrieving picks metadata:`, error);
    return null;
  }
}

/**
 * Update the list of available gameweeks for a manager
 */
async function updateManagerGameweeks(entryId: number, gameweek: number): Promise<void> {
  const gameweeksKey = getManagerGameweeksKey(entryId);
  
  try {
    // Get existing gameweeks
    const existingGameweeks = await redis.get(gameweeksKey) as number[] || [];
    
    // Add new gameweek if not already present
    if (!existingGameweeks.includes(gameweek)) {
      existingGameweeks.push(gameweek);
      existingGameweeks.sort((a, b) => a - b);
      
      // Store for 30 days
      await redis.setex(gameweeksKey, 30 * 24 * 3600, existingGameweeks);
    }
  } catch (error) {
    console.error(`❌ Error updating manager gameweeks:`, error);
  }
}

/**
 * Get all available gameweeks for a manager
 */
export async function getManagerGameweeks(entryId: number): Promise<number[]> {
  const gameweeksKey = getManagerGameweeksKey(entryId);
  
  try {
    const gameweeks = await redis.get(gameweeksKey) as number[];
    return gameweeks || [];
  } catch (error) {
    console.error(`❌ Error getting manager gameweeks:`, error);
    return [];
  }
}

/**
 * Bulk store picks for multiple managers and gameweeks
 */
export async function bulkStoreManagerPicks(
  picksDataArray: Array<{ entryId: number; gameweek: number; data: ManagerPicksData }>
): Promise<void> {
  console.log(`🔄 Bulk storing ${picksDataArray.length} picks datasets...`);
  
  const promises = picksDataArray.map(({ entryId, gameweek, data }) =>
    storeManagerPicks(entryId, gameweek, data)
  );
  
  try {
    await Promise.all(promises);
    console.log(`✅ Successfully bulk stored ${picksDataArray.length} picks datasets`);
  } catch (error) {
    console.error(`❌ Error in bulk store:`, error);
    throw error;
  }
}

/**
 * Get picks for multiple managers and gameweeks
 */
export async function bulkGetManagerPicks(
  requests: Array<{ entryId: number; gameweek: number }>
): Promise<Array<{ entryId: number; gameweek: number; data: ManagerPicksData | null }>> {
  console.log(`🔄 Bulk retrieving ${requests.length} picks requests...`);
  
  const promises = requests.map(async ({ entryId, gameweek }) => {
    const data = await getManagerPicks(entryId, gameweek);
    return { entryId, gameweek, data };
  });
  
  try {
    const results = await Promise.all(promises);
    console.log(`✅ Successfully bulk retrieved ${requests.length} picks requests`);
    return results;
  } catch (error) {
    console.error(`❌ Error in bulk get:`, error);
    throw error;
  }
}

/**
 * Check if picks exist in cache for a manager and gameweek
 */
export async function hasManagerPicks(entryId: number, gameweek: number): Promise<boolean> {
  const picksKey = getPicksKey(entryId, gameweek);
  
  try {
    const exists = await redis.exists(picksKey);
    return exists === 1;
  } catch (error) {
    console.error(`❌ Error checking picks existence:`, error);
    return false;
  }
}

/**
 * Get comprehensive cache statistics
 */
export async function getPicksCacheStats(): Promise<CacheStats> {
  try {
    // Instead of scanning all keys (which is slow), let's use a more efficient approach
    // We know we have 145 managers and we can check a sample to estimate coverage
    
    const sampleKeys: string[] = [];
    let totalPicksKeys = 0;
    let totalMetadataKeys = 0;
    let totalGameweeksKeys = 0;
    
    // Check a sample of managers to estimate coverage
    const sampleManagerIds = [23272, 47421, 55728, 250392, 192153]; // First few managers
    const sampleGameweeks = [1, 2]; // Check first 2 gameweeks
    
    for (const managerId of sampleManagerIds) {
      for (const gameweek of sampleGameweeks) {
        const picksKey = `fc-footy:manager-picks:${managerId}:${gameweek}`;
        const metadataKey = `fc-footy:manager-picks:metadata:${managerId}:${gameweek}`;
        
        // Check if picks key exists
        const picksExists = await redis.exists(picksKey);
        if (picksExists) {
          totalPicksKeys++;
          if (sampleKeys.length < 5) {
            sampleKeys.push(picksKey);
          }
        }
        
        // Check if metadata key exists
        const metadataExists = await redis.exists(metadataKey);
        if (metadataExists) {
          totalMetadataKeys++;
        }
      }
    }
    
    // Check gameweeks keys for sample managers
    for (const managerId of sampleManagerIds) {
      const gameweeksKey = `fc-footy:manager-gameweeks:${managerId}`;
      const gameweeksExists = await redis.exists(gameweeksKey);
      if (gameweeksExists) {
        totalGameweeksKeys++;
      }
    }
    
    // Estimate total coverage based on sample
    const sampleSize = sampleManagerIds.length * sampleGameweeks.length;
    const picksCoverage = totalPicksKeys / sampleSize;
    const metadataCoverage = totalMetadataKeys / sampleSize;
    const gameweeksCoverage = totalGameweeksKeys / sampleManagerIds.length;
    
    // Estimate totals for all 145 managers
    const estimatedTotalPicks = Math.round(145 * 2 * picksCoverage); // 145 managers * 2 gameweeks
    const estimatedTotalMetadata = Math.round(145 * 2 * metadataCoverage);
    const estimatedTotalGameweeks = Math.round(145 * gameweeksCoverage);
    
    // For now, use the sample data to determine gameweek range
    const gameweekNumbers: number[] = [];
    sampleKeys.forEach(key => {
      const match = key.match(/fc-footy:manager-picks:\d+:(\d+)/);
      if (match) {
        gameweekNumbers.push(parseInt(match[1]));
      }
    });
    
    const maxGameweek = gameweekNumbers.length > 0 ? Math.max(...gameweekNumbers) : 0;
    const minGameweek = gameweekNumbers.length > 0 ? Math.min(...gameweekNumbers) : 0;
    const gameweekRange = maxGameweek > 0 ? `${minGameweek}-${maxGameweek}` : 'None';
    
    return {
      totalKeys: estimatedTotalPicks + estimatedTotalMetadata + estimatedTotalGameweeks,
      sampleKeys,
      memoryUsage: {
        picksKeys: estimatedTotalPicks,
        metadataKeys: estimatedTotalMetadata,
        gameweeksKeys: estimatedTotalGameweeks
      },
      cacheHealth: {
        picksData: estimatedTotalPicks,
        metadata: estimatedTotalMetadata,
        gameweeks: estimatedTotalGameweeks,
        totalManagers: estimatedTotalGameweeks,
        averagePicksPerManager: estimatedTotalGameweeks > 0 ? (estimatedTotalPicks / estimatedTotalGameweeks) : 0,
        maxGameweek,
        gameweekRange
      }
    };
  } catch (error) {
    console.error(`❌ Error getting cache stats:`, error);
    return { 
      totalKeys: 0, 
      sampleKeys: [],
      memoryUsage: {
        picksKeys: 0,
        metadataKeys: 0,
        gameweeksKeys: 0
      },
      cacheHealth: {
        picksData: 0,
        metadata: 0,
        gameweeks: 0,
        totalManagers: 0,
        averagePicksPerManager: 0,
        maxGameweek: 0,
        gameweekRange: 'None'
      }
    };
  }
}

/**
 * Get cache health summary for monitoring
 */
export async function getCacheHealthSummary(): Promise<CacheHealthSummary> {
  try {
    const stats = await getPicksCacheStats();
    
    // Determine health status based on cache coverage
    const expectedManagers = 145; // Based on our league size
    const coverage = (stats.cacheHealth.totalManagers / expectedManagers) * 100;
    
    let status: 'healthy' | 'warning' | 'error';
    let message: string;
    
    if (coverage >= 90) {
      status = 'healthy';
      message = `Cache is healthy with ${coverage.toFixed(1)}% coverage`;
    } else if (coverage >= 70) {
      status = 'warning';
      message = `Cache coverage is ${coverage.toFixed(1)}% - consider repopulating`;
    } else {
      status = 'error';
      message = `Cache coverage is only ${coverage.toFixed(1)}% - needs repopulation`;
    }
    
    return {
      status,
      message,
      stats
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Cache health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stats: null
    };
  }
}
