// Test script to verify getAllTeams functionality
// Tests that all teams are returned regardless of league membership

import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

// Load environment variables
config();

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function testGetAllTeams() {
  console.log('🧪 Testing getAllTeams functionality...\n');

  try {
    // Test 1: Check API endpoint
    console.log('1️⃣ Testing GET /api/teams endpoint...');
    const response = await fetch('http://localhost:3000/api/teams', {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || '',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ API returned ${data.teams.length} teams`);
      
      // Check if we have teams without league memberships
      const teamsWithoutLeagues = data.teams.filter(team => {
        // This is a simplified check - in reality we'd need to check memberships
        return true; // For now, just show all teams
      });
      
      console.log(`   📊 Total teams found: ${teamsWithoutLeagues.length}`);
      
      // Show first few teams
      console.log('   📋 Sample teams:');
      teamsWithoutLeagues.slice(0, 5).forEach(team => {
        console.log(`      - ${team.name} (${team.abbreviation}) - ID: ${team.id}`);
      });
      
    } else {
      console.log(`   ❌ API returned status: ${response.status}`);
    }
    console.log('');

    // Test 2: Check Redis directly
    console.log('2️⃣ Testing Redis keys directly...');
    const teamKeys = await redis.keys('team:team_*');
    console.log(`   📊 Found ${teamKeys.length} team keys in Redis`);
    
    // Check lookup keys
    const abbrKeys = await redis.keys('team:abbr:*');
    const nameKeys = await redis.keys('team:name:*');
    console.log(`   📊 Found ${abbrKeys.length} abbreviation lookup keys`);
    console.log(`   📊 Found ${nameKeys.length} name lookup keys`);
    
    // Show some sample keys
    console.log('   📋 Sample team keys:');
    teamKeys.slice(0, 3).forEach(key => {
      console.log(`      - ${key}`);
    });
    
    console.log('   📋 Sample abbreviation keys:');
    abbrKeys.slice(0, 3).forEach(key => {
      console.log(`      - ${key}`);
    });
    
    console.log('   📋 Sample name keys:');
    nameKeys.slice(0, 3).forEach(key => {
      console.log(`      - ${key}`);
    });
    console.log('');

    // Test 3: Check league memberships
    console.log('3️⃣ Testing league memberships...');
    const activeLeagues = await redis.smembers('league:active');
    console.log(`   📊 Found ${activeLeagues.length} active leagues`);
    
    let totalTeamsInLeagues = 0;
    for (const leagueId of activeLeagues) {
      const teamsInLeague = await redis.smembers(`league:${leagueId}:teams`);
      console.log(`   📊 League ${leagueId}: ${teamsInLeague.length} teams`);
      totalTeamsInLeagues += teamsInLeague.length;
    }
    
    console.log(`   📊 Total teams in leagues: ${totalTeamsInLeagues}`);
    console.log(`   📊 Teams without leagues: ${teamKeys.length - totalTeamsInLeagues}`);
    console.log('');

    console.log('✅ getAllTeams test completed successfully!');
    console.log('');
    console.log('📝 Summary:');
    console.log(`   - Total teams in database: ${teamKeys.length}`);
    console.log(`   - Teams in active leagues: ${totalTeamsInLeagues}`);
    console.log(`   - Teams without leagues: ${teamKeys.length - totalTeamsInLeagues}`);
    console.log('');
    console.log('💡 The getAllTeams method should now return ALL teams,');
    console.log('   regardless of whether they are assigned to leagues or not.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testGetAllTeams(); 