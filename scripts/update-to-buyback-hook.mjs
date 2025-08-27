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

console.log('🔄 Update to Standard JBBuybackHook');
console.log('=' .repeat(50));
console.log(`📊 Project ID: ${PROJECT_ID}`);
console.log(`⛓️  Chain ID: ${CHAIN_ID} (Base)`);
console.log(`🔧 Current Ruleset ID: ${CURRENT_RULESET_ID}`);
console.log(`🔧 JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
console.log(`🏊 Uniswap Pool: ${UNISWAP_POOL}`);
console.log(`🎯 SCORES Token: ${SCORES_TOKEN}`);
console.log(`💎 WETH: ${WETH}`);
console.log('');

console.log('📋 CURRENT CONFIGURATION');
console.log('=' .repeat(30));
console.log('❌ Current hook: 0x027f1684c6d31066c3f2468117f2508e8134fdfc');
console.log('   • Not a standard data hook');
console.log('   • Interface calls revert');
console.log('   • May not support buyback functionality');
console.log('');

console.log('📋 TARGET CONFIGURATION');
console.log('=' .repeat(30));
console.log('✅ Target hook: ' + JB_CONTRACTS.JBBuybackHook);
console.log('   • Standard Juicebox buyback hook');
console.log('   • Supports Uniswap V3 pools');
console.log('   • Proven implementation');
console.log('');

console.log('📋 UPDATE STEPS');
console.log('=' .repeat(30));
console.log('1️⃣  Queue new ruleset with updated metadata');
console.log('2️⃣  Configure buyback hook with pool parameters');
console.log('3️⃣  Test buyback functionality');
console.log('');

console.log('🔧 BASESCAN CONFIGURATION');
console.log('=' .repeat(30));

// Calculate new metadata with JBBuybackHook
const newMetadata = calculateBuybackMetadata();
console.log(`📊 New Metadata: ${newMetadata}`);
console.log('');

console.log('📋 Step 1: Queue New Ruleset');
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

console.log('📋 Step 2: Configure Buyback Hook');
console.log('=' .repeat(25));
console.log('🔧 Contract: JBBuybackHook');
console.log('   Address: ' + JB_CONTRACTS.JBBuybackHook);
console.log('   Method: setPoolFor');
console.log('📝 Parameters:');
console.log(`   • _projectId: ${PROJECT_ID}`);
console.log(`   • _pool: ${UNISWAP_POOL}`);
console.log('');

console.log('📋 Step 3: Verify Configuration');
console.log('=' .repeat(25));
console.log('🔍 Check Juicebox Interface:');
console.log('   • Go to: https://juicebox.money/v4/p/53');
console.log('   • Connect wallet: 0xdf087b724174a3e4ed2338c0798193932e851f1b');
console.log('   • Check "Funding cycle" tab');
console.log('   • Verify "Data hook" shows: ' + JB_CONTRACTS.JBBuybackHook);
console.log('');

console.log('📋 PERMISSIONS REQUIRED');
console.log('=' .repeat(30));
console.log('🔑 Account: 0xdf087b724174a3e4ed2338c0798193932e851f1b');
console.log('   • Needs permission to queue rulesets');
console.log('   • Needs permission to configure buyback hook');
console.log('');

console.log('⚠️  IMPORTANT NOTES');
console.log('=' .repeat(30));
console.log('• The new ruleset will start immediately');
console.log('• The current ruleset will be replaced');
console.log('• Make sure you have sufficient permissions');
console.log('• Test with small amounts first');
console.log('');

console.log('=' .repeat(50));

/**
 * Calculate metadata for buyback hook configuration
 */
function calculateBuybackMetadata() {
  // Start with base metadata (from current ruleset)
  let metadata = 0n;
  
  // Set useDataHookForPay = true (bit 80)
  metadata |= (1n << 80n);
  
  // Set useDataHookForCashOut = true (bit 81)
  metadata |= (1n << 81n);
  
  // Set dataHook address (bits 82-241)
  const hookAddress = BigInt(JB_CONTRACTS.JBBuybackHook);
  metadata |= (hookAddress << 82n);
  
  // Set other flags from current configuration
  metadata |= (1n << 70n); // allowOwnerMinting
  metadata |= (1n << 79n); // useTotalSurplusForCashOuts
  
  return metadata;
}

