#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BENDYSTRAW_API_KEY = process.env.BENDYSTRAW_API_KEY || "3ZHM6jJ6Dqpyjms9zfZQdR3o";
const BENDYSTRAW_BASE_URL = "https://bendystraw.xyz";
const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

if (!NEYNAR_API_KEY) {
  console.error("❌ NEXT_PUBLIC_NEYNAR_API_KEY environment variable is required");
  process.exit(1);
}

// GraphQL query for pay events
const PAY_EVENTS_QUERY = `
  query GetPayEvents($projectId: Int!, $chainId: Int!, $limit: Int) {
    payEvents(
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
        amountUsd
        beneficiary
        timestamp
      }
    }
  }
`;

/**
 * Fetch pay events from Bendystraw GraphQL API
 */
async function fetchPayEvents(projectId, chainId, limit = 100) {
  try {
    const response = await fetch(`${BENDYSTRAW_BASE_URL}/${BENDYSTRAW_API_KEY}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: PAY_EVENTS_QUERY,
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

    return result.data.payEvents.items;
  } catch (error) {
    console.error('❌ Failed to fetch pay events:', error.message);
    throw error;
  }
}

/**
 * Fetch Farcaster user data by addresses using Neynar API
 */
async function fetchUsersByAddress(addresses) {
  if (!addresses || addresses.length === 0) {
    return { users: [] };
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
    throw err;
  }
}

/**
 * Convert wei to ETH
 */
function weiToEth(wei) {
  const weiBigInt = BigInt(wei);
  const ethBigInt = weiBigInt / BigInt(10 ** 18);
  const remainder = weiBigInt % BigInt(10 ** 18);
  
  if (ethBigInt === 0n) {
    // If less than 1 ETH, show in gwei
    const gwei = Number(weiBigInt) / (10 ** 9);
    return gwei.toFixed(6) + ' gwei';
  } else {
    // If 1 ETH or more, show in ETH with decimal places
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
 * Main function to process pay events and look up Farcaster profiles
 */
async function processPayEvents(projectId, chainId, limit = 100) {
  console.log(`🔍 Fetching pay events for project ${projectId} on chain ${chainId}...\n`);
  
  try {
    // Fetch pay events
    const payEvents = await fetchPayEvents(projectId, chainId, limit);
    console.log(`✅ Found ${payEvents.length} pay events\n`);
    
    // Extract unique addresses
    const addresses = [...new Set(payEvents.map(event => event.from))];
    console.log(`🔍 Looking up Farcaster profiles for ${addresses.length} unique addresses...\n`);
    
    // Fetch Farcaster profiles
    const farcasterData = await fetchUsersByAddress(addresses);
    const users = farcasterData.users || [];
    
         // Create a map of address to Farcaster profile
     const addressToProfile = {};
     
     // Handle the Neynar API response format
     Object.entries(farcasterData).forEach(([address, userArray]) => {
       if (userArray && userArray.length > 0) {
         const user = userArray[0]; // Take the first user if multiple
         addressToProfile[address.toLowerCase()] = {
           fid: user.fid,
           username: user.username,
           displayName: user.display_name
         };
       }
     });
    
    // Process and display results
    console.log(`📊 Pay Events Analysis for Project ${projectId} (Chain ${chainId})\n`);
         console.log(`Total Events: ${payEvents.length}`);
     console.log(`Unique Contributors: ${addresses.length}`);
     console.log(`Farcaster Profiles Found: ${Object.keys(addressToProfile).length}\n`);
    
    // Group by address and calculate totals
    const addressTotals = {};
    payEvents.forEach(event => {
      const address = event.from.toLowerCase();
      if (!addressTotals[address]) {
        addressTotals[address] = {
          address: event.from,
          totalAmount: BigInt(0),
          totalAmountEth: 0,
          eventCount: 0,
          firstPayment: event.timestamp,
          lastPayment: event.timestamp,
          profile: addressToProfile[address] || null
        };
      }
      
      addressTotals[address].totalAmount += BigInt(event.amount);
      addressTotals[address].eventCount++;
      addressTotals[address].firstPayment = Math.min(addressTotals[address].firstPayment, event.timestamp);
      addressTotals[address].lastPayment = Math.max(addressTotals[address].lastPayment, event.timestamp);
    });
    
         // Convert totals to ETH and sort by amount
     Object.values(addressTotals).forEach(total => {
       const weiBigInt = total.totalAmount;
       const ethBigInt = weiBigInt / BigInt(10 ** 18);
       const remainder = weiBigInt % BigInt(10 ** 18);
       total.totalAmountEth = Number(ethBigInt) + Number(remainder) / (10 ** 18);
     });
     
     const sortedAddresses = Object.values(addressTotals).sort((a, b) => b.totalAmountEth - a.totalAmountEth);
    
    // Display results
    console.log(`🏆 Top Contributors:\n`);
    sortedAddresses.forEach((total, index) => {
      const profile = total.profile;
      const profileInfo = profile 
        ? `@${profile.username} (FID: ${profile.fid})`
        : 'No Farcaster profile found';
      
           console.log(`${index + 1}. ${total.address}`);
     console.log(`   💰 Total: ${weiToEth(total.totalAmount.toString())} (${total.eventCount} payments)`);
     console.log(`   📅 First: ${formatTimestamp(total.firstPayment)}`);
     console.log(`   📅 Last: ${formatTimestamp(total.lastPayment)}`);
     console.log(`   🐘 Farcaster: ${profileInfo}`);
     console.log('');
    });
    
         // Summary statistics
     const totalWei = sortedAddresses.reduce((sum, addr) => sum + addr.totalAmount, 0n);
     const profilesFound = sortedAddresses.filter(addr => addr.profile).length;
     
     console.log(`📈 Summary Statistics:`);
     console.log(`   Total contributed: ${weiToEth(totalWei.toString())}`);
     console.log(`   Contributors with Farcaster profiles: ${profilesFound}/${sortedAddresses.length}`);
     if (sortedAddresses.length > 0) {
       console.log(`   Average contribution: ${weiToEth((totalWei / BigInt(sortedAddresses.length)).toString())}`);
     } else {
       console.log(`   Average contribution: N/A (no contributors)`);
     }
    
  } catch (error) {
    console.error('❌ Error processing pay events:', error.message);
    process.exit(1);
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const projectId = parseInt(args[0]);
const chainId = parseInt(args[1]) || 8453; // Default to Base
const limit = parseInt(args[2]) || 100;

if (!projectId) {
  console.log('Usage: node bendystraw-pay-events.mjs <projectId> [chainId] [limit]');
  console.log('');
  console.log('Examples:');
  console.log('  node bendystraw-pay-events.mjs 53');
  console.log('  node bendystraw-pay-events.mjs 53 8453 50');
  console.log('  node bendystraw-pay-events.mjs 140 1 200');
  console.log('');
  console.log('Chain IDs:');
  console.log('  1 = Ethereum');
  console.log('  8453 = Base');
  console.log('  10 = Optimism');
  console.log('  42161 = Arbitrum');
  process.exit(1);
}

// Run the script
processPayEvents(projectId, chainId, limit);
