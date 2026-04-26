#!/usr/bin/env node

import { config } from 'dotenv';
import fantasyManagersLookup from '../src/data/fantasy-managers-lookup.json' with { type: 'json' };
import axios from 'axios';

// Load environment variables
config();

/**
 * Fetch FPL league standings from cached API endpoint
 */
async function fetchFPLLeagueData(leagueId = 18526) {
  // 1) Try cached API on ngrok, Vercel, or localhost
  const baseCandidates = [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_URL || 'https://fc-footy.vercel.app',
    'http://localhost:3000',
  ].filter(Boolean); // Remove undefined values

  for (const base of baseCandidates) {
    const baseUrl = String(base).replace(/\/$/, '');
    const url = `${baseUrl}/api/fpl-league?leagueId=${leagueId}`;
    try {
      console.log(`🗂️ [cache] Trying ${url}`);
      const resp = await fetch(url, { headers: { accept: 'application/json' } });
      if (!resp.ok) {
        console.log(`🗂️ [cache] Non-OK status: ${resp.status}`);
        continue;
      }
      const data = await resp.json();
      const results = data?.standings?.results || [];
      if (Array.isArray(results) && results.length > 0) {
        console.log(`✅ [cache] Using cached standings: ${results.length} entries (fetched_at: ${data?.fetched_at || 'n/a'})`);
        return results;
      }
      console.log('🗂️ [cache] Response OK but missing results, trying next option...');
    } catch (e) {
      console.log(`🗂️ [cache] Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 2) Fallback: fetch directly from FPL with pagination
  console.log('🔁 Fallback to direct FPL API (pagination)...');
  const allStandings = [];
  let page = 1;
  let hasMorePages = true;
  while (hasMorePages) {
    const url = `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/?page_standings=${page}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        accept: 'application/json',
      },
    });
    if (!resp.ok) {
      throw new Error(`FPL API error: ${resp.status}`);
    }
    const data = await resp.json();
    const results = data?.standings?.results || [];
    if (results.length > 0) {
      allStandings.push(...results);
      console.log(`📄 [FPL] Page ${page} → ${results.length} entries (total so far ${allStandings.length})`);
      page += 1;
    } else {
      hasMorePages = false;
    }
  }
  console.log(`✅ [FPL] Total entries fetched: ${allStandings.length}`);
  return allStandings;
}

/**
 * Fetch username from HyperSnap by FID
 */
async function fetchUsernameByFid(fid) {
  try {
    const response = await axios.get(`https://haatz.quilibrium.com/v2/farcaster/user/bulk?fids=${fid}`);
    return response.data?.users?.[0]?.username?.toLowerCase() || null;
  } catch (error) {
    console.error(`Error fetching username for fid ${fid}:`, error.message);
    return null;
  }
}

/**
 * Get managers with FIDs and usernames from HyperSnap
 */
async function getManagersWithFIDs(standings) {
  const managersWithFIDs = [];
  
  for (const entry of standings) {
    const lookupEntry = fantasyManagersLookup.find(lookup => lookup.entry_id === entry.entry);
    if (lookupEntry && lookupEntry.fid) {
      const username = await fetchUsernameByFid(lookupEntry.fid);
      if (username) {
        managersWithFIDs.push({
          ...entry,
          fid: lookupEntry.fid,
          username,
          rank: entry.rank,
          total: entry.total,
          event_total: entry.event_total,
        });
      }
    }
  }
  
  return managersWithFIDs.sort((a, b) => a.rank - b.rank);
}

/**
 * Test infographic generation
 */
