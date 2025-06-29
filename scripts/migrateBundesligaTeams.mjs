#!/usr/bin/env node

/**
 * Script to migrate Bundesliga (ger.1) teams with Supabase storage logo URLs
 * Uses the API endpoints to create teams and leagues
 * Run with: node scripts/migrateBundesligaTeams.mjs
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Bundesliga teams with their abbreviations and logo URLs
const bundesligaTeams = [
  { team: "1.FC Heidenheim 1846", abbr: "hei", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/hei.png" },
  { team: "1.FC Union Berlin", abbr: "ubn", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/ubn.png" },
  { team: "1.FSV Mainz 05", abbr: "mai", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/mai.png" },
  { team: "Bayer 04 Leverkusen", abbr: "lev", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/lev.png" },
  { team: "Bayern Munich", abbr: "bay", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/bay.png" },
  { team: "Borussia Dortmund", abbr: "dor", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/dor.png" },
  { team: "Borussia Mönchengladbach", abbr: "mgl", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/mgl.png" },
  { team: "Eintracht Frankfurt", abbr: "eff", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/eff.png" },
  { team: "FC Augsburg", abbr: "aug", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/aug.png" },
  { team: "FC St. Pauli", abbr: "stp", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/stp.png" },
  { team: "Holstein Kiel", abbr: "kie", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/kie.png" },
  { team: "RB Leipzig", abbr: "rbl", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/rbl.png" },
  { team: "SC Freiburg", abbr: "fri", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/fri.png" },
  { team: "SV Werder Bremen", abbr: "wer", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/wer.png" },
  { team: "TSG 1899 Hoffenheim", abbr: "tsg", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/tsg.png" },
  { team: "VfB Stuttgart", abbr: "stu", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/stu.png" },
  { team: "VfL Bochum", abbr: "boc", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/boc.png" },
  { team: "VfL Wolfsburg", abbr: "wol", logoUrl: "https://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/ger.1/wol.png" }
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_KEY = process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY;

if (!API_KEY) {
  console.error("❌ NEXT_PUBLIC_NOTIFICATION_API_KEY environment variable is required");
  process.exit(1);
}

/**
 * Check if a logo URL is accessible
 */
async function checkLogoAccessibility(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Create a team via API
 */
async function createTeam(teamData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        name: teamData.team,
        shortName: teamData.team,
        abbreviation: teamData.abbr.toLowerCase(),
        country: "GER",
        logoUrl: teamData.logoUrl,
        roomHash: "0x09c73260a2d39cb44fac1f488751fddd6b9fc0c0"
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.team;
    } else {
      const error = await response.json();
      console.error(`❌ Failed to create team ${teamData.team}:`, error);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating team ${teamData.team}:`, error.message);
    return null;
  }
}

/**
 * Create a league via API
 */
async function createLeague(leagueData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leagues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(leagueData),
    });

    if (response.ok) {
      const result = await response.json();
      return result.league;
    } else {
      const error = await response.json();
      console.error(`❌ Failed to create league ${leagueData.id}:`, error);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating league ${leagueData.id}:`, error.message);
    return null;
  }
}

/**
 * Add team to league via API
 */
async function addTeamToLeague(teamId, leagueId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/memberships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        teamId: teamId,
        leagueId: leagueId,
        season: '2024-25',
        startDate: new Date().toISOString().split('T')[0]
      }),
    });

    if (response.ok) {
      return true;
    } else {
      const error = await response.json();
      console.error(`❌ Failed to add team ${teamId} to league ${leagueId}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error adding team ${teamId} to league ${leagueId}:`, error.message);
    return false;
  }
}

/**
 * Get all teams from the API
 */
async function getAllTeams() {
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
      console.error("❌ Failed to fetch teams");
      return [];
    }
  } catch (error) {
    console.error("❌ Error fetching teams:", error.message);
    return [];
  }
}

/**
 * Get all leagues from the API
 */
