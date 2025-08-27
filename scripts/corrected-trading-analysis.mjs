#!/usr/bin/env node

import fetch from 'node-fetch';

const UNISWAP_ENDPOINT = "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1";
const NEYNAR_API_KEY = "DF367E27-ECE3-4D8E-B820-D24A7A07B104";

async function correctedTradingAnalysis() {
  console.log("🔍 Corrected Trading Analysis for SCORES Token...\n");

  try {
    // Get detailed swap data
    const query = `
      query GetDetailedSwaps {
        swaps(
          where: {
            pool: "0xe654dbdbdfb8be04a40b6b3b5ad3b0b12aebf828"
          }
          orderBy: timestamp
          orderDirection: desc
          first: 20
        ) {
          id
          timestamp
          origin
          amount0
          amount1
          amountUSD
          pool {
            id
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol
              decimals
            }
            feeTier
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

    // Process trading data correctly
    const traderData = {};
    
    result.data.swaps.forEach((swap) => {
      const trader = swap.origin;
      const date = new Date(swap.timestamp * 1000);
      const pool = swap.pool;
      const isToken0 = pool.token0.id.toLowerCase() === "0xBa1aFff81A239C926446a67D73F73eC51C37c777".toLowerCase();
      
      if (!traderData[trader]) {
        traderData[trader] = {
          address: trader,
          buys: [],
          sells: [],
          totalBought: 0,
          totalSold: 0,
          totalBoughtUSD: 0,
          totalSoldUSD: 0,
          firstTrade: date,
          lastTrade: date
        };
      }
      
      // CORRECTED: Amounts are already in human-readable form
      const scoresAmount = isToken0 ? swap.amount0 : swap.amount1;
      const wethAmount = isToken0 ? swap.amount1 : swap.amount0;
      const usdValue = parseFloat(swap.amountUSD || '0');
      
      // Determine if this is a buy or sell of SCORES
      let action, amount, wethValue;
      if (scoresAmount > 0) {
        action = 'BUY';
        amount = Math.abs(scoresAmount);
        wethValue = Math.abs(wethAmount);
        traderData[trader].buys.push({ 
          amount, 
          wethValue, 
          usdValue, 
          date, 
          txId: swap.id 
        });
        traderData[trader].totalBought += amount;
        traderData[trader].totalBoughtUSD += usdValue;
      } else {
        action = 'SELL';
        amount = Math.abs(scoresAmount);
        wethValue = Math.abs(wethAmount);
        traderData[trader].sells.push({ 
          amount, 
          wethValue, 
          usdValue, 
          date, 
          txId: swap.id 
        });
        traderData[trader].totalSold += amount;
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

    // Display corrected results
    console.log('✅ CORRECTED Trading Analysis Complete!\n');
    console.log('📊 Real Buy/Sell Analysis by Trader:');
    console.log('====================================\n');

    Object.values(traderData).forEach((trader, index) => {
      const users = profileResult[trader.address] || [];
      const user = users[0];
      
      console.log(`${index + 1}. ${user ? `@${user.username}` : 'Anonymous Trader'}`);
      console.log(`   Address: ${trader.address}`);
      if (user) {
        console.log(`   FID: ${user.fid} | Followers: ${user.follower_count}`);
        console.log(`   Bio: ${user.profile.bio?.text || 'No bio'}`);
      }
      console.log('');
      
      // Buy transactions
      if (trader.buys.length > 0) {
        console.log(`   🟢 BUY Transactions (${trader.buys.length}):`);
        trader.buys.forEach((buy, buyIndex) => {
          const pricePerScores = buy.usdValue / buy.amount;
          console.log(`      ${buyIndex + 1}. ${buy.amount.toFixed(6)} SCORES`);
          console.log(`         WETH: ${buy.wethValue.toFixed(6)} WETH`);
          console.log(`         USD: $${buy.usdValue.toFixed(2)}`);
          console.log(`         Price: $${pricePerScores.toFixed(4)} per SCORES`);
          console.log(`         Date: ${buy.date.toISOString()}`);
          console.log(`         TX: ${buy.txId}`);
        });
        console.log(`   Total Bought: ${trader.totalBought.toFixed(6)} SCORES ($${trader.totalBoughtUSD.toFixed(2)})`);
        console.log('');
      }
      
      // Sell transactions
      if (trader.sells.length > 0) {
        console.log(`   🔴 SELL Transactions (${trader.sells.length}):`);
        trader.sells.forEach((sell, sellIndex) => {
          const pricePerScores = sell.usdValue / sell.amount;
          console.log(`      ${sellIndex + 1}. ${sell.amount.toFixed(6)} SCORES`);
          console.log(`         WETH: ${sell.wethValue.toFixed(6)} WETH`);
          console.log(`         USD: $${sell.usdValue.toFixed(2)}`);
          console.log(`         Price: $${pricePerScores.toFixed(4)} per SCORES`);
          console.log(`         Date: ${sell.date.toISOString()}`);
          console.log(`         TX: ${sell.txId}`);
        });
        console.log(`   Total Sold: ${trader.totalSold.toFixed(6)} SCORES ($${trader.totalSoldUSD.toFixed(2)})`);
        console.log('');
      }
      
      // Summary
      const netAmount = trader.totalBought - trader.totalSold;
      const netUSD = trader.totalBoughtUSD - trader.totalSoldUSD;
      const avgBuyPrice = trader.totalBought > 0 ? trader.totalBoughtUSD / trader.totalBought : 0;
      const avgSellPrice = trader.totalSold > 0 ? trader.totalSoldUSD / trader.totalSold : 0;
      
      console.log(`   📈 Summary:`);
      console.log(`      Net Position: ${netAmount.toFixed(6)} SCORES ($${netUSD.toFixed(2)})`);
      console.log(`      Avg Buy Price: $${avgBuyPrice.toFixed(4)} per SCORES`);
      console.log(`      Avg Sell Price: $${avgSellPrice.toFixed(4)} per SCORES`);
      console.log(`      Trading Period: ${trader.firstTrade.toISOString()} to ${trader.lastTrade.toISOString()}`);
      console.log('');
      console.log('   ' + '='.repeat(50));
      console.log('');
    });

    // Overall summary
    const totalBought = Object.values(traderData).reduce((sum, t) => sum + t.totalBought, 0);
    const totalSold = Object.values(traderData).reduce((sum, t) => sum + t.totalSold, 0);
    const totalBoughtUSD = Object.values(traderData).reduce((sum, t) => sum + t.totalBoughtUSD, 0);
    const totalSoldUSD = Object.values(traderData).reduce((sum, t) => sum + t.totalSoldUSD, 0);
    
    console.log('🎯 CORRECTED Market Summary:');
    console.log(`Total SCORES Bought: ${totalBought.toFixed(6)} ($${totalBoughtUSD.toFixed(2)})`);
    console.log(`Total SCORES Sold: ${totalSold.toFixed(6)} ($${totalSoldUSD.toFixed(2)})`);
    console.log(`Net Market Flow: ${(totalBought - totalSold).toFixed(6)} SCORES ($${(totalBoughtUSD - totalSoldUSD).toFixed(2)})`);
    console.log(`Average Buy Price: $${(totalBoughtUSD / totalBought).toFixed(4)} per SCORES`);
    console.log(`Average Sell Price: $${(totalSoldUSD / totalSold).toFixed(4)} per SCORES`);
    console.log(`Price Range: $${Math.min(...Object.values(traderData).flatMap(t => [...t.buys, ...t.sells]).map(t => t.usdValue / t.amount)).toFixed(4)} - $${Math.max(...Object.values(traderData).flatMap(t => [...t.buys, ...t.sells]).map(t => t.usdValue / t.amount)).toFixed(4)} per SCORES`);

  } catch (error) {
    console.error('❌ Error in corrected analysis:', error.message);
  }
}

correctedTradingAnalysis();
