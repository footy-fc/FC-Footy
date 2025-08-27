#!/usr/bin/env node

import fetch from 'node-fetch';

const NEYNAR_API_KEY = "DF367E27-ECE3-4D8E-B820-D24A7A07B104";

// Trader addresses from the SCORES token trading activity
const TRADER_ADDRESSES = [
  "0x55402f5fc4239615cdccf033140d32f02050c2f7", // Most active - both buy/sell
  "0x41f4ddcc02c550a92336a027f248c7e2e0367dd0", // Recent seller
  "0x773a219cc0a500e6f36fb7bacffce4f584635d9d", // Small seller
  "0x52e3923cbcfb2c898484fef9f705fdf1e0037060"  // Small seller
];

async function lookupFarcasterProfiles() {
  console.log("🔍 Looking up Farcaster profiles for SCORES token traders...\n");

  try {
    // Use Neynar's bulk lookup endpoint
    const addressesParam = TRADER_ADDRESSES.join(',');
    const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addressesParam}&address_types=ethereum`, {
      method: 'GET',
      headers: {
        'api_key': NEYNAR_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ Farcaster profile lookup complete!\n');
    console.log('📊 Trader Profiles:');
    console.log('==================\n');

    TRADER_ADDRESSES.forEach((address, index) => {
      const users = result[address] || [];
      
      console.log(`${index + 1}. Address: ${address}`);
      
      if (users.length > 0) {
        const user = users[0]; // Get the first user
        console.log(`   ✅ Farcaster Profile Found!`);
        console.log(`   FID: ${user.fid}`);
        console.log(`   Username: @${user.username}`);
        console.log(`   Display Name: ${user.display_name || 'N/A'}`);
        console.log(`   Bio: ${user.profile.bio?.text || 'No bio'}`);
        console.log(`   Followers: ${user.follower_count || 0}`);
        console.log(`   Following: ${user.following_count || 0}`);
        
        // Check if they have a profile picture
        if (user.pfp_url) {
          console.log(`   Profile Picture: ${user.pfp_url}`);
        }
      } else {
        console.log(`   ❌ No Farcaster profile found`);
      }
      
      console.log('');
    });

    // Summary
    const profilesFound = TRADER_ADDRESSES.filter(address => 
      result[address] && result[address].length > 0
    ).length;
    
    console.log('📈 Summary:');
    console.log(`Total traders checked: ${TRADER_ADDRESSES.length}`);
    console.log(`Farcaster profiles found: ${profilesFound}`);
    console.log(`Profile rate: ${((profilesFound / TRADER_ADDRESSES.length) * 100).toFixed(1)}%`);

    if (profilesFound > 0) {
      console.log('\n🎯 Active Farcaster Traders:');
      TRADER_ADDRESSES.forEach((address, index) => {
        const users = result[address] || [];
        if (users.length > 0) {
          const user = users[0];
          console.log(`   • @${user.username} (FID: ${user.fid}) - ${address}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error looking up Farcaster profiles:', error.message);
  }
}

lookupFarcasterProfiles();
