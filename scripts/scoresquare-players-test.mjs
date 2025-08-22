#!/usr/bin/env node

/**
 * CLI test script to fetch ScoreSquare game players and look up their FIDs
 * 
 * Usage: node scripts/scoresquare-players-test.mjs
 * 
 * Note: This script requires:
 * 1. NEXT_PUBLIC_SUBGRAPH_URL environment variable pointing to a valid subgraph
 * 2. NEXT_PUBLIC_NEYNAR_API_KEY environment variable for Farcaster lookups
 */

import pkg from '@apollo/client';
const { ApolloClient, InMemoryCache, gql, HttpLink } = pkg;
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Using the existing fetchUsersByAddress function from the codebase
// This is the same implementation as src/components/utils/fetchUserByAddressNeynar.ts

// Load environment variables
dotenv.config();

// Use the same subgraph URL as the main app
const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/106307/score-square-v1/version/latest';

// Apollo Client setup (matching the main app configuration)
const client = new ApolloClient({
  link: new HttpLink({
    uri: SUBGRAPH_URL,
  }),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
  },
});

// GraphQL query for ScoreSquare players
const GET_SCORESQUARE_PLAYERS = gql`
  query GetScoreSquarePlayers($first: Int = 1000, $skip: Int = 0) {
    games(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
      where: { refunded: false }
    ) {
      id
      gameId
      eventId
      deployer
      tickets {
        buyer
        squareIndex
        purchasedAt
      }
    }
  }
`;

/**
 * Fetch Farcaster user data by addresses using Neynar API.
 * This is the same implementation as src/components/utils/fetchUserByAddressNeynar.ts
 */