async function testInfographicGeneration(fplData) {
  console.log('🎨 Testing enhanced infographic generation...');
  
  // Prepare data for infographic
  const sortedByTotal = [...fplData].sort((a, b) => b.total - a.total);
  const sortedByEventTotal = [...fplData].sort((a, b) => b.event_total - a.event_total);
  
  const top3 = sortedByTotal.slice(0, 3);
  const bottom3 = sortedByTotal.slice(-3).reverse();
  const weekWinners = sortedByEventTotal.slice(0, 3);
  
  console.log('🎨 [test] Data prepared:', { 
    top3Count: top3.length, 
    bottom3Count: bottom3.length, 
    weekWinnersCount: weekWinners.length,
    gameWeek: 1 
  });

  // Debug: show entry details
  console.log('🔍 [test] Top 3 entry details:');
  top3.forEach((manager, index) => {
    console.log(`  ${index + 1}. ${manager.username} - entry_id: ${manager.entry_id}, entry: ${manager.entry}, total: ${manager.total}`);
  });
  
  console.log('🔍 [test] Bottom 3 entry details:');
  bottom3.forEach((manager, index) => {
    console.log(`  ${index + 1}. ${manager.username} - entry_id: ${manager.entry_id}, entry: ${manager.entry}, total: ${manager.total}`);
  });
  
  console.log('🔍 [test] Week winners entry details:');
  weekWinners.forEach((manager, index) => {
    console.log(`  ${index + 1}. ${manager.username} - entry_id: ${manager.entry_id}, entry: ${manager.entry}, event_total: ${manager.event_total}`);
  });

  // Use the same base URL logic as fetchFPLLeagueData
  const baseCandidates = [
    process.env.NEXT_PUBLIC_URL || 'https://fc-footy.vercel.app',
    'http://localhost:3000',
  ];

  let infographicUrl = null;
  for (const base of baseCandidates) {
    const baseUrl = String(base).replace(/\/$/, '');
    const url = `${baseUrl}/api/gameweek-infographic`;
    
    try {
      console.log(`🎨 [test] Trying ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'text/html'
        },
        body: JSON.stringify({
          top3,
          weekWinners,
          bottom3,
          gameWeek: 1
        })
      });

      if (!response.ok) {
        console.log(`🎨 [test] Non-OK status: ${response.status}`);
        continue;
      }

      const htmlContent = await response.text();
      console.log(`💾 [test] HTML received, length: ${htmlContent.length}`);
      
      // Convert HTML to PNG using canvas
      try {
        const { createCanvas } = await import('canvas');
        const canvas = createCanvas(1000, 600);
        const ctx = canvas.getContext('2d');
        
        // Draw a simple infographic
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, 1000, 600);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Week 1 Summary', 500, 80);
        
        ctx.font = 'bold 24px Arial';
        ctx.fillText('🏆 WINNERS', 250, 150);
        ctx.fillText('😅 LOSERS', 750, 150);
        
        // Draw top 3
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        top3.forEach((manager, index) => {
          const y = 200 + (index * 40);
          ctx.fillText(`${index + 1}. @${manager.username} - ${manager.total}pts`, 50, y);
        });
        
        // Draw bottom 3
        bottom3.forEach((manager, index) => {
          const y = 200 + (index * 40);
          ctx.fillText(`${index + 1}. @${manager.username} - ${manager.total}pts`, 550, y);
        });
        
        const pngBuffer = canvas.toBuffer('image/png');
        console.log(`📸 [test] PNG generated, size: ${pngBuffer.length} bytes`);
        
        // Upload PNG to IPFS
        console.log('📤 [test] Uploading PNG to IPFS...');
        const uploadResponse = await fetch(`${baseUrl}/api/upload`, {
          method: 'POST',
          body: pngBuffer,
          headers: {
            'Content-Type': 'image/png'
          }
        });
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.log(`📤 [test] Upload failed: ${uploadResponse.status} - ${errorText}`);
          continue;
        }
        
        const uploadResult = await uploadResponse.json();
        console.log(`📤 [test] Upload result:`, uploadResult);
        const publicUrl = uploadResult.publicUrl;
        
        if (publicUrl) {
          infographicUrl = publicUrl;
          console.log(`✅ [test] Uploaded to QStorage: ${infographicUrl}`);
          break;
        } else {
          console.log(`📤 [test] No public URL in response:`, uploadResult);
        }
        
      } catch (canvasError) {
        console.log(`📸 [test] Canvas error: ${canvasError.message}`);
        // Fallback: save HTML locally
        const fs = await import('fs');
        const path = await import('path');
        const htmlPath = path.join(process.cwd(), `test-gameweek-1-summary.html`);
        fs.writeFileSync(htmlPath, htmlContent);
        console.log(`💾 [test] HTML saved to: ${htmlPath}`);
        console.log('📝 [test] Open this HTML file in a browser to see the infographic');
        infographicUrl = `file://${htmlPath}`;
        break;
      }
      
    } catch (e) {
      console.log(`🎨 [test] Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return infographicUrl;
}

/**
 * Generate banter text for top performers
 */
function generateTopPerformersBanter(top3) {
  const banterLines = [];
  
  if (top3.length >= 1) {
    const first = top3[0];
    banterLines.push(`🥇 @${first.username} - The king stays king! 👑⚽️ (${first.total}pts)`);
  }
  
  if (top3.length >= 2) {
    const second = top3[1];
    banterLines.push(`🥈 @${second.username} - So close, yet so far! 😅⚽️ (${second.total}pts)`);
  }
  
  if (top3.length >= 3) {
    const third = top3[2];
    banterLines.push(`🥉 @${third.username} - Bronze medal energy! 🎯⚽️ (${third.total}pts)`);
  }
  
  return banterLines.join('\n');
}

/**
 * Generate banter text for bottom performers
 */
function generateBottomPerformersBanter(bottom3) {
  const banterLines = [];
  
  if (bottom3.length >= 1) {
    const last = bottom3[bottom3.length - 1];
    banterLines.push(`😅 @${last.username} - At least you're not last... oh wait! 😂⚽️ (${last.total}pts)`);
  }
  
  if (bottom3.length >= 2) {
    const secondLast = bottom3[bottom3.length - 2];
    banterLines.push(`🤔 @${secondLast.username} - Maybe next week? 🤞⚽️ (${secondLast.total}pts)`);
  }
  
  if (bottom3.length >= 3) {
    const thirdLast = bottom3[bottom3.length - 3];
    banterLines.push(`💪 @${thirdLast.username} - Keep fighting! 💪⚽️ (${thirdLast.total}pts)`);
  }
  
  return banterLines.join('\n');
}

/**
 * Generate the complete cast text
 */
function generateCastText(top5, bottom5, infographicUrl = null) {
  const topBanter = generateTopPerformersBanter(top5);
  const bottomBanter = generateBottomPerformersBanter(bottom5);
  
  let castText = `🎮 Game Week Summary - Farcaster Fantasy League! 🏆

${topBanter}

${bottomBanter}

⚽ Keep the banter friendly and the competition fierce! 🔥`;

  // Add infographic URL if available
  if (infographicUrl) {
    castText += `\n\n📊 Check out the full infographic: ${infographicUrl}`;
  }

  return castText;
}

/**
 * Main test function
 */
async function main() {
  try {
    console.log('🧪 Starting Game Week Summary Test...\n');
    
    // Fetch FPL data from cached API
    const standings = await fetchFPLLeagueData();
    console.log(`✅ Fetched ${standings.length} entries from cached API\n`);
    
    // Get managers with FIDs
    const managersWithFIDs = await getManagersWithFIDs(standings);
    console.log(`✅ Found ${managersWithFIDs.length} managers with FIDs\n`);
    
    if (managersWithFIDs.length < 6) {
      console.error('❌ Need at least 6 managers with FIDs to generate summary');
      process.exit(1);
    }
    
    // Sort by total points (overall standings)
    const sortedByTotal = managersWithFIDs.sort((a, b) => b.total - a.total);
    
    // Get top 5 and bottom 5 based on overall standings
    const top5 = sortedByTotal.slice(0, 5);
    const bottom5 = sortedByTotal.slice(-5);
    
    console.log('🏆 Top 5 Overall Performers:');
    top5.forEach((manager, index) => {
      console.log(`${index + 1}. @${manager.username} - Total Points: ${manager.total}, Rank: ${manager.rank}`);
    });
    
    console.log('\n😅 Bottom 5 Overall Performers:');
    bottom5.forEach((manager, index) => {
      console.log(`${bottom5.length - index}. @${manager.username} - Total Points: ${manager.total}, Rank: ${manager.rank}`);
    });
    
    // Test infographic generation
    const infographicUrl = await testInfographicGeneration(managersWithFIDs);
    
    // Generate cast text
    const castText = generateCastText(top5, bottom5, infographicUrl);
    
    console.log('\n📝 Generated Cast Text:');
    console.log('─'.repeat(50));
    console.log(castText);
    console.log('─'.repeat(50));
    
    console.log('\n✅ Test completed successfully!');
    console.log('💡 To post the actual cast, run: yarn gameweek:summary');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
main();
