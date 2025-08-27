#!/usr/bin/env node

import fetch from 'node-fetch';

const UNISWAP_ENDPOINT = "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1";
const NEYNAR_API_KEY = "DF367E27-ECE3-4D8E-B820-D24A7A07B104";

async function getHoldersOnly() {
  console.log("📋 SCORES Token Holders Only (Net Positive Positions)\n");

  try {
    // Get swap data
    const query = `
      query GetDetailedSwaps {
        swaps(
          where: {
            pool: "0xe654dbdbdfb8be04a40b6b3b5ad3b0b12aebf828"
          }
          orderBy: timestamp
          orderDirection: desc
          first: 50
        ) {
          id
          timestamp
          origin
          amount0
          amount1
          amountUSD
          pool {
            token0 {
              id
              symbol
            }
            token1 {
              id
              symbol
            }
          }
        }
      }
    `;

    const response = await fetch(UNISWAP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer f98075161b29cf5d23462fe8dc08ec62'
      },
      body: JSON.stringify({
        query,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', JSON.stringify(result.errors, null, 2));
      return;
    }

    // Process trading data
    const traderData = {};
    
    result.data.swaps.forEach((swap) => {
      const trader = swap.origin;
      const pool = swap.pool;
      const isToken0 = pool.token0.id.toLowerCase() === "0xBa1aFff81A239C926446a67D73F73eC51C37c777".toLowerCase();
      
      if (!traderData[trader]) {
        traderData[trader] = {
          address: trader,
          totalBought: 0,
          totalSold: 0,
          totalBoughtUSD: 0,
          totalSoldUSD: 0
        };
      }
      
      const scoresAmount = isToken0 ? swap.amount0 : swap.amount1;
      const usdValue = parseFloat(swap.amountUSD || '0');
      
      if (scoresAmount > 0) {
        traderData[trader].totalBought += Math.abs(scoresAmount);
        traderData[trader].totalBoughtUSD += usdValue;
      } else {
        traderData[trader].totalSold += Math.abs(scoresAmount);
        traderData[trader].totalSoldUSD += usdValue;
      }
    });

    // Get Farcaster profiles
    const addresses = Object.keys(traderData);
    const addressesParam = addresses.join(',');
    
    const profileResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addressesParam}&address_types=ethereum`, {
      method: 'GET',
      headers: {
        'api_key': NEYNAR_API_KEY
      }
    });

    const profileResult = await profileResponse.json();

    // Helper function to get user info
    const getUserInfo = (address) => {
      const users = profileResult[address] || [];
      const user = users[0];
      return {
        fid: user ? user.fid : 'N/A',
        username: user ? user.username : 'Anonymous'
      };
    };

    // Calculate net positions and filter for holders only
    const holders = Object.values(traderData)
      .map(trader => ({
        ...trader,
        netPosition: trader.totalBought - trader.totalSold,
        netValue: trader.totalBoughtUSD - trader.totalSoldUSD
      }))
      .filter(trader => trader.netPosition > 0) // Only holders (net positive)
      .sort((a, b) => b.netPosition - a.netPosition); // Sort by net position

    // Display holders table
    console.log('📊 SCORES Token Holders (Net Positive Positions)');
    console.log('================================================\n');
    console.log('Account | FID | @Username | Net Amount (SCORES)');
    console.log('--------|-----|-----------|-------------------');

    holders.forEach((trader) => {
      const user = getUserInfo(trader.address);
      const netAmount = trader.netPosition.toFixed(2);
      
      console.log(`${trader.address} | ${user.fid} | @${user.username} | ${netAmount}`);
    });

    // Summary
    console.log(`\n📈 Summary:`);
    console.log(`Total Holders: ${holders.length}`);
    console.log(`Total SCORES Held: ${holders.reduce((sum, t) => sum + t.netPosition, 0).toFixed(2)}`);
    console.log(`Total Value Held: $${holders.reduce((sum, t) => sum + t.netValue, 0).toFixed(2)}`);

    // CSV Export
    console.log('\n📄 CSV Format:');
    console.log('=============\n');
    console.log('Account,FID,Username,Net_Amount_SCORES');
    
    holders.forEach((trader) => {
      const user = getUserInfo(trader.address);
      const netAmount = trader.netPosition.toFixed(2);
      
      console.log(`${trader.address},${user.fid},${user.username},${netAmount}`);
    });

  } catch (error) {
    console.error('❌ Error getting holders:', error.message);
  }
}

getHoldersOnly();
