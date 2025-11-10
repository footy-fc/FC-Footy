// lib/gameApi.ts
import { Redis } from "@upstash/redis";
import { scanKeys } from "../app/api/lib/redisScan";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL!,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN!,
});

export type GameState = 'buying' | 'placing' | 'playing' | 'completed';

export type TicketType = {
  boughtRCPreShuffle: string;
  owner: number | null;
  pfp?: string;
  walletAddress?: string; // New field for the buyer's wallet address
  txHash?: string;        // New field for the transaction hash
};


export interface GameData {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  costPerTicket: number;
  serviceFee: number;
  gameState: GameState;
  tickets: TicketType[];
  boardPositions?: TicketType[];
  finalScore?: { home: number; away: number };
  winningTicket?: number;
  refereeId: number;
  payout?: number;
  prizeClaimed?: boolean;
  prizePaid?: boolean; 
  createdAt: string;
  updatedAt: string;
}

function getGameKey(gameId: string): string {
  return `score-square:game:${gameId}`;
}

export async function createGame(gameData: GameData): Promise<void> {
  await redis.set(getGameKey(gameData.gameId), JSON.stringify(gameData));
}

export async function getGamesByPrefix(prefix: string): Promise<GameData[]> {
  const pattern = `score-square:game:${prefix}*`;
  const keys: string[] = await scanKeys(redis as any, pattern, { count: 1000, limit: 100000 });
  const games: GameData[] = [];

  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      if (typeof data === 'string') {
        // Trim to remove any extraneous whitespace.
        const trimmedData = data.trim();
        // Check if it looks like valid JSON.
        if (trimmedData.startsWith('{') || trimmedData.startsWith('[')) {
          try {
            const game = JSON.parse(trimmedData) as GameData;
            games.push(game);
          } catch (err) {
            console.error("Failed to parse game data for key", key, trimmedData, err);
          }
        } else {
          console.error("Data does not appear to be JSON for key", key, data);
        }
      } else if (typeof data === 'object') {
        // If data is already an object, use it directly.
        games.push(data as GameData);
      }
    }
  }
  return games;
}

  
export async function getGame(gameId: string): Promise<GameData | null> {
    const data = await redis.get(getGameKey(gameId));
    if (!data) return null;
  
    // Log the type and value for debugging
    console.log("Type of data:", typeof data, data);
  
    // If the data is a string, parse it; otherwise assume it’s already an object.
    if (typeof data === 'string') {
      try {
        return JSON.parse(data) as GameData;
      } catch (err) {
        console.error("Failed to parse game data:", data, err);
        return null;
      }
    }
    return data as GameData;
}
  

export async function updateGameState(gameId: string, newState: GameState): Promise<void> {
  const game = await getGame(gameId);
  if (game) {
    game.gameState = newState;
    game.updatedAt = new Date().toISOString();
    await redis.set(getGameKey(gameId), JSON.stringify(game));
  }
}

export async function purchaseTickets(
  gameId: string,
  purchasedIndices: number[],
  buyerFid: number,
  buyerPfp: string,
  buyerWalletAddress?: string,
  transactionHash?: string
): Promise<void> {
  // Retrieve the existing game.
  const game = await getGame(gameId);
  if (!game) {
    throw new Error(`Game with id ${gameId} not found`);
  }

  // Update each specified ticket if it hasn't been bought already.
  purchasedIndices.forEach(index => {
    if (!game.tickets[index].owner) {
      game.tickets[index].pfp = buyerPfp;
      game.tickets[index].owner = buyerFid;
      // Record additional info.
      game.tickets[index].walletAddress = buyerWalletAddress;
      game.tickets[index].txHash = transactionHash;
    }
  });

  // Update the updatedAt timestamp.
  game.updatedAt = new Date().toISOString();

  // Store the updated game data in KV.
  await redis.set(getGameKey(gameId), JSON.stringify(game));
}

  
export async function randomizeBoard(gameId: string): Promise<void> {
  const game = await getGame(gameId);
  if (game) {
    const shuffled = [...game.tickets];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    game.boardPositions = shuffled;
    game.gameState = 'playing';
    game.updatedAt = new Date().toISOString();
    await redis.set(getGameKey(gameId), JSON.stringify(game));
  }
}

export async function submitFinalScore(
  gameId: string,
  finalScore: { home: number; away: number },
  refereeId: number
): Promise<void> {
  const game = await getGame(gameId);
  if (game) {
    game.finalScore = finalScore;
    const colIndex = finalScore.home >= 4 ? 4 : finalScore.home;
    const rowIndex = finalScore.away >= 4 ? 4 : finalScore.away;
    game.winningTicket = rowIndex * 5 + colIndex;
    game.refereeId = refereeId; 
    const purchasedCount = game.tickets.filter(ticket => ticket.owner !== null).length;
    const pot = purchasedCount * game.costPerTicket;
    game.payout = pot * (1 - game.serviceFee);
    game.gameState = 'completed';
    game.updatedAt = new Date().toISOString();
    await redis.set(getGameKey(gameId), JSON.stringify(game));
  }
}

export async function claimPrize(gameId: string): Promise<void> {
  const game = await getGame(gameId);
  if (game && game.gameState === 'completed' && !game.prizeClaimed) {
    game.prizeClaimed = true;
    game.prizePaid = false;
    game.updatedAt = new Date().toISOString();
    await redis.set(getGameKey(gameId), JSON.stringify(game));
  }
}

export async function attestPrizePaid(gameId: string): Promise<void> {
  const game = await getGame(gameId);
  if (game && game.gameState === 'completed' && game.prizeClaimed && !game.prizePaid) {
    game.prizePaid = true;
    game.updatedAt = new Date().toISOString();
    await redis.set(getGameKey(gameId), JSON.stringify(game));
  }
}
