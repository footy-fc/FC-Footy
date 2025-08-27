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
const RULESET_ID = 1746995565;

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
 * Get ruleset struct
 */
async function getRulesetStruct(projectId, rulesetId) {
  console.log(`🔍 Getting ruleset ${rulesetId} struct...`);
  
  // getRulesetOf(uint256 _projectId, uint256 _rulesetId) - function selector: 0x8c1d8f1f
  const data = `0x8c1d8f1f${projectId.toString(16).padStart(64, '0')}${rulesetId.toString(16).padStart(64, '0')}`;
  
  const result = await callContract(JB_CONTRACTS.JBRulesets, data);
  
  console.log(`✅ Ruleset ${rulesetId} struct data: ${result}`);
  return result;
}

/**
 * Get ruleset metadata
 */
async function getRulesetMetadata(projectId, rulesetId) {
  console.log(`🔍 Getting ruleset ${rulesetId} metadata...`);
  
  // This would require calling the internal _metadataOf mapping
  // Since it's internal, we need to use a different approach
  // Let's try to get the full ruleset struct which includes metadata
  
  const rulesetData = await getRulesetStruct(projectId, rulesetId);
  
  // The ruleset struct includes metadata as the last field
  // We need to parse the returned data to extract metadata
  if (rulesetData && rulesetData.length >= 64 * 8) { // 8 fields * 64 hex chars each
    const metadataHex = rulesetData.slice(-64); // Last 64 hex chars
    const metadata = BigInt('0x' + metadataHex);
    
    console.log(`✅ Ruleset ${rulesetId} metadata: ${metadata}`);
    return metadata;
  }
  
  console.log(`❌ Could not extract metadata from ruleset data`);
  return null;
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
 * Display manual verification steps
 */
function displayManualSteps() {
  console.log(`\n🛠️  MANUAL VERIFICATION STEPS`);
  console.log('=' .repeat(80));
  
  console.log('\n📋 Step 1: Check Basescan Contract');
  console.log('   • Go to: https://basescan.org/address/' + JB_CONTRACTS.JBRulesets);
  console.log('   • Click "Read Contract"');
  console.log('   • Call "getRulesetOf" with parameters:');
  console.log(`     - projectId: ${PROJECT_ID}`);
  console.log(`     - rulesetId: ${RULESET_ID}`);
  console.log('   • Check the returned metadata field');
  
  console.log('\n📋 Step 2: Decode Metadata');
  console.log('   • The metadata is a packed uint256');
  console.log('   • Bit 80 should be 1 (useDataHookForPay)');
  console.log('   • Bits 82-241 should contain the data hook address');
  console.log('   • Expected address: ' + JB_CONTRACTS.JBBuybackHook);
  
  console.log('\n📋 Step 3: Check Juicebox Interface');
  console.log('   • Go to: https://juicebox.money/v4/p/53');
  console.log('   • Connect wallet: 0xdf087b724174a3e4ed2338c0798193932e851f1b');
  console.log('   • Navigate to "Funding cycle" tab');
  console.log('   • Look for "Data hook" field');
  console.log('   • Check if it shows: ' + JB_CONTRACTS.JBBuybackHook);
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const projectId = parseInt(args[0]) || PROJECT_ID;
  const chainId = parseInt(args[1]) || CHAIN_ID;
  const rulesetId = parseInt(args[2]) || RULESET_ID;

  console.log('🔍 Ruleset Metadata Check');
  console.log('=' .repeat(50));
  console.log(`📊 Project ID: ${projectId}`);
  console.log(`⛓️  Chain ID: ${chainId} (Base)`);
  console.log(`🔧 Ruleset ID: ${rulesetId}`);
  console.log(`🔧 JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
  console.log(`🔗 RPC URL: ${BASE_RPC_URL}`);
  console.log('');

  try {
    // Get ruleset metadata
    const metadata = await getRulesetMetadata(projectId, rulesetId);
    
    // Check buyback configuration
    const hasBuybackHook = checkBuybackConfiguration(metadata);
    
    // Display manual steps
    displayManualSteps();
    
    // Summary
    console.log(`\n📋 SUMMARY`);
    console.log('=' .repeat(80));
    
    if (hasBuybackHook) {
      console.log('✅ BUYBACK HOOK IS CONFIGURED!');
      console.log('   • The current ruleset has a buyback delegate set');
      console.log('   • No manual configuration needed');
      console.log('   • Check if the hook is working correctly');
    } else {
      console.log('❌ BUYBACK HOOK NOT CONFIGURED');
      console.log('   • The current ruleset does not have a buyback delegate');
      console.log('   • Manual configuration required');
      console.log('   • Use the basescan-buyback-config.mjs script for setup');
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

