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

    const membershipData = await request.json();
    
    // Validate required fields
    if (!membershipData.teamId || !membershipData.leagueId || !membershipData.season) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: teamId, leagueId, season" },
        { status: 400 }
      );
    }

    // Add team to league
    const membership = await teamService.addTeamToLeague({
      teamId: membershipData.teamId,
      leagueId: membershipData.leagueId,
      season: membershipData.season,
      startDate: membershipData.startDate || new Date().toISOString().split('T')[0]
    });

    return NextResponse.json({
      success: true,
      message: 'Team added to league successfully',
      membership
    });

  } catch (error) {
    console.error('Membership creation failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Membership creation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Validate API key
    const apiKey = request.headers.get("x-api-key");
    if (apiKey && apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const membershipData = await request.json();
    
    // Validate required fields
    if (!membershipData.teamId || !membershipData.leagueId || !membershipData.season) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: teamId, leagueId, season" },
        { status: 400 }
      );
    }

    // Remove team from league
    await teamService.removeTeamFromLeague(
      membershipData.teamId,
      membershipData.leagueId,
      membershipData.season
    );

    return NextResponse.json({
      success: true,
      message: 'Team removed from league successfully'
    });

  } catch (error) {
    console.error('Membership removal failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Membership removal failed',
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

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const leagueId = searchParams.get('leagueId');

    if (teamId) {
      // Get memberships for a specific team
      const memberships = await teamService.getActiveTeamMemberships(teamId);
      return NextResponse.json({
        success: true,
        memberships
      });
    } else if (leagueId) {
      // Get teams in a specific league
      const teams = await teamService.getLeagueTeams(leagueId);
      return NextResponse.json({
        success: true,
        teams
      });
    } else {
      // Get all memberships (this would be expensive, so we'll return an error)
      return NextResponse.json(
        { success: false, error: "Please specify either teamId or leagueId parameter" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Failed to fetch memberships:', error);
    
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