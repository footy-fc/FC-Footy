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

    const teamData = await request.json();
    
    // Validate required fields
    if (!teamData.name || !teamData.shortName || !teamData.abbreviation || !teamData.country) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: name, shortName, abbreviation, country" },
        { status: 400 }
      );
    }

    // Create team
    const team = await teamService.createTeam({
      name: teamData.name,
      shortName: teamData.shortName,
      abbreviation: teamData.abbreviation.toLowerCase(),
      country: teamData.country,
      logoUrl: teamData.logoUrl,
      roomHash: teamData.roomHash
    });

    return NextResponse.json({
      success: true,
      message: 'Team created successfully',
      team
    });

  } catch (error) {
    console.error('Team creation failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Team creation failed',
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

    // Get ALL teams (not just those in leagues)
    const allTeams = await teamService.getAllTeams();

    return NextResponse.json({
      success: true,
      teams: allTeams
    });

  } catch (error) {
    console.error('Failed to fetch teams:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch teams',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 