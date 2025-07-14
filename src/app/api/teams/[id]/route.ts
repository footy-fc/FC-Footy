import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '../../../../lib/teamService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const team = await teamService.getTeam(id);
    
    if (!team) {
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const updates = await request.json();
    
    const updatedTeam = await teamService.updateTeam(id, updates);
    
    if (!updatedTeam) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Team updated successfully',
      team: updatedTeam
    });

  } catch (error) {
    console.error('Team update failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Team update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    console.log(`DELETE request for team: ${id}`);
    
    // Validate API key
    const apiKey = request.headers.get("x-api-key");
    if (apiKey && apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      console.log("Unauthorized DELETE request - invalid API key");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`Attempting to delete team: ${id}`);
    const success = await teamService.deleteTeam(id);
    
    if (!success) {
      console.log(`Team not found for deletion: ${id}`);
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    console.log(`Successfully deleted team: ${id}`);
    return NextResponse.json({
      success: true,
      message: 'Team deleted successfully'
    });

  } catch (error) {
    console.error('Team deletion failed:', error);
    console.error('Error details:', {
      teamId: id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    });
    
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