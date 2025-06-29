import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '../../../../lib/teamService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const league = await teamService.getLeague(params.id);
    
    if (!league) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      league
    });

  } catch (error) {
    console.error('Failed to fetch league:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch league',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const updates = await request.json();
    
    const updatedLeague = await teamService.updateLeague(params.id, updates);
    
    if (!updatedLeague) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'League updated successfully',
      league: updatedLeague
    });

  } catch (error) {
    console.error('League update failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'League update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Note: We don't have a deleteLeague method in teamService, so we'll deactivate it
    const success = await teamService.updateLeague(params.id, { active: false });
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: "League not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'League deactivated successfully'
    });

  } catch (error) {
    console.error('League deactivation failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'League deactivation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 