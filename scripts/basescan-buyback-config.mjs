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

// Target pool address
const TARGET_POOL = "0xe654dbdbdfb8be04a40b6b3b5ad3b0b12aebf828";

// Project details
const PROJECT_ID = 53;
const CHAIN_ID = 8453; // Base

// Token addresses
const SCORES_TOKEN = "0xBa1aFff81A239C926446a67D73F73eC51C37c777";
const WETH_TOKEN = "0x4200000000000000000000000000000000000006";

// Permission holder account
const PERMISSION_ACCOUNT = "0xdf087b724174a3e4ed2338c0798193932e851f1b";

/**
 * Display exact Basescan configuration
 */
function displayBasescanConfig() {
  console.log('🔧 EXACT BASESCAN CONFIGURATION');
  console.log('=' .repeat(80));
  
  console.log('\n📋 CONTRACT ADDRESSES:');
  console.log(`   JBRulesets: ${JB_CONTRACTS.JBRulesets}`);
  console.log(`   JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
  console.log(`   JBPermissions: ${JB_CONTRACTS.JBPermissions}`);
  
  console.log('\n🎯 PROJECT DETAILS:');
  console.log(`   Project ID: ${PROJECT_ID}`);
  console.log(`   Chain ID: ${CHAIN_ID} (Base)`);
  console.log(`   Pool Address: ${TARGET_POOL}`);
  console.log(`   SCORES Token: ${SCORES_TOKEN}`);
  console.log(`   WETH Token: ${WETH_TOKEN}`);
  
  console.log('\n🔐 PERMISSION ACCOUNT:');
  console.log(`   Account: ${PERMISSION_ACCOUNT}`);
  console.log(`   Permissions: 17, 25, 6, 18, 30, 20, 21, 22, 23`);
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display Step 1: Get Current Ruleset ID
 */
function displayStep1() {
  console.log('\n📋 STEP 1: GET CURRENT RULESET ID');
  console.log('=' .repeat(80));
  
  console.log('\n🔧 Contract: JBRulesets');
  console.log(`   Address: ${JB_CONTRACTS.JBRulesets}`);
  console.log('   Method: rulesetIdOf(uint256 _projectId)');
  
  console.log('\n📝 Parameters:');
  console.log(`   _projectId: ${PROJECT_ID}`);
  
  console.log('\n📋 Expected Return:');
  console.log('   Returns the current ruleset ID (uint256)');
  console.log('   Example: 123456789');
  
  console.log('\n🔗 Basescan URL:');
  console.log(`   https://basescan.org/address/${JB_CONTRACTS.JBRulesets}#readContract`);
  console.log('   Navigate to "rulesetIdOf" method');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display Step 2: Create New Ruleset
 */
function displayStep2() {
  console.log('\n📋 STEP 2: CREATE NEW RULESET WITH BUYBACK DELEGATE');
  console.log('=' .repeat(80));
  
  console.log('\n🔧 Contract: JBRulesets');
  console.log(`   Address: ${JB_CONTRACTS.JBRulesets}`);
  console.log('   Method: createRuleset(uint256 _projectId, uint256 _duration, uint256 _weight, uint256 _discountRate, uint256 _ballot, uint256 _metadata, uint256 _mustStartAtOrAfter)');
  
  console.log('\n📝 Parameters:');
  console.log(`   _projectId: ${PROJECT_ID}`);
  console.log('   _duration: [Current duration in seconds - get from current ruleset]');
  console.log('   _weight: [Current weight - get from current ruleset]');
  console.log('   _discountRate: [Current discount rate - get from current ruleset]');
  console.log('   _ballot: [Current ballot address - get from current ruleset]');
  console.log('   _metadata: [Packed metadata with buyback hook - see calculation below]');
  console.log('   _mustStartAtOrAfter: [Current timestamp]');
  
  console.log('\n🧮 METADATA CALCULATION:');
  console.log('   The _metadata parameter is a packed uint256 with the following structure:');
  console.log('   • Reserved Percent (bits 4-19): 0');
  console.log('   • Cash Out Tax Rate (bits 20-35): 0');
  console.log('   • Base Currency (bits 36-67): 1 (ETH)');
  console.log('   • Pause Pay (bit 68): false (0)');
  console.log('   • Pause Credit Transfers (bit 69): false (0)');
  console.log('   • Allow Owner Minting (bit 70): false (0)');
  console.log('   • Allow Set Custom Token (bit 71): false (0)');
  console.log('   • Allow Terminal Migration (bit 72): false (0)');
  console.log('   • Allow Set Terminals (bit 73): false (0)');
  console.log('   • Allow Set Controller (bit 74): false (0)');
  console.log('   • Allow Add Accounting Context (bit 75): false (0)');
  console.log('   • Allow Add Price Feed (bit 76): false (0)');
  console.log('   • Owner Must Send Payouts (bit 77): false (0)');
  console.log('   • Hold Fees (bit 78): false (0)');
  console.log('   • Use Total Surplus For Cash Outs (bit 79): false (0)');
  console.log('   • Use Data Hook For Pay (bit 80): true (1) ⭐');
  console.log('   • Use Data Hook For Cash Out (bit 81): false (0)');
  console.log('   • Data Hook (bits 82-241): ' + JB_CONTRACTS.JBBuybackHook);
  console.log('   • Metadata (bits 242-255): 0');
  
  console.log('\n📊 PACKED METADATA VALUE:');
  console.log('   Use a metadata calculator or contract to pack the above values');
  console.log('   Expected format: uint256 packed value');
  
  console.log('\n🔗 Basescan URL:');
  console.log(`   https://basescan.org/address/${JB_CONTRACTS.JBRulesets}#writeContract`);
  console.log('   Navigate to "createRuleset" method');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display Step 3: Set New Ruleset
 */
function displayStep3() {
  console.log('\n📋 STEP 3: SET NEW RULESET');
  console.log('=' .repeat(80));
  
  console.log('\n🔧 Contract: JBRulesets');
  console.log(`   Address: ${JB_CONTRACTS.JBRulesets}`);
  console.log('   Method: setRulesOf(uint256 _projectId, uint256 _rulesetId, uint256 _rulesetIdOf)');
  
  console.log('\n📝 Parameters:');
  console.log(`   _projectId: ${PROJECT_ID}`);
  console.log('   _rulesetId: [New ruleset ID from Step 2]');
  console.log('   _rulesetIdOf: [Current ruleset ID from Step 1]');
  
  console.log('\n⚠️  IMPORTANT:');
  console.log('   • This method requires Permission 17 (SET_RULES_OF)');
  console.log('   • Use account: ' + PERMISSION_ACCOUNT);
  console.log('   • Ensure proper permissions before calling');
  
  console.log('\n🔗 Basescan URL:');
  console.log(`   https://basescan.org/address/${JB_CONTRACTS.JBRulesets}#writeContract`);
  console.log('   Navigate to "setRulesOf" method');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display JBBuybackHook configuration
 */
function displayBuybackHookConfig() {
  console.log('\n🔄 JBBUYBACKHOOK CONFIGURATION');
  console.log('=' .repeat(80));
  
  console.log('\n📋 Contract Details:');
  console.log(`   Address: ${JB_CONTRACTS.JBBuybackHook}`);
  console.log('   Purpose: Handles buyback operations for Juicebox projects');
  
  console.log('\n🔧 Configuration Parameters:');
  console.log(`   Pool Address: ${TARGET_POOL}`);
  console.log(`   Token0 (WETH): ${WETH_TOKEN}`);
  console.log(`   Token1 (SCORES): ${SCORES_TOKEN}`);
  console.log('   Fee Tier: 500 (0.05%)');
  console.log('   Slippage Tolerance: 500 (5%)');
  console.log('   Minimum Buyback Amount: 0.01 ETH');
  
  console.log('\n📝 Expected Configuration Format:');
  console.log('   {');
  console.log(`     "pool": "${TARGET_POOL}",`);
  console.log(`     "token0": "${WETH_TOKEN}",`);
  console.log(`     "token1": "${SCORES_TOKEN}",`);
  console.log('     "feeTier": 500,');
  console.log('     "slippageTolerance": 500,');
  console.log('     "minimumBuybackAmount": "10000000000000000000"');
  console.log('   }');
  
  console.log('\n🔗 Basescan URL:');
  console.log(`   https://basescan.org/address/${JB_CONTRACTS.JBBuybackHook}#readContract`);
  console.log('   Check for configuration methods');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display verification steps
 */
function displayVerification() {
  console.log('\n✅ VERIFICATION STEPS');
  console.log('=' .repeat(80));
  
  console.log('\n📋 After Configuration:');
  console.log('   1. Check that the new ruleset is active');
  console.log('   2. Verify buyback delegate is set correctly');
  console.log('   3. Test buyback functionality with small amounts');
  console.log('   4. Monitor buyback activity in project events');
  
  console.log('\n🔧 Verification Methods:');
  console.log('   • Check current ruleset: rulesetIdOf(' + PROJECT_ID + ')');
  console.log('   • Verify metadata: getRuleset([new_ruleset_id])');
  console.log('   • Monitor events: Check project pay events for buyback activity');
  
  console.log('\n⚠️  Important Notes:');
  console.log('   • Only permission holders can update funding cycle configuration');
  console.log('   • Use account: ' + PERMISSION_ACCOUNT);
  console.log('   • Test with small amounts before full deployment');
  console.log('   • Verify configuration after deployment');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display summary
 */
function displaySummary() {
  console.log('\n📋 SUMMARY FOR BASESCAN');
  console.log('=' .repeat(80));
  
  console.log('\n🎯 GOAL: Configure buyback delegate for Project 53 on Base');
  console.log('🔧 METHOD: Manual configuration via JBRulesets contract');
  console.log('👤 ACCOUNT: ' + PERMISSION_ACCOUNT);
  console.log('📊 PROJECT: ' + PROJECT_ID);
  console.log('⛓️  CHAIN: ' + CHAIN_ID + ' (Base)');
  console.log('🏊 POOL: ' + TARGET_POOL);
  console.log('🔄 DELEGATE: ' + JB_CONTRACTS.JBBuybackHook);
  
  console.log('\n📝 STEPS:');
  console.log('   1. Get current ruleset ID using rulesetIdOf()');
  console.log('   2. Create new ruleset with buyback delegate using createRuleset()');
  console.log('   3. Set new ruleset using setRulesOf()');
  console.log('   4. Verify configuration');
  
  console.log('\n🔗 BASESCAN LINKS:');
  console.log(`   JBRulesets: https://basescan.org/address/${JB_CONTRACTS.JBRulesets}`);
  console.log(`   JBBuybackHook: https://basescan.org/address/${JB_CONTRACTS.JBBuybackHook}`);
  console.log(`   Project: https://basescan.org/address/${JB_CONTRACTS.JBProjects}`);
  
  console.log('\n✅ READY FOR MANUAL CONFIGURATION');
  console.log('📋 Use the above information to configure buyback delegate on Basescan');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Main function
 */
function main() {
  console.log('🔧 BASESCAN MANUAL BUYBACK CONFIGURATION');
  console.log('=' .repeat(80));
  console.log(`📊 Project ID: ${PROJECT_ID}`);
  console.log(`⛓️  Chain ID: ${CHAIN_ID} (Base)`);
  console.log(`🏊 Target Pool: ${TARGET_POOL}`);
  console.log('');
  
  displayBasescanConfig();
  displayStep1();
  displayStep2();
  displayStep3();
  displayBuybackHookConfig();
  displayVerification();
  displaySummary();
  
  console.log('\n✅ Configuration Guide Complete');
  console.log('📋 Use the above information to configure buyback delegate on Basescan');
  console.log('🔗 Contract Explorer: https://basescan.org/address/' + JB_CONTRACTS.JBRulesets);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

