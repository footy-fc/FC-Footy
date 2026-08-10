import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { FPL_LEAGUE_ID } from '~/lib/config';
import {
  enrichLeagueWithManagerBadges,
  fetchFplLeagueStandings,
  parsePositiveInteger,
  shouldIncludeManagersInfo,
  type FplLeagueResponse,
} from '~/lib/fplLeague';

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL!,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN!,
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const responseHeaders = {
  ...corsHeaders,
  'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400',
};

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: responseHeaders,
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = parsePositiveInteger(searchParams.get('leagueId'), FPL_LEAGUE_ID);

    if (!leagueId) {
      return jsonResponse(
        { error: 'leagueId must be a positive integer' },
        400
      );
    }

    const includeManagersInfo = shouldIncludeManagersInfo(searchParams);
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    // v3 caches the complete, server-aggregated standings response. Bumping this
    // key intentionally avoids serving a legacy first-page-only payload.
    const cacheKey = `fc-footy:daily-rankings-v3:${leagueId}:${today}`;
    
    // Check if we have cached data for today
    const cachedData = await redis.get<FplLeagueResponse>(cacheKey);

    if (cachedData) {
      console.log('📊 Returning cached rankings for', today);
      const body = includeManagersInfo
        ? await enrichLeagueWithManagerBadges(cachedData, redis)
        : cachedData;

      return jsonResponse(body);
    }

    console.log('🔄 No cached data found, fetching from FPL API...');

    const rankingsData = await fetchFplLeagueStandings(leagueId);

    // Store in Upstash Redis with 24-hour expiration
    try {
      await redis.setex(cacheKey, 86400, rankingsData); // 24 hours = 86400 seconds
      console.log('✅ Cached rankings for', today);
    } catch (cacheError) {
      console.error('❌ Error caching rankings:', cacheError);
      // Still return the data even if caching fails
    }

    const body = includeManagersInfo
      ? await enrichLeagueWithManagerBadges(rankingsData, redis)
      : rankingsData;

    return jsonResponse(body);

  } catch (error) {
    console.error('❌ Error fetching FPL data:', error);
    return jsonResponse(
      { error: 'Failed to fetch FPL data' },
      500
    );
  }
}
