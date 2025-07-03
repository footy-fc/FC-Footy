// Direct test of getAllTeams method
// Tests the method directly without going through the API

import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

// Load environment variables
config();

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function testGetAllTeamsDirect() {
  console.log('🧪 Testing getAllTeams method directly...\n');

  try {
    // Test 1: Check Redis keys directly
    console.log('1️⃣ Checking Redis keys directly...');
    const teamKeys = await redis.keys('team:team_*');
    console.log(`   📊 Found ${teamKeys.length} team keys in Redis`);
    
    // Show some sample keys
    console.log('   📋 Sample team keys:');
    teamKeys.slice(0, 5).forEach(key => {
      console.log(`      - ${key}`);
    });
    console.log('');

    // Test 2: Try to get team data directly
    console.log('2️⃣ Testing team data retrieval...');
    if (teamKeys.length > 0) {
      const sampleTeamKey = teamKeys[0];
      console.log(`   📋 Testing with key: ${sampleTeamKey}`);
      
      const teamData = await redis.get(sampleTeamKey);
      console.log(`   📊 Team data type: ${typeof teamData}`);
      
      if (teamData) {
        if (typeof teamData === 'string') {
          try {
            const parsed = JSON.parse(teamData);
            console.log(`   ✅ Successfully parsed team data: ${parsed.name} (${parsed.abbreviation})`);
          } catch (e) {
            console.log(`   ❌ Failed to parse team data: ${e.message}`);
          }
        } else {
          console.log(`   ✅ Team data is object: ${teamData.name} (${teamData.abbreviation})`);
        }
      } else {
        console.log(`   ❌ No team data found for key: ${sampleTeamKey}`);
      }
    }
    console.log('');

    // Test 3: Simulate getAllTeams logic
    console.log('3️⃣ Simulating getAllTeams logic...');
    const allTeams = [];
    
    for (const key of teamKeys.slice(0, 5)) { // Test with first 5 teams
      try {
        const teamData = await redis.get(key);
        if (teamData) {
          let team;
          if (typeof teamData === 'string') {
            team = JSON.parse(teamData);
          } else {
            team = teamData;
          }
          allTeams.push(team);
          console.log(`   ✅ Retrieved team: ${team.name} (${team.abbreviation})`);
        }
      } catch (error) {
        console.log(`   ❌ Error retrieving team from ${key}: ${error.message}`);
      }
    }
    
    console.log(`   📊 Successfully retrieved ${allTeams.length} teams`);
    console.log('');

    // Test 4: Check environment variables
    console.log('4️⃣ Checking environment variables...');
    console.log(`   📊 KV_REST_API_URL: ${process.env.KV_REST_API_URL ? 'Set' : 'Not set'}`);
    console.log(`   📊 KV_REST_API_TOKEN: ${process.env.KV_REST_API_TOKEN ? 'Set' : 'Not set'}`);
    console.log(`   📊 NEXT_PUBLIC_NOTIFICATION_API_KEY: ${process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY ? 'Set' : 'Not set'}`);
    console.log('');

    console.log('✅ Direct test completed!');

  } catch (error) {
    console.error('❌ Direct test failed:', error);
    process.exit(1);
  }
}

// Run the test
testGetAllTeamsDirect(); 