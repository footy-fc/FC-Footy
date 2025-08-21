import { NextRequest, NextResponse } from 'next/server';
import { TeamMigrationService } from '../../../lib/teamMigrationService';

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

    console.log('🚀 Starting team migration from API endpoint...');
    
    // Run the migration
    const result = await TeamMigrationService.migrateExistingData();

    return NextResponse.json({
      success: true,
      message: 'Team migration completed',
      result
    });

  } catch (error) {
    console.error('Team migration failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Team migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Team migration API is available',
    endpoints: {
      migrate: 'POST /api/migrate-teams - Run team migration with x-api-key header'
    }
  });
}
