#!/usr/bin/env node

import { config } from 'dotenv';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import fantasyManagersLookup from '../src/data/fantasy-managers-lookup.json' with { type: 'json' };
import axios from 'axios';

// Load environment variables
config();

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
const SIGNER_UUID = process.env.SIGNER_UUID;

if (!NEYNAR_API_KEY) {
  console.error('❌ Missing NEYNAR_API_KEY environment variable');
  process.exit(1);
}

if (!SIGNER_UUID) {
  console.error('❌ Missing SIGNER_UUID environment variable');
  process.exit(1);
}

const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY);

/**
 * Fetch FPL league standings from cached API endpoint
 */
async function fetchFPLLeagueData(leagueId = 18526) {
  // 1) Try cached API on Vercel or env URL, then localhost
  const baseCandidates = [
    process.env.NEXT_PUBLIC_URL || 'https://fc-footy.vercel.app',
    'http://localhost:3000',
  ];

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
 * Fetch username from Merv Hub by FID
 */
async function fetchUsernameByFid(fid) {
  try {
    const server = "https://hub.merv.fun";
    const response = await axios.get(`${server}/v1/userDataByFid?fid=${fid}`);
    
    const messages = response.data.messages || [];
    for (const message of messages) {
      if (message.data?.userDataBody?.type === 'USER_DATA_TYPE_USERNAME') {
        return message.data.userDataBody.value.toLowerCase();
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching username for fid ${fid}:`, error.message);
    return null;
  }
}

/**
 * Get managers with FIDs and usernames from Merv Hub
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
 * Generate and upload infographic to IPFS
 */
async function generateAndUploadInfographic(fplData, gameWeek) {
  try {
    console.log('🎨 Generating enhanced infographic...');
    
    // Prepare data for infographic
    const sortedByTotal = [...fplData].sort((a, b) => b.total - a.total);
    const sortedByEventTotal = [...fplData].sort((a, b) => b.event_total - a.event_total);
    
    const top3 = sortedByTotal.slice(0, 3);
    const bottom3 = sortedByTotal.slice(-3).reverse();
    const weekWinners = sortedByEventTotal.slice(0, 3);
    
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
        console.log(`🎨 [infographic] Trying ${url}`);
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
            gameWeek
          })
        });

        if (!response.ok) {
          console.log(`🎨 [infographic] Non-OK status: ${response.status}`);
          continue;
        }

        const htmlContent = await response.text();
        console.log(`💾 [infographic] HTML received, length: ${htmlContent.length}`);
        
        // Convert HTML to PNG using a headless browser approach
        // For now, we'll use a simple approach: save HTML and use a browser automation tool
        const fs = await import('fs');
        const path = await import('path');
        const htmlPath = path.join(process.cwd(), `temp-gameweek-${gameWeek}-summary.html`);
        fs.writeFileSync(htmlPath, htmlContent);
        
        console.log(`💾 [infographic] HTML saved to: ${htmlPath}`);
        console.log('📝 [infographic] Converting HTML to PNG...');
        
        // For production, you would use Puppeteer or similar to convert HTML to PNG
        // For now, we'll create a simple PNG using Node.js canvas or similar
        // Let's try to use the existing upload endpoint with a generated PNG
        
        // Create a simple PNG using canvas (if available) or use a placeholder
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
          ctx.fillText(`Game Week ${gameWeek} Summary`, 500, 80);
          
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
          console.log(`📸 [infographic] PNG generated, size: ${pngBuffer.length} bytes`);
          
          // Upload PNG to IPFS
          console.log('📤 [infographic] Uploading PNG to IPFS...');
          const uploadResponse = await fetch(`${baseUrl}/api/upload`, {
            method: 'POST',
            body: pngBuffer,
            headers: {
              'Content-Type': 'image/png'
            }
          });
          
          if (!uploadResponse.ok) {
            console.log(`📤 [infographic] Upload failed: ${uploadResponse.status}`);
            continue;
          }
          
          const uploadResult = await uploadResponse.json();
          const publicUrl = uploadResult.publicUrl;
          
          if (publicUrl) {
            infographicUrl = publicUrl;
            console.log(`✅ [infographic] Uploaded to QStorage: ${infographicUrl}`);
            break;
          }
          
        } catch (canvasError) {
          console.log(`📸 [infographic] Canvas not available, using fallback: ${canvasError.message}`);
          // Fallback: create a simple text-based image or use a placeholder
          infographicUrl = 'https://via.placeholder.com/1000x600/1a1a1a/ffffff?text=Game+Week+Summary';
          console.log(`📸 [infographic] Using fallback URL: ${infographicUrl}`);
          break;
        }
        
      } catch (e) {
        console.log(`🎨 [infographic] Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return infographicUrl;
  } catch (error) {
    console.error('❌ Failed to generate infographic:', error.message);
    return null;
  }
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
 * Post cast to Farcaster
 */
async function postCast(text) {
  try {
    console.log('🔄 Posting cast to Farcaster...');
    
    const cast = await neynarClient.publishCast(SIGNER_UUID, text, {
      channelId: 'football'
    });
    
    console.log('✅ Cast posted successfully!');
    console.log(`🔗 Cast hash: ${cast.hash}`);
    console.log(`🌐 View on Warpcast: https://warpcast.com/~/cast/${cast.hash}`);
    return cast;
  } catch (error) {
    console.error('❌ Failed to post cast:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Game Week Summary Script...\n');
    
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
    
    // Generate infographic
    const infographicUrl = await generateAndUploadInfographic(managersWithFIDs, 1); // Pass gameWeek
    
    // Generate cast text
    const castText = generateCastText(top5, bottom5, infographicUrl);
    
    console.log('\n📝 Generated Cast Text:');
    console.log('─'.repeat(50));
    console.log(castText);
    console.log('─'.repeat(50));
    
    // Post cast
    await postCast(castText);
    
    console.log('\n🎉 Game Week Summary completed successfully!');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
