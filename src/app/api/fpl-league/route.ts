import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { FPL_LEAGUE_ID } from '~/lib/config';

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL!,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId') || FPL_LEAGUE_ID;
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const cacheKey = `fc-footy:daily-rankings-v2:${leagueId}:${today}`;
    
    // Check if we have cached data for today
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log('📊 Returning cached rankings for', today);
      return NextResponse.json(cachedData);
    }

    console.log('🔄 No cached data found, fetching from FPL API...');
    
    // Fetch fresh data from FPL API
    const allStandings = [];
    const allNewEntries = [];
    let league = null;
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const response = await fetch(
        `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/?page_standings=${page}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`FPL API error: ${response.status}`);
      }

      const data = await response.json();
      league = data.league ?? league;

      if (page === 1 && data.new_entries?.results && data.new_entries.results.length > 0) {
        allNewEntries.push(...data.new_entries.results);
      }
      
      if (data.standings?.results && data.standings.results.length > 0) {
        allStandings.push(...data.standings.results);
        hasMorePages = Boolean(data.standings.has_next);
        page++;
      } else {
        hasMorePages = false;
      }
    }

    const rankingsData = {
      standings: {
        results: allStandings,
        total: allStandings.length
      },
      new_entries: {
        results: allNewEntries,
        total: allNewEntries.length
      },
      league,
      fetched_at: new Date().toISOString()
    };

    // Store in Upstash Redis with 24-hour expiration
    try {
      await redis.setex(cacheKey, 86400, rankingsData); // 24 hours = 86400 seconds
      console.log('✅ Cached rankings for', today);
    } catch (cacheError) {
      console.error('❌ Error caching rankings:', cacheError);
      // Still return the data even if caching fails
    }

    return NextResponse.json(rankingsData);

  } catch (error) {
    console.error('❌ Error fetching FPL data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FPL data' },
      { status: 500 }
    );
  }
}
