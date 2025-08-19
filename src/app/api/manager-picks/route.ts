import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL!,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN!,
});

interface ManagerPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  element_type: number;
}

interface EntryHistory {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  rank_sort: number;
  overall_rank: number;
  percentile_rank: number;
  bank: number;
  value: number;
  event_transfers: number;
  event_transfers_cost: number;
  points_on_bench: number;
}

interface ManagerPicksResponse {
  active_chip: string | null;
  automatic_subs: unknown[];
  entry_history: EntryHistory;
  picks: ManagerPick[];
}

interface BootstrapPlayer {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  code: number; // Add code property for player images
  team: number;
  element_type: number;
  form: string;
  selected_by_percent: string;
  expected_goals: string;
  expected_assists: string;
  total_points: number;
  points_per_game: string;
}

interface BootstrapTeam {
  id: number;
  name: string;
  short_name: string;
}

interface BootstrapData {
  elements: BootstrapPlayer[];
  teams: BootstrapTeam[];
}

// Function to get the current gameweek
async function getCurrentGameweek(): Promise<number> {
  try {
    // Check cache first
    const cachedGameweek = await redis.get('fc-footy:current-gameweek');
    if (cachedGameweek) {
      return cachedGameweek as number;
    }

    // Fetch from FPL API
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`❌ FPL API error in getCurrentGameweek: ${response.status}`);
      // Return a fallback gameweek instead of throwing
      return 1;
    }

    const data: { events: Array<{ id: number; is_current?: boolean; finished?: boolean }> } = await response.json();
    const currentEvent = data.events.find((event) => event.is_current);
    
    if (!currentEvent) {
      // If no current event, try to find the latest event
      const latestEvent = data.events
        .filter((event) => event.finished)
        .sort((a, b) => b.id - a.id)[0];
      
      if (latestEvent) {
        try {
          await redis.setex('fc-footy:current-gameweek', 3600, latestEvent.id); // Cache for 1 hour
        } catch (cacheError) {
          console.error('❌ Error caching current gameweek:', cacheError);
        }
        return latestEvent.id;
      }
      
      console.error('❌ No current or latest gameweek found, returning fallback');
      return 1; // Return fallback instead of throwing
    }

    try {
      await redis.setex('fc-footy:current-gameweek', 3600, currentEvent.id); // Cache for 1 hour
    } catch (cacheError) {
      console.error('❌ Error caching current gameweek:', cacheError);
    }
    return currentEvent.id;
  } catch (error) {
    console.error('❌ Error getting current gameweek:', error);
    return 1; // Return fallback instead of throwing
  }
}

// Function to get bootstrap data (cached)
async function getBootstrapData(): Promise<BootstrapData> {
  try {
    // Check cache first
    const cachedData = await redis.get('fc-footy:fpl-bootstrap');
    if (cachedData) {
      return cachedData as BootstrapData;
    }

    // Fetch from our cached endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fpl-bootstrap`);
    
    if (!response.ok) {
      throw new Error(`Bootstrap API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting bootstrap data:', error);
    throw error;
  }
}

// Function to find the latest available gameweek for a manager
async function findLatestGameweek(entryId: number): Promise<number> {
  // Try from current gameweek down to 1
  const currentGameweek = await getCurrentGameweek();
  
  for (let gameweek = currentGameweek; gameweek >= 1; gameweek--) {
    try {
      const response = await fetch(`https://fantasy.premierleague.com/api/entry/${entryId}/event/${gameweek}/picks/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (response.ok) {
        return gameweek;
      }
      
      if (response.status === 404) {
        continue; // Try next gameweek
      }
      
      throw new Error(`FPL API error: ${response.status}`);
    } catch (error) {
      console.error(`Error checking gameweek ${gameweek}:`, error);
      continue;
    }
  }
  
  throw new Error(`No available gameweek found for entry ${entryId}`);
}

