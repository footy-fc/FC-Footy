#!/usr/bin/env node

/**
 * Script to monitor KV cache health and statistics for FPL picks
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function monitorPicksCache() {
  console.log('🔍 Monitoring FPL Picks Cache Health...\n');
  
  try {
    // Get cache statistics
    const response = await fetch(`${BASE_URL}/api/cache-stats`);
    
    if (response.ok) {
      const data = await response.json();
      
      console.log('📊 CACHE HEALTH SUMMARY:');
      console.log('─'.repeat(50));
      console.log(`Status: ${data.status}`);
      console.log(`Message: ${data.message}`);
      
      if (data.stats) {
        const stats = data.stats;
        
        console.log('\n📈 DETAILED STATISTICS:');
        console.log('─'.repeat(50));
        console.log(`Total Keys: ${stats.totalKeys}`);
        console.log(`Picks Data: ${stats.cacheHealth.picksData}`);
        console.log(`Metadata: ${stats.cacheHealth.metadata}`);
        console.log(`Manager Gameweek Entries: ${stats.cacheHealth.gameweeks}`);
        console.log(`Total Managers: ${stats.cacheHealth.totalManagers}`);
        console.log(`Avg Picks per Manager: ${stats.cacheHealth.averagePicksPerManager}`);
        console.log(`Gameweek Range: ${stats.cacheHealth.gameweekRange}`);
        console.log(`Max Gameweek Cached: ${stats.cacheHealth.maxGameweek}`);
        
        // Calculate coverage
        const expectedManagers = 145;
        const coverage = (stats.cacheHealth.totalManagers / expectedManagers) * 100;
        
        console.log('\n📊 CACHE COVERAGE:');
        console.log('─'.repeat(50));
        console.log(`Coverage: ${coverage.toFixed(1)}% (${stats.cacheHealth.totalManagers}/${expectedManagers} managers)`);
        
        // Sample keys
        if (stats.sampleKeys && stats.sampleKeys.length > 0) {
          console.log('\n🔑 SAMPLE CACHE KEYS:');
          console.log('─'.repeat(50));
          stats.sampleKeys.forEach((key, index) => {
            console.log(`${index + 1}. ${key}`);
          });
        }
      }
      
    } else {
      console.log('❌ Failed to get cache statistics');
    }
    
  } catch (error) {
    console.error('❌ Error monitoring cache:', error.message);
  }
}

// Run the monitoring script
monitorPicksCache().catch((err) => {
  console.error('❌ Script failed:', err.message);
  process.exit(1);
});
