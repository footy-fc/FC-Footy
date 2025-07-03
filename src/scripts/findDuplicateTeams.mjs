// Script to find duplicate teams in the database
import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

// Load environment variables
config();

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function findDuplicateTeams() {
  console.log('🔍 Finding duplicate teams...\n');

  try {
    // Get all team keys
    const teamKeys = await redis.keys('team:team_*');
    console.log(`📊 Found ${teamKeys.length} team keys`);
    
    // Filter out the :leagues keys
    const actualTeamKeys = teamKeys.filter(key => !key.endsWith(':leagues'));
    console.log(`📊 Found ${actualTeamKeys.length} actual team data keys\n`);
    
    // Fetch all team data
    const teamDataPromises = actualTeamKeys.map(async (key) => {
      const teamData = await redis.get(key);
      if (teamData) {
        const team = typeof teamData === 'string' ? JSON.parse(teamData) : teamData;
        return {
          key,
          ...team
        };
      }
      return null;
    });
    
    const teams = (await Promise.all(teamDataPromises)).filter(team => team !== null);
    
    // Find duplicates by name
    console.log('🔍 Checking for duplicates by name...');
    const nameGroups = {};
    teams.forEach(team => {
      const name = team.name.toLowerCase();
      if (!nameGroups[name]) {
        nameGroups[name] = [];
      }
      nameGroups[name].push(team);
    });
    
    const nameDuplicates = Object.entries(nameGroups).filter(([name, teamList]) => teamList.length > 1);
    
    if (nameDuplicates.length > 0) {
      console.log(`❌ Found ${nameDuplicates.length} teams with duplicate names:`);
      nameDuplicates.forEach(([name, teamList]) => {
        console.log(`\n📋 "${name}" (${teamList.length} duplicates):`);
        teamList.forEach(team => {
          console.log(`   - ID: ${team.id}`);
          console.log(`     Name: "${team.name}"`);
          console.log(`     Abbr: "${team.abbreviation}"`);
          console.log(`     Country: "${team.country}"`);
          console.log(`     Key: ${team.key}`);
        });
      });
    } else {
      console.log('✅ No duplicate names found');
    }
    
    // Find duplicates by abbreviation
    console.log('\n🔍 Checking for duplicates by abbreviation...');
    const abbrGroups = {};
    teams.forEach(team => {
      const abbr = team.abbreviation.toLowerCase();
      if (!abbrGroups[abbr]) {
        abbrGroups[abbr] = [];
      }
      abbrGroups[abbr].push(team);
    });
    
    const abbrDuplicates = Object.entries(abbrGroups).filter(([abbr, teamList]) => teamList.length > 1);
    
    if (abbrDuplicates.length > 0) {
      console.log(`❌ Found ${abbrDuplicates.length} teams with duplicate abbreviations:`);
      abbrDuplicates.forEach(([abbr, teamList]) => {
        console.log(`\n📋 "${abbr}" (${teamList.length} duplicates):`);
        teamList.forEach(team => {
          console.log(`   - ID: ${team.id}`);
          console.log(`     Name: "${team.name}"`);
          console.log(`     Abbr: "${team.abbreviation}"`);
          console.log(`     Country: "${team.country}"`);
          console.log(`     Key: ${team.key}`);
        });
      });
    } else {
      console.log('✅ No duplicate abbreviations found');
    }
    
    // Show total unique teams
    const uniqueNames = new Set(teams.map(team => team.name.toLowerCase()));
    const uniqueAbbrs = new Set(teams.map(team => team.abbreviation.toLowerCase()));
    
    console.log('\n📊 Summary:');
    console.log(`   Total team records: ${teams.length}`);
    console.log(`   Unique team names: ${uniqueNames.size}`);
    console.log(`   Unique abbreviations: ${uniqueAbbrs.size}`);
    
    if (teams.length !== uniqueNames.size) {
      console.log(`\n⚠️  You have ${teams.length - uniqueNames.size} duplicate team records!`);
    }
    
  } catch (error) {
    console.error('❌ Error finding duplicates:', error);
  }
}

findDuplicateTeams(); 