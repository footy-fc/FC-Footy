#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BENDYSTRAW_API_KEY = process.env.BENDYSTRAW_API_KEY || "3ZHM6jJ6Dqpyjms9zfZQdR3o";
const BENDYSTRAW_BASE_URL = "https://bendystraw.xyz";
const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

/**
 * Convert wei to ETH
 */
function weiToEth(wei) {
  const weiBigInt = BigInt(wei);
  const ethBigInt = weiBigInt / BigInt(10 ** 18);
  const remainder = weiBigInt % BigInt(10 ** 18);
  
  if (ethBigInt === 0n) {
    const gwei = Number(weiBigInt) / (10 ** 9);
    return gwei.toFixed(6) + ' gwei';
  } else {
    const ethDecimal = Number(remainder) / (10 ** 18);
    return (Number(ethBigInt) + ethDecimal).toFixed(6) + ' ETH';
  }
}

/**
 * Format timestamp to readable date
 */
function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Fetch Farcaster user data by addresses using Neynar API
 */
async function fetchUsersByAddress(addresses) {
  if (!addresses || addresses.length === 0) {
    return {};
  }
  
  const csv = addresses.join(',');
  const options = {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'api_key': NEYNAR_API_KEY,
    },
  };
  
  const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${csv}&address_types=ethereum`;
  
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error('❌ Failed to fetch users by address:', err);
    return {};
  }
}

/**
 * Analyze trading activity for a project
 */
async function analyzeTradingActivity(projectId, chainId) {
  console.log(`🔍 Analyzing trading activity for project ${projectId} on chain ${chainId}...\n`);

  try {
    // 1. Get burn events (potential trading activity)
    console.log("🔥 1. Burn Events Analysis (Potential Trading Activity):");
    const burnEvents = await queryBurnEvents(projectId, chainId, 50);
    console.log(`   Found ${burnEvents.length} burn events\n`);

    // 2. Get cash out events (tokens redeemed for ETH)
    console.log("💰 2. Cash Out Events Analysis (Token Redemptions):");
    const cashOutEvents = await queryCashOutEvents(projectId, chainId, 50);
    console.log(`   Found ${cashOutEvents.length} cash out events\n`);

    // 3. Get all activity events to see patterns
    console.log("📈 3. Activity Events Analysis:");
    const activityEvents = await queryActivityEvents(projectId, chainId, 100);
    console.log(`   Found ${activityEvents.length} activity events\n`);

    // 4. Get unique addresses involved in trading-like activities
    const tradingAddresses = new Set();
    burnEvents.forEach(event => tradingAddresses.add(event.from));
    cashOutEvents.forEach(event => tradingAddresses.add(event.from));
    
    // Look for addresses that have both minted and burned tokens
    const mintEvents = await queryMintEvents(projectId, chainId, 100);
    const mintAddresses = new Set(mintEvents.map(event => event.from));
    
    const addressesWithBothMintAndBurn = [...tradingAddresses].filter(addr => mintAddresses.has(addr));
    
    console.log(`   Addresses with burn events: ${tradingAddresses.size}`);
    console.log(`   Addresses with both mint and burn: ${addressesWithBothMintAndBurn.length}\n`);

    // 5. Look up Farcaster profiles for trading addresses
    console.log("🐘 4. Farcaster Profiles for Trading Addresses:");
    const farcasterData = await fetchUsersByAddress([...tradingAddresses]);
    
    // Create address to profile mapping
    const addressToProfile = {};
    Object.entries(farcasterData).forEach(([address, userArray]) => {
      if (userArray && userArray.length > 0) {
        const user = userArray[0];
        addressToProfile[address.toLowerCase()] = {
          fid: user.fid,
          username: user.username,
          displayName: user.display_name
        };
      }
    });
    
    console.log(`   Found ${Object.keys(addressToProfile).length} Farcaster profiles\n`);

    // 6. Analyze burn events in detail
    console.log("🔥 5. Detailed Burn Events Analysis:");
    if (burnEvents.length > 0) {
      const burnTotals = {};
      burnEvents.forEach(event => {
        const address = event.from.toLowerCase();
        if (!burnTotals[address]) {
          burnTotals[address] = {
            address: event.from,
            totalBurned: BigInt(0),
            burnCount: 0,
            firstBurn: event.timestamp,
            lastBurn: event.timestamp,
            profile: addressToProfile[address] || null
          };
        }
        burnTotals[address].totalBurned += BigInt(event.amount);
        burnTotals[address].burnCount++;
        burnTotals[address].firstBurn = Math.min(burnTotals[address].firstBurn, event.timestamp);
        burnTotals[address].lastBurn = Math.max(burnTotals[address].lastBurn, event.timestamp);
      });

      const sortedBurns = Object.values(burnTotals).sort((a, b) => Number(b.totalBurned - a.totalBurned));
      
      sortedBurns.forEach((burn, index) => {
        const profile = burn.profile;
        const profileInfo = profile 
          ? `@${profile.username} (FID: ${profile.fid})`
          : 'No Farcaster profile found';
        
        console.log(`${index + 1}. ${burn.address}`);
        console.log(`   🔥 Burned: ${weiToEth(burn.totalBurned.toString())} (${burn.burnCount} burns)`);
        console.log(`   📅 First: ${formatTimestamp(burn.firstBurn)}`);
        console.log(`   📅 Last: ${formatTimestamp(burn.lastBurn)}`);
        console.log(`   🐘 Farcaster: ${profileInfo}`);
        console.log('');
      });
    } else {
      console.log("   No burn events found\n");
    }

    // 7. Summary and conclusions
    console.log("📋 6. Trading Activity Summary:");
    console.log(`   • Total Burn Events: ${burnEvents.length}`);
    console.log(`   • Total Cash Out Events: ${cashOutEvents.length}`);
    console.log(`   • Unique Trading Addresses: ${tradingAddresses.size}`);
    console.log(`   • Addresses with Farcaster Profiles: ${Object.keys(addressToProfile).length}`);
    console.log(`   • Addresses with Both Mint and Burn: ${addressesWithBothMintAndBurn.length}`);

         const totalBurned = burnEvents.reduce((sum, event) => sum + BigInt(event.amount), 0n);
     
     console.log(`   • Total Tokens Burned: ${weiToEth(totalBurned.toString())}`);
     console.log(`   • Total Tokens Cashed Out: ${cashOutEvents.length} events (amount not available)`);

    console.log("\n💡 7. Trading Activity Conclusions:");
    
    if (burnEvents.length > 0 || cashOutEvents.length > 0) {
      console.log("   ✅ Trading activity detected!");
      console.log("   📝 What this means:");
      console.log("      • Burn events indicate tokens were destroyed (potential selling)");
      console.log("      • Cash out events indicate tokens were redeemed for ETH");
      console.log("      • These are indirect indicators of trading activity");
      console.log("      • However, this is NOT direct DEX trading data");
    } else {
      console.log("   ❌ No trading activity detected in Bendystraw data");
    }
    
    console.log("\n🔍 8. Important Notes:");
    console.log("   • Bendystraw tracks Juicebox protocol events, not DEX trading");
    console.log("   • Burn events can indicate selling activity but aren't direct trades");
    console.log("   • For actual Uniswap trading data, you'd need:");
    console.log("     - Uniswap V3 subgraph");
    console.log("     - DEX aggregator APIs (1inch, 0x, etc.)");
    console.log("     - Direct contract event monitoring");
    console.log("   • This analysis shows protocol-level activity, not DEX trades");

  } catch (error) {
    console.error('❌ Error analyzing trading activity:', error.message);
  }
}

/**
 * Query burn events
 */
async function queryBurnEvents(projectId, chainId, limit = 50) {
  const query = `
    query GetBurnEvents($projectId: Int!, $chainId: Int!, $limit: Int) {
      burnEvents(
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
          amount
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

  return result.data.burnEvents.items;
}

/**
 * Query cash out events
 */
async function queryCashOutEvents(projectId, chainId, limit = 50) {
  const query = `
    query GetCashOutEvents($projectId: Int!, $chainId: Int!, $limit: Int) {
      cashOutTokensEvents(
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

  return result.data.cashOutTokensEvents.items;
}

/**
 * Query activity events
 */
async function queryActivityEvents(projectId, chainId, limit = 100) {
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

/**
 * Query mint events
 */
async function queryMintEvents(projectId, chainId, limit = 100) {
  const query = `
    query GetMintEvents($projectId: Int!, $chainId: Int!, $limit: Int) {
      mintTokensEvents(
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
          beneficiary
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

  return result.data.mintTokensEvents.items;
}

// CLI argument parsing
const args = process.argv.slice(2);
const projectId = parseInt(args[0]);
const chainId = parseInt(args[1]) || 8453; // Default to Base

if (!projectId) {
  console.log('Usage: node analyze-trading-activity.mjs <projectId> [chainId]');
  console.log('');
  console.log('Examples:');
  console.log('  node analyze-trading-activity.mjs 53');
  console.log('  node analyze-trading-activity.mjs 53 8453');
  console.log('  node analyze-trading-activity.mjs 140 1');
  process.exit(1);
}

// Run the script
analyzeTradingActivity(projectId, chainId);
