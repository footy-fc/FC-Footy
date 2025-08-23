#!/usr/bin/env node

/**
 * Test script to analyze worst captain picks for any gameweek
 * Finds managers whose vice captain outscored their captain
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Parse command line arguments
const args = process.argv.slice(2);
const gameweek = parseInt(args[0]) || 1;

// Validate gameweek
if (gameweek < 1 || gameweek > 38) {
  console.error('❌ Invalid gameweek. Must be between 1-38');
  console.log('Usage: node scripts/test-worst-captain-picks.mjs [gameweek]');
  console.log('Examples:');
  console.log('  node scripts/test-worst-captain-picks.mjs 1    # Analyze gameweek 1');
  console.log('  node scripts/test-worst-captain-picks.mjs 5    # Analyze gameweek 5');
  console.log('  node scripts/test-worst-captain-picks.mjs      # Default to gameweek 1');
  process.exit(1);
}

// Sample FPL managers with FIDs for testing
const testManagers = [
  { entry_id: 250392, fid: 4163, team_name: "KMac" },
  { entry_id: 192153, fid: 249647, team_name: "JE11YF15H" },
  { entry_id: 215181, fid: 267104, team_name: "FeMMie" },
  { entry_id: 200716, fid: 528707, team_name: "Ghost" },
  { entry_id: 204596, fid: 844615, team_name: "kimken" },
  { entry_id: 179856, fid: 718134, team_name: "Henry" },
  { entry_id: 23272, fid: 231807, team_name: "Milo" },
  { entry_id: 47421, fid: 1136655, team_name: "Vyenepaul" },
  { entry_id: 55728, fid: 317946, team_name: "Zipar" },
  { entry_id: 56917, fid: 4926, team_name: "kazani" },
  { entry_id: 100599, fid: 297066, team_name: "Supertaster" },
  { entry_id: 135864, fid: 12938, team_name: "ash" },
  { entry_id: 143460, fid: 1171009, team_name: "Fearles" },
  { entry_id: 196349, fid: 886751, team_name: "urluck" },
  { entry_id: 216189, fid: 877298, team_name: "amirmaleki" }
];

async function analyzeWorstCaptainPicks() {
  console.log(`🔍 Analyzing worst captain picks for gameweek ${gameweek}...\n`);
  
  const worstPicks = [];
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 3; // Stop after 3 consecutive failures
  let shouldSkipGameweek = false;
  
  for (const manager of testManagers) {
    // Skip remaining managers if we've determined this gameweek has no data
    if (shouldSkipGameweek) {
      console.log(`⏭️  Skipping @${manager.team_name} - gameweek ${gameweek} has no data`);
      continue;
    }
    try {
      console.log(`📊 Analyzing @${manager.team_name} (FID: ${manager.fid})...`);
      
      // Fetch manager picks for specified gameweek
      const response = await fetch(`${BASE_URL}/api/manager-picks?fid=${manager.fid}&gameweek=${gameweek}`);
      
      if (response.ok) {
        const picksData = await response.json();
        
        // Find captain and vice captain
        const captain = picksData.picks.find(p => p.is_captain);
        const viceCaptain = picksData.picks.find(p => p.is_vice_captain);
        
        if (captain && viceCaptain && captain.player && viceCaptain.player) {
          // Calculate points (captain gets 2x multiplier, vice captain gets 1x if captain doesn't play)
          const captainPoints = captain.player.total_points * 2;
          const viceCaptainPoints = viceCaptain.player.total_points;
          
          console.log(`  👑 Captain: ${captain.player.web_name} (${captain.player.team?.short_name}) - ${captain.player.total_points}pts × 2 = ${captainPoints}pts`);
          console.log(`  👑 Vice Captain: ${viceCaptain.player.web_name} (${viceCaptain.player.team?.short_name}) - ${viceCaptainPoints}pts`);
          
          // If vice captain outscored captain, this is a bad captain choice
          if (viceCaptainPoints > captainPoints) {
            const pointsDifference = viceCaptainPoints - captainPoints;
            
            const badPick = {
              manager: manager.team_name,
              fid: manager.fid,
              captain: {
                name: captain.player.web_name,
                team: captain.player.team?.short_name,
                points: captain.player.total_points,
                captainPoints: captainPoints
              },
              viceCaptain: {
                name: viceCaptain.player.web_name,
                team: viceCaptain.player.team?.short_name,
                points: viceCaptain.player.total_points,
                viceCaptainPoints: viceCaptainPoints
              },
              pointsDifference: pointsDifference,
              missedPoints: pointsDifference
            };
            
            worstPicks.push(badPick);
            console.log(`  ❌ BAD CAPTAIN CHOICE! Missed ${pointsDifference}pts`);
                  } else {
          console.log(`  ✅ Good captain choice`);
          consecutiveFailures = 0; // Reset failure counter on success
        }
        } else {
          console.log(`  ⚠️  Missing captain or vice captain data`);
        }
      } else {
        console.log(`  ❌ Failed to fetch picks: ${response.status}`);
        consecutiveFailures++;
        
        // Check if we should skip this gameweek
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log(`\n⚠️  Skipping remaining managers: ${consecutiveFailures} consecutive failures suggest gameweek ${gameweek} may not have data yet`);
          shouldSkipGameweek = true;
          continue;
        }
      }
      
      console.log(''); // Empty line for readability
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Error analyzing picks for ${manager.team_name}:`, error.message);
      consecutiveFailures++;
      
      // Check if we should skip this gameweek
      if (consecutiveFailures >= maxConsecutiveFailures) {
        console.log(`\n⚠️  Skipping remaining managers: ${consecutiveFailures} consecutive failures suggest gameweek ${gameweek} may not have data yet`);
        shouldSkipGameweek = true;
        continue;
      }
    }
  }
  
  // Sort by points difference (worst first)
  worstPicks.sort((a, b) => b.pointsDifference - a.pointsDifference);
  
  console.log('📊 RESULTS SUMMARY:');
  console.log('─'.repeat(50));
  
  if (worstPicks.length > 0) {
    console.log(`Found ${worstPicks.length} managers with bad captain choices in Gameweek ${gameweek}:\n`);
    
    worstPicks.forEach((pick, index) => {
      console.log(`${index + 1}. @${pick.manager}`);
      console.log(`   Captain: ${pick.captain.name} (${pick.captain.team}) - ${pick.captain.captainPoints}pts`);
      console.log(`   Vice Captain: ${pick.viceCaptain.name} (${pick.viceCaptain.team}) - ${pick.viceCaptain.points}pts`);
      console.log(`   Missed: ${pick.missedPoints}pts\n`);
    });
    
    // Generate sample cast text
    console.log('📝 SAMPLE CAST TEXT:');
    console.log('─'.repeat(50));
    console.log(`👑 Game Week ${gameweek} - Worst Captain Picks! 😅\n`);
    
    const top3Worst = worstPicks.slice(0, 3);
    top3Worst.forEach((pick, index) => {
      const reactions = ['😅', '🤦‍♂️', '😬'];
      const reaction = reactions[index] || '😅';
      console.log(`${reaction} @${pick.manager} - C: ${pick.captain.name} (${pick.captain.captainPoints}pts) vs VC: ${pick.viceCaptain.name} (${pick.viceCaptain.points}pts) - Missed ${pick.missedPoints}pts!`);
    });
    
    console.log(`\n⚽ Sometimes the vice captain knows best! 🔥`);
    
  } else {
    console.log(`🎉 Great news! No managers had their vice captain outscore their captain in Gameweek ${gameweek}!`);
    console.log('⚽ Everyone made solid captain choices! 🔥');
  }
}

// Run the analysis
analyzeWorstCaptainPicks().catch((err) => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
