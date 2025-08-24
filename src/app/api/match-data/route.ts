import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing required parameter: eventId' },
        { status: 400 }
      );
    }

    // For now, return basic match data structure
    // In the future, this would fetch real data from ESPN API or match context
    const matchData = {
      eventId,
      score: '0-2', // This should come from real match data
      status: 'Live',
      events: [], // Real match events would go here
      homeTeam: eventId.split('_')[2] || 'Home',
      awayTeam: eventId.split('_')[3] || 'Away'
    };

    return NextResponse.json({
      success: true,
      ...matchData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching match data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch match data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