// Function to look up entry ID from FID using fantasy managers lookup
async function getEntryIdFromFid(fid: number): Promise<number | null> {
  try {
    // Import the lookup data directly from the JSON file
    const fantasyManagersLookup = await import('../../../data/fantasy-managers-lookup.json');
    const managers = Array.isArray(fantasyManagersLookup.default) 
      ? fantasyManagersLookup.default 
      : fantasyManagersLookup;
    
    const manager = managers.find((m: any) => m.fid === fid);
    return manager ? manager.entry_id : null;
  } catch (error) {
    console.error('Error looking up entry ID from FID:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    const fid = searchParams.get('fid');
    const gameweek = searchParams.get('gameweek');
    const refresh = searchParams.get('refresh') === 'true';

    console.log(`🔍 Manager picks request:`, { entryId, fid, gameweek, refresh });

    let targetEntryId: number;

    // Handle FID lookup if provided
    if (fid && !entryId) {
      const fidNum = parseInt(fid, 10);
      if (isNaN(fidNum)) {
        return NextResponse.json(
          { error: 'fid must be a valid number' },
          { status: 400 }
        );
      }
      
      try {
        const resolvedEntryId = await getEntryIdFromFid(fidNum);
        if (!resolvedEntryId) {
          return NextResponse.json(
            { error: `No manager found for FID ${fidNum}` },
            { status: 404 }
          );
        }
        
        targetEntryId = resolvedEntryId;
        console.log(`🔍 Found entry ID ${targetEntryId} for FID ${fidNum}`);
      } catch (error) {
        console.error(`❌ Error looking up entry ID for FID ${fidNum}:`, error);
        return NextResponse.json(
          { error: 'Failed to look up manager entry ID' },
          { status: 500 }
        );
      }
    } else if (entryId) {
      targetEntryId = parseInt(entryId, 10);
      if (isNaN(targetEntryId)) {
        return NextResponse.json(
          { error: 'entryId must be a valid number' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Either entryId or fid parameter is required' },
        { status: 400 }
      );
    }

    // Determine which gameweek to fetch
    let targetGameweek: number;
    if (gameweek) {
      targetGameweek = parseInt(gameweek, 10);
      if (isNaN(targetGameweek) || targetGameweek < 1 || targetGameweek > 38) {
        return NextResponse.json(
          { error: 'gameweek must be between 1 and 38' },
          { status: 400 }
        );
      }
    } else {
      // Find the latest available gameweek for this manager
      try {
        targetGameweek = await findLatestGameweek(targetEntryId);
      } catch (error) {
        console.error(`❌ Error finding latest gameweek for entry ${targetEntryId}:`, error);
        return NextResponse.json(
          { error: 'Failed to determine available gameweek for this manager' },
          { status: 500 }
        );
      }
    }

    console.log(`🎯 Target: entry ${targetEntryId}, gameweek ${targetGameweek}`);

    // Check cache first (unless refresh is requested)
    const cacheKey = `fc-footy:manager-picks:${targetEntryId}:${targetGameweek}`;
    let cachedPicks = null;
    
    try {
      cachedPicks = refresh ? null : await redis.get(cacheKey);
    } catch (cacheError) {
      console.error(`❌ Error checking cache:`, cacheError);
      // Continue without cache if Redis fails
    }
    
    if (cachedPicks) {
      console.log(`✅ Returning cached manager picks for entry ${targetEntryId}, gameweek ${targetGameweek}`);
      return NextResponse.json(cachedPicks);
    }

    console.log(`🔄 Fetching manager picks for entry ${targetEntryId}, gameweek ${targetGameweek}...`);

    // Fetch manager picks from FPL API with better error handling
    const fplUrl = `https://fantasy.premierleague.com/api/entry/${targetEntryId}/event/${targetGameweek}/picks/`;
    console.log(`🌐 Fetching from FPL API: ${fplUrl}`);
    
    const response = await fetch(fplUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    console.log(`📡 FPL API response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `No picks found for entry ${targetEntryId} in gameweek ${targetGameweek}` },
          { status: 404 }
        );
      }
      
      const errorText = await response.text();
      console.error(`❌ FPL API error ${response.status}:`, errorText);
      throw new Error(`FPL API error: ${response.status} - ${errorText}`);
    }

    const picksData: ManagerPicksResponse = await response.json();
    console.log(`✅ Successfully fetched picks data for entry ${targetEntryId}, gameweek ${targetGameweek}`);

    // Get bootstrap data to enrich player information
    let bootstrapData: BootstrapData;
    try {
      bootstrapData = await getBootstrapData();
      console.log(`✅ Successfully fetched bootstrap data`);
    } catch (error) {
      console.error(`❌ Error fetching bootstrap data:`, error);
      // Return picks data without enrichment rather than failing completely
      const basicData = {
        ...picksData,
        gameweek: targetGameweek,
        entry_id: targetEntryId,
        fetched_at: new Date().toISOString(),
        note: 'Player enrichment failed, returning basic picks data'
      };
      
      // Cache the basic data for 1 hour
      try {
        await redis.setex(cacheKey, 3600, basicData);
      } catch (cacheError) {
        console.error(`❌ Error caching basic data:`, cacheError);
      }
      return NextResponse.json(basicData);
    }
    
    // Enrich picks with player and team information
    const enrichedPicks = picksData.picks.map(pick => {
      const player = bootstrapData.elements.find(p => p.id === pick.element);
      const team = player ? bootstrapData.teams.find(t => t.id === player.team) : null;
      
      return {
        ...pick,
        player: player ? {
          id: player.id,
          name: `${player.first_name} ${player.second_name}`,
          web_name: player.web_name,
          code: player.code, // Add the code property for player images
          team: team ? {
            id: team.id,
            name: team.name,
            short_name: team.short_name
          } : null,
          element_type: player.element_type,
          form: parseFloat(player.form) || 0,
          selected_by_percent: parseFloat(player.selected_by_percent) || 0,
          expected_goals: parseFloat(player.expected_goals) || 0,
          expected_assists: parseFloat(player.expected_assists) || 0,
          total_points: player.total_points || 0,
          points_per_game: parseFloat(player.points_per_game) || 0
        } : null
      };
    });

    const enrichedData = {
      ...picksData,
      picks: enrichedPicks,
      gameweek: targetGameweek,
      entry_id: targetEntryId,
      fetched_at: new Date().toISOString()
    };

    // Cache the enriched data for 1 hour
    try {
      await redis.setex(cacheKey, 3600, enrichedData);
      console.log(`✅ Cached manager picks for entry ${targetEntryId}, gameweek ${targetGameweek}`);
    } catch (cacheError) {
      console.error(`❌ Error caching manager picks:`, cacheError);
      // Still return the data even if caching fails
    }

    return NextResponse.json(enrichedData);

  } catch (error) {
    console.error('❌ Error fetching manager picks:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fetch manager picks';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = 'Network error - unable to reach FPL API';
      errorDetails = 'fetch failed';
    } else if (error instanceof Error && error.message.includes('FPL API error')) {
      errorMessage = 'FPL API error';
      errorDetails = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
