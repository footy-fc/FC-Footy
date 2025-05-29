'use client';

import React, { useEffect, useState } from 'react';
import { useContractRead } from 'wagmi';
import { formatEther } from 'viem';
import { getTeamLogo, getLeagueCode } from './utils/fetchTeamLogos';
import { parseEventId } from '../utils/eventIdParser';
import WinnerDisplay from './WinnerDisplay';
import FarcasterAvatar from './FarcasterAvatar';
import Image from 'next/image';
import { SCORE_SQUARE_ADDRESS } from '../lib/config';

import type { GameStatusResponse, SubgraphGame } from '../types/gameTypes';
import { fetchNativeTokenPrice } from '~/utils/fetchUsdPrice';

const SCORE_SQUARE_ABI = [
  {
    name: 'getAllTickets',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'gameId', type: 'uint256' }],
    outputs: [
      { name: 'ticketNumbers', type: 'uint8[]' },
      { name: 'owners', type: 'address[]' },
    ],
  },
  {
    name: 'getGameStatus',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'gameId', type: 'uint256' }],
    outputs: [
      { name: 'active', type: 'bool' },
      { name: 'referee', type: 'address' },
      { name: 'squarePrice', type: 'uint256' },
      { name: 'ticketsSold', type: 'uint8' },
      { name: 'prizePool', type: 'uint256' },
      { name: 'winningSquares', type: 'uint8[]' },
      { name: 'winnerPercentages', type: 'uint8[]' },
      { name: 'prizeClaimed', type: 'bool' },
      { name: 'eventId', type: 'string' },
      { name: 'refunded', type: 'bool' },
    ],
  },
];

