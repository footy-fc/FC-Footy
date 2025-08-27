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
 * Make RPC call to Base
 */
async function makeRpcCall(method, params) {
  try {
    const response = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: 1
      })
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
    console.error(`❌ RPC call failed: ${error.message}`);
    throw error;
  }
}

/**
 * Call contract method
 */
async function callContract(to, data) {
  const result = await makeRpcCall('eth_call', [{
    to: to,
    data: data
  }, 'latest']);
  return result;
}

/**
 * Calculate metadata for buyback hook configuration
 */
function calculateBuybackMetadata() {
  let metadata = 0n;
  
  // Set useDataHookForPay = true (bit 80)
  metadata |= (1n << 80n);
  
  // Set useDataHookForCashOut = true (bit 81)
  metadata |= (1n << 81n);
  
  // Set dataHook address (bits 82-241)
  const hookAddress = BigInt(JB_CONTRACTS.JBBuybackHook);
  metadata |= (hookAddress << 82n);
  
  // Set other flags for proper project operation
  metadata |= (1n << 70n); // allowOwnerMinting
  metadata |= (1n << 79n); // useTotalSurplusForCashOuts
  
  return metadata;
}

/**
 * Check current project controller
 */
async function getProjectController() {
  try {
    // controllerOf(uint256 projectId) - function selector: 0x439fab91
    const data = `0x439fab91${PROJECT_ID.toString(16).padStart(64, '0')}`;
    const result = await callContract(JB_CONTRACTS.JBProjects, data);
    
    if (result && result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return `0x${result.slice(-40)}`;
    }
    return null;
  } catch (error) {
    console.log(`❌ Error getting project controller: ${error.message}`);
    return null;
  }
}

/**
 * Check current ruleset
 */
async function getCurrentRuleset() {
  try {
    // rulesetIdOf(uint256 projectId) - function selector: 0x8c1d8f1f
    const data = `0x8c1d8f1f${PROJECT_ID.toString(16).padStart(64, '0')}`;
    const result = await callContract(JB_CONTRACTS.JBRulesets, data);
    
    if (result && result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return BigInt(result);
    }
    return null;
  } catch (error) {
    console.log(`❌ Error getting current ruleset: ${error.message}`);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔧 Buyback Hook Activation Guide');
  console.log('=' .repeat(50));
  console.log(`📊 Project ID: ${PROJECT_ID}`);
  console.log(`⛓️  Chain ID: ${CHAIN_ID} (Base)`);
  console.log(`🔧 JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
  console.log('');

  try {
    // Get project controller
    console.log('🔍 Checking project controller...');
    const controller = await getProjectController();
    
    if (controller) {
      console.log(`✅ Project Controller: ${controller}`);
    } else {
      console.log('❌ Could not determine project controller');
      return;
    }

    // Get current ruleset
    console.log('\n🔍 Checking current ruleset...');
    const currentRuleset = await getCurrentRuleset();
    
    if (currentRuleset) {
      console.log(`✅ Current Ruleset ID: ${currentRuleset}`);
    } else {
      console.log('❌ Could not determine current ruleset');
      return;
    }

    // Calculate new metadata
    console.log('\n🔧 Calculating buyback metadata...');
    const newMetadata = calculateBuybackMetadata();
    console.log(`✅ New Metadata: ${newMetadata}`);
    console.log(`✅ New Metadata (hex): 0x${newMetadata.toString(16)}`);

    // Display activation instructions
    console.log('\n🛠️  ACTIVATION INSTRUCTIONS');
    console.log('=' .repeat(50));
    
    console.log('📋 Step 1: Queue New Ruleset');
    console.log('Contract: ' + JB_CONTRACTS.JBRulesets);
    console.log('Method: queueFor(uint256,uint256,uint256,uint256,address,uint256,uint256)');
    console.log('Function Selector: 0x8c1d8f1f');
    console.log('');
    
    console.log('Parameters:');
    console.log(`  • projectId: ${PROJECT_ID}`);
    console.log(`  • duration: 0 (no duration)`);
    console.log(`  • weight: 1000000000000000000 (1.0 in wei)`);
    console.log(`  • weightCutPercent: 0`);
    console.log(`  • approvalHook: 0x0000000000000000000000000000000000000000`);
    console.log(`  • metadata: ${newMetadata}`);
    console.log(`  • mustStartAtOrAfter: 0`);
    console.log('');
    
    console.log('Transaction Data:');
    const txData = '0x8c1d8f1f' + 
      PROJECT_ID.toString(16).padStart(64, '0') + // projectId
      '0'.padStart(64, '0') + // duration
      '0000000000000000000000000000000000000000000000000de0b6b3a7640000' + // weight (1e18)
      '0'.padStart(64, '0') + // weightCutPercent
      '0000000000000000000000000000000000000000000000000000000000000000' + // approvalHook
      newMetadata.toString(16).padStart(64, '0') + // metadata
      '0'.padStart(64, '0'); // mustStartAtOrAfter
    
    console.log(`Data: ${txData}`);
    console.log('');
    
    console.log('📋 Step 2: Set Pool for Buyback Hook');
    console.log('Contract: ' + JB_CONTRACTS.JBBuybackHook);
    console.log('Method: setPoolFor(uint256,uint24,uint16,uint16,address)');
    console.log('Function Selector: 0x8d1fdf2f');
    console.log('');
    
    console.log('Parameters:');
    console.log(`  • projectId: ${PROJECT_ID}`);
    console.log(`  • fee: 500 (0.05% fee tier)`);
    console.log(`  • twapWindow: 1800 (30 minutes)`);
    console.log(`  • twapSlippageTolerance: 1000 (10%)`);
    console.log(`  • terminalToken: 0x4200000000000000000000000000000000000006 (WETH)`);
    console.log('');
    
    console.log('📋 Step 3: Execute Transactions');
    console.log('1. Sign the queueFor transaction with the project controller private key');
    console.log('2. Wait for the transaction to be confirmed');
    console.log('3. Sign the setPoolFor transaction with the project controller private key');
    console.log('4. The buyback hook will now be active for all future payments');
    console.log('');
    
    console.log('⚠️  IMPORTANT NOTES:');
    console.log('• Only the project controller can execute these transactions');
    console.log('• The buyback hook will only work with WETH as the terminal token');
    console.log('• Make sure you have a Uniswap V3 pool configured for SCORES/WETH');
    console.log('• The pool should have sufficient liquidity for the buyback to work');
    console.log('');
    
    console.log('🔗 Useful Links:');
    console.log(`• Project Controller: https://basescan.org/address/${controller}`);
    console.log(`• JBRulesets Contract: https://basescan.org/address/${JB_CONTRACTS.JBRulesets}`);
    console.log(`• JBBuybackHook Contract: https://basescan.org/address/${JB_CONTRACTS.JBBuybackHook}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
