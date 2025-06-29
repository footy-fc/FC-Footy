// API endpoint for team migration
// Handles migration of existing hardcoded team data to Redis-based system

import { NextRequest, NextResponse } from 'next/server';
import { TeamMigrationService } from '../../../lib/teamMigrationService';

export async function POST(request: NextRequest) {
  try {
    // Validate API key from headers (optional security)
    const apiKey = request.headers.get("x-api-key");
    if (apiKey && apiKey !== process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log('🚀 Starting team migration via API...');

    // Run migration
    const result = await TeamMigrationService.migrateExistingData();

    // Return results
    return NextResponse.json({
      success: true,
      message: 'Team migration completed successfully',
      results: result
    });

  } catch (error) {
    console.error('💥 Team migration API failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return migration status and available operations
    return NextResponse.json({
      success: true,
      message: 'Team migration API is available',
      endpoints: {
        POST: 'Run team migration',
        GET: 'Get API status'
      },
      features: [
        'Migrate existing hardcoded team data to Redis',
        'Create leagues and team memberships',
        'Validate ESPN logos with fallbacks',
        'Support for teams in multiple leagues'
      ]
    });

  } catch (error) {
    console.error('💥 Team migration API status check failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'API status check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 