import { NextResponse } from 'next/server';
import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';

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
      squarePrice
      tickets {
        buyer
        squareIndex
        purchasedAt
      }
    }
  }
`;

// Initialize Apollo Client
const client = new ApolloClient({
  link: new HttpLink({
    uri: 'https://api.studio.thegraph.com/query/106307/score-square-v1/version/latest',
  }),
  cache: new InMemoryCache(),
});

// Fetch Farcaster user data by addresses using Neynar API
async function fetchUsersByAddress(addresses: string[]) {
  if (!addresses || addresses.length === 0) {
    return { users: [] };
  }
  
  const csv = addresses.join(',');
  const options = {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'api_key': process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '',
    },
  };
  
  const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${csv}&address_types=ethereum`;
  
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch users by address:', err);
    throw err;
  }
}

// Fetch ScoreSquare players from subgraph
async function fetchScoreSquarePlayers() {
  try {
    const result = await client.query({
      query: GET_SCORESQUARE_PLAYERS,
      variables: { first: 1000, skip: 0 },
    });
    
    const games = result.data.games || [];
    
    // Extract unique addresses and track participation stats
    const uniqueAddresses = new Set<string>();
    const participationStats = new Map<string, { 
      tickets: number; 
      games: number; 
      deployed: number; 
      points: number;
      gameIds: Set<string> 
    }>();
    
    games.forEach((game: { 
      id: string; 
      gameId: string; 
      eventId: string; 
      deployer: string; 
      squarePrice: string; 
      tickets: Array<{ buyer: string; squareIndex: number; purchasedAt: string }> 
    }) => {
      const pricePerTicket = parseFloat(game.squarePrice || '0') / 1e18; // Convert from wei to ETH
      
      // Add deployer
      if (game.deployer) {
        const deployerAddr = game.deployer.toLowerCase();
        uniqueAddresses.add(deployerAddr);
        
        if (!participationStats.has(deployerAddr)) {
          participationStats.set(deployerAddr, { tickets: 0, games: 0, deployed: 0, points: 0, gameIds: new Set() });
        }
        const stats = participationStats.get(deployerAddr)!;
        stats.deployed += 1;
        stats.gameIds.add(game.gameId);
        stats.games = stats.gameIds.size;
      }
      
      // Add ticket buyers
      if (game.tickets) {
        game.tickets.forEach((ticket: { buyer: string; squareIndex: number; purchasedAt: string }) => {
          if (ticket.buyer) {
            const buyerAddr = ticket.buyer.toLowerCase();
            uniqueAddresses.add(buyerAddr);
            
            if (!participationStats.has(buyerAddr)) {
              participationStats.set(buyerAddr, { tickets: 0, games: 0, deployed: 0, points: 0, gameIds: new Set() });
            }
            const stats = participationStats.get(buyerAddr)!;
            stats.tickets += 1;
            stats.points += pricePerTicket; // Add points based on ticket price
            stats.gameIds.add(game.gameId);
            stats.games = stats.gameIds.size;
          }
        });
      }
    });
    
    const addresses = Array.from(uniqueAddresses);
    
    // Convert Set to array for JSON serialization and create new map with correct types
    const serializedStats = new Map<string, { 
      tickets: number; 
      games: number; 
      deployed: number; 
      points: number;
      gameIds: string[] 
    }>();
    
    participationStats.forEach((stats, address) => {
      serializedStats.set(address, {
        tickets: stats.tickets,
        games: stats.games,
        deployed: stats.deployed,
        points: stats.points,
        gameIds: Array.from(stats.gameIds)
      });
    });
    
    return { addresses, participationStats: serializedStats };
  } catch (error) {
    console.error('Error fetching ScoreSquare players:', error);
    throw error;
  }
}

