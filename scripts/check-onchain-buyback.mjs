import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Juicebox V4 contract addresses for Base
const JB_CONTRACTS = {
  JBBuybackHook: "0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b",
  JBMultiTerminal: "0xdb9644369c79c3633cde70d2df50d827d7dc7dbc",
  JBPermissions: "0xf5ca295dc286a176e35ebb7833031fd95550eb14",
  JBProjects: "0x0b538a02610d7d3cc91ce2870f423e0a34d646ad",
  JBRulesets: "0xda86eedb67c6c9fb3e58fe83efa28674d7c89826"
};

// Project details
const PROJECT_ID = 53;
const CHAIN_ID = 8453; // Base

// Base RPC URL
const BASE_RPC_URL = "https://mainnet.base.org";

/**
 * Decode ruleset metadata
 */
function decodeRulesetMetadata(metadata) {
  if (!metadata) return null;
  
  const packed = BigInt(metadata);
  
  return {
    reservedPercent: Number((packed >> 4n) & ((1n << 16n) - 1n)),
    cashOutTaxRate: Number((packed >> 20n) & ((1n << 16n) - 1n)),
    baseCurrency: Number((packed >> 36n) & ((1n << 32n) - 1n)),
    pausePay: Boolean((packed >> 68n) & 1n),
    pauseCreditTransfers: Boolean((packed >> 69n) & 1n),
    allowOwnerMinting: Boolean((packed >> 70n) & 1n),
    allowSetCustomToken: Boolean((packed >> 71n) & 1n),
    allowTerminalMigration: Boolean((packed >> 72n) & 1n),
    allowSetTerminals: Boolean((packed >> 73n) & 1n),
    allowSetController: Boolean((packed >> 74n) & 1n),
    allowAddAccountingContext: Boolean((packed >> 75n) & 1n),
    allowAddPriceFeed: Boolean((packed >> 76n) & 1n),
    ownerMustSendPayouts: Boolean((packed >> 77n) & 1n),
    holdFees: Boolean((packed >> 78n) & 1n),
    useTotalSurplusForCashOuts: Boolean((packed >> 79n) & 1n),
    useDataHookForPay: Boolean((packed >> 80n) & 1n),
    useDataHookForCashOut: Boolean((packed >> 81n) & 1n),
    dataHook: `0x${((packed >> 82n) & ((1n << 160n) - 1n)).toString(16).padStart(40, "0")}`,
    metadata: Number((packed >> 242n) & ((1n << 14n) - 1n))
  };
}

/**
 * Make RPC call to Base
 */
