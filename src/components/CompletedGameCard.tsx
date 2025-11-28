'use client';

import React, { useEffect, useState } from 'react';
import { useContractRead } from 'wagmi';
import { formatEther } from 'viem';
import { getTeamLogo, getLeagueCode, getLeagueDisplayName } from './utils/fetchTeamLogos';
import { parseEventId } from '../utils/eventIdParser';
import WinnerDisplay from './WinnerDisplay';
import FarcasterAvatar from './FarcasterAvatar';
import Image from 'next/image';
import { Trophy, Ticket, ShieldCheck } from 'lucide-react';
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

  if (!onChainTickets || !gameStatus) {
    return (
      <div className="relative bg-slateViolet/80 rounded-2xl p-4 border border-brightPink/35 w-full">
        <div className="flex items-center justify-center gap-2 text-lightPurple text-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brightPink"></div>
          ⏳ Loading game results...
        </div>
      </div>
    );
  }

  const calculatePrizePool = () => {
    if (!gameStatusRaw) return 0;

    const squarePriceEth = parseFloat(formatEther(BigInt(game.squarePrice)));
    const fullPool = squarePriceEth * 25;
    const totalFeePercent = (game.deployerFeePercent || 0) + 5;
    return fullPool * (1 - totalFeePercent / 100);
  };

  const ethPrizePool = calculatePrizePool();
  const usdPrizePool = ethPrice ? ethPrizePool * ethPrice : null;

  const eventLeague = eventDetails?.leagueId || '';
  const ticketsSold = Number(gameStatus?.ticketsSold || game.ticketsSold || 0);
  const ticketPrice = Number(game.squarePrice) / 1e18;
  const isRefunded = Boolean(gameStatus?.refunded);
  const statusLabel = isRefunded ? 'Refunded' : 'Completed';
  const statusBadge = isRefunded
    ? 'bg-orange-500/15 text-orange-200 border-orange-400/40'
    : 'bg-limeGreenOpacity/20 text-limeGreenOpacity border-limeGreenOpacity/40';

  const winnersReady =
    !!gameStatus &&
    Array.isArray(gameStatus.winningSquares) &&
    Array.isArray(onChainTickets) &&
    onChainTickets[0].length > 0 &&
    gameStatus.winningSquares.length > 0;

  return (
    <div className="relative bg-slateViolet/80 rounded-2xl p-4 border border-brightPink/35 shadow-[0_16px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_18px_36px_rgba(231,46,119,0.25)] overflow-hidden w-full">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brightPink/60 to-transparent" />

      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-[11px] border ${statusBadge}`}>{statusLabel}</span>
          <span className="px-3 py-1 bg-midnight/80 text-lightPurple rounded-full text-[11px] border border-brightPink/20">
            {getLeagueDisplayName(eventLeague)}
          </span>
          <span className="px-3 py-1 bg-midnight/70 text-lightPurple rounded-full text-[11px] border border-brightPink/15">Game #{game.gameId}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-lightPurple">
          <ShieldCheck className="w-4 h-4 text-brightPink" />
          Referee:
          <FarcasterAvatar address={game.referee} size={18} showName className="rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-3 items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Image
            src={getTeamLogo(eventDetails?.homeTeam, getLeagueCode(eventDetails?.leagueId))}
            alt={eventDetails?.homeTeam || 'Home Team'}
            width={44}
            height={44}
            className="object-contain"
          />
          <span className="font-semibold text-white text-base uppercase tracking-wide">{eventDetails?.homeTeam}</span>
        </div>
        <div className="text-center text-brightPink text-sm font-semibold">vs</div>
        <div className="flex items-center gap-2 justify-end">
          <span className="font-semibold text-white text-base uppercase tracking-wide">{eventDetails?.awayTeam}</span>
          <Image
            src={getTeamLogo(eventDetails?.awayTeam, getLeagueCode(eventDetails?.leagueId))}
            alt={eventDetails?.awayTeam || 'Away Team'}
            width={44}
            height={44}
            className="object-contain"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-midnight/70 border border-brightPink/25 rounded-xl p-3">
          <div className="text-lightPurple text-xs flex items-center gap-2 uppercase tracking-wide">
            <Trophy className="w-3 h-3" />
            Prize pool
          </div>
          <div className="text-base font-bold text-white">{ethPrizePool.toFixed(4)} ETH</div>
          <div className="text-xs text-gray-400">{usdPrizePool !== null ? `≈ $${usdPrizePool.toFixed(2)} USD` : '$'}</div>
        </div>
        <div className="bg-midnight/70 border border-brightPink/25 rounded-xl p-3">
          <div className="text-lightPurple text-xs flex items-center gap-2 uppercase tracking-wide">
            <Ticket className="w-3 h-3" />
            Ticket price
          </div>
          <div className="text-base font-semibold text-white">{ticketPrice.toFixed(4)} ETH</div>
          <div className="text-[11px] text-lightPurple mt-1">{ticketsSold}/25 tickets sold</div>
        </div>
      </div>

      <div className="bg-midnight/70 border border-brightPink/20 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-lightPurple">Outcome</span>
          <span className={`px-2 py-1 rounded-full text-[10px] border ${winnersReady ? 'border-limeGreenOpacity/40 text-limeGreenOpacity bg-limeGreenOpacity/10' : 'border-brightPink/30 text-lightPurple bg-slateViolet/40'}`}>
            {winnersReady ? 'Winners posted' : isRefunded ? 'Refunded' : 'Finalizing'}
          </span>
        </div>

        {!winnersReady ? (
          <div className="mt-3 text-sm text-lightPurple bg-slateViolet/40 border border-brightPink/15 rounded-lg px-3 py-2">
            {isRefunded ? 'This game was refunded.' : 'Final scores are being processed.'}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {gameStatus.winningSquares.map((squareIndex: number, i: number) => {
              const address = derivedPlayers[squareIndex] || undefined;
              const percentage = gameStatus.winnerPercentages[i] ?? 0;

              return (
                <WinnerDisplay
                  key={`${squareIndex}-${percentage}`}
                  winner={{ squareIndex, percentage }}
                  address={address}
                  className="bg-slateViolet/70 border border-brightPink/25 rounded-lg px-3 py-2"
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-lightPurple">
        <span className="truncate">Event ID: {game.eventId}</span>
        <span className="px-2 py-1 rounded-full bg-slateViolet/60 border border-brightPink/20 text-brightPink">Score Square</span>
      </div>
    </div>
  );
};

export default CompletedGameCard;
