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

// GraphQL query to get current funding cycle
const FUNDING_CYCLE_QUERY = `
  query GetCurrentFundingCycle($projectId: Float!, $chainId: Float!) {
    fundingCycles(
      limit: 1,
      where: {projectId: $projectId, chainId: $chainId},
      orderBy: "number",
      orderDirection: "desc"
    ) {
      items {
        id
        projectId
        chainId
        number
        weight
        discountRate
        ballot
        duration
        target
        currency
        start
        end
        metadata
      }
    }
  }
`;

// GraphQL query to get all funding cycles
const ALL_FUNDING_CYCLES_QUERY = `
  query GetAllFundingCycles($projectId: Float!, $chainId: Float!) {
    fundingCycles(
      limit: 10,
      where: {projectId: $projectId, chainId: $chainId},
      orderBy: "number",
      orderDirection: "desc"
    ) {
      items {
        id
        projectId
        chainId
        number
        weight
        discountRate
        ballot
        duration
        target
        currency
        start
        end
        metadata
      }
    }
  }
`;

// GraphQL query for project configuration
const PROJECT_CONFIG_QUERY = `
  query GetProjectConfig($projectId: Float!, $chainId: Float!) {
    project(projectId: $projectId, chainId: $chainId) {
      id
      projectId
      chainId
      balance
      volume
      volumeUsd
      tokenSupply
      metadata
    }
  }
`;

/**
 * Fetch current funding cycle
 */
async function fetchCurrentFundingCycle(projectId, chainId) {
  try {
    console.log(`🔍 Fetching current funding cycle for project ${projectId} on chain ${chainId}...`);
    
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: FUNDING_CYCLE_QUERY,
        variables: { projectId, chainId }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.fundingCycles.items[0];
  } catch (error) {
    console.error('❌ Failed to fetch funding cycle:', error.message);
    throw error;
  }
}

/**
 * Fetch all funding cycles
 */
async function fetchAllFundingCycles(projectId, chainId) {
  try {
    console.log(`🔍 Fetching all funding cycles for project ${projectId} on chain ${chainId}...`);
    
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: ALL_FUNDING_CYCLES_QUERY,
        variables: { projectId, chainId }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.fundingCycles.items;
  } catch (error) {
    console.error('❌ Failed to fetch funding cycles:', error.message);
    throw error;
  }
}

/**
 * Fetch project configuration
 */
async function fetchProjectConfig(projectId, chainId) {
  try {
    console.log(`🔍 Fetching project configuration for project ${projectId} on chain ${chainId}...`);
    
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: PROJECT_CONFIG_QUERY,
        variables: { projectId, chainId }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data.project;
  } catch (error) {
    console.error('❌ Failed to fetch project config:', error.message);
    throw error;
  }
}

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
 * Check for buyback hook configuration
 */
function checkBuybackConfiguration(fundingCycle) {
  console.log(`\n🔍 Buyback Hook Configuration Check`);
  console.log('=' .repeat(80));
  
  if (!fundingCycle) {
    console.log('❌ No funding cycle found');
    return false;
  }
  
  console.log(`📋 Current Funding Cycle #${fundingCycle.number}:`);
  console.log(`   • Start: ${new Date(fundingCycle.start * 1000).toISOString()}`);
  console.log(`   • End: ${new Date(fundingCycle.end * 1000).toISOString()}`);
  console.log(`   • Duration: ${fundingCycle.duration} seconds`);
  console.log(`   • Target: ${fundingCycle.target} wei`);
  console.log(`   • Currency: ${fundingCycle.currency}`);
  console.log(`   • Weight: ${fundingCycle.weight}`);
  console.log(`   • Discount Rate: ${fundingCycle.discountRate}`);
  console.log(`   • Ballot: ${fundingCycle.ballot}`);
  
  if (fundingCycle.metadata) {
    console.log(`\n📊 Raw Metadata: ${fundingCycle.metadata}`);
    
    const decoded = decodeRulesetMetadata(fundingCycle.metadata);
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
  } else {
    console.log(`\n❌ No metadata found in funding cycle`);
    return false;
  }
  
  return false;
}

