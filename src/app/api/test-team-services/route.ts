// Test API endpoint for team services
// Verifies that the team management system is working correctly

import { NextRequest, NextResponse } from 'next/server';
import { teamService } from '../../../lib/teamService';
import { ESPNLogoService } from '../../../lib/espnLogoService';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Team Services...');

    const results = {
      espnLogoService: {},
      teamService: {},
      errors: []
    };

    // Test 1: ESPN Logo Service
    try {
      console.log('1️⃣ Testing ESPN Logo Service...');
      const testAbbr = 'ars';
      const logoUrl = ESPNLogoService.getLogoUrl(testAbbr);
      const isValid = await ESPNLogoService.validateLogo(testAbbr);
      
      results.espnLogoService = {
        testAbbr,
        logoUrl,
        isValid,
        status: 'success'
      };
      console.log('✅ ESPN Logo Service test completed');
    } catch (error) {
      results.espnLogoService = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.errors.push(`ESPN Logo Service: ${error}`);
    }

    // Test 2: Team Service - Create Test League
    try {
      console.log('2️⃣ Testing Team Service - League Creation...');
      const testLeague = await teamService.createLeague({
        id: 'test.league',
        name: 'Test League',
        country: 'TEST',
        type: 'domestic'
      });
      
      results.teamService.leagueCreated = {
        id: testLeague.id,
        name: testLeague.name,
        status: 'success'
      };
      console.log('✅ League creation test completed');
    } catch (error) {
      results.teamService.leagueCreated = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.errors.push(`League Creation: ${error}`);
    }

    // Test 3: Team Service - Create Test Team
    try {
      console.log('3️⃣ Testing Team Service - Team Creation...');
      const testTeam = await teamService.createTeam({
        name: 'Test Team',
        shortName: 'Test',
        abbreviation: 'tst',
        country: 'TEST',
        logoUrl: ESPNLogoService.getLogoUrl('tst'),
        roomHash: '0x1234567890123456789012345678901234567890'
      });
      
      results.teamService.teamCreated = {
        id: testTeam.id,
        name: testTeam.name,
        abbreviation: testTeam.abbreviation,
        status: 'success'
      };
      console.log('✅ Team creation test completed');
    } catch (error) {
      results.teamService.teamCreated = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.errors.push(`Team Creation: ${error}`);
    }

    // Test 4: Get Active Leagues
    try {
      console.log('4️⃣ Testing Team Service - Get Active Leagues...');
      const activeLeagues = await teamService.getActiveLeagues();
      
      results.teamService.activeLeagues = {
        count: activeLeagues.length,
        leagues: activeLeagues.map(l => ({ id: l.id, name: l.name })),
        status: 'success'
      };
      console.log('✅ Get active leagues test completed');
    } catch (error) {
      results.teamService.activeLeagues = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      results.errors.push(`Get Active Leagues: ${error}`);
    }

    console.log('🎉 Team Services test completed!');

    return NextResponse.json({
      success: true,
      message: 'Team services test completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Team services test failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 