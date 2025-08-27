#!/usr/bin/env node

/**
 * Test script to analyze worst captain picks for any gameweek
 * Finds managers whose vice captain outscored their captain
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Function to fetch Farcaster username by FID
async function fetchFanUserData(fanFid) {
  try {
    const response = await fetch(`https://hub.merv.fun/v1/userDataByFid?fid=${fanFid}`);
    const data = await response.json();
    if (!data.messages || data.messages.length === 0) {
      return {};
    }
    const userDataMap = {};
    for (const message of data.messages) {
      const userData = message.data.userDataBody;
      if (userData?.type && userData?.value) {
        if (!userDataMap[userData.type]) {
          userDataMap[userData.type] = [];
        }
        userDataMap[userData.type].push(userData.value);
      }
    }
    return userDataMap;
  } catch (error) {
    console.error("Error fetching fan user data for fid:", fanFid, error);
    return {};
  }
}

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

// Function to fetch all managers from FPL league
async function fetchAllManagers() {
  try {
    const response = await fetch(`${BASE_URL}/api/fpl-league`);
    if (!response.ok) {
      throw new Error(`Failed to fetch league data: ${response.status}`);
    }
    const data = await response.json();
    return data.standings.results || [];
  } catch (error) {
    console.error('Error fetching league data:', error.message);
    return [];
  }
}

// Function to get managers with FIDs from lookup data
async function getManagersWithFIDs() {
  try {
    // Read the fantasy managers lookup file
    const fs = await import('fs');
    const path = await import('path');
    const lookupPath = path.join(process.cwd(), 'src', 'data', 'fantasy-managers-lookup.json');
    const lookupData = JSON.parse(fs.readFileSync(lookupPath, 'utf8'));
    
    // Fetch all managers from FPL
    const allManagers = await fetchAllManagers();
    
    // Match managers with FIDs
    const managersWithFIDs = [];
    for (const entry of allManagers) {
      const lookupEntry = lookupData.find(item => item.entry_id === entry.entry);
      if (lookupEntry && lookupEntry.fid) {
        managersWithFIDs.push({
          entry_id: entry.entry,
          fid: lookupEntry.fid,
          team_name: entry.player_name || entry.entry_name,
          entry_name: entry.entry_name
        });
      }
    }
    
    return managersWithFIDs;
  } catch (error) {
    console.error('Error getting managers with FIDs:', error.message);
    // Fallback to test managers if lookup fails
    return [
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
  }
}

async function analyzeWorstCaptainPicks() {
  console.log(`🔍 Analyzing worst captain picks for gameweek ${gameweek}...\n`);
  
  // Get all managers with FIDs
  console.log('📋 Fetching all managers from FPL league...');
  const allManagers = await getManagersWithFIDs();
  console.log(`Found ${allManagers.length} managers with FIDs\n`);
  
  const worstPicks = [];
  const allCaptainPicks = []; // Track all captain picks for stats
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 5; // Increased for larger dataset
  let shouldSkipGameweek = false;
  
  for (const manager of allManagers) {
    // Skip remaining managers if we've determined this gameweek has no data
    if (shouldSkipGameweek) {
      console.log(`⏭️  Skipping @${manager.team_name} - gameweek ${gameweek} has no data`);
      continue;
    }
    try {
      console.log(`📊 Analyzing @${manager.team_name} (FID: ${manager.fid})...`);
      
      // Fetch manager picks for specified gameweek
      const response = await fetch(`${BASE_URL}/api/manager-picks?fid=${manager.fid}&gameweek=${gameweek}`);
      
      // Also fetch FPL live data for accurate gameweek points
      const fplLiveUrl = `https://fantasy.premierleague.com/api/event/${gameweek}/live/`;
      const fplLiveResponse = await fetch(fplLiveUrl);
      const fplLiveData = await fplLiveResponse.json();
      
      // Create a map of player ID to gameweek points
      const playerPointsMap = {};
      fplLiveData.elements.forEach(player => {
        playerPointsMap[player.id] = player.stats.total_points;
      });
      
      if (response.ok) {
        const picksData = await response.json();
        
        // Find captain and vice captain
        const captain = picksData.picks.find(p => p.is_captain);
        const viceCaptain = picksData.picks.find(p => p.is_vice_captain);
        
        if (captain && viceCaptain && captain.player && viceCaptain.player) {
          // Get accurate gameweek points from FPL live data
          const captainGameweekPoints = playerPointsMap[captain.player.id] || 0;
          const viceCaptainGameweekPoints = playerPointsMap[viceCaptain.player.id] || 0;
          
          // Calculate points based on FPL rules:
          // - If captain plays: captain gets 2x, vice captain gets 1x
          // - If captain doesn't play: vice captain becomes captain and gets 2x
          const captainPlayed = captainGameweekPoints > 0;
          const viceCaptainPlayed = viceCaptainGameweekPoints > 0;
          
          let captainPoints, viceCaptainPoints, actualCaptainName, actualViceCaptainName;
          
          if (captainPlayed) {
            // Captain played - normal rules
            captainPoints = captainGameweekPoints * 2;
            viceCaptainPoints = viceCaptainGameweekPoints;
            actualCaptainName = captain.player.web_name;
            actualViceCaptainName = viceCaptain.player.web_name;
          } else if (viceCaptainPlayed) {
            // Captain didn't play, vice captain becomes captain
            captainPoints = viceCaptainGameweekPoints * 2;
            viceCaptainPoints = 0; // No vice captain points since they became captain
            actualCaptainName = `${viceCaptain.player.web_name} (VC promoted)`;
            actualViceCaptainName = "N/A";
          } else {
            // Both captain and vice captain didn't play
            captainPoints = 0;
            viceCaptainPoints = 0;
            actualCaptainName = captain.player.web_name;
            actualViceCaptainName = viceCaptain.player.web_name;
          }
          
          console.log(`  👑 Captain: ${actualCaptainName} (${captain.player.team?.short_name}) - ${captainPoints}pts`);
          console.log(`  👑 Vice Captain: ${actualViceCaptainName} (${viceCaptain.player.team?.short_name}) - ${viceCaptainPoints}pts`);
          
          // Track all captain picks for statistics
          allCaptainPicks.push({
            manager: manager.team_name,
            fid: manager.fid,
            captainName: actualCaptainName, // Use actual captain name (includes VC promotions)
            captainTeam: captain.player.team?.short_name,
            captainPoints: captainPoints,
            captainGameweekPoints: captainGameweekPoints,
            viceCaptainName: actualViceCaptainName, // Use actual vice captain name
            viceCaptainTeam: viceCaptain.player.team?.short_name,
            viceCaptainPoints: viceCaptainPoints,
            viceCaptainGameweekPoints: viceCaptainGameweekPoints,
            captainPlayed: captainPlayed,
            viceCaptainPlayed: viceCaptainPlayed,
            wasViceCaptainPromoted: !captainPlayed && viceCaptainPlayed
          });
          
          // Only consider it a bad choice if:
          // 1. Captain played but vice captain would have scored more, OR
          // 2. Both captain and vice captain didn't play (truly bad choice)
          const isBadChoice = (captainPlayed && viceCaptainGameweekPoints > captainGameweekPoints) || 
                             (!captainPlayed && !viceCaptainPlayed);
          
          if (isBadChoice) {
            // Calculate points difference based on the scenario
            let pointsDifference;
            let reason;
            
            if (captainPlayed && viceCaptainGameweekPoints > captainGameweekPoints) {
              // Captain played but vice captain would have scored more
              pointsDifference = (viceCaptainGameweekPoints * 2) - captainPoints;
              reason = `Captain played but VC would have scored ${viceCaptainGameweekPoints * 2}pts vs ${captainPoints}pts`;
            } else if (!captainPlayed && !viceCaptainPlayed) {
              // Both captain and vice captain didn't play
              pointsDifference = 0; // No points difference, but it's still a bad choice
              reason = "Both captain and vice captain didn't play";
            }
            
            const badPick = {
              manager: manager.team_name,
              fid: manager.fid,
              username: null, // Will be populated later
              captain: {
                name: actualCaptainName,
                team: captain.player.team?.short_name,
                points: captainGameweekPoints,
                captainPoints: captainPoints
              },
              viceCaptain: {
                name: actualViceCaptainName,
                team: viceCaptain.player.team?.short_name,
                points: viceCaptainGameweekPoints,
                viceCaptainPoints: viceCaptainPoints
              },
              pointsDifference: pointsDifference,
              missedPoints: pointsDifference,
              reason: reason
            };
            
            worstPicks.push(badPick);
            console.log(`  ❌ BAD CAPTAIN CHOICE! ${reason}`);
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
  
  // Lookup usernames for all bad picks
  console.log('🔍 Looking up Farcaster usernames...');
  for (const pick of worstPicks) {
    try {
      const userData = await fetchFanUserData(pick.fid);
      const username = userData['USER_DATA_TYPE_USERNAME']?.[0];
      if (username) {
        pick.username = username.toLowerCase();
      } else {
        // Fallback to team_name if no username found
        pick.username = pick.manager.toLowerCase().replace(/[^a-z0-9]/g, '');
      }
    } catch (error) {
      console.error(`Error looking up username for FID ${pick.fid}:`, error.message);
      pick.username = pick.manager.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
  }
  
  console.log('📊 RESULTS SUMMARY:');
  console.log('─'.repeat(50));
  
  if (worstPicks.length > 0) {
    console.log(`Found ${worstPicks.length} managers with bad captain choices in Gameweek ${gameweek}:\n`);
    
    worstPicks.forEach((pick, index) => {
      console.log(`${index + 1}. @${pick.username}`);
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
      console.log(`${reaction} @${pick.username} - C: ${pick.captain.name} (${pick.captain.captainPoints}pts) vs VC: ${pick.viceCaptain.name} (${pick.viceCaptain.points}pts) - Missed ${pick.missedPoints}pts!`);
    });
    
    console.log(`\n⚽ Sometimes the vice captain knows best! 🔥`);
    
  } else {
    console.log(`🎉 Great news! No managers had their vice captain outscore their captain in Gameweek ${gameweek}!`);
    console.log('⚽ Everyone made solid captain choices! 🔥');
  }
  
  // Generate descriptive statistics
  console.log('\n📊 DESCRIPTIVE STATISTICS:');
  console.log('─'.repeat(50));
  
  // Captain popularity histogram
  const captainCounts = {};
  allCaptainPicks.forEach(pick => {
    const captainKey = `${pick.captainName} (${pick.captainTeam})`;
    captainCounts[captainKey] = (captainCounts[captainKey] || 0) + 1;
  });
  
  // Sort by popularity
  const sortedCaptains = Object.entries(captainCounts)
    .sort(([,a], [,b]) => b - a);
  
  console.log('👑 CAPTAIN POPULARITY:');
  sortedCaptains.forEach(([captain, count]) => {
    const percentage = ((count / allCaptainPicks.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round((count / allCaptainPicks.length) * 20));
    console.log(`${captain.padEnd(25)} ${count.toString().padStart(2)} picks (${percentage}%) ${bar}`);
  });
  
  // Captain performance stats
  const captainPerformance = {};
  allCaptainPicks.forEach(pick => {
    const captainKey = `${pick.captainName} (${pick.captainTeam})`;
    if (!captainPerformance[captainKey]) {
      captainPerformance[captainKey] = {
        totalPoints: 0,
        count: 0,
        avgPoints: 0
      };
    }
    captainPerformance[captainKey].totalPoints += pick.captainPoints;
    captainPerformance[captainKey].count += 1;
  });
  
  // Calculate averages
  Object.values(captainPerformance).forEach(perf => {
    perf.avgPoints = (perf.totalPoints / perf.count).toFixed(1);
  });
  
  console.log('\n📈 CAPTAIN PERFORMANCE:');
  const sortedPerformance = Object.entries(captainPerformance)
    .sort(([,a], [,b]) => parseFloat(b.avgPoints) - parseFloat(a.avgPoints));
  
  sortedPerformance.forEach(([captain, perf]) => {
    console.log(`${captain.padEnd(25)} ${perf.avgPoints}pts avg (${perf.count} picks)`);
  });
  
  // Overall stats
  const totalManagers = allCaptainPicks.length;
  const managersWithBadChoices = worstPicks.length;
  const badChoicePercentage = ((managersWithBadChoices / totalManagers) * 100).toFixed(1);
  
  const viceCaptainPromotions = allCaptainPicks.filter(pick => pick.wasViceCaptainPromoted).length;
  const promotionPercentage = ((viceCaptainPromotions / totalManagers) * 100).toFixed(1);
  
  console.log('\n📋 OVERALL STATS:');
  console.log(`Total managers analyzed: ${totalManagers}`);
  console.log(`Managers with bad captain choices: ${managersWithBadChoices} (${badChoicePercentage}%)`);
  console.log(`Vice captain promotions: ${viceCaptainPromotions} (${promotionPercentage}%)`);
  
  // Average captain points
  const totalCaptainPoints = allCaptainPicks.reduce((sum, pick) => sum + pick.captainPoints, 0);
  const avgCaptainPoints = (totalCaptainPoints / totalManagers).toFixed(1);
  console.log(`Average captain points: ${avgCaptainPoints}pts`);
  
  // Best and worst captain performances
  const bestCaptain = allCaptainPicks.reduce((best, pick) => 
    pick.captainPoints > best.captainPoints ? pick : best
  );
  const worstCaptain = allCaptainPicks.reduce((worst, pick) => 
    pick.captainPoints < worst.captainPoints ? pick : worst
  );
  
  console.log(`Best captain performance: @${bestCaptain.manager} - ${bestCaptain.captainName} (${bestCaptain.captainPoints}pts)`);
  console.log(`Worst captain performance: @${worstCaptain.manager} - ${worstCaptain.captainName} (${worstCaptain.captainPoints}pts)`);
}

// Run the analysis
analyzeWorstCaptainPicks().catch((err) => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
