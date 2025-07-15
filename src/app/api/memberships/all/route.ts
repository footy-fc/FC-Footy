import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = request.headers.get("x-api-key");
    if (apiKey && apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all active leagues
    const activeLeagues = await redis.smembers('league:active');
    
    // Fetch all team IDs from all leagues in parallel
    const teamIdsPromises = activeLeagues.map(leagueId => 
      redis.smembers(`league:${leagueId}:teams`)
    );
    const teamIdsArrays = await Promise.all(teamIdsPromises);
    
    // Build memberships object
    const membershipsData: {[leagueId: string]: string[]} = {};
    activeLeagues.forEach((leagueId, index) => {
      membershipsData[leagueId] = teamIdsArrays[index];
    });

    return NextResponse.json({
      success: true,
      memberships: membershipsData
    });

  } catch (error) {
    console.error('Failed to fetch all memberships:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch memberships',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const runtime = 'edge'; 