import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Pool address
const POOL_ADDRESS = "0x3e06b10d12649b7f99543e0a7178003f0b53e988";

// Token addresses
const SCORES_TOKEN = "0xBa1aFff81A239C926446a67D73F73eC51C37c777";
const WETH_TOKEN = "0x4200000000000000000000000000000000000006";

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
      console.log(`🔗 Using RPC: ${rpcUrl}`);
      
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
 * Get pool tokens
 */
async function getPoolTokens() {
  console.log('🔍 Getting pool tokens...');
  
  try {
    // token0() - function selector: 0x0dfe1681
    const token0Data = "0x0dfe1681";
    const token0Result = await callContract(POOL_ADDRESS, token0Data);
    const token0 = `0x${token0Result.slice(-40)}`;
    
    // token1() - function selector: 0xd21220a7
    const token1Data = "0xd21220a7";
    const token1Result = await callContract(POOL_ADDRESS, token1Data);
    const token1 = `0x${token1Result.slice(-40)}`;
    
    console.log(`✅ Token0: ${token0}`);
    console.log(`✅ Token1: ${token1}`);
    
    return { token0, token1 };
  } catch (error) {
    console.log(`❌ Error getting pool tokens: ${error.message}`);
    return null;
  }
}

/**
 * Get pool fee
 */
async function getPoolFee() {
  console.log('🔍 Getting pool fee...');
  
  try {
    // fee() - function selector: 0xddca3f43
    const feeData = "0xddca3f43";
    const feeResult = await callContract(POOL_ADDRESS, feeData);
    const fee = BigInt(feeResult);
    
    console.log(`✅ Pool Fee: ${fee} (${Number(fee) / 10000}%)`);
    return fee;
  } catch (error) {
    console.log(`❌ Error getting pool fee: ${error.message}`);
    return null;
  }
}

/**
 * Get pool liquidity
 */
async function getPoolLiquidity() {
  console.log('🔍 Getting pool liquidity...');
  
  try {
    // liquidity() - function selector: 0x1a686502
    const liquidityData = "0x1a686502";
    const liquidityResult = await callContract(POOL_ADDRESS, liquidityData);
    const liquidity = BigInt(liquidityResult);
    
    console.log(`✅ Pool Liquidity: ${liquidity}`);
    return liquidity;
  } catch (error) {
    console.log(`❌ Error getting pool liquidity: ${error.message}`);
    return null;
  }
}

/**
 * Get pool slot0 (current price)
 */
async function getPoolSlot0() {
  console.log('🔍 Getting pool slot0 (current price)...');
  
  try {
    // slot0() - function selector: 0x3850c7bd
    const slot0Data = "0x3850c7bd";
    const slot0Result = await callContract(POOL_ADDRESS, slot0Data);
    
    // slot0 returns multiple values, we need to parse them
    // The first 32 bytes (64 chars) are the sqrtPriceX96
    const sqrtPriceX96 = BigInt(`0x${slot0Result.slice(2, 66)}`);
    
    console.log(`✅ SqrtPriceX96: ${sqrtPriceX96}`);
    return sqrtPriceX96;
  } catch (error) {
    console.log(`❌ Error getting pool slot0: ${error.message}`);
    return null;
  }
}

/**
 * Calculate price from sqrtPriceX96
 */
function calculatePrice(sqrtPriceX96, token0IsScores) {
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
 * Main function
 */
async function main() {
  console.log('🏊 SCORES/ETH Pool Price Check');
  console.log('=' .repeat(50));
  console.log(`📊 Pool Address: ${POOL_ADDRESS}`);
  console.log('');

  try {
    // Check if pool exists
    const poolCode = await makeRpcCall('eth_getCode', [POOL_ADDRESS, 'latest']);
    if (poolCode === '0x' || poolCode === '0x0') {
      console.log('❌ Pool contract does not exist at this address');
      return;
    }
    
    console.log('✅ Pool contract exists');
    console.log('');

    // Get pool tokens
    const tokens = await getPoolTokens();
    if (!tokens) {
      console.log('❌ Could not get pool tokens');
      return;
    }
    
    console.log('');

    // Get token symbols
    const token0Symbol = await getTokenSymbol(tokens.token0);
    const token1Symbol = await getTokenSymbol(tokens.token1);
    
    console.log(`📊 Token0 (${token0Symbol}): ${tokens.token0}`);
    console.log(`📊 Token1 (${token1Symbol}): ${tokens.token1}`);
    console.log('');

    // Check if this is the right pool
    const scoresToken = SCORES_TOKEN.toLowerCase();
    const wethToken = WETH_TOKEN.toLowerCase();
    
    const hasScores = tokens.token0.toLowerCase() === scoresToken || tokens.token1.toLowerCase() === scoresToken;
    const hasWeth = tokens.token0.toLowerCase() === wethToken || tokens.token1.toLowerCase() === wethToken;
    
    if (!hasScores || !hasWeth) {
      console.log('❌ This pool does not contain SCORES and WETH tokens');
      console.log(`   Expected SCORES: ${SCORES_TOKEN}`);
      console.log(`   Expected WETH: ${WETH_TOKEN}`);
      return;
    }
    
    console.log('✅ Pool contains SCORES and WETH tokens');
    console.log('');

    // Get pool fee
    const fee = await getPoolFee();
    console.log('');

    // Get pool liquidity
    const liquidity = await getPoolLiquidity();
    console.log('');

    // Get current price
    const sqrtPriceX96 = await getPoolSlot0();
    if (!sqrtPriceX96) {
      console.log('❌ Could not get current price');
      return;
    }
    
    console.log('');

    // Calculate price
    const token0IsScores = tokens.token0.toLowerCase() === scoresToken;
    const price = calculatePrice(sqrtPriceX96, token0IsScores);
    const formattedPrice = formatPrice(price, token0IsScores);
    
    console.log('📊 PRICE ANALYSIS');
    console.log('=' .repeat(50));
    console.log(`💰 Current Price: ${formattedPrice}`);
    console.log(`🏊 Pool Fee: ${fee ? `${Number(fee) / 10000}%` : 'Unknown'}`);
    console.log(`💧 Pool Liquidity: ${liquidity ? liquidity.toString() : 'Unknown'}`);
    console.log(`📈 Token Order: ${token0Symbol} / ${token1Symbol}`);
    
    if (liquidity && liquidity === 0n) {
      console.log('\n⚠️  WARNING: Pool has zero liquidity!');
      console.log('   • No trading can occur until liquidity is added');
      console.log('   • Price may not be accurate');
    }
    
    console.log('\n' + '=' .repeat(50));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
