#!/usr/bin/env node

/**
 * Script to update logo URLs for Premier League teams
 * Uses the Supabase storage path pattern: http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1/{abbreviation}.png
 */

import fetch from 'node-fetch';

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
  { name: "Luton", abbreviation: "lut" },
  { name: "Manchester City", abbreviation: "mci" },
  { name: "Manchester United", abbreviation: "mun" },
  { name: "Newcastle", abbreviation: "new" },
  { name: "Nottingham Forest", abbreviation: "nfo" },
  { name: "Southampton", abbreviation: "sou" },
  { name: "Tottenham", abbreviation: "tot" },
  { name: "West Ham", abbreviation: "whu" },
  { name: "Wolves", abbreviation: "wol" }
];

const BASE_URL = "http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/eng.1";
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
 * Update team logo URL via API
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
 * Main function to update Premier League team logos
 */
async function updatePremierLeagueLogos() {
  console.log("🚀 Starting Premier League logo update...\n");

  // Get all teams from the database
  console.log("📋 Fetching all teams from database...");
  const allTeams = await getAllTeams();
  
  if (allTeams.length === 0) {
    console.error("❌ No teams found in database");
    return;
  }

  console.log(`✅ Found ${allTeams.length} teams in database\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process each Premier League team
  for (const premierTeam of premierLeagueTeams) {
    console.log(`🔄 Processing ${premierTeam.name} (${premierTeam.abbreviation})...`);

    // Find matching team in database (case-insensitive match on name or abbreviation)
    const matchingTeam = allTeams.find(team => 
      team.name.toLowerCase() === premierTeam.name.toLowerCase() ||
      team.abbreviation.toLowerCase() === premierTeam.abbreviation.toLowerCase()
    );

    if (!matchingTeam) {
      console.log(`⚠️  No matching team found for ${premierTeam.name}`);
      skippedCount++;
      continue;
    }

    // Construct the new logo URL
    const newLogoUrl = `${BASE_URL}/${premierTeam.abbreviation}.png`;

    // Check if the logo is accessible
    console.log(`🔍 Checking logo accessibility: ${newLogoUrl}`);
    const isAccessible = await checkLogoAccessibility(newLogoUrl);

    if (!isAccessible) {
      console.log(`⚠️  Logo not accessible for ${premierTeam.name}: ${newLogoUrl}`);
      errorCount++;
      continue;
    }

    // Check if the logo URL is already set correctly
    if (matchingTeam.logoUrl === newLogoUrl) {
      console.log(`✅ Logo already up to date for ${premierTeam.name}`);
      skippedCount++;
      continue;
    }

    // Update the team logo
    console.log(`📝 Updating logo for ${premierTeam.name}...`);
    const success = await updateTeamLogo(matchingTeam.id, newLogoUrl);

    if (success) {
      console.log(`✅ Successfully updated logo for ${premierTeam.name}`);
      updatedCount++;
    } else {
      console.log(`❌ Failed to update logo for ${premierTeam.name}`);
      errorCount++;
    }

    console.log(""); // Empty line for readability
  }

  // Summary
  console.log("📊 Update Summary:");
  console.log(`✅ Successfully updated: ${updatedCount} teams`);
  console.log(`⚠️  Skipped: ${skippedCount} teams`);
  console.log(`❌ Errors: ${errorCount} teams`);
  console.log(`📋 Total processed: ${premierLeagueTeams.length} teams`);

  if (errorCount > 0) {
    console.log("\n⚠️  Some teams had errors. Check the logs above for details.");
  } else {
    console.log("\n🎉 All Premier League team logos have been updated successfully!");
  }
}

// Run the script
updatePremierLeagueLogos().catch(error => {
  console.error("❌ Script failed:", error);
  process.exit(1);
}); 