async function fetchUsersByAddress(addresses) {
  if (!addresses || addresses.length === 0) {
    return { users: [] };
  }
  const csv = addresses.join(',');
  const query = csv;
  const options = {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'api_key': process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '',
    },
  };
  const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${query}&address_types=ethereum`;
  
  console.log(`🔍 Debug: Neynar API call:`);
  console.log(`   URL: ${url}`);
  console.log(`   Headers:`, options.headers);
  console.log(`   Addresses: ${addresses.length} addresses`);
  
  try {
    const response = await fetch(url, options);
    console.log(`🔍 Debug: Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`🔍 Debug: Error response: ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`🔍 Debug: Response body:`, JSON.stringify(result, null, 2).substring(0, 1000) + '...');
    
    return result;
  } catch (err) {
    console.error('Failed to fetch users by address:', err);
    throw err;
  }
}

/**
 * Generate mock ScoreSquare data for testing
 */
function generateMockScoreSquareData() {
  console.log('🧪 Using mock data for testing...');
  
  // Sample addresses (these are example addresses)
  const mockAddresses = [
    '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    '0x1234567890123456789012345678901234567890',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    '0x1111111111111111111111111111111111111111',
    '0x2222222222222222222222222222222222222222',
  ];
  
  return mockAddresses;
}

/**
 * Fetch all ScoreSquare players from subgraph
 */
async function fetchScoreSquarePlayers() {
  console.log('🔍 Fetching ScoreSquare players from subgraph...');
  
  try {
    const result = await client.query({
      query: GET_SCORESQUARE_PLAYERS,
      variables: { first: 1000, skip: 0 },
    });
    
    const games = result.data.games || [];
    console.log(`📊 Found ${games.length} games`);
    
    // Extract unique addresses and track participation stats
    const uniqueAddresses = new Set();
    const participationStats = new Map(); // address -> { tickets: 0, games: 0, deployed: 0 }
    
    games.forEach(game => {
      // Add deployer
      if (game.deployer) {
        const deployerAddr = game.deployer.toLowerCase();
        uniqueAddresses.add(deployerAddr);
        
        if (!participationStats.has(deployerAddr)) {
          participationStats.set(deployerAddr, { tickets: 0, games: 0, deployed: 0 });
        }
        participationStats.get(deployerAddr).deployed += 1;
        participationStats.get(deployerAddr).games += 1;
      }
      
      // Add ticket buyers
      if (game.tickets) {
        game.tickets.forEach(ticket => {
          if (ticket.buyer) {
            const buyerAddr = ticket.buyer.toLowerCase();
            uniqueAddresses.add(buyerAddr);
            
            if (!participationStats.has(buyerAddr)) {
              participationStats.set(buyerAddr, { tickets: 0, games: 0, deployed: 0 });
            }
            participationStats.get(buyerAddr).tickets += 1;
            
            // Count unique games (only once per game)
            const gameId = game.gameId;
            const userStats = participationStats.get(buyerAddr);
            if (!userStats.gameIds) {
              userStats.gameIds = new Set();
            }
            userStats.gameIds.add(gameId);
            userStats.games = userStats.gameIds.size;
          }
        });
      }
    });
    
    const addresses = Array.from(uniqueAddresses);
    console.log(`👥 Found ${addresses.length} unique addresses`);
    
    // Show participation stats summary
    const totalSubgraphTickets = Array.from(participationStats.values()).reduce((sum, stats) => sum + stats.tickets, 0);
    const totalSubgraphGames = Array.from(participationStats.values()).reduce((sum, stats) => sum + stats.games, 0);
    const totalSubgraphDeployed = Array.from(participationStats.values()).reduce((sum, stats) => sum + stats.deployed, 0);
    console.log(`📊 Total ScoreSquare activity: ${totalSubgraphTickets} tickets, ${totalSubgraphGames} games, ${totalSubgraphDeployed} deployed`);
    
    // Convert Set to array for JSON serialization
    participationStats.forEach((stats, address) => {
      if (stats.gameIds) {
        stats.gameIds = Array.from(stats.gameIds);
      }
    });
    
    return { addresses, participationStats };
  } catch (error) {
    console.error('❌ Error fetching ScoreSquare players:', error.message);
    
    if (error.message.includes('endpoint has been removed') || error.message.includes('404')) {
      console.log('⚠️  Subgraph endpoint not available. Using mock data for testing...');
      return generateMockScoreSquareData();
    }
    
    throw error;
  }
}

/**
 * Look up FIDs for addresses using Neynar API
 * Processes addresses in batches to avoid API limits
 */
async function lookupFIDs(addresses, participationStats) {
  console.log('🔍 Looking up FIDs for addresses...');
  
  if (!process.env.NEXT_PUBLIC_NEYNAR_API_KEY) {
    console.log('⚠️  No Neynar API key found. Skipping FID lookup.');
    console.log('   Set NEXT_PUBLIC_NEYNAR_API_KEY environment variable to enable FID lookup.');
    console.log('   You can get a free API key at: https://neynar.com/');
    return [];
  }
  
  try {
    // Process addresses in batches of 100 (Neynar API limit)
    const batchSize = 100;
    const allUsers = [];
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(addresses.length / batchSize)} (${batch.length} addresses)...`);
      
      const result = await fetchUsersByAddress(batch);
      
      // Handle the Neynar response format: {address: [users]}
      // We need to preserve which ScoreSquare address corresponds to which user
      if (result && typeof result === 'object') {
        Object.entries(result).forEach(([scoreSquareAddress, users]) => {
          if (Array.isArray(users) && users.length > 0) {
            users.forEach(user => {
              // Add the original ScoreSquare address to the user object
              user.originalScoreSquareAddress = scoreSquareAddress.toLowerCase();
              allUsers.push(user);
            });
          }
        });
      }
      
      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Found ${allUsers.length} users with Farcaster profiles`);
    
    return allUsers.map(user => {
      // Use the original ScoreSquare address for stats lookup
      const scoreSquareAddress = user.originalScoreSquareAddress;
      const userStats = participationStats.get(scoreSquareAddress) || { tickets: 0, games: 0, deployed: 0 };
      
      return {
        address: scoreSquareAddress, // Use the ScoreSquare address as the primary address
        custodyAddress: user.custody_address, // Keep the Farcaster custody address as additional info
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        followerCount: user.follower_count,
        followingCount: user.following_count,
        pfpUrl: user.pfp_url || user.profile?.avatar_url || '',
        // ScoreSquare participation stats (now correctly mapped!)
        ticketsPurchased: userStats.tickets,
        gamesParticipated: userStats.games,
        gamesDeployed: userStats.deployed,
      };
    });
  } catch (error) {
    console.error('❌ Error looking up FIDs:', error.message);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('⚠️  Invalid or missing Neynar API key.');
      console.log('   Please check your NEXT_PUBLIC_NEYNAR_API_KEY environment variable.');
      console.log('   You can get a free API key at: https://neynar.com/');
    }
    
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting ScoreSquare players FID lookup test...\n');
  
  try {
    // Step 1: Fetch ScoreSquare players
    const { addresses, participationStats } = await fetchScoreSquarePlayers();
    
    if (addresses.length === 0) {
      console.log('❌ No addresses found');
      return;
    }
    
    // Step 2: Look up FIDs for addresses that have Farcaster profiles
    console.log(`\n🔍 Debug: Looking up FIDs for ${addresses.length} addresses...`);
    console.log(`🔍 Debug: First 5 addresses:`, addresses.slice(0, 5));
    
    const usersWithFIDs = await lookupFIDs(addresses, participationStats);
    
    console.log(`🔍 Debug: Neynar returned ${usersWithFIDs.length} users`);
    if (usersWithFIDs.length > 0) {
      console.log(`🔍 Debug: First user from Neynar:`, usersWithFIDs[0]);
    }
    
    // Step 3: Create complete list of all ScoreSquare players (with and without Farcaster)
    console.log(`🔍 Debug: Processing ${usersWithFIDs.length} Neynar users against ${addresses.length} ScoreSquare addresses`);
    
    // Create a map of ScoreSquare addresses to their Farcaster profiles
    const addressToFarcasterMap = new Map();
    
    // Each user in usersWithFIDs now has the correct ScoreSquare address mapping
    usersWithFIDs.forEach(farcasterUser => {
      const scoreSquareAddress = farcasterUser.address.toLowerCase(); // This is now the ScoreSquare address
      addressToFarcasterMap.set(scoreSquareAddress, farcasterUser);
      console.log(`🔍 Debug: MAPPED! ScoreSquare ${scoreSquareAddress} -> Farcaster @${farcasterUser.username} (custody: ${farcasterUser.custodyAddress})`);
    });
    
    const allScoreSquarePlayers = addresses.map(address => {
      const userStats = participationStats.get(address.toLowerCase()) || { tickets: 0, games: 0, deployed: 0 };
      
      // Check if this address has a Farcaster profile
      const farcasterUser = addressToFarcasterMap.get(address.toLowerCase());
      
      if (farcasterUser) {
        // Address has Farcaster profile
        return {
          address: address,
          hasFarcaster: true,
          fid: farcasterUser.fid,
          username: farcasterUser.username,
          displayName: farcasterUser.displayName,
          followerCount: farcasterUser.followerCount,
          followingCount: farcasterUser.followingCount,
          pfpUrl: farcasterUser.pfpUrl,
          ticketsPurchased: userStats.tickets,
          gamesParticipated: userStats.games,
          gamesDeployed: userStats.deployed,
        };
      } else {
        // Address doesn't have Farcaster profile (or not found)
        return {
          address: address,
          hasFarcaster: false,
          fid: null,
          username: null,
          displayName: `Unknown (${address.slice(0, 8)}...)`,
          followerCount: null,
          followingCount: null,
          pfpUrl: null,
          ticketsPurchased: userStats.tickets,
          gamesParticipated: userStats.games,
          gamesDeployed: userStats.deployed,
        };
      }
    });
    
    // Sort by activity level (most active first)
    allScoreSquarePlayers.sort((a, b) => {
      const aActivity = a.ticketsPurchased + (a.gamesDeployed * 10); // Weight deployed games higher
      const bActivity = b.ticketsPurchased + (b.gamesDeployed * 10);
      return bActivity - aActivity;
    });
    
    // Step 4: Display results
    console.log('\n📋 All ScoreSquare Players (ranked by activity):');
    console.log('='.repeat(80));
    
    allScoreSquarePlayers.forEach((player, index) => {
      const activityBadge = player.ticketsPurchased > 50 ? '🔥' : player.ticketsPurchased > 10 ? '⭐' : player.ticketsPurchased > 0 ? '📈' : '👀';
      const farcasterBadge = player.hasFarcaster ? '🎭' : '🚫';
      
      console.log(`${index + 1}. ${activityBadge} ${player.displayName} ${farcasterBadge}`);
      console.log(`   Address: ${player.address}`);
      console.log(`   ScoreSquare: ${player.ticketsPurchased} tickets, ${player.gamesParticipated} games, ${player.gamesDeployed} deployed`);
      
      if (player.hasFarcaster) {
        console.log(`   Farcaster: @${player.username} (FID: ${player.fid})`);
        console.log(`   Followers: ${player.followerCount} | Following: ${player.followingCount}`);
        if (player.pfpUrl) {
          console.log(`   PFP: ${player.pfpUrl}`);
        }
      } else {
        console.log(`   Farcaster: No profile found`);
      }
      console.log('');
    });
      
    // Summary statistics
    const playersWithFarcaster = allScoreSquarePlayers.filter(p => p.hasFarcaster);
    const playersWithoutFarcaster = allScoreSquarePlayers.filter(p => !p.hasFarcaster);
    
    const totalTickets = allScoreSquarePlayers.reduce((sum, player) => sum + player.ticketsPurchased, 0);
    const totalGames = allScoreSquarePlayers.reduce((sum, player) => sum + player.gamesParticipated, 0);
    const totalDeployed = allScoreSquarePlayers.reduce((sum, player) => sum + player.gamesDeployed, 0);
    
    const totalFollowers = playersWithFarcaster.reduce((sum, player) => sum + (player.followerCount || 0), 0);
    const avgFollowers = playersWithFarcaster.length > 0 ? Math.round(totalFollowers / playersWithFarcaster.length) : 0;
    
    console.log('📊 Summary:');
    console.log(`- Total ScoreSquare players: ${allScoreSquarePlayers.length}`);
    console.log(`- Players with Farcaster profiles: ${playersWithFarcaster.length} (${((playersWithFarcaster.length / allScoreSquarePlayers.length) * 100).toFixed(1)}%)`);
    console.log(`- Players without Farcaster profiles: ${playersWithoutFarcaster.length} (${((playersWithoutFarcaster.length / allScoreSquarePlayers.length) * 100).toFixed(1)}%)`);
    console.log('');
    console.log('🎮 Total ScoreSquare Activity (all players):');
    console.log(`- Total tickets purchased: ${totalTickets}`);
    console.log(`- Total games participated: ${totalGames}`);
    console.log(`- Total games deployed: ${totalDeployed}`);
    console.log(`- Most active players: ${allScoreSquarePlayers.slice(0, 3).map(p => `${p.displayName} (${p.ticketsPurchased} tickets)`).join(', ')}`);
    
    if (playersWithFarcaster.length > 0) {
      console.log('');
      console.log('🎭 Farcaster Stats:');
      console.log(`- Total followers across all Farcaster players: ${totalFollowers.toLocaleString()}`);
      console.log(`- Average followers per Farcaster player: ${avgFollowers.toLocaleString()}`);
      console.log(`- Top Farcaster influencers: ${playersWithFarcaster.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0)).slice(0, 3).map(p => `${p.displayName} (${(p.followerCount || 0).toLocaleString()} followers)`).join(', ')}`);
    }
    
    // Show additional info about custody addresses vs ScoreSquare addresses
    const usersWithDifferentCustody = playersWithFarcaster.filter(player => 
      player.custodyAddress && player.custodyAddress.toLowerCase() !== player.address.toLowerCase()
    );
    
    if (usersWithDifferentCustody.length > 0) {
      console.log('');
      console.log('🎭 Address Mapping Info:');
      console.log(`- ${usersWithDifferentCustody.length} users have different Farcaster custody addresses`);
      console.log(`- ${playersWithFarcaster.length - usersWithDifferentCustody.length} users use the same address for both ScoreSquare and Farcaster`);
    }
    
    // Step 5: Save results to file
    const results = {
      timestamp: new Date().toISOString(),
      totalPlayers: allScoreSquarePlayers.length,
      playersWithFarcaster: playersWithFarcaster.length,
      playersWithoutFarcaster: playersWithoutFarcaster.length,
      allPlayers: allScoreSquarePlayers, // Complete list anchored on on-chain data
      participationStats: Object.fromEntries(participationStats), // Raw participation data
      summary: {
        totalTickets,
        totalGames,
        totalDeployed,
        totalFollowers,
        avgFollowers,
      }
    };
    
    const fs = await import('fs');
    const filename = `scoresquare-players-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${filename}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
