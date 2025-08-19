import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL!,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN!,
});

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const cacheKey = `fc-footy:fpl-bootstrap:${today}`;
    
    // Check if we have cached data for today
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      console.log('📊 Returning cached FPL bootstrap data for', today);
      return NextResponse.json(cachedData);
    }

    console.log('🔄 No cached data found, fetching from FPL API...');
    
    // Fetch fresh data from FPL API
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`FPL API error: ${response.status}`);
    }

    const data = await response.json();
    
    const bootstrapData = {
      ...data,
      fetched_at: new Date().toISOString()
    };

    // Store in Upstash Redis with 24-hour expiration
    try {
      await redis.setex(cacheKey, 86400, bootstrapData); // 24 hours = 86400 seconds
      console.log('✅ Cached FPL bootstrap data for', today);
    } catch (cacheError) {
      console.error('❌ Error caching bootstrap data:', cacheError);
      // Still return the data even if caching fails
    }

    return NextResponse.json(bootstrapData);

  } catch (error) {
    console.error('❌ Error fetching FPL bootstrap data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FPL bootstrap data' },
      { status: 500 }
    );
  }
}