async function getAllLeagues() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/leagues`, {
      headers: {
        'x-api-key': API_KEY,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.leagues || [];
    } else {
      console.error("❌ Failed to fetch leagues");
      return [];
    }
  } catch (error) {
    console.error("❌ Error fetching leagues:", error.message);
    return [];
  }
}

/**
 * Main function to migrate Bundesliga teams
 */
async function migrateBundesligaTeams() {
  console.log("🚀 Starting Bundesliga teams migration...\n");

  const result = {
    teamsCreated: 0,
    leaguesCreated: 0,
    membershipsCreated: 0,
    errors: []
  };

  try {
    // Step 1: Check if ger.1 league exists
    console.log("📋 Checking if ger.1 league exists...");
    const allLeagues = await getAllLeagues();
    const ger1League = allLeagues.find(league => league.id === 'ger.1');

    if (!ger1League) {
      console.log("📋 Creating ger.1 league...");
      const league = await createLeague({
        id: "ger.1",
        name: "Bundesliga",
        country: "GER",
        type: "domestic"
      });
      
      if (league) {
        result.leaguesCreated++;
        console.log("✅ Created league: Bundesliga (ger.1)");
      } else {
        result.errors.push("Failed to create ger.1 league");
        console.error("❌ Failed to create ger.1 league");
        return;
      }
    } else {
      console.log("ℹ️  League ger.1 already exists");
    }

    // Step 2: Get existing teams to avoid duplicates
    console.log("📋 Fetching existing teams...");
    const existingTeams = await getAllTeams();
    console.log(`✅ Found ${existingTeams.length} existing teams`);

    // Step 3: Create teams and memberships
    console.log("\n📋 Processing Bundesliga teams...");
    
    for (const teamData of bundesligaTeams) {
      console.log(`\n🔄 Processing ${teamData.team} (${teamData.abbr})...`);

      // Check if team already exists
      const existingTeam = existingTeams.find(team => 
        team.abbreviation.toLowerCase() === teamData.abbr.toLowerCase() ||
        team.name.toLowerCase() === teamData.team.toLowerCase()
      );

      let teamId;

      if (existingTeam) {
        console.log(`ℹ️  Team already exists: ${teamData.team} (${teamData.abbr})`);
        teamId = existingTeam.id;
      } else {
        // Check if logo is accessible
        console.log(`🔍 Checking logo accessibility: ${teamData.logoUrl}`);
        const isAccessible = await checkLogoAccessibility(teamData.logoUrl);

        if (!isAccessible) {
          console.log(`⚠️  Logo not accessible for ${teamData.team}: ${teamData.logoUrl}`);
          result.errors.push(`Logo not accessible for ${teamData.team}`);
          continue;
        }

        // Create new team
        console.log(`📝 Creating team: ${teamData.team}...`);
        const team = await createTeam(teamData);

        if (team) {
          teamId = team.id;
          result.teamsCreated++;
          console.log(`✅ Created team: ${teamData.team} (${teamData.abbr})`);
        } else {
          result.errors.push(`Failed to create team ${teamData.team}`);
          continue;
        }
      }

      // Add team to ger.1 league
      console.log(`🔗 Adding ${teamData.team} to ger.1...`);
      const membershipSuccess = await addTeamToLeague(teamId, 'ger.1');

      if (membershipSuccess) {
        result.membershipsCreated++;
        console.log(`✅ Added ${teamData.team} to ger.1`);
      } else {
        result.errors.push(`Failed to add ${teamData.team} to ger.1`);
      }
    }

    // Summary
    console.log("\n📊 Migration Summary:");
    console.log(`✅ Teams created: ${result.teamsCreated}`);
    console.log(`✅ Leagues created: ${result.leaguesCreated}`);
    console.log(`✅ Memberships created: ${result.membershipsCreated}`);
    console.log(`❌ Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log("\n⚠️  Errors encountered:");
      result.errors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log("\n🎉 All Bundesliga teams have been migrated successfully!");
    }

  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateBundesligaTeams().catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
}); 