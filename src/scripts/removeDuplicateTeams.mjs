#!/usr/bin/env node

import { Redis } from '@upstash/redis';
import { config } from 'dotenv';

// Load environment variables
config();

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function removeDuplicateTeams() {
  console.log('🧹 Removing duplicate teams...\n');

  try {
    // Get all team keys
    const allTeamKeys = await redis.keys('team:team_*');
    const teamDataKeys = allTeamKeys.filter(key => !key.endsWith(':leagues'));
    
    console.log(`📊 Found ${teamDataKeys.length} team records\n`);
    
    // Fetch all team data
    const teamDataPromises = teamDataKeys.map(async (key) => {
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
    
    // Group teams by name and abbreviation
    const teamsByName = {};
    teams.forEach(team => {
      const key = `${team.name.toLowerCase()}_${team.abbreviation.toLowerCase()}`;
      if (!teamsByName[key]) {
        teamsByName[key] = [];
      }
      teamsByName[key].push(team);
    });
    
    // Find duplicates
    const duplicates = Object.entries(teamsByName).filter(([key, teamList]) => teamList.length > 1);
    
    console.log(`🔍 Found ${duplicates.length} teams with duplicates:\n`);
    
    let totalToRemove = 0;
    const teamsToRemove = [];
    
    for (const [key, teamList] of duplicates) {
      console.log(`📋 ${key}:`);
      
      // Check league assignments for each duplicate
      const teamsWithLeagues = [];
      const teamsWithoutLeagues = [];
      
      for (const team of teamList) {
        const leagueKey = `${team.key}:leagues`;
        const teamLeagues = await redis.smembers(leagueKey);
        
        if (teamLeagues.length > 0) {
          teamsWithLeagues.push({ ...team, leagues: teamLeagues });
        } else {
          teamsWithoutLeagues.push(team);
        }
      }
      
      // Show details
      teamsWithLeagues.forEach(team => {
        console.log(`   ✅ ${team.id} - HAS leagues: ${team.leagues.join(', ')}`);
      });
      
      teamsWithoutLeagues.forEach(team => {
        console.log(`   ❌ ${team.id} - NO leagues`);
        teamsToRemove.push(team);
        totalToRemove++;
      });
      
      console.log('');
    }
    
    if (teamsToRemove.length === 0) {
      console.log('🎉 No duplicate teams to remove!');
      return;
    }
    
    console.log(`⚠️  This will remove ${totalToRemove} duplicate teams without leagues.`);
    console.log('Are you sure you want to proceed? (y/N)');
    
    // Proceed with removal
    console.log('\n🗑️  Removing duplicate teams without leagues...');
    
    let removedCount = 0;
    for (const team of teamsToRemove) {
      try {
        // Remove the team data
        await redis.del(team.key);
        
        // Remove the team's league set (even if empty)
        const leagueKey = `${team.key}:leagues`;
        await redis.del(leagueKey);
        
        console.log(`   ✅ Removed: ${team.id} (${team.name})`);
        removedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to remove ${team.id}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 Successfully removed ${removedCount} duplicate teams!`);
    
    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingTeamKeys = await redis.keys('team:team_*');
    const remainingTeamDataKeys = remainingTeamKeys.filter(key => !key.endsWith(':leagues'));
    console.log(`📊 Remaining team records: ${remainingTeamDataKeys.length}`);
    
    // Check for remaining duplicates
    const remainingTeams = [];
    for (const key of remainingTeamDataKeys) {
      const teamData = await redis.get(key);
      if (teamData) {
        const team = typeof teamData === 'string' ? JSON.parse(teamData) : teamData;
        remainingTeams.push(team);
      }
    }
    
    const remainingByName = {};
    remainingTeams.forEach(team => {
      const key = `${team.name.toLowerCase()}_${team.abbreviation.toLowerCase()}`;
      if (!remainingByName[key]) {
        remainingByName[key] = [];
      }
      remainingByName[key].push(team);
    });
    
    const remainingDuplicates = Object.entries(remainingByName).filter(([key, teamList]) => teamList.length > 1);
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ No remaining duplicates!');
    } else {
      console.log(`⚠️  ${remainingDuplicates.length} teams still have duplicates.`);
    }
    
  } catch (error) {
    console.error('❌ Error removing duplicate teams:', error);
  }
}

removeDuplicateTeams(); 