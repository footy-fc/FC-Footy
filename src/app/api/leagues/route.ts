import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '../../../lib/teamService';

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = request.headers.get("x-api-key");
    if (apiKey && apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const leagueData = await request.json();
    
    // Validate required fields
    if (!leagueData.id || !leagueData.name || !leagueData.country || !leagueData.type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: id, name, country, type" },
        { status: 400 }
      );
    }

    // Create league
    const league = await teamService.createLeague({
      id: leagueData.id,
      name: leagueData.name,
      country: leagueData.country,
      type: leagueData.type,
      active: leagueData.active ?? true
    });

    return NextResponse.json({
      success: true,
      message: 'League created successfully',
      league
    });

  } catch (error) {
    console.error('League creation failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'League creation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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
    const leagues = await teamService.getActiveLeagues();

    return NextResponse.json({
      success: true,
      leagues
    });

  } catch (error) {
    console.error('Failed to fetch leagues:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch leagues',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 