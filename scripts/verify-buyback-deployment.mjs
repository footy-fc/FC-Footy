import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BENDYSTRAW_API_KEY = process.env.BENDYSTRAW_API_KEY || "3ZHM6jJ6Dqpyjms9zfZQdR3o";
const BENDYSTRAW_BASE_URL = "https://bendystraw.xyz";

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

// Token addresses
const SCORES_TOKEN = "0xBa1aFff81A239C926446a67D73F73eC51C37c777";
const WETH_TOKEN = "0x4200000000000000000000000000000000000006";

// Target pool address
const TARGET_POOL = "0xe654dbdbdfb8be04a40b6b3b5ad3b0b12aebf828";

// Permission holder account
const PERMISSION_ACCOUNT = "0xdf087b724174a3e4ed2338c0798193932e851f1b";

/**
 * Display comprehensive verification
 */
function displayVerification() {
  console.log('🔍 COMPREHENSIVE BUYBACK VERIFICATION');
  console.log('=' .repeat(80));
  
  console.log('\n📋 PROJECT DETAILS:');
  console.log(`   • Project ID: ${PROJECT_ID}`);
  console.log(`   • Chain ID: ${CHAIN_ID} (Base)`);
  console.log(`   • SCORES Token: ${SCORES_TOKEN}`);
  console.log(`   • WETH Token: ${WETH_TOKEN}`);
  console.log(`   • Target Pool: ${TARGET_POOL}`);
  
  console.log('\n🔧 CONTRACT ADDRESSES:');
  console.log(`   • JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
  console.log(`   • JBRulesets: ${JB_CONTRACTS.JBRulesets}`);
  console.log(`   • JBProjects: ${JB_CONTRACTS.JBProjects}`);
  console.log(`   • JBPermissions: ${JB_CONTRACTS.JBPermissions}`);
  
  console.log('\n🔐 PERMISSION ACCOUNT:');
  console.log(`   • Account: ${PERMISSION_ACCOUNT}`);
  console.log(`   • Permissions: 17, 25, 6, 18, 30, 20, 21, 22, 23`);
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display verification methods
 */
function displayVerificationMethods() {
  console.log('\n🔍 VERIFICATION METHODS');
  console.log('=' .repeat(80));
  
  console.log('\n📋 Method 1: Check Juicebox Interface');
  console.log('   1. Visit: https://juicebox.money/v4/p/53');
  console.log('   2. Connect wallet with permissions');
  console.log('   3. Check "Funding cycle" tab');
  console.log('   4. Look for "Data hook" configuration');
  console.log('   5. Verify if buyback delegate is set');
  
  console.log('\n📋 Method 2: Check Basescan Contract');
  console.log('   1. Visit: https://basescan.org/address/0xda86eedb67c6c9fb3e58fe83efa28674d7c89826');
  console.log('   2. Go to "Read Contract" tab');
  console.log('   3. Call "rulesetIdOf" with project ID 53');
  console.log('   4. Get the current ruleset ID');
  console.log('   5. Call "getRuleset" with the ruleset ID');
  console.log('   6. Check metadata for data hook configuration');
  
  console.log('\n📋 Method 3: Check JBBuybackHook Contract');
  console.log('   1. Visit: https://basescan.org/address/0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b');
  console.log('   2. Go to "Read Contract" tab');
  console.log('   3. Check if contract is deployed and accessible');
  console.log('   4. Look for configuration methods');
  
  console.log('\n📋 Method 4: Check Project Events');
  console.log('   1. Look for buyback-related events');
  console.log('   2. Check if buyback hook is mentioned in events');
  console.log('   3. Verify if buyback activity exists');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display deterministic address explanation
 */
function displayDeterministicAddress() {
  console.log('\n🎯 DETERMINISTIC ADDRESS EXPLANATION');
  console.log('=' .repeat(80));
  
  console.log('\n📋 What This Means:');
  console.log('   • The buyback hook address is deterministic');
  console.log('   • It was calculated at project deployment time');
  console.log('   • The address should be: 0x47d1b88af8ee0ed0a772a7c98430894141b9ac8b');
  console.log('   • This address is the same for all projects on Base');
  
  console.log('\n🔧 How to Verify:');
  console.log('   1. The contract exists at the deterministic address');
  console.log('   2. Check if it was configured in the funding cycle');
  console.log('   3. Verify the ruleset metadata includes this address');
  console.log('   4. Confirm the "useDataHookForPay" flag is set to true');
  
  console.log('\n⚠️  Important Notes:');
  console.log('   • Contract existence ≠ Configuration');
  console.log('   • The hook must be referenced in ruleset metadata');
  console.log('   • The "useDataHookForPay" flag must be true');
  console.log('   • The data hook address must be set in metadata');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display manual verification steps
 */
function displayManualSteps() {
  console.log('\n🛠️  MANUAL VERIFICATION STEPS');
  console.log('=' .repeat(80));
  
  console.log('\n📋 Step 1: Check Juicebox Interface');
  console.log('   • Go to: https://juicebox.money/v4/p/53');
  console.log('   • Connect wallet: ' + PERMISSION_ACCOUNT);
  console.log('   • Navigate to "Funding cycle" tab');
  console.log('   • Look for "Data hook" field');
  console.log('   • Check if it shows: ' + JB_CONTRACTS.JBBuybackHook);
  
  console.log('\n📋 Step 2: Check Basescan Contract');
  console.log('   • Go to: https://basescan.org/address/' + JB_CONTRACTS.JBRulesets);
  console.log('   • Click "Read Contract"');
  console.log('   • Call "rulesetIdOf" with parameter: 53');
  console.log('   • Note the returned ruleset ID');
  console.log('   • Call "getRuleset" with the ruleset ID');
  console.log('   • Check the metadata field for data hook configuration');
  
  console.log('\n📋 Step 3: Decode Metadata');
  console.log('   • The metadata is a packed uint256');
  console.log('   • Bit 80 should be 1 (useDataHookForPay)');
  console.log('   • Bits 82-241 should contain the data hook address');
  console.log('   • Expected address: ' + JB_CONTRACTS.JBBuybackHook);
  
  console.log('\n📋 Step 4: Verify Buyback Hook');
  console.log('   • Go to: https://basescan.org/address/' + JB_CONTRACTS.JBBuybackHook);
  console.log('   • Check if contract is deployed');
  console.log('   • Look for configuration methods');
  console.log('   • Verify pool configuration');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display expected configuration
 */
function displayExpectedConfig() {
  console.log('\n📋 EXPECTED CONFIGURATION');
  console.log('=' .repeat(80));
  
  console.log('\n🎯 If Buyback Hook is Configured:');
  console.log('   • Ruleset metadata should have bit 80 = 1');
  console.log('   • Data hook address should be: ' + JB_CONTRACTS.JBBuybackHook);
  console.log('   • Juicebox interface should show the data hook');
  console.log('   • Buyback activity should be visible in events');
  
  console.log('\n🎯 If Buyback Hook is NOT Configured:');
  console.log('   • Ruleset metadata should have bit 80 = 0');
  console.log('   • Data hook address should be: 0x0000...');
  console.log('   • Juicebox interface should show no data hook');
  console.log('   • No buyback activity in events');
  
  console.log('\n🔧 Configuration Parameters (if needed):');
  console.log('   • Pool Address: ' + TARGET_POOL);
  console.log('   • Fee Tier: 500 (0.05%)');
  console.log('   • Slippage Tolerance: 500 (5%)');
  console.log('   • Minimum Buyback Amount: 0.01 ETH');
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Display conclusion
 */
function displayConclusion() {
  console.log('\n📋 CONCLUSION');
  console.log('=' .repeat(80));
  
  console.log('\n🎯 Based on Deterministic Address:');
  console.log('   • The buyback hook contract exists at: ' + JB_CONTRACTS.JBBuybackHook);
  console.log('   • This suggests it was deployed at project creation');
  console.log('   • However, existence ≠ configuration');
  
  console.log('\n🔍 What to Check:');
  console.log('   1. Is the hook referenced in the current ruleset?');
  console.log('   2. Is the "useDataHookForPay" flag set to true?');
  console.log('   3. Is the data hook address set in metadata?');
  console.log('   4. Is the hook actually configured for the pool?');
  
  console.log('\n⚠️  Next Steps:');
  console.log('   • Use the manual verification steps above');
  console.log('   • Check the Juicebox interface directly');
  console.log('   • Verify the ruleset metadata on Basescan');
  console.log('   • If not configured, use basescan-buyback-config.mjs');
  
  console.log('\n🔗 Useful Links:');
  console.log('   • Juicebox Interface: https://juicebox.money/v4/p/53');
  console.log('   • JBRulesets: https://basescan.org/address/' + JB_CONTRACTS.JBRulesets);
  console.log('   • JBBuybackHook: https://basescan.org/address/' + JB_CONTRACTS.JBBuybackHook);
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const projectId = parseInt(args[0]) || PROJECT_ID;
  const chainId = parseInt(args[1]) || CHAIN_ID;

  console.log('🔍 Buyback Hook Deployment Verification');
  console.log('=' .repeat(80));
  console.log(`📊 Project ID: ${projectId}`);
  console.log(`⛓️  Chain ID: ${chainId} (Base)`);
  console.log(`🔧 JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
  console.log('');
  
  displayVerification();
  displayVerificationMethods();
  displayDeterministicAddress();
  displayManualSteps();
  displayExpectedConfig();
  displayConclusion();
  
  console.log('\n✅ Verification Guide Complete');
  console.log('📋 Use the above methods to verify buyback hook configuration');
  console.log('🔗 Start with: https://juicebox.money/v4/p/53');
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

