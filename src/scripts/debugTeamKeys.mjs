// Detailed debug script to show exactly which team keys exist
import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

// Load environment variables
config();

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function debugTeamKeys() {
  console.log('🔍 Debugging team keys...\n');

  try {
    // Get all team keys
    const allTeamKeys = await redis.keys('team:team_*');
    console.log(`📊 Total team keys found: ${allTeamKeys.length}`);
    
    // Separate team data keys from league keys
    const teamDataKeys = allTeamKeys.filter(key => !key.endsWith(':leagues'));
    const teamLeagueKeys = allTeamKeys.filter(key => key.endsWith(':leagues'));
    
    console.log(`📊 Team data keys: ${teamDataKeys.length}`);
    console.log(`📊 Team league keys: ${teamLeagueKeys.length}`);
    
    // Show first 10 team data keys
    console.log('\n📋 First 10 team data keys:');
    teamDataKeys.slice(0, 10).forEach(key => {
      console.log(`   ${key}`);
    });
    
    // Show first 10 team league keys
    console.log('\n📋 First 10 team league keys:');
    teamLeagueKeys.slice(0, 10).forEach(key => {
      console.log(`   ${key}`);
    });
    
    // Check for specific team (Arsenal) to see if there are real duplicates
    console.log('\n🔍 Checking for Arsenal specifically...');
    const arsenalKeys = teamDataKeys.filter(key => key.includes('ars') || key.includes('1751172501632'));
    console.log(`📊 Arsenal-related keys: ${arsenalKeys.length}`);
    arsenalKeys.forEach(key => {
      console.log(`   ${key}`);
    });
    
    // Get actual Arsenal data
    console.log('\n📋 Arsenal team data:');
    for (const key of arsenalKeys) {
      const teamData = await redis.get(key);
      if (teamData) {
        const team = typeof teamData === 'string' ? JSON.parse(teamData) : teamData;
        console.log(`   Key: ${key}`);
        console.log(`   Name: "${team.name}"`);
        console.log(`   ID: ${team.id}`);
        console.log(`   Created: ${team.createdAt}`);
        console.log('');
      }
    }
    
    // Check if there are multiple keys for the same team ID
    console.log('\n🔍 Checking for duplicate team IDs...');
    const teamIds = teamDataKeys.map(key => {
      const parts = key.split(':');
      return parts[parts.length - 1]; // Get the team ID part
    });
    
    const idCounts = {};
    teamIds.forEach(id => {
      idCounts[id] = (idCounts[id] || 0) + 1;
    });
    
    const duplicateIds = Object.entries(idCounts).filter(([id, count]) => count > 1);
    
    if (duplicateIds.length > 0) {
      console.log(`❌ Found ${duplicateIds.length} duplicate team IDs:`);
      duplicateIds.forEach(([id, count]) => {
        console.log(`   ${id}: ${count} times`);
      });
    } else {
      console.log('✅ No duplicate team IDs found');
    }
    
    // Show summary
    console.log('\n📊 Final Summary:');
    console.log(`   Total team keys: ${allTeamKeys.length}`);
    console.log(`   Team data keys: ${teamDataKeys.length}`);
    console.log(`   Team league keys: ${teamLeagueKeys.length}`);
    console.log(`   Unique team IDs: ${Object.keys(idCounts).length}`);
    
  } catch (error) {
    console.error('❌ Error debugging team keys:', error);
  }
}

debugTeamKeys(); 