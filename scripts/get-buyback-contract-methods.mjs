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
 * Display contract methods for manual configuration
 */
function displayContractMethods() {
  console.log('🔧 Manual Buyback Configuration - Contract Methods');
  console.log('=' .repeat(80));
  
  console.log('\n📋 Contract Addresses:');
  console.log(`   • JBRulesets: ${JB_CONTRACTS.JBRulesets}`);
  console.log(`   • JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
  console.log(`   • JBPermissions: ${JB_CONTRACTS.JBPermissions}`);
  
  console.log('\n🎯 Target Configuration:');
  console.log(`   • Project ID: ${PROJECT_ID}`);
  console.log(`   • Chain ID: ${CHAIN_ID} (Base)`);
  console.log(`   • Pool Address: ${TARGET_POOL}`);
  console.log(`   • SCORES Token: ${SCORES_TOKEN}`);
  console.log(`   • WETH Token: ${WETH_TOKEN}`);
  
  console.log('\n🔐 Permission Account:');
  console.log(`   • Account: ${PERMISSION_ACCOUNT}`);
  console.log(`   • Permissions: 17, 25, 6, 18, 30, 20, 21, 22, 23`);
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display JBRulesets contract methods
 */
function displayJBRulesetsMethods() {
  console.log('\n📝 JBRulesets Contract Methods');
  console.log('=' .repeat(80));
  
  console.log('\n🔧 Method 1: setRulesOf');
  console.log('   Contract: JBRulesets');
  console.log('   Address: ' + JB_CONTRACTS.JBRulesets);
  console.log('   Method: setRulesOf(uint256 _projectId, uint256 _rulesetId, uint256 _rulesetIdOf)');
  
  console.log('\n📋 Parameters:');
  console.log('   • _projectId: ' + PROJECT_ID);
  console.log('   • _rulesetId: [Current ruleset ID]');
  console.log('   • _rulesetIdOf: [New ruleset ID with buyback delegate]');
  
  console.log('\n⚠️  Note: This method requires:');
  console.log('   • Permission 17 (SET_RULES_OF)');
  console.log('   • Current ruleset ID must be known');
  console.log('   • New ruleset must be configured with buyback delegate');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display JBBuybackHook configuration
 */
function displayBuybackHookConfig() {
  console.log('\n🔄 JBBuybackHook Configuration');
  console.log('=' .repeat(80));
  
  console.log('\n📋 Contract Details:');
  console.log('   • Address: ' + JB_CONTRACTS.JBBuybackHook);
  console.log('   • Purpose: Handles buyback operations for Juicebox projects');
  
  console.log('\n🔧 Configuration Parameters:');
  console.log('   • Pool Address: ' + TARGET_POOL);
  console.log('   • Token0 (WETH): ' + WETH_TOKEN);
  console.log('   • Token1 (SCORES): ' + SCORES_TOKEN);
  console.log('   • Fee Tier: 500 (0.05%)');
  console.log('   • Slippage Tolerance: 500 (5%)');
  console.log('   • Minimum Buyback Amount: 0.01 ETH');
  
  console.log('\n📝 Expected Configuration Format:');
  console.log('   {');
  console.log('     "pool": "' + TARGET_POOL + '",');
  console.log('     "token0": "' + WETH_TOKEN + '",');
  console.log('     "token1": "' + SCORES_TOKEN + '",');
  console.log('     "feeTier": 500,');
  console.log('     "slippageTolerance": 500,');
  console.log('     "minimumBuybackAmount": "10000000000000000000"');
  console.log('   }');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display funding cycle metadata structure
 */
function displayFundingCycleMetadata() {
  console.log('\n📊 Funding Cycle Metadata Structure');
  console.log('=' .repeat(80));
  
  console.log('\n🔧 Ruleset Metadata (Packed uint256):');
  console.log('   • Reserved Percent: bits 4-19');
  console.log('   • Cash Out Tax Rate: bits 20-35');
  console.log('   • Base Currency: bits 36-67');
  console.log('   • Pause Pay: bit 68');
  console.log('   • Pause Credit Transfers: bit 69');
  console.log('   • Allow Owner Minting: bit 70');
  console.log('   • Allow Set Custom Token: bit 71');
  console.log('   • Allow Terminal Migration: bit 72');
  console.log('   • Allow Set Terminals: bit 73');
  console.log('   • Allow Set Controller: bit 74');
  console.log('   • Allow Add Accounting Context: bit 75');
  console.log('   • Allow Add Price Feed: bit 76');
  console.log('   • Owner Must Send Payouts: bit 77');
  console.log('   • Hold Fees: bit 78');
  console.log('   • Use Total Surplus For Cash Outs: bit 79');
  console.log('   • Use Data Hook For Pay: bit 80');
  console.log('   • Use Data Hook For Cash Out: bit 81');
  console.log('   • Data Hook: bits 82-241');
  console.log('   • Metadata: bits 242-255');
  
  console.log('\n🎯 Buyback Configuration:');
  console.log('   • Data Hook: ' + JB_CONTRACTS.JBBuybackHook);
  console.log('   • Use Data Hook For Pay: true');
  console.log('   • Use Data Hook For Cash Out: false');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display manual configuration steps
 */
function displayManualSteps() {
  console.log('\n🛠️  Manual Configuration Steps for Basescan');
  console.log('=' .repeat(80));
  
  console.log('\n📋 Step 1: Get Current Ruleset ID');
  console.log('   • Contract: JBRulesets');
  console.log('   • Method: rulesetIdOf(uint256 _projectId)');
  console.log('   • Parameter: ' + PROJECT_ID);
  console.log('   • This returns the current ruleset ID');
  
  console.log('\n📋 Step 2: Create New Ruleset with Buyback Delegate');
  console.log('   • Contract: JBRulesets');
  console.log('   • Method: createRuleset(uint256 _projectId, uint256 _duration, uint256 _weight, uint256 _discountRate, uint256 _ballot, uint256 _metadata, uint256 _mustStartAtOrAfter)');
  console.log('   • Parameters:');
  console.log('     - _projectId: ' + PROJECT_ID);
  console.log('     - _duration: [Current duration in seconds]');
  console.log('     - _weight: [Current weight]');
  console.log('     - _discountRate: [Current discount rate]');
  console.log('     - _ballot: [Current ballot address]');
  console.log('     - _metadata: [Packed metadata with buyback hook]');
  console.log('     - _mustStartAtOrAfter: [Current timestamp]');
  
  console.log('\n📋 Step 3: Set New Ruleset');
  console.log('   • Contract: JBRulesets');
  console.log('   • Method: setRulesOf(uint256 _projectId, uint256 _rulesetId, uint256 _rulesetIdOf)');
  console.log('   • Parameters:');
  console.log('     - _projectId: ' + PROJECT_ID);
  console.log('     - _rulesetId: [New ruleset ID from Step 2]');
  console.log('     - _rulesetIdOf: [Current ruleset ID from Step 1]');
  
  console.log('\n⚠️  Important Notes:');
  console.log('   • Use account: ' + PERMISSION_ACCOUNT);
  console.log('   • Ensure proper permissions (17, 25, 6, 18, 30, 20, 21, 22, 23)');
  console.log('   • Test with small amounts first');
  console.log('   • Verify configuration after deployment');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display metadata calculation
 */
function displayMetadataCalculation() {
  console.log('\n🧮 Metadata Calculation for Buyback Hook');
  console.log('=' .repeat(80));
  
  console.log('\n📋 Current Configuration (Example):');
  console.log('   • Reserved Percent: 0% (0)');
  console.log('   • Cash Out Tax Rate: 0% (0)');
  console.log('   • Base Currency: 1 (ETH)');
  console.log('   • Pause Pay: false');
  console.log('   • Pause Credit Transfers: false');
  console.log('   • Allow Owner Minting: false');
  console.log('   • Allow Set Custom Token: false');
  console.log('   • Allow Terminal Migration: false');
  console.log('   • Allow Set Terminals: false');
  console.log('   • Allow Set Controller: false');
  console.log('   • Allow Add Accounting Context: false');
  console.log('   • Allow Add Price Feed: false');
  console.log('   • Owner Must Send Payouts: false');
  console.log('   • Hold Fees: false');
  console.log('   • Use Total Surplus For Cash Outs: false');
  console.log('   • Use Data Hook For Pay: true ⭐');
  console.log('   • Use Data Hook For Cash Out: false');
  console.log('   • Data Hook: ' + JB_CONTRACTS.JBBuybackHook);
  console.log('   • Metadata: 0');
  
  console.log('\n🔧 Packed Metadata (uint256):');
  console.log('   • Reserved Percent: 0 << 4 = 0');
  console.log('   • Cash Out Tax Rate: 0 << 20 = 0');
  console.log('   • Base Currency: 1 << 36 = 68719476736');
  console.log('   • Use Data Hook For Pay: 1 << 80 = 1208925819614629174706176');
  console.log('   • Data Hook: [Address as uint256] << 82');
  console.log('   • Final packed value: [Calculated uint256]');
  
  console.log('\n⚠️  Note:');
  console.log('   • Use a metadata calculator or contract to pack values');
  console.log('   • Ensure all boolean flags are set correctly');
  console.log('   • Data hook address must be properly encoded');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Manual Buyback Configuration Guide');
  console.log('=' .repeat(80));
  console.log(`📊 Project ID: ${PROJECT_ID}`);
  console.log(`⛓️  Chain ID: ${CHAIN_ID} (Base)`);
  console.log(`🏊 Target Pool: ${TARGET_POOL}`);
  console.log('');
  
  displayContractMethods();
  displayJBRulesetsMethods();
  displayBuybackHookConfig();
  displayFundingCycleMetadata();
  displayManualSteps();
  displayMetadataCalculation();
  
  console.log('\n✅ Manual Configuration Guide Complete');
  console.log('📋 Use the above information to configure buyback delegate on Basescan');
  console.log('🔗 Contract Explorer: https://basescan.org/address/' + JB_CONTRACTS.JBRulesets);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

