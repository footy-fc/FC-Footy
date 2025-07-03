#!/usr/bin/env node

/**
 * Script to clean up duplicate teams and ensure all Premier League teams have correct Supabase URLs
 */

import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || 'random-notification-api-key';

// Premier League teams with their abbreviations
const premierLeagueTeams = [
  { name: "Arsenal", abbreviation: "ars" },
  { name: "Aston Villa", abbreviation: "avl" },
  { name: "Bournemouth", abbreviation: "bou" },
  { name: "Brentford", abbreviation: "bre" },
  { name: "Brighton", abbreviation: "bha" },
  { name: "Burnley", abbreviation: "bur" },
  { name: "Chelsea", abbreviation: "che" },
  { name: "Crystal Palace", abbreviation: "cry" },
  { name: "Everton", abbreviation: "eve" },
  { name: "Fulham", abbreviation: "ful" },
  { name: "Ipswich", abbreviation: "ips" },
  { name: "Leicester", abbreviation: "lei" },
  { name: "Liverpool", abbreviation: "liv" },
  { name: "Luton Town", abbreviation: "lut" },
  { name: "Man City", abbreviation: "mnc" },
  { name: "Man Utd", abbreviation: "man" },
  { name: "Newcastle", abbreviation: "new" },
  { name: "Nott'm Forest", abbreviation: "nfo" },
  { name: "Southampton", abbreviation: "sou" },
  { name: "Spurs", abbreviation: "tot" },
  { name: "West Ham", abbreviation: "whu" },
  { name: "Wolves", abbreviation: "wol" }
];

/**
 * Fetch all teams from the API
 */
async function fetchAllTeams() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams`, {
      headers: {
        'x-api-key': API_KEY,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.teams || [];
    } else {
      console.error('❌ Failed to fetch teams:', response.status);
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching teams:', error.message);
    return [];
  }
}

/**
 * Delete a team by ID
 */
async function deleteTeam(teamId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
      method: 'DELETE',
      headers: {
        'x-api-key': API_KEY,
      },
    });

    if (response.ok) {
      return true;
    } else {
      const error = await response.json();
      console.error(`❌ Failed to delete ${teamId}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error deleting ${teamId}:`, error.message);
    return false;
  }
}

/**
 * Update team logo URL
 */
async function updateTeamLogo(teamId, logoUrl) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({ logoUrl }),
    });

    if (response.ok) {
      return true;
    } else {
      const error = await response.json();
      console.error(`❌ Failed to update ${teamId}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${teamId}:`, error.message);
    return false;
  }
}

/**
 * Check if logo URL is accessible
 */
async function isLogoAccessible(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Main cleanup function
 */
async function cleanupTeams() {
  console.log('🔍 Starting team cleanup process...\n');

  // Fetch all teams
  const teams = await fetchAllTeams();
  console.log(`📊 Found ${teams.length} total teams`);

  // Group teams by name
  const teamsByName = {};
  teams.forEach(team => {
    if (!teamsByName[team.name]) {
      teamsByName[team.name] = [];
    }
    teamsByName[team.name].push(team);
  });

  // Find duplicates
  const duplicates = Object.entries(teamsByName).filter(([name, teamList]) => teamList.length > 1);
  console.log(`🔍 Found ${duplicates.length} teams with duplicates\n`);

  let deletedCount = 0;
  let updatedCount = 0;

  // Process each team with duplicates
  for (const [teamName, teamList] of duplicates) {
    console.log(`🔄 Processing: ${teamName} (${teamList.length} duplicates)`);

    // Sort by creation date (keep the oldest)
    teamList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const keepTeam = teamList[0];
    const deleteTeams = teamList.slice(1);

    // Delete duplicates
    for (const team of deleteTeams) {
      console.log(`  🗑️  Deleting duplicate: ${team.id}`);
      const success = await deleteTeam(team.id);
      if (success) {
        deletedCount++;
      }
    }

    // Check if this is a Premier League team that needs URL update
    const premierTeam = premierLeagueTeams.find(pt => pt.name === teamName);
    if (premierTeam) {
      const expectedUrl = `http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/${premierTeam.abbreviation}.png`;
      
      if (keepTeam.logoUrl !== expectedUrl) {
        console.log(`  🔄 Updating logo URL for ${teamName}`);
        const isAccessible = await isLogoAccessible(expectedUrl);
        
        if (isAccessible) {
          const success = await updateTeamLogo(keepTeam.id, expectedUrl);
          if (success) {
            updatedCount++;
            console.log(`  ✅ Updated ${teamName} logo URL`);
          }
        } else {
          console.log(`  ⚠️  Logo URL not accessible for ${teamName}: ${expectedUrl}`);
        }
      } else {
        console.log(`  ✅ ${teamName} already has correct logo URL`);
      }
    }

    console.log('');
  }

  // Process Premier League teams that don't have duplicates
  console.log('🔍 Processing remaining Premier League teams...\n');
  
  for (const premierTeam of premierLeagueTeams) {
    const existingTeams = teamsByName[premierTeam.name] || [];
    
    if (existingTeams.length === 1) {
      const team = existingTeams[0];
      const expectedUrl = `http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/${premierTeam.abbreviation}.png`;
      
      if (team.logoUrl !== expectedUrl) {
        console.log(`🔄 Updating logo URL for ${premierTeam.name}`);
        const isAccessible = await isLogoAccessible(expectedUrl);
        
        if (isAccessible) {
          const success = await updateTeamLogo(team.id, expectedUrl);
          if (success) {
            updatedCount++;
            console.log(`✅ Updated ${premierTeam.name} logo URL`);
          }
        } else {
          console.log(`⚠️  Logo URL not accessible for ${premierTeam.name}: ${expectedUrl}`);
        }
      } else {
        console.log(`✅ ${premierTeam.name} already has correct logo URL`);
      }
    } else if (existingTeams.length === 0) {
      console.log(`❌ ${premierTeam.name} not found in database`);
    }
  }

  console.log('\n📊 Cleanup Summary:');
  console.log(`  🗑️  Deleted ${deletedCount} duplicate teams`);
  console.log(`  🔄 Updated ${updatedCount} logo URLs`);
  console.log('✨ Cleanup completed!');
}

// Run the cleanup
cleanupTeams().catch(console.error); 