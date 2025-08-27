#!/usr/bin/env node

import fetch from 'node-fetch';

// Uniswap V3 GraphQL endpoint for Base
const UNISWAP_BASE_ENDPOINT = "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1";

// SCORES token address on Base
const SCORES_TOKEN_ADDRESS = "0x6147b9AB63496aCE7f3D270F8222e09038FD0870";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

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

/**
 * Fetch Uniswap pools for SCORES token
 */
async function fetchUniswapPools(token0, token1, apiKey) {
  try {
    console.log(`🔍 Checking Uniswap V3 pools for ${token0} and ${token1}...`);
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
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
 * Fetch token information
 */
async function fetchTokenInfo(tokenAddress, apiKey) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
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
function analyzeBuybackReadiness(pools) {
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
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const apiKey = args[0];
  
  if (!apiKey) {
    console.log('❌ Usage: node scripts/check-uniswap-pools-with-key.mjs <YOUR_GRAPH_API_KEY>');
    console.log('   Example: node scripts/check-uniswap-pools-with-key.mjs your_api_key_here');
    process.exit(1);
  }

  console.log('🏊 Uniswap V3 Pool Check for SCORES Token');
  console.log('=' .repeat(50));
  console.log(`🪙 SCORES Token: ${SCORES_TOKEN_ADDRESS}`);
  console.log(`🪙 WETH Token: ${WETH_ADDRESS}`);
  console.log(`⛓️  Network: Base (8453)`);
  console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);
  console.log('');

  try {
    // Fetch token information
    const scoresToken = await fetchTokenInfo(SCORES_TOKEN_ADDRESS, apiKey);
    const wethToken = await fetchTokenInfo(WETH_ADDRESS, apiKey);
    
    displayTokenInfo(scoresToken, 'SCORES');
    displayTokenInfo(wethToken, 'WETH');
    
    // Fetch pools
    const pools = await fetchUniswapPools(SCORES_TOKEN_ADDRESS, WETH_ADDRESS, apiKey);
    displayPoolInfo(pools);
    
    // Analyze buyback readiness
    analyzeBuybackReadiness(pools);
    
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

