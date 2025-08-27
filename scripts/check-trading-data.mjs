#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BENDYSTRAW_API_KEY = process.env.BENDYSTRAW_API_KEY || "3ZHM6jJ6Dqpyjms9zfZQdR3o";
const BENDYSTRAW_BASE_URL = "https://bendystraw.xyz";

/**
 * Check all available event types for a project
 */
async function checkTradingData(projectId, chainId) {
  console.log(`🔍 Checking trading/swap data for project ${projectId} on chain ${chainId}...\n`);

  try {
    // 1. Check pay events (contributions)
    console.log("📊 1. Pay Events (Contributions):");
    const payEvents = await queryEvents('payEvents', projectId, chainId, 5);
    console.log(`   Found ${payEvents.length} pay events\n`);

    // 2. Check burn events (token burns)
    console.log("🔥 2. Burn Events (Token Burns):");
    const burnEvents = await queryEvents('burnEvents', projectId, chainId, 5);
    console.log(`   Found ${burnEvents.length} burn events\n`);

    // 3. Check mint events (token mints)
    console.log("🪙 3. Mint Events (Token Mints):");
    const mintEvents = await queryEvents('mintTokensEvents', projectId, chainId, 5);
    console.log(`   Found ${mintEvents.length} mint events\n`);

    // 4. Check activity events (general activity)
    console.log("📈 4. Activity Events (General Activity):");
    const activityEvents = await queryActivityEvents(projectId, chainId, 10);
    console.log(`   Found ${activityEvents.length} activity events\n`);

    // 5. Check if there are any transfer events
    console.log("🔄 5. Transfer Events (if available):");
    try {
      const transferEvents = await queryEvents('transferEvents', projectId, chainId, 5);
      console.log(`   Found ${transferEvents.length} transfer events\n`);
    } catch (error) {
      console.log("   ❌ Transfer events not available in Bendystraw\n");
    }

    // 6. Check if there are any swap events
    console.log("💱 6. Swap Events (if available):");
    try {
      const swapEvents = await queryEvents('swapEvents', projectId, chainId, 5);
      console.log(`   Found ${swapEvents.length} swap events\n`);
    } catch (error) {
      console.log("   ❌ Swap events not available in Bendystraw\n");
    }

    // 7. Check if there are any trade events
    console.log("📈 7. Trade Events (if available):");
    try {
      const tradeEvents = await queryEvents('tradeEvents', projectId, chainId, 5);
      console.log(`   Found ${tradeEvents.length} trade events\n`);
    } catch (error) {
      console.log("   ❌ Trade events not available in Bendystraw\n");
    }

    // Summary
    console.log("📋 Summary:");
    console.log(`   • Pay Events: ${payEvents.length}`);
    console.log(`   • Burn Events: ${burnEvents.length}`);
    console.log(`   • Mint Events: ${mintEvents.length}`);
    console.log(`   • Activity Events: ${activityEvents.length}`);
    
    // Check if any activity events might be related to trading
    const tradingRelatedTypes = activityEvents.filter(event => 
      event.type && (
        event.type.includes('transfer') || 
        event.type.includes('swap') || 
        event.type.includes('trade') ||
        event.type.includes('sell') ||
        event.type.includes('buy')
      )
    );
    
    if (tradingRelatedTypes.length > 0) {
      console.log(`   • Trading-related Activity Events: ${tradingRelatedTypes.length}`);
      console.log("   Types found:", [...new Set(tradingRelatedTypes.map(e => e.type))].join(', '));
    } else {
      console.log("   • Trading-related Activity Events: 0");
    }

    console.log("\n💡 Conclusion:");
    if (burnEvents.length > 0 || tradingRelatedTypes.length > 0) {
      console.log("   ✅ Some trading activity detected through burn events or activity events");
    } else {
      console.log("   ❌ No direct trading/swap data available in Bendystraw");
      console.log("   📝 Note: Bendystraw focuses on Juicebox protocol events, not DEX trading");
      console.log("   🔍 For Uniswap trading data, you'd need to query Uniswap's subgraph directly");
    }

  } catch (error) {
    console.error('❌ Error checking trading data:', error.message);
  }
}

/**
 * Query events with standard fields
 */
async function queryEvents(eventType, projectId, chainId, limit = 5) {
  const query = `
    query Get${eventType.charAt(0).toUpperCase() + eventType.slice(1)}($projectId: Int!, $chainId: Int!, $limit: Int) {
      ${eventType}(
        limit: $limit, 
        where: {projectId: $projectId, chainId: $chainId}, 
        orderBy: "timestamp", 
        orderDirection: "desc"
      ) {
        items {
          id
          projectId
          chainId
          from
          timestamp
        }
      }
    }
  `;

  const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { projectId, chainId, limit }
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data[eventType].items;
}

/**
 * Query activity events with type field
 */
async function queryActivityEvents(projectId, chainId, limit = 10) {
  const query = `
    query GetActivityEvents($projectId: Int!, $chainId: Int!, $limit: Int) {
      activityEvents(
        limit: $limit, 
        where: {projectId: $projectId, chainId: $chainId}, 
        orderBy: "timestamp", 
        orderDirection: "desc"
      ) {
        items {
          id
          projectId
          chainId
          from
          timestamp
          type
        }
      }
    }
  `;

  const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { projectId, chainId, limit }
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  return result.data.activityEvents.items;
}

// CLI argument parsing
const args = process.argv.slice(2);
const projectId = parseInt(args[0]);
const chainId = parseInt(args[1]) || 8453; // Default to Base

if (!projectId) {
  console.log('Usage: node check-trading-data.mjs <projectId> [chainId]');
  console.log('');
  console.log('Examples:');
  console.log('  node check-trading-data.mjs 53');
  console.log('  node check-trading-data.mjs 53 8453');
  console.log('  node check-trading-data.mjs 140 1');
  process.exit(1);
}

// Run the script
checkTradingData(projectId, chainId);

