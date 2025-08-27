#!/usr/bin/env node

import fetch from 'node-fetch';

// Test with 1inch API for Base network
const ONEINCH_BASE_URL = "https://api.1inch.dev/swap/v6.0/8453";

async function testDEXTrading() {
  console.log("🔍 Testing DEX Trading APIs...\n");

  try {
    // Test 1inch API with a simple quote request
    // WETH to USDC on Base
    const wethAddress = "0x4200000000000000000000000000000000000006"; // WETH on Base
    const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base
    
    const url = `${ONEINCH_BASE_URL}/quote?src=${wethAddress}&dst=${usdcAddress}&amount=1000000000000000000`; // 1 WETH
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        // Note: You would need a 1inch API key for production use
        // 'Authorization': 'Bearer YOUR_API_KEY'
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('✅ 1inch API endpoint is accessible (requires API key)');
        console.log('📝 To use 1inch API, you need to:');
        console.log('   1. Get an API key from https://1inch.dev/');
        console.log('   2. Add it to your environment variables');
        console.log('   3. Update the MCP server configuration');
      } else {
        console.log(`❌ 1inch API error: ${response.status} ${response.statusText}`);
      }
      return;
    }

    const result = await response.json();
    
    console.log('✅ 1inch API is working!');
    console.log('\n📊 Sample Quote (1 WETH → USDC on Base):');
    console.log(`   From: ${result.fromToken.symbol} (${result.fromToken.address})`);
    console.log(`   To: ${result.toToken.symbol} (${result.toToken.address})`);
    console.log(`   Amount In: ${result.fromTokenAmount} ${result.fromToken.symbol}`);
    console.log(`   Amount Out: ${result.toTokenAmount} ${result.toToken.symbol}`);
    console.log(`   Price Impact: ${result.priceImpact}%`);
    console.log(`   Gas Cost: ${result.gasCost} wei`);
    console.log('');

    console.log('🎉 DEX Trading MCP server should be ready to use!');
    console.log('\n💡 Available features:');
    console.log('   • Get swap quotes across multiple DEXs');
    console.log('   • Find best trading routes');
    console.log('   • Get price data for any token pair');
    console.log('   • Monitor trading activity');

  } catch (error) {
    console.error('❌ Error testing DEX APIs:', error.message);
    console.log('\n💡 Alternative approaches:');
    console.log('   • Use 0x API for DEX aggregation');
    console.log('   • Use direct RPC calls to Uniswap contracts');
    console.log('   • Use Jupiter API for Solana DEXs');
    console.log('   • Use Bendystraw for Juicebox protocol data');
  }
}

testDEXTrading();

