import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BENDYSTRAW_API_KEY = process.env.BENDYSTRAW_API_KEY || "3ZHM6jJ6Dqpyjms9zfZQdR3o";
const BENDYSTRAW_BASE_URL = "https://bendystraw.xyz";

// Token addresses
const SCORES_TOKEN = "0xBa1aFff81A239c926446a67D73F73eC51C37c777";
const WETH_TOKEN = "0x4200000000000000000000000000000000000006";

// GraphQL query to get all pools for SCORES token
const SCORES_POOLS_QUERY = `
  query GetScoresPools($tokenAddress: String!, $limit: Int) {
    pools(
      limit: $limit,
      where: {
        or: [
          { token0: $tokenAddress },
          { token1: $tokenAddress }
        ]
      },
      orderBy: "totalValueLockedUSD",
      orderDirection: "desc"
    ) {
      items {
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
        totalValueLockedToken0
        totalValueLockedToken1
        volumeUSD
        volume
        txCount
        createdAtTimestamp
        createdAtBlockNumber
      }
    }
  }
`;

// GraphQL query to get pool positions
const POOL_POSITIONS_QUERY = `
  query GetPoolPositions($poolAddress: String!, $limit: Int) {
    positions(
      limit: $limit,
      where: { pool: $poolAddress },
      orderBy: "liquidity",
      orderDirection: "desc"
    ) {
      items {
        id
        owner
        liquidity
        depositedToken0
        depositedToken1
        withdrawnToken0
        withdrawnToken1
        collectedFeesToken0
        collectedFeesToken1
        tickLower
        tickUpper
        createdAtTimestamp
        createdAtBlockNumber
      }
    }
  }
`;

// GraphQL query to get recent swaps for a pool
const POOL_SWAPS_QUERY = `
  query GetPoolSwaps($poolAddress: String!, $limit: Int) {
    swaps(
      limit: $limit,
      where: { pool: $poolAddress },
      orderBy: "timestamp",
      orderDirection: "desc"
    ) {
      items {
        id
        timestamp
        pool {
          id
          token0 {
            symbol
          }
          token1 {
            symbol
          }
        }
        sender
        recipient
        amount0
        amount1
        amountUSD
        sqrtPriceX96
        tick
      }
    }
  }
`;

/**
 * Make GraphQL request to Bendystraw
 */
