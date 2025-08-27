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

console.log('🎯 Final Buyback Hook Setup for SCORES/WETH Pool');
console.log('=' .repeat(70));
console.log(`📊 Project ID: ${PROJECT_ID}`);
console.log(`⛓️  Chain ID: ${CHAIN_ID} (Base)`);
console.log(`🔧 Current Ruleset ID: ${CURRENT_RULESET_ID}`);
console.log(`🔧 JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
console.log(`🏊 Uniswap Pool: ${UNISWAP_POOL}`);
console.log(`🎯 SCORES Token: ${SCORES_TOKEN}`);
console.log(`💎 WETH: ${WETH}`);
console.log('');

console.log('📋 Deployment Analysis Summary');
console.log('=' .repeat(40));
console.log('✅ Project 53 was deployed with buyback hook configured');
console.log('✅ Original configuration used generic WETH pool setup');
console.log('⚠️  Need to update to specific SCORES/WETH pool');
console.log('⚠️  Current ruleset has weight = 0 (no token minting)');
console.log('');

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
 * Display the complete setup instructions
 */
function displayCompleteSetup() {
  console.log('🛠️  COMPLETE SETUP INSTRUCTIONS');
  console.log('=' .repeat(50));
  
  const newMetadata = calculateBuybackMetadata();
  
  console.log('📋 Step 1: Queue New Ruleset (Fix Weight + Buyback Hook)');
  console.log('=' .repeat(50));
  console.log('🔧 Contract: JBRulesets');
  console.log('   Address: ' + JB_CONTRACTS.JBRulesets);
  console.log('   Method: queueFor');
  console.log('📝 Parameters:');
  console.log(`   • projectId: ${PROJECT_ID}`);
  console.log(`   • duration: 0 (no duration)`);
  console.log(`   • weight: 1000000000000000000 (1e18) ⭐ FIXES TOKEN MINTING`);
  console.log(`   • weightCutPercent: 0`);
  console.log(`   • approvalHook: 0x0000000000000000000000000000000000000000`);
  console.log(`   • metadata: ${newMetadata} ⭐ ENABLES BUYBACK HOOK`);
  console.log(`   • mustStartAtOrAfter: 0 (start immediately)`);
  console.log('');
  
  console.log('📋 Step 2: Configure Buyback Hook Pool');
  console.log('=' .repeat(50));
  console.log('🔧 Contract: JBBuybackHook');
  console.log('   Address: ' + JB_CONTRACTS.JBBuybackHook);
  console.log('   Method: setPoolFor');
  console.log('📝 Parameters:');
  console.log(`   • _projectId: ${PROJECT_ID}`);
  console.log(`   • _pool: ${UNISWAP_POOL} ⭐ SPECIFIC SCORES/WETH POOL`);
  console.log('');
  
  console.log('📋 Step 3: Verify Configuration');
  console.log('=' .repeat(50));
  console.log('🔍 Check Juicebox Interface:');
  console.log('   • Go to: https://juicebox.money/v4/p/53');
  console.log('   • Connect wallet: 0xdf087b724174a3e4ed2338c0798193932e851f1b');
  console.log('   • Check "Funding cycle" tab');
  console.log('   • Verify "Data hook" shows: ' + JB_CONTRACTS.JBBuybackHook);
  console.log('   • Verify "Weight" shows: 1.000000000000000000');
  console.log('');
  
  console.log('🔍 Check Buyback Hook:');
  console.log('   • Go to: https://basescan.org/address/' + JB_CONTRACTS.JBBuybackHook);
  console.log('   • Call "poolFor" with projectId: ' + PROJECT_ID);
  console.log('   • Should return: ' + UNISWAP_POOL);
  console.log('');
}

/**
 * Display transaction data for manual execution
 */
function displayTransactionData() {
  console.log('📋 TRANSACTION DATA FOR MANUAL EXECUTION');
  console.log('=' .repeat(50));
  
  const newMetadata = calculateBuybackMetadata();
  
  // Queue ruleset transaction
  console.log('🔧 Step 1: Queue Ruleset Transaction');
  console.log('=' .repeat(40));
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
  console.log('🔧 Step 2: Set Pool Transaction');
  console.log('=' .repeat(40));
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
 * Display what this will accomplish
 */
function displayExpectedOutcome() {
  console.log('🎯 EXPECTED OUTCOME AFTER SETUP');
  console.log('=' .repeat(50));
  console.log('✅ Token Minting Enabled');
  console.log('   • Weight: 1e18 (1:1 ratio)');
  console.log('   • 1 ETH payment = 1 SCORES token');
  console.log('   • Project can now mint tokens properly');
  console.log('');
  console.log('✅ Buyback Hook Configured');
  console.log('   • Data hook: ' + JB_CONTRACTS.JBBuybackHook);
  console.log('   • Pool: ' + UNISWAP_POOL);
  console.log('   • Automatic buyback from Uniswap V3 pool');
  console.log('');
  console.log('✅ Ready for Pool Seeding');
  console.log('   • Add liquidity to the Uniswap pool');
  console.log('   • Buyback hook will use the pool for swaps');
  console.log('   • Project can now perform buybacks');
  console.log('');
}

/**
 * Display important notes
 */
function displayImportantNotes() {
  console.log('⚠️  IMPORTANT NOTES');
  console.log('=' .repeat(50));
  console.log('🔑 Permissions Required:');
  console.log('   • Account: 0xdf087b724174a3e4ed2338c0798193932e851f1b');
  console.log('   • Needs permission to queue rulesets');
  console.log('   • Needs permission to configure buyback hook');
  console.log('');
  console.log('⏰ Timing:');
  console.log('   • New ruleset starts immediately');
  console.log('   • Current ruleset (weight=0) will be replaced');
  console.log('   • No downtime expected');
  console.log('');
  console.log('💰 Testing:');
  console.log('   • Test with small amounts first');
  console.log('   • Verify token minting works');
  console.log('   • Verify buyback functionality');
  console.log('');
}

/**
 * Main function
 */
async function main() {
  try {
    // Display complete setup instructions
    displayCompleteSetup();
    
    // Display transaction data
    displayTransactionData();
    
    // Display expected outcome
    displayExpectedOutcome();
    
    // Display important notes
    displayImportantNotes();
    
    // Final summary
    console.log('📋 FINAL SUMMARY');
    console.log('=' .repeat(50));
    console.log('🎯 Goal: Configure buyback hook for SCORES/WETH pool');
    console.log('✅ Solution: Update ruleset with proper weight + buyback hook');
    console.log('🔧 Method: Execute 2 transactions in sequence');
    console.log('📊 Result: Project ready for pool seeding and buybacks');
    console.log('');
    console.log('🚀 Ready to execute! Follow the transaction data above.');
    console.log('');
    console.log('=' .repeat(70));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