async function makeRpcCall(method, params) {
  try {
    const response = await fetch(BASE_RPC_URL, {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`RPC error: ${result.error.message}`);
    }

    return result.result;
  } catch (error) {
    console.error('❌ RPC call failed:', error.message);
    throw error;
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
 * Check JBBuybackHook pool configuration
 */
async function checkBuybackHookPool() {
  console.log(`\n🔄 Checking JBBuybackHook Pool Configuration`);
  console.log('=' .repeat(80));
  
  console.log(`📋 Contract: ${JB_CONTRACTS.JBBuybackHook}`);
  
  try {
    // Check if there's a pool configured for this project
    // poolOf(uint256 projectId, address terminalToken) - function selector: 0x8d1fdf2f
    const wethAddress = "0x4200000000000000000000000000000000000006";
    const data = `0x8d1fdf2f${PROJECT_ID.toString(16).padStart(64, '0')}${wethAddress.replace('0x', '').padStart(64, '0')}`;
    
    const result = await callContract(JB_CONTRACTS.JBBuybackHook, data);
    
    if (result && result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      const poolAddress = `0x${result.slice(-40)}`;
      console.log(`✅ Pool configured for project ${PROJECT_ID}:`);
      console.log(`   • Pool Address: ${poolAddress}`);
      console.log(`   • Terminal Token: ${wethAddress} (WETH)`);
      
      // Check if this pool exists
      const poolCode = await makeRpcCall('eth_getCode', [poolAddress, 'latest']);
      if (poolCode && poolCode !== '0x' && poolCode !== '0x0') {
        console.log(`   • ✅ Pool contract exists`);
        
        // Try to get pool tokens
        try {
          // token0() - function selector: 0x0dfe1681
          const token0Data = "0x0dfe1681";
          const token0Result = await callContract(poolAddress, token0Data);
          const token0 = `0x${token0Result.slice(-40)}`;
          
          // token1() - function selector: 0xd21220a7
          const token1Data = "0xd21220a7";
          const token1Result = await callContract(poolAddress, token1Data);
          const token1 = `0x${token1Result.slice(-40)}`;
          
          console.log(`   • Token0: ${token0}`);
          console.log(`   • Token1: ${token1}`);
          
          const scoresToken = "0xBa1aFff81A239c926446a67D73F73eC51C37c777";
          if (token0.toLowerCase() === scoresToken.toLowerCase() || token1.toLowerCase() === scoresToken.toLowerCase()) {
            console.log(`   • ✅ Pool contains SCORES token`);
          } else {
            console.log(`   • ⚠️  Pool does not contain SCORES token`);
          }
          
          if (token0.toLowerCase() === wethAddress.toLowerCase() || token1.toLowerCase() === wethAddress.toLowerCase()) {
            console.log(`   • ✅ Pool contains WETH token`);
          } else {
            console.log(`   • ⚠️  Pool does not contain WETH token`);
          }
          
        } catch (tokenError) {
          console.log(`   • ⚠️  Could not get pool tokens: ${tokenError.message}`);
        }
        
      } else {
        console.log(`   • ❌ Pool contract does not exist`);
      }
      
    } else {
      console.log(`❌ No pool configured for project ${PROJECT_ID}`);
      console.log(`   • Terminal Token: ${wethAddress} (WETH)`);
    }
    
  } catch (error) {
    console.log(`⚠️  Error checking buyback hook pool: ${error.message}`);
  }
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Check if buyback hook is configured
 */
function checkBuybackConfiguration(metadata) {
  console.log(`\n🔍 Buyback Hook Configuration Check`);
  console.log('=' .repeat(80));
  
  if (!metadata) {
    console.log('❌ No metadata found');
    return false;
  }
  
  console.log(`📊 Raw Metadata: ${metadata}`);
  
  const decoded = decodeRulesetMetadata(metadata);
  if (decoded) {
    console.log(`\n🔍 Decoded Metadata:`);
    console.log(`   • Reserved Percent: ${decoded.reservedPercent}%`);
    console.log(`   • Cash Out Tax Rate: ${decoded.cashOutTaxRate}%`);
    console.log(`   • Base Currency: ${decoded.baseCurrency}`);
    console.log(`   • Pause Pay: ${decoded.pausePay}`);
    console.log(`   • Pause Credit Transfers: ${decoded.pauseCreditTransfers}`);
    console.log(`   • Allow Owner Minting: ${decoded.allowOwnerMinting}`);
    console.log(`   • Allow Set Custom Token: ${decoded.allowSetCustomToken}`);
    console.log(`   • Allow Terminal Migration: ${decoded.allowTerminalMigration}`);
    console.log(`   • Allow Set Terminals: ${decoded.allowSetTerminals}`);
    console.log(`   • Allow Set Controller: ${decoded.allowSetController}`);
    console.log(`   • Allow Add Accounting Context: ${decoded.allowAddAccountingContext}`);
    console.log(`   • Allow Add Price Feed: ${decoded.allowAddPriceFeed}`);
    console.log(`   • Owner Must Send Payouts: ${decoded.ownerMustSendPayouts}`);
    console.log(`   • Hold Fees: ${decoded.holdFees}`);
    console.log(`   • Use Total Surplus For Cash Outs: ${decoded.useTotalSurplusForCashOuts}`);
    console.log(`   • Use Data Hook For Pay: ${decoded.useDataHookForPay} ⭐`);
    console.log(`   • Use Data Hook For Cash Out: ${decoded.useDataHookForCashOut}`);
    console.log(`   • Data Hook: ${decoded.dataHook}`);
    console.log(`   • Metadata: ${decoded.metadata}`);
    
    // Check if buyback hook is configured
    if (decoded.useDataHookForPay && decoded.dataHook !== "0x0000000000000000000000000000000000000000") {
      console.log(`\n✅ BUYBACK HOOK CONFIGURED!`);
      console.log(`   • Data Hook: ${decoded.dataHook}`);
      
      if (decoded.dataHook.toLowerCase() === JB_CONTRACTS.JBBuybackHook.toLowerCase()) {
        console.log(`   • ✅ Matches JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
        return true;
      } else {
        console.log(`   • ⚠️  Different from JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
        console.log(`   • Current hook: ${decoded.dataHook}`);
        return false;
      }
    } else {
      console.log(`\n❌ No buyback hook configured`);
      console.log(`   • Use Data Hook For Pay: ${decoded.useDataHookForPay}`);
      console.log(`   • Data Hook: ${decoded.dataHook}`);
      return false;
    }
  }
  
  return false;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const projectId = parseInt(args[0]) || PROJECT_ID;
  const chainId = parseInt(args[1]) || CHAIN_ID;

  console.log('🔍 On-Chain Buyback Configuration Check');
  console.log('=' .repeat(50));
  console.log(`📊 Project ID: ${projectId}`);
  console.log(`⛓️  Chain ID: ${chainId} (Base)`);
  console.log(`🔧 JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
  console.log(`🔗 RPC URL: ${BASE_RPC_URL}`);
  console.log('');

  try {
    // Check buyback hook pool configuration (this is more reliable)
    await checkBuybackHookPool();
    
    // Summary
    console.log(`\n📋 SUMMARY`);
    console.log('=' .repeat(80));
    
    console.log('🔍 Manual Check Instructions:');
    console.log('1. Go to: https://basescan.org/address/0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b#readContract');
    console.log('2. Find "poolOf" method');
    console.log('3. Call with projectId: 53, terminalToken: 0x4200000000000000000000000000000000000006');
    console.log('4. Check if a pool address is returned');
    console.log('5. If pool exists, check token0() and token1() to verify WETH/SCORES pair');
    
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

