#!/usr/bin/env node

import fetch from 'node-fetch';

const UNISWAP_ENDPOINT = "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1";
const NEYNAR_API_KEY = "DF367E27-ECE3-4D8E-B820-D24A7A07B104";

async function getTraderSummary() {
  console.log("📋 Generating Complete Trader Summary...\n");

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
          totalSoldUSD: 0,
          firstTrade: new Date(swap.timestamp * 1000),
          lastTrade: new Date(swap.timestamp * 1000)
        };
      }
      
      const scoresAmount = isToken0 ? swap.amount0 : swap.amount1;
      const usdValue = parseFloat(swap.amountUSD || '0');
      const date = new Date(swap.timestamp * 1000);
      
      if (scoresAmount > 0) {
        traderData[trader].totalBought += Math.abs(scoresAmount);
        traderData[trader].totalBoughtUSD += usdValue;
      } else {
        traderData[trader].totalSold += Math.abs(scoresAmount);
        traderData[trader].totalSoldUSD += usdValue;
      }
      
      if (date < traderData[trader].firstTrade) traderData[trader].firstTrade = date;
      if (date > traderData[trader].lastTrade) traderData[trader].lastTrade = date;
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

    // 1. BUYERS LIST
    console.log('🟢 SCORES TOKEN BUYERS');
    console.log('======================\n');
    console.log('Address | FID | Username | Buy Amount (SCORES) | Buy Value (USD)');
    console.log('--------|-----|----------|-------------------|-----------------');

    const buyers = Object.values(traderData)
      .filter(trader => trader.totalBought > 0)
      .sort((a, b) => b.totalBought - a.totalBought);

    buyers.forEach((trader) => {
      const user = getUserInfo(trader.address);
      console.log(`${trader.address} | ${user.fid} | @${user.username} | ${trader.totalBought.toFixed(2)} | $${trader.totalBoughtUSD.toFixed(2)}`);
    });

    console.log(`\n📊 Buyers Summary: ${buyers.length} traders, ${buyers.reduce((sum, t) => sum + t.totalBought, 0).toFixed(2)} SCORES, $${buyers.reduce((sum, t) => sum + t.totalBoughtUSD, 0).toFixed(2)} USD`);

    // 2. SELLERS LIST
    console.log('\n🔴 SCORES TOKEN SELLERS');
    console.log('=======================\n');
    console.log('Address | FID | Username | Sell Amount (SCORES) | Sell Value (USD)');
    console.log('--------|-----|----------|--------------------|------------------');

    const sellers = Object.values(traderData)
      .filter(trader => trader.totalSold > 0)
      .sort((a, b) => b.totalSold - a.totalSold);

    sellers.forEach((trader) => {
      const user = getUserInfo(trader.address);
      console.log(`${trader.address} | ${user.fid} | @${user.username} | ${trader.totalSold.toFixed(2)} | $${trader.totalSoldUSD.toFixed(2)}`);
    });

    console.log(`\n📊 Sellers Summary: ${sellers.length} traders, ${sellers.reduce((sum, t) => sum + t.totalSold, 0).toFixed(2)} SCORES, $${sellers.reduce((sum, t) => sum + t.totalSoldUSD, 0).toFixed(2)} USD`);

    // 3. NET POSITIONS LIST
    console.log('\n📈 NET POSITIONS (All Traders)');
    console.log('==============================\n');
    console.log('Address | FID | Username | Net Position (SCORES) | Net Value (USD) | Status');
    console.log('--------|-----|----------|---------------------|-----------------|--------');

    const allTraders = Object.values(traderData)
      .map(trader => ({
        ...trader,
        netPosition: trader.totalBought - trader.totalSold,
        netValue: trader.totalBoughtUSD - trader.totalSoldUSD
      }))
      .sort((a, b) => Math.abs(b.netPosition) - Math.abs(a.netPosition));

    allTraders.forEach((trader) => {
      const user = getUserInfo(trader.address);
      const status = trader.netPosition > 0 ? 'HOLDER' : trader.netPosition < 0 ? 'SELLER' : 'NEUTRAL';
      const netPos = trader.netPosition.toFixed(2);
      const netVal = trader.netValue.toFixed(2);
      
      console.log(`${trader.address} | ${user.fid} | @${user.username} | ${netPos} | $${netVal} | ${status}`);
    });

    // Summary statistics
    console.log('\n🎯 OVERALL MARKET SUMMARY');
    console.log('=========================\n');
    
    const totalBought = buyers.reduce((sum, t) => sum + t.totalBought, 0);
    const totalSold = sellers.reduce((sum, t) => sum + t.totalSold, 0);
    const totalBoughtUSD = buyers.reduce((sum, t) => sum + t.totalBoughtUSD, 0);
    const totalSoldUSD = sellers.reduce((sum, t) => sum + t.totalSoldUSD, 0);
    
    const holders = allTraders.filter(t => t.netPosition > 0);
    const netSellers = allTraders.filter(t => t.netPosition < 0);
    const neutral = allTraders.filter(t => t.netPosition === 0);
    
    console.log(`Total Traders: ${allTraders.length}`);
    console.log(`Holders: ${holders.length} (${(holders.length/allTraders.length*100).toFixed(1)}%)`);
    console.log(`Net Sellers: ${netSellers.length} (${(netSellers.length/allTraders.length*100).toFixed(1)}%)`);
    console.log(`Neutral: ${neutral.length} (${(neutral.length/allTraders.length*100).toFixed(1)}%)`);
    console.log('');
    console.log(`Total SCORES Bought: ${totalBought.toFixed(2)} ($${totalBoughtUSD.toFixed(2)})`);
    console.log(`Total SCORES Sold: ${totalSold.toFixed(2)} ($${totalSoldUSD.toFixed(2)})`);
    console.log(`Net Market Flow: ${(totalBought - totalSold).toFixed(2)} SCORES ($${(totalBoughtUSD - totalSoldUSD).toFixed(2)})`);
    console.log(`Average Price: $${((totalBoughtUSD + totalSoldUSD) / (totalBought + totalSold)).toFixed(4)} per SCORES`);

    // CSV Export
    console.log('\n📄 CSV EXPORT - NET POSITIONS');
    console.log('=============================\n');
    console.log('Address,FID,Username,Net_Position_SCORES,Net_Value_USD,Status,Total_Bought,Total_Sold');
    
    allTraders.forEach((trader) => {
      const user = getUserInfo(trader.address);
      const status = trader.netPosition > 0 ? 'HOLDER' : trader.netPosition < 0 ? 'SELLER' : 'NEUTRAL';
      
      console.log(`${trader.address},${user.fid},${user.username},${trader.netPosition.toFixed(2)},${trader.netValue.toFixed(2)},${status},${trader.totalBought.toFixed(2)},${trader.totalSold.toFixed(2)}`);
    });

  } catch (error) {
    console.error('❌ Error generating trader summary:', error.message);
  }
}

getTraderSummary();
