#!/usr/bin/env node

import fetch from 'node-fetch';

const UNISWAP_ENDPOINT = "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1";

async function checkTokenDetails() {
  console.log("🔍 Checking SCORES token details and pricing...\n");

  try {
    // Get token details
    const query = `
      query GetTokenDetails {
        token(id: "0xBa1aFff81A239C926446a67D73F73eC51C37c777") {
          id
          symbol
          name
          decimals
          totalSupply
          volume
          volumeUSD
          totalValueLocked
          totalValueLockedUSD
        }
        
        pools(
          where: {
            or: [
              { token0: "0xBa1aFff81A239C926446a67D73F73eC51C37c777" },
              { token1: "0xBa1aFff81A239C926446a67D73F73eC51C37c777" }
            ]
          }
          first: 3
        ) {
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
          totalValueLockedUSD
          volumeUSD
          token0Price
          token1Price
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

    console.log('✅ Token Details:');
    console.log('================\n');

    const token = result.data.token;
    if (token) {
      console.log(`Token: ${token.symbol} (${token.name})`);
      console.log(`Address: ${token.id}`);
      console.log(`Decimals: ${token.decimals}`);
      console.log(`Total Supply: ${token.totalSupply}`);
      console.log(`Volume: ${token.volume}`);
      console.log(`Volume USD: $${token.volumeUSD}`);
      console.log(`TVL: ${token.totalValueLocked}`);
      console.log(`TVL USD: $${token.totalValueLockedUSD}`);
      console.log('');
    }

    console.log('📊 Pool Details:');
    console.log('===============\n');

    result.data.pools.forEach((pool, index) => {
      const isToken0 = pool.token0.id.toLowerCase() === "0xBa1aFff81A239C926446a67D73F73eC51C37c777".toLowerCase();
      const scoresToken = isToken0 ? pool.token0 : pool.token1;
      const otherToken = isToken0 ? pool.token1 : pool.token0;
      
      console.log(`${index + 1}. Pool: ${pool.token0.symbol}/${pool.token1.symbol} (${pool.feeTier/10000}%)`);
      console.log(`   Pool ID: ${pool.id}`);
      console.log(`   SCORES Decimals: ${scoresToken.decimals}`);
      console.log(`   Other Token Decimals: ${otherToken.decimals}`);
      console.log(`   Token0 Price: ${pool.token0Price}`);
      console.log(`   Token1 Price: ${pool.token1Price}`);
      console.log(`   TVL USD: $${pool.totalValueLockedUSD}`);
      console.log(`   Volume USD: $${pool.volumeUSD}`);
      console.log('');
    });

    // Calculate actual price from recent trades
    console.log('💰 Price Analysis from Recent Trades:');
    console.log('====================================\n');
    
    const recentTrades = [
      { amount: 0.000011, usd: 0.05, action: 'SELL' },
      { amount: 0.000210, usd: 0.99, action: 'BUY' },
      { amount: 0.000109, usd: 0.52, action: 'SELL' },
      { amount: 0.000005, usd: 0.02, action: 'SELL' },
      { amount: 0.000018, usd: 0.08, action: 'SELL' }
    ];

    recentTrades.forEach((trade, index) => {
      const pricePerToken = trade.usd / trade.amount;
      console.log(`${index + 1}. ${trade.action}: ${trade.amount} SCORES for $${trade.usd}`);
      console.log(`   Price per SCORES: $${pricePerToken.toFixed(2)}`);
      console.log(`   Price per SCORES (formatted): $${pricePerToken.toLocaleString()}`);
      console.log('');
    });

    // Check if this might be in ETH instead of USD
    console.log('🤔 Alternative Price Interpretations:');
    console.log('====================================\n');
    
    recentTrades.forEach((trade, index) => {
      const pricePerTokenUSD = trade.usd / trade.amount;
      const pricePerTokenETH = (trade.usd / 3000) / trade.amount; // Assuming ETH ~$3000
      
      console.log(`${index + 1}. ${trade.action}: ${trade.amount} SCORES for $${trade.usd}`);
      console.log(`   If USD: $${pricePerTokenUSD.toFixed(2)} per SCORES`);
      console.log(`   If ETH: ${pricePerTokenETH.toFixed(6)} ETH per SCORES`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking token details:', error.message);
  }
}

checkTokenDetails();
