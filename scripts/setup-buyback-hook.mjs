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
const CURRENT_RULESET_ID = 1746995565;

// Uniswap pool details
const UNISWAP_POOL = "0xe3fbca95a921334a73dc523903d69189cb89e2cb";
const SCORES_TOKEN = "0xBa1aFff81A239C926446a67D73F73eC51C37c777";
const WETH = "0x4200000000000000000000000000000000000006";

// Base RPC URL
const BASE_RPC_URL = "https://mainnet.base.org";

console.log('🔄 Buyback Hook Setup for Uniswap V3 Pool');
console.log('=' .repeat(60));
console.log(`📊 Project ID: ${PROJECT_ID}`);
console.log(`⛓️  Chain ID: ${CHAIN_ID} (Base)`);
console.log(`🔧 Current Ruleset ID: ${CURRENT_RULESET_ID}`);
console.log(`🔧 JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
console.log(`🏊 Uniswap Pool: ${UNISWAP_POOL}`);
console.log(`🎯 SCORES Token: ${SCORES_TOKEN}`);
console.log(`💎 WETH: ${WETH}`);
console.log('');

/**
 * Make RPC call to Base
 */
async function makeRpcCall(method, params) {
  try {
    const response = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
 * Check if account has permission
 */
async function checkPermission(account, projectId, permissionId) {
  try {
    // hasPermission(address _account, uint256 _projectId, uint256 _permissionId, bool _includeRoot) - 0x4d2301cc
    const data = `0x4d2301cc${account.replace('0x', '').padStart(64, '0')}${projectId.toString(16).padStart(64, '0')}${permissionId.toString(16).padStart(64, '0')}01`;
    const result = await callContract(JB_CONTRACTS.JBPermissions, data);
    return result === '0x0000000000000000000000000000000000000000000000000000000000000001';
  } catch (error) {
    console.error('❌ Permission check failed:', error.message);
    return false;
  }
}

/**
 * Calculate metadata for buyback hook configuration
 */
function calculateBuybackMetadata() {
  // Start with base metadata
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
 * Check current buyback hook configuration
 */
async function checkCurrentBuybackConfig() {
  console.log('📋 Step 1: Check Current Configuration');
  console.log('=' .repeat(40));
  
  try {
    // Check if buyback hook is already configured for this project
    // poolFor(uint256 _projectId) - 0x8d1fdf2f
    const data = `0x8d1fdf2f${PROJECT_ID.toString(16).padStart(64, '0')}`;
    const result = await callContract(JB_CONTRACTS.JBBuybackHook, data);
    
    if (result && result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      const currentPool = `0x${result.slice(-40)}`;
      console.log(`✅ Buyback hook already configured`);
      console.log(`   • Current pool: ${currentPool}`);
      
      if (currentPool.toLowerCase() === UNISWAP_POOL.toLowerCase()) {
        console.log(`   • ✅ Already configured for correct pool!`);
        return true;
      } else {
        console.log(`   • ⚠️  Configured for different pool: ${currentPool}`);
        console.log(`   • Target pool: ${UNISWAP_POOL}`);
        return false;
      }
    } else {
      console.log(`❌ No buyback hook configured for project ${PROJECT_ID}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error checking current config: ${error.message}`);
    return false;
  }
}

/**
 * Check permissions
 */
async function checkPermissions() {
  console.log('\n📋 Step 2: Check Permissions');
  console.log('=' .repeat(40));
  
  const account = "0xdf087b724174a3e4ed2338c0798193932e851f1b";
  
  // Check key permissions
  const permissions = [
    { id: 1, name: "Queue Rulesets" },
    { id: 6, name: "Set Rulesets" },
    { id: 16, name: "Set Terminals" },
    { id: 17, name: "Set Controller" },
    { id: 18, name: "Set Project URI" },
    { id: 20, name: "Set Token" },
    { id: 21, name: "Set Metadata" },
    { id: 22, name: "Set Split Groups" },
    { id: 23, name: "Set Payment Terminals" },
    { id: 25, name: "Set Permissions" },
    { id: 30, name: "Set Data Hook" }
  ];
  
  console.log(`🔑 Checking permissions for: ${account}`);
  console.log('');
  
  let hasAllPermissions = true;
  
  for (const permission of permissions) {
    const hasPermission = await checkPermission(account, PROJECT_ID, permission.id);
    const status = hasPermission ? '✅' : '❌';
    console.log(`   ${status} ${permission.name} (ID: ${permission.id})`);
    
    if (!hasPermission) {
      hasAllPermissions = false;
    }
  }
  
  console.log('');
  if (hasAllPermissions) {
    console.log('✅ Account has all required permissions');
  } else {
    console.log('❌ Account missing some permissions');
    console.log('⚠️  You may need to grant additional permissions');
  }
  
  return hasAllPermissions;
}

/**
 * Display setup instructions
 */
function displaySetupInstructions() {
  console.log('\n📋 Step 3: Setup Instructions');
  console.log('=' .repeat(40));
  
  const newMetadata = calculateBuybackMetadata();
  
  console.log('🔧 BASESCAN CONFIGURATION');
  console.log('=' .repeat(30));
  
  console.log('📋 Step 3a: Queue New Ruleset');
  console.log('=' .repeat(25));
  console.log('🔧 Contract: JBRulesets');
  console.log('   Address: ' + JB_CONTRACTS.JBRulesets);
  console.log('   Method: queueFor');
  console.log('📝 Parameters:');
  console.log(`   • projectId: ${PROJECT_ID}`);
  console.log(`   • duration: 0 (no duration)`);
  console.log(`   • weight: 1000000000000000000 (1e18)`);
  console.log(`   • weightCutPercent: 0`);
  console.log(`   • approvalHook: 0x0000000000000000000000000000000000000000`);
  console.log(`   • metadata: ${newMetadata}`);
  console.log(`   • mustStartAtOrAfter: 0 (start immediately)`);
  console.log('');
  
  console.log('📋 Step 3b: Configure Buyback Hook');
  console.log('=' .repeat(25));
  console.log('🔧 Contract: JBBuybackHook');
  console.log('   Address: ' + JB_CONTRACTS.JBBuybackHook);
  console.log('   Method: setPoolFor');
  console.log('📝 Parameters:');
  console.log(`   • _projectId: ${PROJECT_ID}`);
  console.log(`   • _pool: ${UNISWAP_POOL}`);
  console.log('');
  
  console.log('📋 Step 3c: Verify Configuration');
  console.log('=' .repeat(25));
  console.log('🔍 Check Juicebox Interface:');
  console.log('   • Go to: https://juicebox.money/v4/p/53');
  console.log('   • Connect wallet: 0xdf087b724174a3e4ed2338c0798193932e851f1b');
  console.log('   • Check "Funding cycle" tab');
  console.log('   • Verify "Data hook" shows: ' + JB_CONTRACTS.JBBuybackHook);
  console.log('');
  
  console.log('🔍 Check Buyback Hook:');
  console.log('   • Go to: https://basescan.org/address/' + JB_CONTRACTS.JBBuybackHook);
  console.log('   • Call "poolFor" with projectId: ' + PROJECT_ID);
  console.log('   • Should return: ' + UNISWAP_POOL);
  console.log('');
}

/**
 * Display transaction data
 */
function displayTransactionData() {
  console.log('\n📋 Step 4: Transaction Data');
  console.log('=' .repeat(40));
  
  const newMetadata = calculateBuybackMetadata();
  
  // Queue ruleset transaction
  console.log('🔧 Queue Ruleset Transaction');
  console.log('=' .repeat(30));
  console.log('Contract: ' + JB_CONTRACTS.JBRulesets);
  console.log('Method: queueFor(uint256,uint256,uint256,uint256,address,uint256,uint256)');
  console.log('Function Selector: 0x8c1d8f1f');
  console.log('Data: 0x8c1d8f1f' + 
    PROJECT_ID.toString(16).padStart(64, '0') + // projectId
    '0'.padStart(64, '0') + // duration
    '0000000000000000000000000000000000000000000000000de0b6b3a7640000' + // weight (1e18)
    '0'.padStart(64, '0') + // weightCutPercent
    '0000000000000000000000000000000000000000000000000000000000000000' + // approvalHook
    newMetadata.toString(16).padStart(64, '0') + // metadata
    '0'.padStart(64, '0') // mustStartAtOrAfter
  );
  console.log('');
  
  // Set pool transaction
  console.log('🔧 Set Pool Transaction');
  console.log('=' .repeat(30));
  console.log('Contract: ' + JB_CONTRACTS.JBBuybackHook);
  console.log('Method: setPoolFor(uint256,address)');
  console.log('Function Selector: 0x8d1fdf2f');
  console.log('Data: 0x8d1fdf2f' + 
    PROJECT_ID.toString(16).padStart(64, '0') + // projectId
    UNISWAP_POOL.replace('0x', '').padStart(64, '0') // pool
  );
  console.log('');
}

/**
 * Main function
 */
async function main() {
  try {
    // Check current configuration
    const isConfigured = await checkCurrentBuybackConfig();
    
    // Check permissions
    const hasPermissions = await checkPermissions();
    
    // Display setup instructions
    displaySetupInstructions();
    
    // Display transaction data
    displayTransactionData();
    
    // Summary
    console.log('\n📋 SUMMARY');
    console.log('=' .repeat(40));
    
    if (isConfigured) {
      console.log('✅ Buyback hook is already configured correctly!');
      console.log('   • No action needed');
      console.log('   • Ready to seed the pool');
    } else {
      console.log('❌ Buyback hook needs configuration');
      console.log('   • Follow the setup instructions above');
      console.log('   • Execute the transactions in order');
      console.log('   • Verify the configuration after setup');
    }
    
    if (!hasPermissions) {
      console.log('⚠️  Permission issues detected');
      console.log('   • You may need to grant additional permissions');
      console.log('   • Contact the project owner if needed');
    }
    
    console.log('\n' + '=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