// Look up FIDs for addresses using Neynar API
async function lookupFIDs(addresses: string[], participationStats: Map<string, { tickets: number; games: number; deployed: number; points: number; gameIds: string[] }>) {
  if (!process.env.NEXT_PUBLIC_NEYNAR_API_KEY) {
    return [];
  }
  
  try {
    const batchSize = 100;
    const allUsers: Array<{
      originalScoreSquareAddress: string;
      custody_address: string;
      fid: number;
      username: string;
      display_name: string;
      follower_count: number;
      following_count: number;
      pfp_url?: string;
      profile?: { avatar_url?: string };
    }> = [];
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const result = await fetchUsersByAddress(batch);
      
      // Handle the response format: {address: [users]}
      if (result && typeof result === 'object') {
        Object.entries(result).forEach(([scoreSquareAddress, users]) => {
          if (Array.isArray(users) && users.length > 0) {
            users.forEach((user: {
              custody_address: string;
              fid: number;
              username: string;
              display_name: string;
              follower_count: number;
              following_count: number;
              pfp_url?: string;
              profile?: { avatar_url?: string };
            }) => {
              // Create extended user object with original ScoreSquare address
              const extendedUser = {
                ...user,
                originalScoreSquareAddress: scoreSquareAddress.toLowerCase()
              };
              allUsers.push(extendedUser);
            });
          }
        });
      }
      
      // Add a small delay between batches
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allUsers.map(user => {
      const scoreSquareAddress = user.originalScoreSquareAddress;
      const userStats = participationStats.get(scoreSquareAddress) || { tickets: 0, games: 0, deployed: 0, points: 0, gameIds: [] };
      
      return {
        address: scoreSquareAddress,
        custodyAddress: user.custody_address,
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        followerCount: user.follower_count,
        followingCount: user.following_count,
        pfpUrl: user.pfp_url || user.profile?.avatar_url || '',
        ticketsPurchased: userStats.tickets,
        gamesParticipated: userStats.games,
        gamesDeployed: userStats.deployed,
        points: userStats.points,
        hasFarcaster: true,
      };
    });
  } catch (error) {
    console.error('Error looking up FIDs:', error);
    return [];
  }
}

export async function GET() {
  try {
    // Step 1: Fetch ScoreSquare players
    const { addresses, participationStats } = await fetchScoreSquarePlayers();
    
    if (addresses.length === 0) {
      return NextResponse.json({ allPlayers: [] });
    }
    
    // Step 2: Look up FIDs for addresses that have Farcaster profiles
    const usersWithFIDs = await lookupFIDs(addresses, participationStats);
    
    // Step 3: Create complete list of all ScoreSquare players (with and without Farcaster)
    const allScoreSquarePlayers = addresses.map(scoreSquareAddress => {
      const userStats = participationStats.get(scoreSquareAddress.toLowerCase()) || { tickets: 0, games: 0, deployed: 0, points: 0, gameIds: [] };
      
      // Check if this address has a Farcaster profile
      const farcasterUser = usersWithFIDs.find(user => user.address.toLowerCase() === scoreSquareAddress.toLowerCase());
      
      if (farcasterUser) {
        // Address has Farcaster profile
        return {
          address: scoreSquareAddress,
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
          points: userStats.points,
        };
      } else {
        // Address doesn't have Farcaster profile (or not found)
        return {
          address: scoreSquareAddress,
          hasFarcaster: false,
          fid: null,
          username: null,
          displayName: `Anon (${scoreSquareAddress.slice(0, 8)}...)`,
          followerCount: null,
          followingCount: null,
          pfpUrl: null,
          ticketsPurchased: userStats.tickets,
          gamesParticipated: userStats.games,
          gamesDeployed: userStats.deployed,
          points: userStats.points,
        };
      }
    });
    
    // Sort by points (descending) - total value of tickets purchased
    allScoreSquarePlayers.sort((a, b) => b.points - a.points);
    
    // Calculate summary statistics
    const playersWithFarcaster = allScoreSquarePlayers.filter(p => p.hasFarcaster);
    const playersWithoutFarcaster = allScoreSquarePlayers.filter(p => !p.hasFarcaster);
    
    const totalTickets = allScoreSquarePlayers.reduce((sum, player) => sum + player.ticketsPurchased, 0);
    const totalGames = allScoreSquarePlayers.reduce((sum, player) => sum + player.gamesParticipated, 0);
    const totalDeployed = allScoreSquarePlayers.reduce((sum, player) => sum + player.gamesDeployed, 0);
    const totalPoints = allScoreSquarePlayers.reduce((sum, player) => sum + player.points, 0);
    
    const totalFollowers = playersWithFarcaster.reduce((sum, player) => sum + (player.followerCount || 0), 0);
    const avgFollowers = playersWithFarcaster.length > 0 ? Math.round(totalFollowers / playersWithFarcaster.length) : 0;
    
    const results = {
      timestamp: new Date().toISOString(),
      totalPlayers: allScoreSquarePlayers.length,
      playersWithFarcaster: playersWithFarcaster.length,
      playersWithoutFarcaster: playersWithoutFarcaster.length,
      allPlayers: allScoreSquarePlayers,
      participationStats: Object.fromEntries(participationStats),
      summary: {
        totalTickets,
        totalGames,
        totalDeployed,
        totalPoints,
        totalFollowers,
        avgFollowers,
      }
    };
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('Error fetching ScoreSquare leaderboard:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch ScoreSquare leaderboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
