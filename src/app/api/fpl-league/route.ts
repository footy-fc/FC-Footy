import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const FPL_LEAGUE_ID = 18526; // Your league ID

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId') || FPL_LEAGUE_ID;
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const cacheKey = `fc-footy:daily-rankings:${leagueId}:${today}`;
    
    // Check if we have cached data for today
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log('📊 Returning cached rankings for', today);
      return NextResponse.json(cachedData);
    }

    console.log('🔄 No cached data found, fetching from FPL API...');
    
    // Fetch fresh data from FPL API
    const allStandings = [];
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
      
      if (data.standings?.results && data.standings.results.length > 0) {
        allStandings.push(...data.standings.results);
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
