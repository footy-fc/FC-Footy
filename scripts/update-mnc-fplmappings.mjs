#!/usr/bin/env node

import { config } from 'dotenv';
import { Redis } from '@upstash/redis';

// Load environment variables
config();

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

async function updateManchesterCityFplMappings() {
  try {
    console.log('🔍 Looking for Manchester City team...');
    
    // First, let's see what teams exist in the database
    console.log('📋 Listing all teams in database...');
    const allTeamKeys = await redis.keys('team:team_*');
    console.log(`Found ${allTeamKeys.length} team keys`);
    
    // Get all team data - filter out keys that end with ':leagues' (these are sets, not team data)
    const teamKeys = allTeamKeys.filter(key => !key.endsWith(':leagues'));
    console.log(`Found ${teamKeys.length} actual team data keys`);
    
    const teamDataPromises = teamKeys.map(async (key) => {
      try {
        const teamData = await redis.get(key);
        if (teamData) {
          return typeof teamData === 'string' ? JSON.parse(teamData) : teamData;
        }
        return null;
      } catch (error) {
        console.log(`⚠️ Error reading team data from ${key}:`, error.message);
        return null;
      }
    });
    
    const teams = (await Promise.all(teamDataPromises)).filter(Boolean);
    console.log('📋 Teams in database:');
    teams.forEach(team => {
      console.log(`  - ${team.name} (${team.abbreviation})`);
    });
    
    // Check if Manchester City exists
    const manCityTeam = teams.find(t => 
      t.name.toLowerCase().includes('manchester city') || 
      t.name.toLowerCase().includes('man city') ||
      t.abbreviation.toLowerCase() === 'mnc' ||
      t.abbreviation.toLowerCase() === 'mci'
    );
    
    if (manCityTeam) {
      console.log(`✅ Found existing Manchester City team: ${manCityTeam.name} (${manCityTeam.abbreviation})`);
      
      // Update the existing team
      const updatedMetadata = {
        ...manCityTeam.metadata,
        fplMappings: JSON.stringify(["mci", "mnc", "man_city", "mancity"])
      };
      
      const updatedTeam = {
        ...manCityTeam,
        metadata: updatedMetadata,
        updatedAt: new Date().toISOString()
      };
      
      await redis.set(`team:${manCityTeam.id}`, JSON.stringify(updatedTeam));
      console.log('✅ Successfully updated existing Manchester City team with fplMappings');
      
    } else {
      console.log('❌ Manchester City team not found, creating new team...');
      
      // Create new Manchester City team
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const newTeam = {
        id: teamId,
        name: "Manchester City",
        shortName: "Man City",
        abbreviation: "mnc",
        country: "ENG",
        logoUrl: "https://a.espncdn.com/i/teamlogos/soccer/500/mnc.png",
        roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0",
        metadata: {
          fplMappings: JSON.stringify(["mci", "mnc", "man_city", "mancity"])
        },
        createdAt: now,
        updatedAt: now
      };
      
      // Store team data
      await redis.set(`team:${teamId}`, JSON.stringify(newTeam));
      
      // Store lookup keys
      await redis.set(`team:abbr:${newTeam.abbreviation}`, teamId);
      await redis.set(`team:name:${newTeam.name.toLowerCase().replace(/\s+/g, '-')}`, teamId);
      
      console.log('✅ Successfully created new Manchester City team with fplMappings');
    }
    
    // Test the comprehensive lookup
    console.log('🧪 Testing comprehensive lookup...');
    
    // Test with different abbreviations
    const testAbbrs = ['mci', 'mnc', 'man_city', 'mancity'];
    
    for (const abbr of testAbbrs) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/teams/abbreviation/${abbr}`, {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Lookup for "${abbr}": Found team "${data.team.name}"`);
        } else {
          console.log(`❌ Lookup for "${abbr}": Not found`);
        }
      } catch (error) {
        console.log(`❌ Lookup for "${abbr}": Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating Manchester City team:', error);
  }
}

// Run the update
updateManchesterCityFplMappings()
  .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