async function makeGraphQLRequest(query, variables = {}) {
  try {
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        variables: variables
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL error: ${result.errors[0].message}`);
    }

    return result.data;
  } catch (error) {
    console.error('❌ GraphQL request failed:', error.message);
    throw error;
  }
}

/**
 * Get all SCORES pools
 */
async function getScoresPools() {
  console.log('🔍 Fetching SCORES pools from GraphQL...');
  
  try {
    const data = await makeGraphQLRequest(SCORES_POOLS_QUERY, {
      tokenAddress: SCORES_TOKEN.toLowerCase(),
      limit: 50
    });
    
    return data.pools.items;
  } catch (error) {
    console.log(`❌ Error fetching SCORES pools: ${error.message}`);
    return [];
  }
}

/**
 * Get pool positions
 */
async function getPoolPositions(poolAddress) {
  try {
    const data = await makeGraphQLRequest(POOL_POSITIONS_QUERY, {
      poolAddress: poolAddress.toLowerCase(),
      limit: 20
    });
    
    return data.positions.items;
  } catch (error) {
    console.log(`❌ Error fetching pool positions: ${error.message}`);
    return [];
  }
}

/**
 * Get pool swaps
 */
async function getPoolSwaps(poolAddress) {
  try {
    const data = await makeGraphQLRequest(POOL_SWAPS_QUERY, {
      poolAddress: poolAddress.toLowerCase(),
      limit: 10
    });
    
    return data.swaps.items;
  } catch (error) {
    console.log(`❌ Error fetching pool swaps: ${error.message}`);
    return [];
  }
}

/**
 * Format liquidity for display
 */
function formatLiquidity(liquidity) {
  if (!liquidity) return '0';
  const num = Number(liquidity);
  if (num >= 1e18) {
    return `${(num / 1e18).toFixed(2)} (${num.toLocaleString()})`;
  }
  return num.toLocaleString();
}

/**
 * Format USD value
 */
function formatUSD(value) {
  if (!value) return '$0.00';
  const num = Number(value);
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get fee tier description
 */
function getFeeTierDescription(feeTier) {
  const feeMap = {
    100: '0.01%',
    500: '0.05%',
    3000: '0.3%',
    10000: '1%'
  };
  return feeMap[feeTier] || `${feeTier/10000}%`;
}

/**
 * Main function
 */
async function main() {
  console.log('🏊 SCORES Token Pool Analysis (GraphQL)');
  console.log('=' .repeat(50));
  console.log(`📊 SCORES Token: ${SCORES_TOKEN}`);
  console.log(`📊 WETH Token: ${WETH_TOKEN}`);
  console.log(`🔗 Bendystraw API: ${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`);
  console.log('');

  try {
    // Get all SCORES pools
    const pools = await getScoresPools();
    
    console.log('\n📊 POOL ANALYSIS RESULTS');
    console.log('=' .repeat(80));
    
    if (pools.length === 0) {
      console.log('❌ No SCORES pools found');
      return;
    }
    
    console.log(`✅ Found ${pools.length} SCORES pools:`);
    console.log('');
    
    // Process each pool
    for (let i = 0; i < pools.length; i++) {
      const pool = pools[i];
      const feeTier = getFeeTierDescription(pool.feeTier);
      
      console.log(`${i + 1}. Pool: ${pool.id}`);
      console.log(`   • Fee Tier: ${feeTier} (${pool.feeTier})`);
      console.log(`   • Liquidity: ${formatLiquidity(pool.liquidity)}`);
      console.log(`   • TVL USD: ${formatUSD(pool.totalValueLockedUSD)}`);
      console.log(`   • TVL Token0: ${formatLiquidity(pool.totalValueLockedToken0)} ${pool.token0.symbol}`);
      console.log(`   • TVL Token1: ${formatLiquidity(pool.totalValueLockedToken1)} ${pool.token1.symbol}`);
      console.log(`   • Volume USD: ${formatUSD(pool.volumeUSD)}`);
      console.log(`   • Transactions: ${pool.txCount || 0}`);
      console.log(`   • Created: ${new Date(pool.createdAtTimestamp * 1000).toISOString()}`);
      console.log(`   • Token Pair: ${pool.token0.symbol} / ${pool.token1.symbol}`);
      
      // Check if this is SCORES/WETH
      const isScoresWeth = (pool.token0.id.toLowerCase() === SCORES_TOKEN.toLowerCase() && 
                           pool.token1.id.toLowerCase() === WETH_TOKEN.toLowerCase()) ||
                          (pool.token1.id.toLowerCase() === SCORES_TOKEN.toLowerCase() && 
                           pool.token0.id.toLowerCase() === WETH_TOKEN.toLowerCase());
      
      if (isScoresWeth) {
        console.log(`   • ✅ SCORES/WETH Pair`);
      } else {
        console.log(`   • ⚠️  Other pair (not SCORES/WETH)`);
      }
      
      // Get positions for this pool
      console.log(`   • 🔍 Fetching positions...`);
      const positions = await getPoolPositions(pool.id);
      console.log(`   • Positions: ${positions.length} active positions`);
      
      if (positions.length > 0) {
        // Show top 3 positions by liquidity
        const topPositions = positions.slice(0, 3);
        console.log(`   • Top positions:`);
        for (let j = 0; j < topPositions.length; j++) {
          const pos = topPositions[j];
          console.log(`     ${j + 1}. ${pos.owner} - Liquidity: ${formatLiquidity(pos.liquidity)}`);
        }
      }
      
      // Get recent swaps
      console.log(`   • 🔍 Fetching recent swaps...`);
      const swaps = await getPoolSwaps(pool.id);
      console.log(`   • Recent swaps: ${swaps.length} in last 10`);
      
      if (swaps.length > 0) {
        const latestSwap = swaps[0];
        console.log(`   • Latest swap: ${formatUSD(latestSwap.amountUSD)} at ${new Date(latestSwap.timestamp * 1000).toISOString()}`);
      }
      
      console.log('');
    }
    
    // Summary
    console.log('📋 SUMMARY');
    console.log('=' .repeat(80));
    
    const scoresWethPools = pools.filter(pool => {
      return (pool.token0.id.toLowerCase() === SCORES_TOKEN.toLowerCase() && 
              pool.token1.id.toLowerCase() === WETH_TOKEN.toLowerCase()) ||
             (pool.token1.id.toLowerCase() === SCORES_TOKEN.toLowerCase() && 
              pool.token0.id.toLowerCase() === WETH_TOKEN.toLowerCase());
    });
    
    const totalTVL = pools.reduce((sum, pool) => sum + (Number(pool.totalValueLockedUSD) || 0), 0);
    const totalVolume = pools.reduce((sum, pool) => sum + (Number(pool.volumeUSD) || 0), 0);
    
    console.log(`📊 Total Pools Found: ${pools.length}`);
    console.log(`🎯 SCORES/WETH Pools: ${scoresWethPools.length}`);
    console.log(`💰 Total TVL: ${formatUSD(totalTVL)}`);
    console.log(`📈 Total Volume: ${formatUSD(totalVolume)}`);
    
    if (scoresWethPools.length > 0) {
      console.log('\n🏆 SCORES/WETH Pool Analysis:');
      scoresWethPools.forEach((pool, index) => {
        console.log(`   ${index + 1}. ${getFeeTierDescription(pool.feeTier)} fee - TVL: ${formatUSD(pool.totalValueLockedUSD)} - Volume: ${formatUSD(pool.volumeUSD)}`);
      });
    }
    
    console.log('\n' + '=' .repeat(80));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
