#!/usr/bin/env node

import fetch from 'node-fetch';

const UNISWAP_ENDPOINT = "https://gateway.thegraph.com/api/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1";

async function testUniswapAPI() {
  console.log("🔍 Getting recent swaps for SCORES token pools...\n");

  try {
    // Get recent swaps for SCORES token (simplified query)
    const query = `
      query GetRecentSwaps {
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
        }
      }
    `;

    console.log('Querying most active pool (0.05% fee)...');
    
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

    console.log('✅ Found recent swaps for SCORES token!');
    console.log('\n📊 Recent Trading Activity (0.05% pool):');
    
    if (result.data.swaps.length === 0) {
      console.log('❌ No recent swaps found for this pool');
      return;
    }
    
    result.data.swaps.forEach((swap, index) => {
      const date = new Date(swap.timestamp * 1000).toISOString();
      
      // Determine if this is a buy or sell of SCORES
      let action, amount;
      if (swap.amount0 > 0) {
        action = 'BUY SCORES';
        amount = Math.abs(swap.amount0);
      } else {
        action = 'SELL SCORES';
        amount = Math.abs(swap.amount0);
      }
      
      console.log(`${index + 1}. ${action}`);
      console.log(`   Trader: ${swap.origin}`);
      console.log(`   Amount: ${amount.toFixed(6)} SCORES`);
      console.log(`   USD Value: $${parseFloat(swap.amountUSD || '0').toFixed(2)}`);
      console.log(`   Time: ${date}`);
      console.log(`   Transaction: ${swap.id}`);
      console.log('');
    });

    console.log('🎉 Trading activity analysis complete!');

  } catch (error) {
    console.error('❌ Error testing Uniswap API:', error.message);
    
    // Try a fallback query for all swaps
    console.log('\n🔄 Trying fallback query for all recent swaps...');
    try {
      const fallbackQuery = `
        query GetAllSwaps {
          swaps(
            orderBy: timestamp
            orderDirection: desc
            first: 3
          ) {
            id
            timestamp
            origin
            amountUSD
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
          query: fallbackQuery,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API is working, but no SCORES swaps found recently');
        console.log('Recent general swaps:', result.data.swaps.length);
      }
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
    }
  }
}

testUniswapAPI();
