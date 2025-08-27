#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

if (!NEYNAR_API_KEY) {
  console.error("❌ NEXT_PUBLIC_NEYNAR_API_KEY environment variable is required");
  process.exit(1);
}

async function testNeynarLookup() {
  // Test with a known Farcaster address
  const testAddresses = [
    "0xdf087b724174a3e4ed2338c0798193932e851f1b", // From project 53
    "0xaa23bb616192b9f596945a088ed4febfb2d71efe", // From project 53
    "0x59733c7cd78d08dab90368ad2cc09c8c81f097c0"  // From project 53
  ];

  console.log("🔍 Testing Neynar API lookup...\n");

  try {
    const csv = testAddresses.join(',');
    const options = {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
      },
    };
    
    const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${csv}&address_types=ethereum`;
    
    console.log(`📡 Making request to: ${url}`);
    
    const response = await fetch(url, options);
    console.log(`📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`✅ Response received:`, JSON.stringify(result, null, 2));
    
    if (result.users && result.users.length > 0) {
      console.log(`\n🎉 Found ${result.users.length} Farcaster profiles:`);
      result.users.forEach((user, index) => {
        console.log(`${index + 1}. @${user.username} (FID: ${user.fid})`);
        console.log(`   Addresses: ${user.verified_addresses?.join(', ') || 'None'}`);
        console.log(`   Display Name: ${user.display_name || 'None'}`);
        console.log('');
      });
    } else {
      console.log(`\n❌ No Farcaster profiles found for the test addresses`);
    }
    
  } catch (error) {
    console.error('❌ Error testing Neynar API:', error.message);
  }
}

testNeynarLookup();

