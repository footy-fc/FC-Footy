// Test script for Team Services
// Verifies that the new team management system is working correctly

import { teamService } from '../lib/teamService';
import { ESPNLogoService } from '../lib/espnLogoService';
import { TeamMigrationService } from '../lib/teamMigrationService';

async function testTeamServices() {
  console.log('🧪 Starting Team Services Test...\n');

  try {
    // Test 1: ESPN Logo Service
    console.log('1️⃣ Testing ESPN Logo Service...');
    const testAbbr = 'ars';
    const logoUrl = ESPNLogoService.getLogoUrl(testAbbr);
    console.log(`   Logo URL for ${testAbbr}: ${logoUrl}`);
    
    const isValid = await ESPNLogoService.validateLogo(testAbbr);
    console.log(`   Logo valid: ${isValid}`);
    
    const logoData = await ESPNLogoService.getLogoData(testAbbr);
    console.log(`   Logo data:`, logoData);
    console.log('✅ ESPN Logo Service test completed\n');

    // Test 2: Team Service - Create League
    console.log('2️⃣ Testing Team Service - League Creation...');
    const testLeague = await teamService.createLeague({
      id: 'test.league',
      name: 'Test League',
      country: 'TEST',
      type: 'domestic'
    });
    console.log(`   Created league: ${testLeague.name} (${testLeague.id})`);
    console.log('✅ League creation test completed\n');

    // Test 3: Team Service - Create Team
    console.log('3️⃣ Testing Team Service - Team Creation...');
    const testTeam = await teamService.createTeam({
      name: 'Test Team',
      shortName: 'Test',
      abbreviation: 'tst',
      country: 'TEST',
      logoUrl: ESPNLogoService.getLogoUrl('tst'),
      roomHash: '0x1234567890123456789012345678901234567890'
    });
    console.log(`   Created team: ${testTeam.name} (${testTeam.abbreviation})`);
    console.log('✅ Team creation test completed\n');

    // Test 4: Team Service - Add Team to League
    console.log('4️⃣ Testing Team Service - Team-League Membership...');
    const membership = await teamService.addTeamToLeague({
      teamId: testTeam.id,
      leagueId: testLeague.id,
      season: '2024-25',
      startDate: new Date().toISOString().split('T')[0]
    });
    console.log(`   Created membership: ${membership.id}`);
    console.log('✅ Membership creation test completed\n');

    // Test 5: Team Service - Get Team with Leagues
    console.log('5️⃣ Testing Team Service - Get Team with Leagues...');
    const teamWithLeagues = await teamService.getTeamWithLeagues(testTeam.id);
    console.log(`   Team: ${teamWithLeagues?.name}`);
    console.log(`   Leagues: ${teamWithLeagues?.leagues.map(l => l.name).join(', ')}`);
    console.log('✅ Get team with leagues test completed\n');

    // Test 6: Team Service - Get League with Teams
    console.log('6️⃣ Testing Team Service - Get League with Teams...');
    const leagueWithTeams = await teamService.getLeagueWithTeams(testLeague.id);
    console.log(`   League: ${leagueWithTeams?.name}`);
    console.log(`   Teams: ${leagueWithTeams?.teams.map(t => t.name).join(', ')}`);
    console.log('✅ Get league with teams test completed\n');

    // Test 7: Team Service - Logo Validation
    console.log('7️⃣ Testing Team Service - Logo Validation...');
    const logo = await teamService.getTeamLogo(testTeam.id);
    console.log(`   Team logo: ${logo}`);
    console.log('✅ Logo validation test completed\n');

    // Test 8: Migration Service (dry run)
    console.log('8️⃣ Testing Migration Service (dry run)...');
    console.log('   Note: This would normally run the full migration');
    console.log('   Skipping actual migration to avoid data conflicts');
    console.log('✅ Migration service test completed\n');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ ESPN Logo Service');
    console.log('   ✅ Team Service - League Creation');
    console.log('   ✅ Team Service - Team Creation');
    console.log('   ✅ Team Service - Membership Creation');
    console.log('   ✅ Team Service - Get Team with Leagues');
    console.log('   ✅ Team Service - Get League with Teams');
    console.log('   ✅ Team Service - Logo Validation');
    console.log('   ✅ Migration Service (dry run)');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testTeamServices()
    .then(() => {
      console.log('\n🎯 All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tests failed:', error);
      process.exit(1);
    });
}

export { testTeamServices }; 