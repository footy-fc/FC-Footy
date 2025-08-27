#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Uniswap V3 GraphQL endpoint for Base (updated)
const UNISWAP_BASE_ENDPOINT = "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1";
const GRAPH_API_KEY = process.env.GRAPH_API_KEY || process.env.THEGRAPH_API_KEY || process.env.THE_GRAPH_API;

// SCORES token address on Base (corrected)
const SCORES_TOKEN_ADDRESS = "0xBa1aFff81A239C926446a67D73F73eC51C37c777"; // Correct SCORES address
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"; // WETH on Base

// GraphQL query to find pools with SCORES token
const POOL_QUERY = `
  query GetPools($token0: String!, $token1: String!) {
    pools(
      where: {
        or: [
          { token0: $token0, token1: $token1 },
          { token0: $token1, token1: $token0 }
        ]
      }
    ) {
      id
      token0 {
        id
        symbol
        decimals
      }
      token1 {
        id
        symbol
        decimals
      }
      feeTier
      liquidity
      totalValueLockedUSD
      volumeUSD
      createdAtTimestamp
    }
  }
`;

// GraphQL query to get token information
const TOKEN_QUERY = `
  query GetToken($tokenAddress: String!) {
    token(id: $tokenAddress) {
      id
      symbol
      name
      decimals
      totalSupply
      totalValueLockedUSD
      volumeUSD
    }
  }
`;

// GraphQL query to get specific pool information
const SPECIFIC_POOL_QUERY = `
  query GetPool($poolAddress: String!) {
    pool(id: $poolAddress) {
      id
      token0 {
        id
        symbol
        decimals
      }
      token1 {
        id
        symbol
        decimals
      }
      feeTier
      liquidity
      totalValueLockedUSD
      volumeUSD
      createdAtTimestamp
      token0Price
      token1Price
    }
  }
`;

/**
 * Fetch Uniswap pools for SCORES token
 */
async function fetchUniswapPools(token0, token1) {
  try {
    console.log(`🔍 Checking Uniswap V3 pools for ${token0} and ${token1}...`);
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (GRAPH_API_KEY) {
      headers['Authorization'] = `Bearer ${GRAPH_API_KEY}`;
    }
    
    const response = await fetch(UNISWAP_BASE_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: POOL_QUERY,
        variables: { token0, token1 }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.pools;
  } catch (error) {
    console.error('❌ Failed to fetch Uniswap pools:', error.message);
    throw error;
  }
}

/**
 * Fetch specific pool information
 */
async function fetchSpecificPool(poolAddress) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (GRAPH_API_KEY) {
      headers['Authorization'] = `Bearer ${GRAPH_API_KEY}`;
    }
    
    const response = await fetch(UNISWAP_BASE_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: SPECIFIC_POOL_QUERY,
        variables: { poolAddress }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.pool;
  } catch (error) {
    console.error('❌ Failed to fetch specific pool:', error.message);
    throw error;
  }
}

/**
 * Fetch token information
 */
async function fetchTokenInfo(tokenAddress) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (GRAPH_API_KEY) {
      headers['Authorization'] = `Bearer ${GRAPH_API_KEY}`;
    }
    
    const response = await fetch(UNISWAP_BASE_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: TOKEN_QUERY,
        variables: { tokenAddress }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.token;
  } catch (error) {
    console.error('❌ Failed to fetch token info:', error.message);
    throw error;
  }
}

/**
 * Display token information
 */
