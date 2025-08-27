import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Token addresses
const SCORES_TOKEN = "0xBa1aFff81A239C926446a67D73F73eC51C37c777";
const WETH_TOKEN = "0x4200000000000000000000000000000000000006";

// Uniswap V3 Factory on Base
const UNISWAP_V3_FACTORY = "0x33128a8fc17869897dce68ed026d694621f6fdfd";

// Base RPC URL - try different endpoints
const BASE_RPC_URLS = [
  "https://mainnet.base.org",
  "https://base.blockpi.network/v1/rpc/public",
  "https://1rpc.io/base",
  "https://base.meowrpc.com"
];

let currentRpcIndex = 0;

/**
 * Make RPC call to Base with retry logic
 */
async function makeRpcCall(method, params, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const rpcUrl = BASE_RPC_URLS[currentRpcIndex];
    
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: method,
          params: params
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.log(`⚠️  Rate limited by ${rpcUrl}, trying next endpoint...`);
          currentRpcIndex = (currentRpcIndex + 1) % BASE_RPC_URLS.length;
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`RPC error: ${result.error.message}`);
      }

      return result.result;
    } catch (error) {
      console.log(`❌ RPC call failed (attempt ${attempt + 1}): ${error.message}`);
      
      if (attempt === retries - 1) {
        throw error;
      }
      
      // Try next RPC endpoint
      currentRpcIndex = (currentRpcIndex + 1) % BASE_RPC_URLS.length;
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Call contract method
 */
async function callContract(to, data) {
  return await makeRpcCall('eth_call', [{
    to: to,
    data: data
  }, 'latest']);
}

/**
 * Get token symbol
 */
async function getTokenSymbol(tokenAddress) {
  try {
    // symbol() - function selector: 0x95d89b41
    const symbolData = "0x95d89b41";
    const symbolResult = await callContract(tokenAddress, symbolData);
    
    // Decode the string from hex
    const hexString = symbolResult.slice(2); // Remove '0x'
    let symbol = '';
    for (let i = 0; i < hexString.length; i += 2) {
      const charCode = parseInt(hexString.substr(i, 2), 16);
      if (charCode === 0) break; // Stop at null terminator
      symbol += String.fromCharCode(charCode);
    }
    
    return symbol;
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Get pool address from factory
 */
async function getPoolAddress(tokenA, tokenB, fee) {
  try {
    // getPool(address tokenA, address tokenB, uint24 fee) - function selector: 0x783cca1c
    const data = `0x783cca1c${tokenA.replace('0x', '').padStart(64, '0')}${tokenB.replace('0x', '').padStart(64, '0')}${fee.toString(16).padStart(64, '0')}`;
    const result = await callContract(UNISWAP_V3_FACTORY, data);
    
    if (result && result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return `0x${result.slice(-40)}`;
    }
    return null;
  } catch (error) {
    console.log(`❌ Error getting pool address: ${error.message}`);
    return null;
  }
}

/**
 * Get pool liquidity
 */
async function getPoolLiquidity(poolAddress) {
  try {
    // liquidity() - function selector: 0x1a686502
    const liquidityData = "0x1a686502";
    const liquidityResult = await callContract(poolAddress, liquidityData);
    return BigInt(liquidityResult);
  } catch (error) {
    return 0n;
  }
}

/**
 * Get pool fee
 */
async function getPoolFee(poolAddress) {
  try {
    // fee() - function selector: 0xddca3f43
    const feeData = "0xddca3f43";
    const feeResult = await callContract(poolAddress, feeData);
    return BigInt(feeResult);
  } catch (error) {
    return null;
  }
}

/**
 * Get pool tokens
 */
async function getPoolTokens(poolAddress) {
  try {
    // token0() - function selector: 0x0dfe1681
    const token0Data = "0x0dfe1681";
    const token0Result = await callContract(poolAddress, token0Data);
    const token0 = `0x${token0Result.slice(-40)}`;
    
    // token1() - function selector: 0xd21220a7
    const token1Data = "0xd21220a7";
    const token1Result = await callContract(poolAddress, token1Data);
    const token1 = `0x${token1Result.slice(-40)}`;
    
    return { token0, token1 };
  } catch (error) {
    return null;
  }
}

/**
 * Get pool slot0 (current price)
 */
async function getPoolSlot0(poolAddress) {
  try {
    // slot0() - function selector: 0x3850c7bd
    const slot0Data = "0x3850c7bd";
    const slot0Result = await callContract(poolAddress, slot0Data);
    
    // slot0 returns multiple values, we need to parse them
    // The first 32 bytes (64 chars) are the sqrtPriceX96
    const sqrtPriceX96 = BigInt(`0x${slot0Result.slice(2, 66)}`);
    return sqrtPriceX96;
  } catch (error) {
    return null;
  }
}

/**
 * Calculate price from sqrtPriceX96
 */
function calculatePrice(sqrtPriceX96, token0IsScores) {
  if (!sqrtPriceX96 || sqrtPriceX96 === 0n) return null;
  
  // Price = (sqrtPriceX96 / 2^96)^2
  const Q96 = 2n ** 96n;
  const price = (sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96);
  
  if (token0IsScores) {
    // If SCORES is token0, price is SCORES per WETH
    return price;
  } else {
    // If SCORES is token1, price is WETH per SCORES
    return (Q96 * Q96) / (sqrtPriceX96 * sqrtPriceX96);
  }
}

/**
 * Format price for display
 */
function formatPrice(price, token0IsScores) {
  if (!price) return 'No price data';
  
  const priceNumber = Number(price);
  
  if (token0IsScores) {
    // SCORES per WETH
    return `${priceNumber.toFixed(18)} SCORES per WETH`;
  } else {
    // WETH per SCORES
    return `${priceNumber.toFixed(18)} WETH per SCORES`;
  }
}

/**
 * Get all SCORES pools
 */
async function getAllScoresPools() {
  console.log('🔍 Finding all SCORES pools...');
  
  const feeTiers = [100, 500, 3000, 10000]; // 0.01%, 0.05%, 0.3%, 1%
  const pools = [];
  
  // Check SCORES/WETH pairs
  for (const fee of feeTiers) {
    console.log(`🔍 Checking SCORES/WETH pool with ${fee/10000}% fee...`);
    
    const poolAddress = await getPoolAddress(SCORES_TOKEN, WETH_TOKEN, fee);
    if (poolAddress) {
      console.log(`✅ Found pool: ${poolAddress}`);
      
      // Get pool details
      const tokens = await getPoolTokens(poolAddress);
      const liquidity = await getPoolLiquidity(poolAddress);
      const poolFee = await getPoolFee(poolAddress);
      const sqrtPriceX96 = await getPoolSlot0(poolAddress);
      
      if (tokens) {
        const token0IsScores = tokens.token0.toLowerCase() === SCORES_TOKEN.toLowerCase();
        const price = calculatePrice(sqrtPriceX96, token0IsScores);
        const formattedPrice = formatPrice(price, token0IsScores);
        
        pools.push({
          address: poolAddress,
          token0: tokens.token0,
          token1: tokens.token1,
          fee: poolFee,
          liquidity: liquidity,
          price: formattedPrice,
          token0IsScores: token0IsScores
        });
      }
    } else {
      console.log(`❌ No pool found for ${fee/10000}% fee`);
    }
  }
  
  return pools;
}

/**
 * Get pool positions (simplified - we'll get basic info)
 */
async function getPoolPositions(poolAddress) {
  console.log(`🔍 Getting positions for pool ${poolAddress}...`);
  
  // Note: Getting all positions requires complex queries
  // For now, we'll just check if the pool has any liquidity
  try {
    const liquidity = await getPoolLiquidity(poolAddress);
    return {
      totalLiquidity: liquidity,
      hasPositions: liquidity > 0n
    };
  } catch (error) {
    return {
      totalLiquidity: 0n,
      hasPositions: false
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🏊 SCORES Token Pool Analysis');
  console.log('=' .repeat(50));
  console.log(`📊 SCORES Token: ${SCORES_TOKEN}`);
  console.log(`📊 WETH Token: ${WETH_TOKEN}`);
  console.log(`🏭 Uniswap V3 Factory: ${UNISWAP_V3_FACTORY}`);
  console.log('');

  try {
    // Get all SCORES pools
    const pools = await getAllScoresPools();
    
    console.log('\n📊 POOL ANALYSIS RESULTS');
    console.log('=' .repeat(80));
    
    if (pools.length === 0) {
      console.log('❌ No SCORES pools found');
      return;
    }
    
    console.log(`✅ Found ${pools.length} SCORES pools:`);
    console.log('');
    
    // Sort pools by liquidity (highest first)
    pools.sort((a, b) => Number(b.liquidity - a.liquidity));
    
    for (let i = 0; i < pools.length; i++) {
      const pool = pools[i];
      const feePercent = Number(pool.fee) / 10000;
      
      console.log(`${i + 1}. Pool: ${pool.address}`);
      console.log(`   • Fee Tier: ${feePercent}% (${pool.fee})`);
      console.log(`   • Liquidity: ${pool.liquidity.toString()}`);
      console.log(`   • Price: ${pool.price}`);
      console.log(`   • Token Order: ${pool.token0} / ${pool.token1}`);
      console.log(`   • SCORES Position: ${pool.token0IsScores ? 'Token0' : 'Token1'}`);
      
      // Get position info
      const positions = await getPoolPositions(pool.address);
      console.log(`   • Has Positions: ${positions.hasPositions ? 'Yes' : 'No'}`);
      console.log(`   • Total Liquidity: ${positions.totalLiquidity.toString()}`);
      console.log('');
    }
    
    // Summary
    console.log('📋 SUMMARY');
    console.log('=' .repeat(80));
    
    const totalLiquidity = pools.reduce((sum, pool) => sum + pool.liquidity, 0n);
    const poolsWithLiquidity = pools.filter(pool => pool.liquidity > 0n);
    
    console.log(`📊 Total Pools Found: ${pools.length}`);
    console.log(`💧 Pools with Liquidity: ${poolsWithLiquidity.length}`);
    console.log(`💰 Total Liquidity: ${totalLiquidity.toString()}`);
    
    if (poolsWithLiquidity.length > 0) {
      console.log('\n🏆 Most Liquid Pool:');
      const mostLiquid = poolsWithLiquidity[0];
      console.log(`   • Address: ${mostLiquid.address}`);
      console.log(`   • Fee: ${Number(mostLiquid.fee) / 10000}%`);
      console.log(`   • Liquidity: ${mostLiquid.liquidity.toString()}`);
      console.log(`   • Price: ${mostLiquid.price}`);
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
