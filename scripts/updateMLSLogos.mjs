#!/usr/bin/env node

/**
 * Script to update logo URLs for MLS teams
 * Uses the Supabase storage path pattern: http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/usa.1/{abbreviation}.png
 */

import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || 'random-notification-api-key';

// MLS teams with their abbreviations
const mlsTeams = [
  { name: "Atlanta United", abbreviation: "atl" },
  { name: "Austin FC", abbreviation: "atx" },
  { name: "Chicago Fire", abbreviation: "chi" },
  { name: "FC Cincinnati", abbreviation: "cin" },
  { name: "Columbus Crew", abbreviation: "clb" },
  { name: "Charlotte FC", abbreviation: "clt" },
  { name: "Colorado Rapids", abbreviation: "col" },
  { name: "FC Dallas", abbreviation: "dal" },
  { name: "D.C. United", abbreviation: "dcu" },
  { name: "Houston Dynamo", abbreviation: "hou" },
  { name: "LA Galaxy", abbreviation: "lag" },
  { name: "LAFC", abbreviation: "laf" },
  { name: "Inter Miami", abbreviation: "mia" },
  { name: "Minnesota United", abbreviation: "min" },
  { name: "New England Revolution", abbreviation: "ner" },
  { name: "Nashville SC", abbreviation: "nsh" },
  { name: "New York City FC", abbreviation: "nyc" },
  { name: "New York Red Bulls", abbreviation: "nyr" },
  { name: "Orlando City SC", abbreviation: "orl" },
  { name: "Philadelphia Union", abbreviation: "phi" },
  { name: "Real Salt Lake", abbreviation: "rsl" },
  { name: "San Jose Earthquakes", abbreviation: "sj" },
  { name: "Seattle Sounders", abbreviation: "sea" },
  { name: "Sporting Kansas City", abbreviation: "skc" },
  { name: "St. Louis City SC", abbreviation: "stl" },
  { name: "Toronto FC", abbreviation: "tor" },
  { name: "Vancouver Whitecaps", abbreviation: "van" }
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
 * Main update function
 */
async function updateMLSLogos() {
  console.log('🔍 Starting MLS logo update process...\n');

  // Fetch all teams
  const teams = await fetchAllTeams();
  console.log(`📊 Found ${teams.length} total teams`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;

  // Process each MLS team
  for (const mlsTeam of mlsTeams) {
    console.log(`🔄 Processing: ${mlsTeam.name} (${mlsTeam.abbreviation})`);

    // Find matching team in database
    const matchingTeam = teams.find(team => 
      team.name.toLowerCase() === mlsTeam.name.toLowerCase() ||
      team.abbreviation.toLowerCase() === mlsTeam.abbreviation.toLowerCase()
    );

    if (!matchingTeam) {
      console.log(`  ❌ No matching team found in database`);
      notFoundCount++;
      continue;
    }

    // Construct new logo URL
    const newLogoUrl = `http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/usa.1/${mlsTeam.abbreviation}.png`;

    // Check if URL is already correct
    if (matchingTeam.logoUrl === newLogoUrl) {
      console.log(`  ✅ Already has correct logo URL`);
      skippedCount++;
      continue;
    }

    // Check if new logo URL is accessible
    console.log(`  🔍 Checking logo accessibility: ${newLogoUrl}`);
    const isAccessible = await isLogoAccessible(newLogoUrl);

    if (!isAccessible) {
      console.log(`  ⚠️  Logo URL not accessible, skipping update`);
      errorCount++;
      continue;
    }

    // Update the team logo
    console.log(`  🔄 Updating logo URL...`);
    const success = await updateTeamLogo(matchingTeam.id, newLogoUrl);

    if (success) {
      console.log(`  ✅ Successfully updated ${mlsTeam.name} logo URL`);
      updatedCount++;
    } else {
      console.log(`  ❌ Failed to update ${mlsTeam.name} logo URL`);
      errorCount++;
    }

    console.log('');
  }

  // Summary
  console.log('📊 MLS Logo Update Summary:');
  console.log(`  ✅ Successfully updated: ${updatedCount} teams`);
  console.log(`  ⏭️  Skipped (already correct): ${skippedCount} teams`);
  console.log(`  ❌ Errors (URL not accessible): ${errorCount} teams`);
  console.log(`  🔍 Not found in database: ${notFoundCount} teams`);
  console.log(`  📈 Total MLS teams processed: ${mlsTeams.length}`);
  console.log('✨ MLS logo update completed!');
}

// Run the update
updateMLSLogos().catch(console.error); 