function displayTokenInfo(token, tokenName) {
  console.log(`\n🪙 ${tokenName} Token Information`);
  console.log('=' .repeat(80));
  
  if (!token) {
    console.log('❌ Token not found on Uniswap V3');
    return;
  }
  
  console.log(`✅ Symbol: ${token.symbol}`);
  console.log(`📝 Name: ${token.name}`);
  console.log(`🔢 Decimals: ${token.decimals}`);
  console.log(`💰 Total Supply: ${token.totalSupply}`);
  console.log(`💵 Total Value Locked: $${parseFloat(token.totalValueLockedUSD || 0).toFixed(2)}`);
  console.log(`📊 Volume (24h): $${parseFloat(token.volumeUSD || 0).toFixed(2)}`);
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Display specific pool information
 */
function displaySpecificPoolInfo(pool) {
  console.log(`\n🏊 Specific Pool Information`);
  console.log('=' .repeat(80));
  
  if (!pool) {
    console.log('❌ Pool not found');
    return;
  }

  console.log(`✅ Pool ID: ${pool.id}`);
  console.log(`🪙 Token Pair: ${pool.token0.symbol}/${pool.token1.symbol}`);
  console.log(`   • Token 0: ${pool.token0.id} (${pool.token0.symbol})`);
  console.log(`   • Token 1: ${pool.token1.id} (${pool.token1.symbol})`);
  console.log(`💰 Fee Tier: ${pool.feeTier} (${pool.feeTier / 10000}%)`);
  console.log(`💧 Liquidity: ${parseFloat(pool.liquidity).toLocaleString()}`);
  console.log(`💵 TVL: $${parseFloat(pool.totalValueLockedUSD || 0).toFixed(2)}`);
  console.log(`📊 Volume: $${parseFloat(pool.volumeUSD || 0).toFixed(2)}`);
  console.log(`📅 Created: ${new Date(pool.createdAtTimestamp * 1000).toISOString()}`);
  console.log(`📈 Token 0 Price: ${parseFloat(pool.token0Price || 0).toFixed(6)}`);
  console.log(`📉 Token 1 Price: ${parseFloat(pool.token1Price || 0).toFixed(6)}`);
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Display pool information
 */
function displayPoolInfo(pools) {
  console.log(`\n🏊 Uniswap V3 Pools`);
  console.log('=' .repeat(80));
  
  if (!pools || pools.length === 0) {
    console.log('❌ No pools found for SCORES/WETH pair');
    console.log('\n📝 This means you need to create a new pool for buyback operations');
    return;
  }

  console.log(`✅ Found ${pools.length} pool(s) for SCORES/WETH pair\n`);
  
  pools.forEach((pool, index) => {
    console.log(`Pool ${index + 1}:`);
    console.log(`   • Pool ID: ${pool.id}`);
    console.log(`   • Token Pair: ${pool.token0.symbol}/${pool.token1.symbol}`);
    console.log(`   • Fee Tier: ${pool.feeTier} (${pool.feeTier / 10000}%)`);
    console.log(`   • Liquidity: ${parseFloat(pool.liquidity).toLocaleString()}`);
    console.log(`   • TVL: $${parseFloat(pool.totalValueLockedUSD || 0).toFixed(2)}`);
    console.log(`   • Volume: $${parseFloat(pool.volumeUSD || 0).toFixed(2)}`);
    console.log(`   • Created: ${new Date(pool.createdAtTimestamp * 1000).toISOString()}`);
    console.log('');
  });
  
  console.log('='.repeat(80));
}

/**
 * Analyze buyback readiness
 */
function analyzeBuybackReadiness(pools, scoresToken, wethToken) {
  console.log(`\n🔄 Buyback Configuration Readiness`);
  console.log('=' .repeat(80));
  
  if (!pools || pools.length === 0) {
    console.log('❌ No Uniswap V3 pools found');
    console.log('\n🔧 Required Actions:');
    console.log('   1. Create Uniswap V3 pool for SCORES/WETH pair');
    console.log('   2. Seed pool with initial liquidity');
    console.log('   3. Configure buyback delegate in Juicebox');
    
    console.log('\n📋 Pool Creation Steps:');
    console.log('   1. Go to Uniswap V3 interface on Base');
    console.log('   2. Create new pool with SCORES and WETH');
    console.log('   3. Choose appropriate fee tier (0.05%, 0.3%, or 1%)');
    console.log('   4. Add initial liquidity');
    
    console.log('\n⚠️  Note:');
    console.log('   • Pool creation requires initial liquidity');
    console.log('   • Choose fee tier based on expected trading volume');
    console.log('   • Consider starting with 0.3% fee tier for moderate volume');
    
  } else {
    console.log('✅ Uniswap V3 pool(s) found');
    
    // Find the best pool for buyback
    const bestPool = pools.reduce((best, pool) => {
      const liquidity = parseFloat(pool.liquidity);
      const bestLiquidity = parseFloat(best.liquidity);
      return liquidity > bestLiquidity ? pool : best;
    });
    
    console.log(`\n🏆 Recommended Pool for Buyback:`);
    console.log(`   • Pool ID: ${bestPool.id}`);
    console.log(`   • Fee Tier: ${bestPool.feeTier} (${bestPool.feeTier / 10000}%)`);
    console.log(`   • Liquidity: ${parseFloat(bestPool.liquidity).toLocaleString()}`);
    console.log(`   • TVL: $${parseFloat(bestPool.totalValueLockedUSD || 0).toFixed(2)}`);
    
    console.log('\n🔧 Next Steps:');
    console.log('   1. Configure JBBuybackHook with pool address');
    console.log('   2. Update funding cycle with buyback delegate');
    console.log('   3. Test buyback functionality');
    
    console.log('\n📋 Buyback Configuration:');
    console.log(`   • Pool Address: ${bestPool.id}`);
    console.log(`   • Token 0: ${bestPool.token0.id} (${bestPool.token0.symbol})`);
    console.log(`   • Token 1: ${bestPool.token1.id} (${bestPool.token1.symbol})`);
    console.log(`   • Fee Tier: ${bestPool.feeTier}`);
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Display technical implementation guide
 */
function displayImplementationGuide(pools) {
  console.log(`\n📚 Technical Implementation Guide`);
  console.log('=' .repeat(80));
  
  if (!pools || pools.length === 0) {
    console.log('🔧 Step 1: Create Uniswap V3 Pool');
    console.log('   • Visit: https://app.uniswap.org/pools');
    console.log('   • Connect wallet to Base network');
    console.log('   • Click "Create Pool"');
    console.log('   • Select SCORES and WETH tokens');
    console.log('   • Choose fee tier (recommended: 0.3%)');
    console.log('   • Set initial price and add liquidity');
    
    console.log('\n🔧 Step 2: Configure Juicebox Buyback');
    console.log('   • Use JBBuybackHook: 0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b');
    console.log('   • Set pool address in buyback configuration');
    console.log('   • Configure buyback parameters (slippage, etc.)');
    
  } else {
    const bestPool = pools[0];
    console.log('🔧 Buyback Configuration Parameters:');
    console.log(`   • Pool Address: ${bestPool.id}`);
    console.log(`   • Fee Tier: ${bestPool.feeTier}`);
    console.log(`   • Token Order: ${bestPool.token0.symbol} (${bestPool.token0.id}) / ${bestPool.token1.symbol} (${bestPool.token1.id})`);
    
    console.log('\n🔧 Juicebox Integration:');
    console.log('   • JBBuybackHook: 0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b');
    console.log('   • Configure with pool address and parameters');
    console.log('   • Update funding cycle to use buyback delegate');
  }
  
  console.log('\n🔧 Permission Requirements:');
  console.log('   • Only accounts with permissions 17, 25, 6, 18, 30, 20, 21, 22, 23 can configure');
  console.log('   • Primary account: 0x027f1684c6d31066c3f2468117f2508e8134fdfc');
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Main function
 */
async function main() {
  console.log('🏊 Uniswap V3 Pool Check for SCORES Token');
  console.log('=' .repeat(50));
  console.log(`🪙 SCORES Token: ${SCORES_TOKEN_ADDRESS}`);
  console.log(`🪙 WETH Token: ${WETH_ADDRESS}`);
  console.log(`⛓️  Network: Base (8453)`);
  
  if (GRAPH_API_KEY) {
    console.log(`🔑 API Key: Available`);
  } else {
    console.log(`⚠️  API Key: Not found (set GRAPH_API_KEY or THEGRAPH_API_KEY env var)`);
  }
  console.log('');

  try {
    // Check if specific pool address is provided
    const args = process.argv.slice(2);
    const specificPoolAddress = args[0];
    
    if (specificPoolAddress) {
      console.log(`🔍 Checking specific pool: ${specificPoolAddress}`);
      
      // Fetch specific pool information
      const specificPool = await fetchSpecificPool(specificPoolAddress);
      displaySpecificPoolInfo(specificPool);
      
      // Analyze buyback readiness for this specific pool
      analyzeBuybackReadiness([specificPool], null, null);
      displayImplementationGuide([specificPool]);
      
    } else {
      // Fetch token information
      const scoresToken = await fetchTokenInfo(SCORES_TOKEN_ADDRESS);
      const wethToken = await fetchTokenInfo(WETH_ADDRESS);
      
      displayTokenInfo(scoresToken, 'SCORES');
      displayTokenInfo(wethToken, 'WETH');
      
      // Fetch pools
      const pools = await fetchUniswapPools(SCORES_TOKEN_ADDRESS, WETH_ADDRESS);
      displayPoolInfo(pools);
      
      // Analyze buyback readiness
      analyzeBuybackReadiness(pools, scoresToken, wethToken);
      
      // Display implementation guide
      displayImplementationGuide(pools);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fetchUniswapPools, fetchTokenInfo };
