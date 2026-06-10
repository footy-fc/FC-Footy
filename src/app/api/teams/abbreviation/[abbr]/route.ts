import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '../../../../../lib/teamService';
import { WORLD_CUP_2026_TEAMS } from '../../../../../lib/worldCupData';
import type { Team } from '../../../../../types/teamTypes';

function getWorldCupTeamFallback(abbreviation: string): Team | null {
  const match = WORLD_CUP_2026_TEAMS.find((team) => team.fifaCode.toLowerCase() === abbreviation.toLowerCase());
  if (!match) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: match.id,
    name: match.name,
    shortName: match.name,
    abbreviation: match.fifaCode.toLowerCase(),
    country: match.fifaCode,
    logoUrl: undefined,
    roomHash: undefined,
    metadata: {
      source: 'world-cup-2026',
      fifaCode: match.fifaCode,
      flag: match.flag,
      group: match.group || '',
      confederation: match.confederation || '',
    },
    createdAt: now,
    updatedAt: now,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ abbr: string }> }
) {
  try {
    // Validate API key
    const apiKey = request.headers.get("x-api-key");
    if (apiKey && apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { abbr } = await params;
    // Normalize ESPN-style abbreviations that sometimes include suffixes like ":1"
    const normalizedAbbr = abbr.split(':')[0].trim().toLowerCase();
    
    if (!normalizedAbbr) {
      return NextResponse.json(
        { success: false, error: "Team abbreviation is required" },
        { status: 400 }
      );
    }

    // Find team by abbreviation
    const team = await teamService.getTeamByAbbrComprehensive(normalizedAbbr);
    
    if (!team) {
      const worldCupTeam = getWorldCupTeamFallback(normalizedAbbr);
      if (worldCupTeam) {
        return NextResponse.json({
          success: true,
          team: worldCupTeam
        });
      }

      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      team
    });

  } catch (error) {
    console.error('Failed to fetch team:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch team',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ abbr: string }> }
) {
  try {
    // Validate API key
    const apiKey = request.headers.get("x-api-key");
    if (apiKey && apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { abbr } = await params;
    
    if (!abbr) {
      return NextResponse.json(
        { success: false, error: "Team abbreviation is required" },
        { status: 400 }
      );
    }

    // Find team by abbreviation
    const team = await teamService.getTeamByAbbr(abbr.toLowerCase());
    
    if (!team) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Delete the team
    const deleted = await teamService.deleteTeam(team.id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Team deletion failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully'
    });

  } catch (error) {
    console.error('Team deletion failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Team deletion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
