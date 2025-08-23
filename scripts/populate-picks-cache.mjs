#!/usr/bin/env node

/**
 * Script to bulk populate KV cache with picks for multiple gameweeks
 * This ensures we have all picks data cached for analysis
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Import fantasy managers lookup
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fantasyManagersLookupPath = join(__dirname, '../src/data/fantasy-managers-lookup.json');
const fantasyManagersLookup = JSON.parse(readFileSync(fantasyManagersLookupPath, 'utf8'));

// Parse command line arguments
const args = process.argv.slice(2);
const startGameweek = parseInt(args[0]) || 1;
const endGameweek = parseInt(args[1]) || 38;
const forceRefresh = args.includes('--force') || args.includes('-f');
const incremental = args.includes('--incremental') || args.includes('-i');

// Validate gameweek range
if (startGameweek < 1 || endGameweek > 38 || startGameweek > endGameweek) {
  console.error('❌ Invalid gameweek range. Must be between 1-38 and start <= end');
  console.log('Usage: node scripts/populate-picks-cache.mjs [start] [end] [--force] [--incremental]');
  console.log('Examples:');
  console.log('  node scripts/populate-picks-cache.mjs 1 10        # Cache gameweeks 1-10');
  console.log('  node scripts/populate-picks-cache.mjs 15 20       # Cache gameweeks 15-20');
  console.log('  node scripts/populate-picks-cache.mjs 1 38 --force # Force refresh all gameweeks');
  console.log('  node scripts/populate-picks-cache.mjs --incremental # Only cache missing gameweeks');
  process.exit(1);
}

// Generate gameweeks array
const GAMEWEEKS_TO_POPULATE = Array.from({length: endGameweek - startGameweek + 1}, (_, i) => startGameweek + i);

async function checkExistingCache() {
  if (!incremental) return { existing: [], missing: GAMEWEEKS_TO_POPULATE };
  
  console.log('🔍 Checking existing cache...');
  const existing = [];
  const missing = [];
  
  // Check first manager for existing gameweeks
  const testManager = fantasyManagersLookup[0];
  if (testManager) {
    for (const gameweek of GAMEWEEKS_TO_POPULATE) {
      try {
        const response = await fetch(`${BASE_URL}/api/manager-picks?fid=${testManager.fid}&gameweek=${gameweek}`);
        if (response.ok) {
          const data = await response.json();
          if (data.picks && data.picks.length > 0) {
            existing.push(gameweek);
          } else {
            missing.push(gameweek);
          }
        } else {
          missing.push(gameweek);
        }
      } catch (error) {
        missing.push(gameweek);
      }
    }
  }
  
  console.log(`📊 Cache status: ${existing.length} existing, ${missing.length} missing gameweeks`);
  return { existing, missing };
}

async function populatePicksCache() {
  console.log('🚀 Starting bulk picks cache population...\n');
  console.log(`📅 Gameweek range: ${startGameweek}-${endGameweek} (${GAMEWEEKS_TO_POPULATE.length} gameweeks)`);
  console.log(`🔄 Mode: ${incremental ? 'Incremental' : 'Full'} ${forceRefresh ? '(Force refresh)' : ''}\n`);
  
  // Check existing cache if incremental mode
  const { existing, missing } = await checkExistingCache();
  const gameweeksToProcess = incremental ? missing : GAMEWEEKS_TO_POPULATE;
  
  if (gameweeksToProcess.length === 0) {
    console.log('✅ All requested gameweeks are already cached!');
    return;
  }
  
  console.log(`📊 Processing ${gameweeksToProcess.length} gameweeks: ${gameweeksToProcess.join(', ')}\n`);
  
  const managers = fantasyManagersLookup;
  console.log(`👥 Found ${managers.length} managers to process\n`);
  
  const results = {
    success: 0,
    failed: 0,
    errors: [],
    totalRequests: managers.length * gameweeksToProcess.length
  };
  
  // Track gameweek failures and availability
  const gameweekFailures = new Map(); // gameweek -> failure count
  const unavailableGameweeks = new Set(); // gameweeks that are confirmed unavailable
  const maxGameweekFailures = 2; // Stop processing a gameweek after 2 consecutive failures
  
  // Process managers in batches to avoid overwhelming the API
  const batchSize = 5;
  const batches = [];
  
  for (let i = 0; i < managers.length; i += batchSize) {
    batches.push(managers.slice(i, i + batchSize));
  }
  
  console.log(`📦 Processing ${batches.length} batches of ${batchSize} managers each\n`);
  
  let currentRequest = 0;
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} managers)...`);
    
    const batchPromises = batch.map(async (manager) => {
      const managerResults = {
        manager: manager.team_name,
        gameweeks: {
          success: 0,
          failed: 0,
          errors: []
        }
      };
      
      // Loop through each gameweek for this manager
      for (const gameweek of gameweeksToProcess) {
        // Skip if this gameweek is confirmed unavailable
        if (unavailableGameweeks.has(gameweek)) {
          console.log(`  ⏭️  Skipping GW${gameweek} for @${manager.team_name} - gameweek confirmed unavailable`);
          continue;
        }
        
        // Check if this gameweek should be skipped due to previous failures
        const gameweekFailureCount = gameweekFailures.get(gameweek) || 0;
        if (gameweekFailureCount >= maxGameweekFailures) {
          console.log(`  ⏭️  Skipping GW${gameweek} for @${manager.team_name} - gameweek has ${gameweekFailureCount} failures`);
          unavailableGameweeks.add(gameweek);
          continue;
        }
        
        currentRequest++;
        const progress = ((currentRequest / results.totalRequests) * 100).toFixed(1);
        
        try {
          console.log(`  📊 [${progress}%] Fetching picks for @${manager.team_name} (FID: ${manager.fid}) - GW${gameweek}...`);
          
          // Fetch picks for current gameweek
          const refreshParam = forceRefresh ? '&refresh=true' : '';
          const response = await fetch(`${BASE_URL}/api/manager-picks?fid=${manager.fid}&gameweek=${gameweek}${refreshParam}`);
          
          if (response.ok) {
            const picksData = await response.json();
            
            // Check if we got valid picks data
            if (picksData.picks && picksData.picks.length > 0) {
              console.log(`    ✅ Successfully cached ${picksData.picks.length} picks for GW${gameweek}`);
              managerResults.gameweeks.success++;
              results.success++;
              // Reset failure count for this gameweek on success
              gameweekFailures.delete(gameweek);
            } else {
              console.log(`    ⚠️  No picks data found for GW${gameweek}`);
              managerResults.gameweeks.failed++;
              results.failed++;
              managerResults.gameweeks.errors.push(`GW${gameweek}: No picks data`);
              // Increment failure count for this gameweek
              const currentFailures = gameweekFailures.get(gameweek) || 0;
              gameweekFailures.set(gameweek, currentFailures + 1);
              
              // If this is a 404 or similar error, mark gameweek as unavailable
              if (response.status === 404) {
                console.log(`    🚫 GW${gameweek} appears to be unavailable (404), marking as unavailable for all managers`);
                unavailableGameweeks.add(gameweek);
              }
            }
          } else {
            const errorText = await response.text();
            console.log(`    ❌ Failed to fetch picks for GW${gameweek}: ${response.status} - ${errorText}`);
            managerResults.gameweeks.failed++;
            results.failed++;
            // Increment failure count for this gameweek
            const currentFailures = gameweekFailures.get(gameweek) || 0;
            gameweekFailures.set(gameweek, currentFailures + 1);
            const error = `GW${gameweek}: ${response.status}: ${errorText}`;
            managerResults.gameweeks.errors.push(error);
            results.errors.push({ manager: manager.team_name, error });
            
            // If this is a 404 or similar error, mark gameweek as unavailable
            if (response.status === 404) {
              console.log(`    🚫 GW${gameweek} appears to be unavailable (404), marking as unavailable for all managers`);
              unavailableGameweeks.add(gameweek);
            }
          }
        } catch (error) {
          console.log(`    ❌ Error processing ${manager.team_name} GW${gameweek}: ${error.message}`);
          managerResults.gameweeks.failed++;
          results.failed++;
          // Increment failure count for this gameweek
          const currentFailures = gameweekFailures.get(gameweek) || 0;
          gameweekFailures.set(gameweek, currentFailures + 1);
          const errorMsg = `GW${gameweek}: ${error.message}`;
          managerResults.gameweeks.errors.push(errorMsg);
          results.errors.push({ manager: manager.team_name, error: errorMsg });
        }
        
        // Small delay between gameweek requests for the same manager
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return managerResults;
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Log batch summary
    const batchSuccess = batchResults.reduce((sum, r) => sum + r.gameweeks.success, 0);
    const batchFailed = batchResults.reduce((sum, r) => sum + r.gameweeks.failed, 0);
    console.log(`  📊 Batch ${batchIndex + 1} complete: ${batchSuccess} success, ${batchFailed} failed`);
    
    // Log unavailable gameweeks discovered in this batch
    if (unavailableGameweeks.size > 0) {
      const newlyUnavailable = Array.from(unavailableGameweeks).sort((a, b) => a - b);
      console.log(`  🚫 Unavailable gameweeks discovered: ${newlyUnavailable.join(', ')}`);
    }
    
    console.log('');
    
    // Add delay between batches to be respectful to the API
    if (batchIndex < batches.length - 1) {
      console.log('⏳ Waiting 3 seconds before next batch...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Final summary
  console.log('📊 FINAL RESULTS:');
  console.log('─'.repeat(50));
  console.log(`✅ Successful: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total processed: ${results.success + results.failed}`);
  console.log(`📈 Success rate: ${((results.success / (results.success + results.failed)) * 100).toFixed(1)}%`);
  
  if (unavailableGameweeks.size > 0) {
    const unavailableList = Array.from(unavailableGameweeks).sort((a, b) => a - b);
    console.log(`🚫 Unavailable gameweeks: ${unavailableList.join(', ')}`);
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    console.log('─'.repeat(50));
    results.errors.slice(0, 10).forEach(error => {
      console.log(`• ${error.manager}: ${error.error}`);
    });
    
    if (results.errors.length > 10) {
      console.log(`... and ${results.errors.length - 10} more errors`);
    }
  }
  
  // Test cache retrieval for a few gameweeks
  console.log('\n🧪 Testing cache retrieval...');
  const testManager = managers[0];
  if (testManager) {
    const testGameweeks = gameweeksToProcess.slice(0, 3); // Test first 3 gameweeks
    for (const gameweek of testGameweeks) {
      // Skip unavailable gameweeks in testing
      if (unavailableGameweeks.has(gameweek)) {
        console.log(`⏭️  Skipping cache test for GW${gameweek} - unavailable`);
        continue;
      }
      
      try {
        const testResponse = await fetch(`${BASE_URL}/api/manager-picks?fid=${testManager.fid}&gameweek=${gameweek}`);
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log(`✅ Cache test successful for ${testManager.team_name} GW${gameweek}: ${testData.picks?.length || 0} picks retrieved`);
        } else {
          console.log(`❌ Cache test failed for ${testManager.team_name} GW${gameweek}: ${testResponse.status}`);
        }
      } catch (error) {
        console.log(`❌ Cache test error for GW${gameweek}: ${error.message}`);
      }
    }
  }
  
  console.log('\n🎉 Cache population complete!');
}

// Run the population script
populatePicksCache().catch((err) => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
