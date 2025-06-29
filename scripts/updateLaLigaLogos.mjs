#!/usr/bin/env node

/**
 * Script to update logo URLs for La Liga teams
 * Uses the Supabase storage path pattern: http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/esp.1/{abbreviation}.png
 */

import fetch from 'node-fetch';

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || 'random-notification-api-key';

// La Liga teams with their abbreviations
const laLigaTeams = [
  { name: "Athletic Bilbao", abbreviation: "ath" },
  { name: "Atlético de Madrid", abbreviation: "atm" },
  { name: "CA Osasuna", abbreviation: "osa" },
  { name: "CD Leganés", abbreviation: "leg" },
  { name: "Celta de Vigo", abbreviation: "cel" },
  { name: "Deportivo Alavés", abbreviation: "alv" },
  { name: "FC Barcelona", abbreviation: "bar" },
  { name: "Getafe CF", abbreviation: "get" },
  { name: "Girona FC", abbreviation: "gir" },
  { name: "RCD Espanyol Barcelona", abbreviation: "esp" },
  { name: "RCD Mallorca", abbreviation: "mal" },
  { name: "Rayo Vallecano", abbreviation: "ray" },
  { name: "Real Betis Balompié", abbreviation: "bet" },
  { name: "Real Madrid", abbreviation: "rma" },
  { name: "Real Sociedad", abbreviation: "rso" },
  { name: "Real Valladolid CF", abbreviation: "vll" },
  { name: "Sevilla FC", abbreviation: "sev" },
  { name: "UD Las Palmas", abbreviation: "lpa" },
  { name: "Valencia CF", abbreviation: "val" },
  { name: "Villarreal CF", abbreviation: "vil" }
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
async function updateLaLigaLogos() {
  console.log('🔍 Starting La Liga logo update process...\n');

  // Fetch all teams
  const teams = await fetchAllTeams();
  console.log(`📊 Found ${teams.length} total teams`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let notFoundCount = 0;

  // Process each La Liga team
  for (const laLigaTeam of laLigaTeams) {
    console.log(`🔄 Processing: ${laLigaTeam.name} (${laLigaTeam.abbreviation})`);

    // Find matching team in database
    const matchingTeam = teams.find(team => 
      team.name.toLowerCase() === laLigaTeam.name.toLowerCase() ||
      team.abbreviation.toLowerCase() === laLigaTeam.abbreviation.toLowerCase()
    );

    if (!matchingTeam) {
      console.log(`  ❌ No matching team found in database`);
      notFoundCount++;
      continue;
    }

    // Construct new logo URL
    const newLogoUrl = `http://tjftzpjqfqnbtvodsigk.supabase.co/storage/v1/object/public/d33m_images/teams/leagues/esp.1/${laLigaTeam.abbreviation}.png`;

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
      console.log(`  ✅ Successfully updated ${laLigaTeam.name} logo URL`);
      updatedCount++;
    } else {
      console.log(`  ❌ Failed to update ${laLigaTeam.name} logo URL`);
      errorCount++;
    }

    console.log('');
  }

  // Summary
  console.log('📊 La Liga Logo Update Summary:');
  console.log(`  ✅ Successfully updated: ${updatedCount} teams`);
  console.log(`  ⏭️  Skipped (already correct): ${skippedCount} teams`);
  console.log(`  ❌ Errors (URL not accessible): ${errorCount} teams`);
  console.log(`  🔍 Not found in database: ${notFoundCount} teams`);
  console.log(`  📈 Total La Liga teams processed: ${laLigaTeams.length}`);
  console.log('✨ La Liga logo update completed!');
}

// Run the update
updateLaLigaLogos().catch(console.error); 