/**
 * Display all funding cycles
 */
function displayAllFundingCycles(fundingCycles) {
  console.log(`\n📊 All Funding Cycles`);
  console.log('=' .repeat(80));
  
  if (!fundingCycles || fundingCycles.length === 0) {
    console.log('❌ No funding cycles found');
    return;
  }
  
  console.log(`✅ Found ${fundingCycles.length} funding cycles\n`);
  
  fundingCycles.forEach((cycle, index) => {
    console.log(`${index + 1}. Funding Cycle #${cycle.number}:`);
    console.log(`   • ID: ${cycle.id}`);
    console.log(`   • Start: ${new Date(cycle.start * 1000).toISOString()}`);
    console.log(`   • End: ${new Date(cycle.end * 1000).toISOString()}`);
    console.log(`   • Duration: ${cycle.duration} seconds`);
    console.log(`   • Target: ${cycle.target} wei`);
    console.log(`   • Currency: ${cycle.currency}`);
    console.log(`   • Weight: ${cycle.weight}`);
    console.log(`   • Discount Rate: ${cycle.discountRate}`);
    console.log(`   • Ballot: ${cycle.ballot}`);
    
    if (cycle.metadata) {
      const decoded = decodeRulesetMetadata(cycle.metadata);
      if (decoded) {
        console.log(`   • Use Data Hook For Pay: ${decoded.useDataHookForPay}`);
        console.log(`   • Data Hook: ${decoded.dataHook}`);
        
        if (decoded.useDataHookForPay && decoded.dataHook !== "0x0000000000000000000000000000000000000000") {
          console.log(`   • 🔄 BUYBACK HOOK CONFIGURED!`);
        }
      }
    }
    console.log('');
  });
}

/**
 * Display project configuration
 */
function displayProjectConfig(project) {
  console.log(`\n📋 Project Configuration`);
  console.log('=' .repeat(80));
  
  if (!project) {
    console.log('❌ No project configuration found');
    return;
  }
  
  console.log(`📊 Project Details:`);
  console.log(`   • ID: ${project.id}`);
  console.log(`   • Project ID: ${project.projectId}`);
  console.log(`   • Chain ID: ${project.chainId}`);
  console.log(`   • Balance: ${project.balance} wei`);
  console.log(`   • Volume: ${project.volume} wei`);
  console.log(`   • Volume USD: $${project.volumeUsd}`);
  console.log(`   • Token Supply: ${project.tokenSupply}`);
  
  if (project.metadata) {
    console.log(`   • Metadata: ${JSON.stringify(project.metadata)}`);
  }
  
  console.log('\n' + '=' .repeat(80));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const projectId = parseInt(args[0]) || PROJECT_ID;
  const chainId = parseInt(args[1]) || CHAIN_ID;

  console.log('🔍 Funding Cycle Configuration Check');
  console.log('=' .repeat(50));
  console.log(`📊 Project ID: ${projectId}`);
  console.log(`⛓️  Chain ID: ${chainId} (Base)`);
  console.log(`🔧 JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
  console.log('');

  try {
    // Fetch project configuration
    const project = await fetchProjectConfig(projectId, chainId);
    displayProjectConfig(project);
    
    // Fetch current funding cycle
    const currentFundingCycle = await fetchCurrentFundingCycle(projectId, chainId);
    const hasBuybackHook = checkBuybackConfiguration(currentFundingCycle);
    
    // Fetch all funding cycles
    const allFundingCycles = await fetchAllFundingCycles(projectId, chainId);
    displayAllFundingCycles(allFundingCycles);
    
    // Summary
    console.log(`\n📋 SUMMARY`);
    console.log('=' .repeat(80));
    
    if (hasBuybackHook) {
      console.log('✅ BUYBACK HOOK IS CONFIGURED!');
      console.log('   • The current funding cycle has a buyback delegate set');
      console.log('   • No manual configuration needed');
      console.log('   • Check if the hook is working correctly');
    } else {
      console.log('❌ BUYBACK HOOK NOT CONFIGURED');
      console.log('   • The current funding cycle does not have a buyback delegate');
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