const CompletedGameCard: React.FC<{ game: SubgraphGame }> = ({ game }) => {
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const eventDetails = parseEventId(game.eventId);

  useEffect(() => {
  const fetchPrice = async () => {
    try {
      const price = await fetchNativeTokenPrice('base');
      setEthPrice(price);
    } catch (error) {
      console.error('Failed to fetch ETH price:', error);
      setEthPrice(null);
      // Consider adding retry logic here
    }
  };
  
  fetchPrice();
}, []);

  const { data: onChainTickets } = useContractRead({
    address: SCORE_SQUARE_ADDRESS as `0x${string}`,
    abi: SCORE_SQUARE_ABI,
    functionName: 'getAllTickets',
    args: [BigInt(game.gameId)],
    chainId: 8453,
  });
  
  const { data: gameStatusRaw } = useContractRead({
    address: SCORE_SQUARE_ADDRESS as `0x${string}`,
    abi: SCORE_SQUARE_ABI,
    functionName: 'getGameStatus',
    args: [BigInt(game.gameId)],
    chainId: 8453,
  });
  
  // 🧠 Manually shape the return tuple into a proper object
  const gameStatus: GameStatusResponse | null = Array.isArray(gameStatusRaw) && gameStatusRaw.length === 10
    ? {
        active: gameStatusRaw[0],
        referee: gameStatusRaw[1],
        squarePrice: gameStatusRaw[2],
        ticketsSold: gameStatusRaw[3],
        prizePool: gameStatusRaw[4],
        winningSquares: gameStatusRaw[5],
        winnerPercentages: gameStatusRaw[6],
        prizeClaimed: gameStatusRaw[7],
        eventId: gameStatusRaw[8],
        refunded: gameStatusRaw[9],
      }
    : null;
  
  
  const derivedPlayers = Array(25).fill(null);
  if (Array.isArray(onChainTickets) && onChainTickets.length === 2) {
    const [indexes, owners] = onChainTickets as [number[], string[]];
    indexes.forEach((idx, i) => {
      derivedPlayers[idx] = owners[i] || null;
    });
  }

    // 🧠 Debug logs
    console.log('🏁 gameStatus:', gameStatus);
    console.log('🧠 derivedPlayers:', derivedPlayers);
    console.log("✅ gameStatus?.winningSquares:", gameStatus?.winningSquares);
    console.log("✅ Array.isArray(gameStatus?.winningSquares):", Array.isArray(gameStatus?.winningSquares));
    console.log("✅ onChainTickets:", onChainTickets);
    console.log("✅ Array.isArray(onChainTickets):", Array.isArray(onChainTickets));
    console.log("✅ onChainTickets[0].length:", Array.isArray(onChainTickets) && onChainTickets[0]?.length);

  if (!onChainTickets || !gameStatus) {
    return (
      <div className="text-gray-400 text-sm px-4 py-2">
        ⏳ Loading game results...
      </div>
    );
  }
  // Calculate ETH prize pool
  const calculatePrizePool = () => {
    if (!gameStatusRaw) return 0;
    
    const squarePriceEth = parseFloat(formatEther(BigInt(game.squarePrice)));
    const fullPool = squarePriceEth * 25;
    const totalFeePercent = (game.deployerFeePercent || 0) + 5;
    return fullPool * (1 - totalFeePercent / 100);
  };

  const ethPrizePool = calculatePrizePool();
  const usdPrizePool = ethPrice ? ethPrizePool * ethPrice : null;


  return (
    <div className="w-full max-w-md bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-limeGreenOpacity transition-colors cursor-pointer flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div>
          {eventDetails ? (
            <div className="flex items-center gap-1">
              <Image
                src={getTeamLogo(eventDetails.homeTeam, getLeagueCode(eventDetails.leagueId))}
                alt={eventDetails.homeTeam}
                width={20}
                height={20}
                className="object-contain"
              />
              <span className="font-bold text-notWhite text-sm">{eventDetails.homeTeam}</span>
              <span className="mx-1 text-lightPurple text-xs">v</span>
              <span className="font-bold text-notWhite text-sm">{eventDetails.awayTeam}</span>
              <Image
                src={getTeamLogo(eventDetails.awayTeam, getLeagueCode(eventDetails.leagueId))}
                alt={eventDetails.awayTeam}
                width={20}
                height={20}
                className="object-contain"
              />
            </div>
          ) : (
            <span className="text-notWhite text-xs">{game.eventId}</span>
          )}
          {eventDetails && (
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-blue-900 text-blue-200 rounded-full text-[10px]">
                {eventDetails.league}
              </span>
              <span className="text-lightPurple text-xs flex items-center gap-1">
                REF:
                <FarcasterAvatar address={game.referee} size={16} className="rounded-full" />
              </span>
            </div>
          )}
        </div>

        <div className="text-right">
        <div className="text-[11px] text-lightPurple">PRIZE POOL</div>
        <div className="text-base font-semibold text-limeGreenOpacity">
          {ethPrizePool.toFixed(4)} ETH
        </div>
        <div className="text-xs text-gray-400">
          {usdPrizePool !== null ? (
            `~$${usdPrizePool.toLocaleString('en-US', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}`
          ) : (
            <span className="text-gray-500">USD value unavailable</span>
          )}
        </div>
      </div>
      </div>

      <div>
      {!gameStatus ||
 !Array.isArray(gameStatus.winningSquares) ||
 !Array.isArray(onChainTickets) ||
 onChainTickets[0].length === 0 ? (
  <div className="bg-yellow-900 bg-opacity-40 px-2 py-1 rounded text-[11px] text-yellow-200">
    ⏳ Loading game results...
  </div>
) : gameStatus.winningSquares.length > 0 ? (
  // ✅ Render real winners
  <div className="px-2 py-1 rounded text-sm text-limeGreenOpacity">
    <p className="font-semibold text-notWhite text-[13px] mb-1">🏆 Winners</p>
    <div className="space-y-1">
      {gameStatus.winningSquares.map((squareIndex: number, i: number) => {
        const address = derivedPlayers[squareIndex] || undefined;
        const percentage = gameStatus.winnerPercentages[i] ?? 0;

        return (
          <WinnerDisplay
            key={`${squareIndex}-${percentage}`}
            winner={{ squareIndex, percentage }}
            address={address}
          />
        );
      })}
    </div>
  </div>
) : (
  <div className="bg-yellow-900 bg-opacity-40 px-2 py-1 rounded text-[11px] text-yellow-200">
    ⏳ Finalized, no winners.
  </div>
)}



</div>


      <div className="text-[10px] text-gray-500 truncate">ID: {game.eventId}</div>
    </div>
  );
};

export default CompletedGameCard;
