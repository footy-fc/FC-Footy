#!/usr/bin/env node

import fetch from 'node-fetch';
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

// Target pool address
const TARGET_POOL = "0xe654dbdbdfb8be04a40b6b3b5ad3b0b12aebf828";

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

// GraphQL query for project events to check for buyback configuration
const PROJECT_EVENTS_QUERY = `
  query GetProjectEvents($projectId: Float!, $chainId: Float!) {
    payEvents(
      limit: 50,
      where: {projectId: $projectId, chainId: $chainId},
      orderBy: "timestamp",
      orderDirection: "desc"
    ) {
      items {
        id
        projectId
        chainId
        from
        amount
        amountUsd
        beneficiary
        timestamp
      }
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
 * Fetch project events to check for buyback patterns
 */
async function fetchProjectEvents(projectId, chainId) {
  try {
    console.log(`🔍 Fetching project events for project ${projectId} on chain ${chainId}...`);
    
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: PROJECT_EVENTS_QUERY,
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

    return result.data.payEvents.items;
  } catch (error) {
    console.error('❌ Failed to fetch project events:', error.message);
    throw error;
  }
}

/**
 * Check if buyback delegate is configured
 */
function checkBuybackConfiguration(fundingCycle, events) {
  console.log(`\n🔍 Buyback Delegate Configuration Check`);
  console.log('=' .repeat(80));
  
  if (!fundingCycle) {
    console.log('❌ No funding cycle found');
    return;
  }
  
  console.log(`📋 Current Funding Cycle #${fundingCycle.number}:`);
  console.log(`   • Start: ${new Date(fundingCycle.start * 1000).toISOString()}`);
  console.log(`   • End: ${new Date(fundingCycle.end * 1000).toISOString()}`);
  console.log(`   • Duration: ${fundingCycle.duration} seconds`);
  console.log(`   • Target: ${fundingCycle.target} wei`);
  console.log(`   • Currency: ${fundingCycle.currency}`);
  
  if (fundingCycle.metadata) {
    console.log(`   • Metadata: ${JSON.stringify(fundingCycle.metadata)}`);
  }
  
  // Check for buyback delegate in metadata
  const hasBuybackDelegate = fundingCycle.metadata && 
    (fundingCycle.metadata.buybackDelegate || 
     fundingCycle.metadata.hook || 
     fundingCycle.metadata.buybackHook);
  
  if (hasBuybackDelegate) {
    console.log(`\n✅ Buyback Delegate Found:`);
    console.log(`   • Delegate: ${fundingCycle.metadata.buybackDelegate || fundingCycle.metadata.hook || fundingCycle.metadata.buybackHook}`);
    
    // Check if it matches our target
    const delegateAddress = fundingCycle.metadata.buybackDelegate || fundingCycle.metadata.hook || fundingCycle.metadata.buybackHook;
    if (delegateAddress.toLowerCase() === JB_CONTRACTS.JBBuybackHook.toLowerCase()) {
      console.log(`   • ✅ Matches JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
    } else {
      console.log(`   • ❌ Different from JBBuybackHook: ${JB_CONTRACTS.JBBuybackHook}`);
    }
  } else {
    console.log(`\n❌ No buyback delegate configured in current funding cycle`);
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Analyze project activity for buyback patterns
 */
function analyzeProjectActivity(events) {
  console.log(`\n📊 Project Activity Analysis`);
  console.log('=' .repeat(80));
  
  if (!events || events.length === 0) {
    console.log('❌ No recent activity found');
    return;
  }
  
  console.log(`✅ Found ${events.length} recent pay events`);
  
  // Check for patterns that might indicate buyback activity
  const recentEvents = events.slice(0, 10);
  console.log(`\n📅 Recent Activity (last 10 events):`);
  
  recentEvents.forEach((event, index) => {
    const date = new Date(event.timestamp * 1000).toISOString();
    const amountEth = (parseFloat(event.amount) / Math.pow(10, 18)).toFixed(6);
    console.log(`   ${index + 1}. ${date}: ${amountEth} ETH from ${event.from}`);
  });
  
  // Check if any events might be buyback-related
  const buybackIndicators = events.filter(event => 
    event.from === JB_CONTRACTS.JBBuybackHook ||
    event.beneficiary === JB_CONTRACTS.JBBuybackHook ||
    event.amount > 0.1 * Math.pow(10, 18) // Large amounts might indicate buyback
  );
  
  if (buybackIndicators.length > 0) {
    console.log(`\n🔄 Potential Buyback Activity:`);
    buybackIndicators.forEach(event => {
      const date = new Date(event.timestamp * 1000).toISOString();
      const amountEth = (parseFloat(event.amount) / Math.pow(10, 18)).toFixed(6);
      console.log(`   • ${date}: ${amountEth} ETH (${event.from === JB_CONTRACTS.JBBuybackHook ? 'From Buyback Hook' : 'Large amount'})`);
    });
  } else {
    console.log(`\n❌ No buyback activity detected in recent events`);
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Display configuration recommendations
 */
function displayRecommendations(fundingCycle, hasBuybackDelegate) {
  console.log(`\n🎯 Configuration Recommendations`);
  console.log('=' .repeat(80));
  
  if (hasBuybackDelegate) {
    console.log('✅ Buyback delegate is already configured!');
    console.log('\n📋 Current Configuration:');
    console.log(`   • Delegate: ${fundingCycle.metadata.buybackDelegate || fundingCycle.metadata.hook || fundingCycle.metadata.buybackHook}`);
    console.log(`   • Target Pool: ${TARGET_POOL}`);
    
    console.log('\n🔧 Next Steps:');
    console.log('   1. Verify the delegate is working correctly');
    console.log('   2. Test buyback functionality');
    console.log('   3. Monitor buyback activity');
    
  } else {
    console.log('❌ No buyback delegate configured');
    console.log('\n🔧 Required Configuration:');
    console.log(`   1. Update funding cycle with buyback delegate`);
    console.log(`   2. Set delegate to: ${JB_CONTRACTS.JBBuybackHook}`);
    console.log(`   3. Configure pool address: ${TARGET_POOL}`);
    console.log(`   4. Set buyback parameters (slippage, etc.)`);
    
    console.log('\n📋 Configuration Parameters:');
    console.log(`   • Pool Address: ${TARGET_POOL}`);
    console.log(`   • Fee Tier: 500 (0.05%)`);
    console.log(`   • Slippage Tolerance: 500 (5%)`);
    console.log(`   • Minimum Buyback Amount: 0.01 ETH`);
  }
  
  console.log('\n⚠️  Note:');
  console.log('   • Only permission holders can update funding cycle configuration');
  console.log('   • Use account: 0x027f1684c6d31066c3f2468117f2508e8134fdfc');
  console.log('   • Test with small amounts before full deployment');
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const projectId = parseInt(args[0]) || 53;
  const chainId = parseInt(args[1]) || 8453;

  console.log('🔍 Buyback Delegate Configuration Check');
  console.log('=' .repeat(50));
  console.log(`📊 Project ID: ${projectId}`);
  console.log(`⛓️  Chain ID: ${chainId} (Base)`);
  console.log(`🏊 Target Pool: ${TARGET_POOL}`);
  console.log('');

  try {
    // Fetch current funding cycle
    const fundingCycle = await fetchCurrentFundingCycle(projectId, chainId);
    
    // Fetch project events
    const events = await fetchProjectEvents(projectId, chainId);
    
    // Check buyback configuration
    const hasBuybackDelegate = fundingCycle?.metadata && 
      (fundingCycle.metadata.buybackDelegate || 
       fundingCycle.metadata.hook || 
       fundingCycle.metadata.buybackHook);
    
    checkBuybackConfiguration(fundingCycle, events);
    
    // Analyze project activity
    analyzeProjectActivity(events);
    
    // Display recommendations
    displayRecommendations(fundingCycle, hasBuybackDelegate);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { fetchCurrentFundingCycle, fetchProjectEvents };

