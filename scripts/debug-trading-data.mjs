#!/usr/bin/env node

import fetch from 'node-fetch';

const UNISWAP_ENDPOINT = "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1";

async function debugTradingData() {
  console.log("🔍 Debugging trading data to understand the real amounts...\n");

  try {
    // Get detailed swap data with pool information
    const query = `
      query GetDetailedSwaps {
        swaps(
          where: {
            pool: "0xe654dbdbdfb8be04a40b6b3b5ad3b0b12aebf828"
          }
          orderBy: timestamp
          orderDirection: desc
          first: 5
        ) {
          id
          timestamp
          origin
          amount0
          amount1
          amountUSD
          sqrtPriceX96
          tick
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
            token0Price
            token1Price
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

    console.log('🔍 Raw Swap Data Analysis:');
    console.log('==========================\n');

    result.data.swaps.forEach((swap, index) => {
      const date = new Date(swap.timestamp * 1000);
      const pool = swap.pool;
      const isToken0 = pool.token0.id.toLowerCase() === "0xBa1aFff81A239C926446a67D73F73eC51C37c777".toLowerCase();
      
      console.log(`${index + 1}. Swap ID: ${swap.id}`);
      console.log(`   Date: ${date.toISOString()}`);
      console.log(`   Trader: ${swap.origin}`);
      console.log(`   Pool: ${pool.token0.symbol}/${pool.token1.symbol} (${pool.feeTier/10000}%)`);
      console.log(`   SCORES is Token${isToken0 ? '0' : '1'}`);
      console.log('');
      
      console.log(`   Raw Amounts:`);
      console.log(`   - amount0: ${swap.amount0}`);
      console.log(`   - amount1: ${swap.amount1}`);
      console.log(`   - amountUSD: ${swap.amountUSD}`);
      console.log('');
      
      console.log(`   Pool Prices:`);
      console.log(`   - token0Price: ${pool.token0Price}`);
      console.log(`   - token1Price: ${pool.token1Price}`);
      console.log('');
      
      // Calculate what each amount represents
      const scoresAmount = isToken0 ? swap.amount0 : swap.amount1;
      const otherAmount = isToken0 ? swap.amount1 : swap.amount0;
      const scoresDecimals = isToken0 ? pool.token0.decimals : pool.token1.decimals;
      const otherDecimals = isToken0 ? pool.token1.decimals : pool.token0.decimals;
      const otherSymbol = isToken0 ? pool.token1.symbol : pool.token0.symbol;
      
      console.log(`   Interpreted Amounts:`);
      console.log(`   - SCORES (${scoresDecimals} decimals): ${scoresAmount} raw units`);
      console.log(`   - ${otherSymbol} (${otherDecimals} decimals): ${otherAmount} raw units`);
      console.log('');
      
      // Convert to human readable
      const scoresHuman = scoresAmount / Math.pow(10, scoresDecimals);
      const otherHuman = otherAmount / Math.pow(10, otherDecimals);
      
      console.log(`   Human Readable:`);
      console.log(`   - SCORES: ${scoresHuman.toFixed(6)} SCORES`);
      console.log(`   - ${otherSymbol}: ${otherHuman.toFixed(6)} ${otherSymbol}`);
      console.log(`   - USD Value: $${swap.amountUSD}`);
      console.log('');
      
      // Calculate price per SCORES
      if (scoresHuman !== 0) {
        const pricePerScores = Math.abs(swap.amountUSD) / Math.abs(scoresHuman);
        const priceInOther = Math.abs(otherHuman) / Math.abs(scoresHuman);
        
        console.log(`   Price Calculations:`);
        console.log(`   - Price per SCORES: $${pricePerScores.toFixed(2)}`);
        console.log(`   - Price in ${otherSymbol}: ${priceInOther.toFixed(6)} ${otherSymbol} per SCORES`);
        console.log('');
      }
      
      console.log('   ' + '='.repeat(60));
      console.log('');
    });

    // Check if amounts make sense
    console.log('🤔 Analysis Questions:');
    console.log('======================\n');
    
    console.log('1. Are the amounts realistic?');
    console.log('   - 0.000011 SCORES seems very small');
    console.log('   - Maybe we need to check token decimals');
    console.log('');
    
    console.log('2. Is the USD calculation correct?');
    console.log('   - $0.05 for 0.000011 SCORES = $4,545 per SCORES');
    console.log('   - This seems way too high');
    console.log('');
    
    console.log('3. Are we reading the pool data correctly?');
    console.log('   - 1 WETH = 942,658 SCORES seems inverted');
    console.log('   - Maybe SCORES should be worth much less');
    console.log('');

  } catch (error) {
    console.error('❌ Error debugging trading data:', error.message);
  }
}

debugTradingData();
