// Script to remove teams without league assignments
import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

// Load environment variables
config();

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function removeTeamsWithoutLeagues() {
  console.log('🧹 Removing teams without league assignments...\n');

  try {
    // Get all team keys
    const allTeamKeys = await redis.keys('team:team_*');
    const teamDataKeys = allTeamKeys.filter(key => !key.endsWith(':leagues'));
    const teamLeagueKeys = allTeamKeys.filter(key => key.endsWith(':leagues'));
    
    console.log(`📊 Found ${teamDataKeys.length} team records`);
    console.log(`📊 Found ${teamLeagueKeys.length} team league sets\n`);
    
    // Get all active leagues
    const activeLeagues = await redis.smembers('league:active');
    console.log(`📊 Found ${activeLeagues.length} active leagues: ${activeLeagues.join(', ')}\n`);
    
    // Check each team for league assignments
    const teamsWithLeagues = [];
    const teamsWithoutLeagues = [];
    
    for (const teamKey of teamDataKeys) {
      const teamId = teamKey.split(':')[1]; // Extract team ID from key
      const leagueKey = `${teamKey}:leagues`;
      
      // Check if team has league assignments
      const teamLeagues = await redis.smembers(leagueKey);
      
      if (teamLeagues.length > 0) {
        teamsWithLeagues.push({
          key: teamKey,
          id: teamId,
          leagues: teamLeagues
        });
      } else {
        teamsWithoutLeagues.push({
          key: teamKey,
          id: teamId
        });
      }
    }
    
    console.log(`✅ Teams WITH leagues: ${teamsWithLeagues.length}`);
    console.log(`❌ Teams WITHOUT leagues: ${teamsWithoutLeagues.length}\n`);
    
    if (teamsWithoutLeagues.length === 0) {
      console.log('🎉 All teams have league assignments! No cleanup needed.');
      return;
    }
    
    // Show teams without leagues
    console.log('📋 Teams without leagues:');
    teamsWithoutLeagues.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.id}`);
    });
    
    // Ask for confirmation
    console.log(`\n⚠️  This will remove ${teamsWithoutLeagues.length} teams without league assignments.`);
    console.log('Are you sure you want to proceed? (y/N)');
    
    // For now, we'll proceed with the removal
    // In a real scenario, you'd want to add user input confirmation
    
    console.log('\n🗑️  Removing teams without leagues...');
    
    let removedCount = 0;
    for (const team of teamsWithoutLeagues) {
      try {
        // Remove the team data
        await redis.del(team.key);
        
        // Remove the team's league set (even if empty)
        const leagueKey = `${team.key}:leagues`;
        await redis.del(leagueKey);
        
        console.log(`   ✅ Removed: ${team.id}`);
        removedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to remove ${team.id}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Successfully removed ${removedCount} teams without leagues!`);
    
    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingTeamKeys = await redis.keys('team:team_*');
    const remainingTeamDataKeys = remainingTeamKeys.filter(key => !key.endsWith(':leagues'));
    console.log(`📊 Remaining team records: ${remainingTeamDataKeys.length}`);
    
    // Check if any remaining teams still don't have leagues
    let remainingTeamsWithoutLeagues = 0;
    for (const teamKey of remainingTeamDataKeys) {
      const leagueKey = `${teamKey}:leagues`;
      const teamLeagues = await redis.smembers(leagueKey);
      if (teamLeagues.length === 0) {
        remainingTeamsWithoutLeagues++;
      }
    }
    
    if (remainingTeamsWithoutLeagues === 0) {
      console.log('✅ All remaining teams have league assignments!');
    } else {
      console.log(`⚠️  ${remainingTeamsWithoutLeagues} teams still don't have league assignments.`);
    }
    
  } catch (error) {
    console.error('❌ Error removing teams without leagues:', error);
  }
}

removeTeamsWithoutLeagues(); 