import { NextRequest, NextResponse } from 'next/server';
import { getPicksCacheStats, getCacheHealthSummary } from '~/lib/kvPicksStorage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    
    if (detailed) {
      // Return detailed cache statistics
      const stats = await getPicksCacheStats();
      return NextResponse.json(stats);
    } else {
      // Return health summary
      const health = await getCacheHealthSummary();
      return NextResponse.json(health);
    }
  } catch (error) {
    console.error('❌ Error getting cache stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get cache statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
