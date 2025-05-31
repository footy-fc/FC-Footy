import React, { useState } from 'react';
import { Info, ChevronDown } from "lucide-react";
import { useGames } from '../hooks/useSubgraphData';
import { formatEther } from 'viem';
import BlockchainScoreSquareDisplay from './BlockchainScoreSquareDisplay';
import { parseEventId } from '../utils/eventIdParser';
import { getTeamLogo, getLeagueCode, getLeagueDisplayName } from './utils/fetchTeamLogos';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import UserInstructions from './UserInstructions';
import FarcasterAvatar from './FarcasterAvatar';

interface SubgraphGame {
  deployer: string;
  id: string;
  gameId: string;
  eventId: string;
  squarePrice: string;
  deployerFeePercent: number;
  ticketsSold: number;
  prizePool: string;
  prizeClaimed: boolean;
  refunded: boolean;
  createdAt: string;
}

interface ActiveGamesBrowserProps {
  initialGameId?: string | null;
}

const formatShortDate = (timestamp: string) => {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).replace(",", "");
};


const ActiveGamesBrowser: React.FC<ActiveGamesBrowserProps> = ({ initialGameId }) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedGame, setSelectedGame] = useState<string | null>(
    initialGameId || searchParams?.get('gameId') || null
  );
  const [isLoadingGame, setIsLoadingGame] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const { data, loading, error } = useGames(20, 0);
  
  if (data?.games) {
    console.log("Raw prize pool values:", data.games.map((g: SubgraphGame) => ({
      id: g.id,
      prizePool: g.prizePool,
      refunded: g.refunded,
      prizeClaimed: g.prizeClaimed,
      ticketsSold: g.ticketsSold,
      squarePrice: g.squarePrice,
      createdAt: g.createdAt,
      eventId: g.eventId,
    })));
  }

  const activeGames = data?.games
    ? data.games
    .filter((game: SubgraphGame) => {
      const createdAtMs = parseInt(game.createdAt) * 1000;
      const tenMinutesAgo = Date.now() - 100 * 60 * 1000;
      const isNewlyDeployed = createdAtMs > tenMinutesAgo;
    
      return (
        !game.prizeClaimed &&
        !game.refunded &&
        BigInt(game.squarePrice) > 0n &&
        (game.ticketsSold > 0 || isNewlyDeployed)
      );
    })
        .sort((a: SubgraphGame, b: SubgraphGame) => {
          const leagueA = parseEventId(a.eventId)?.leagueId || "";
          const leagueB = parseEventId(b.eventId)?.leagueId || "";
          
          if (leagueA !== leagueB) {
            return leagueB.localeCompare(leagueA); // Sort alphabetically by league
          }
          
          return parseInt(a.createdAt) - parseInt(b.createdAt); // Newest first within each league
        })
    : [];

  const handleGameSelect = (gameId: string) => {
    setSelectedGame(gameId); // ✅ Update state before navigating
    setIsLoadingGame(true);
    const params = new URLSearchParams(searchParams?.toString());
    params.delete('eventId'); 
    params.set('gameId', gameId);
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    setTimeout(() => setIsLoadingGame(false), 300);
  };

  const handleBack = () => {
    setSelectedGame(null); // ✅ Clear selectedGame first
    setIsLoadingGame(true);
    const params = new URLSearchParams(searchParams?.toString());
    params.delete('gameId');
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    setTimeout(() => setIsLoadingGame(false), 300);
  };

  if (loading) {
    return (
      <div className="p-4">
        <p className="mt-4 text-gray-500 text-center">Loading active games...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-xl text-notWhite font-bold mb-4">Active Games</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error.message || 'Failed to load games'}</span>
        </div>
        <p className="mt-4 text-gray-500 text-center">Please try again later.</p>
      </div>
    );
  }

  if (selectedGame) {
    const game = activeGames.find((g: { gameId: string; }) => g.gameId === selectedGame);
    return (
      <div className="p-2">
        {isLoadingGame && <p className="text-center mt-2">Loading game...</p>}
        <div className="flex justify-between items-center mb-2">
          <button onClick={handleBack} className="px-4 py-2 text-notWhite">
            ← Active Games
          </button>
        </div>
        {game && <BlockchainScoreSquareDisplay eventId={game.eventId} />}
      </div>
    );
  }

  return (
    <div className="p-4 overflow-x-hidden w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl text-notWhite font-bold">Active Games</h1>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="flex items-center text-deepPink hover:text-fontRed focus:outline-none transition"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>
  
      {showInstructions && <UserInstructions />}
  
      <div className="grid grid-cols-1 gap-4">
        {activeGames.map((game: SubgraphGame) => {
          const eventDetails = parseEventId(game.eventId) || { homeTeam: "", awayTeam: "", leagueId: "" };
          const squarePriceEth = parseFloat(formatEther(BigInt(game.squarePrice)));
          const deployerFee = (game.deployerFeePercent / 100) * (25 * squarePriceEth);
          const communityFee = 0.04 * (25 * squarePriceEth);
          const finalPrizePool = 25 * squarePriceEth - deployerFee - communityFee;
          const ticketsLeft = 25 - game.ticketsSold;
          const deployedTime = formatShortDate(game.createdAt);
          const progressPercentage = (game.ticketsSold / 25) * 100;
          const progressColor = ticketsLeft === 0 ? "bg-deepPink" : "bg-limeGreenOpacity";
  
          return (
            <div
              key={game.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-limeGreenOpacity transition-colors cursor-pointer flex flex-col justify-between shadow-lg"
              onClick={() => handleGameSelect(game.gameId)}
            >
              {/* Teams & League */}
              <div className="flex justify-between items-center">
                {/* Home Team */}
                <div className="flex items-center gap-2">
                  <Image
                    src={getTeamLogo(eventDetails?.homeTeam, getLeagueCode(eventDetails?.leagueId))}
                    alt={eventDetails?.homeTeam}
                    width={30}
                    height={30}
                    className="object-contain"
                  />
                  <span className="font-semibold text-notWhite">{eventDetails?.homeTeam}</span>
                </div>
  
                <span className="text-lightPurple text-sm">vs</span>
  
                {/* Away Team */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-notWhite">{eventDetails?.awayTeam}</span>
                  <Image
                    src={getTeamLogo(eventDetails?.awayTeam, getLeagueCode(eventDetails?.leagueId))}
                    alt={eventDetails?.awayTeam}
                    width={30}
                    height={30}
                    className="object-contain"
                  />
                </div>
              </div>
  
              {/* League & Time Info */}
              <div className="text-xs text-lightPurple text-center my-2 flex items-center justify-center gap-2">
                <span className="px-2 py-0.5 bg-blue-900 text-blue-200 rounded-full text-xs">
                  {getLeagueDisplayName(eventDetails.leagueId)}
                </span>
                <span className="flex items-center gap-1">
                  deployed {deployedTime}
                </span>
              </div>

  
            {/* Tickets Progress Bar with Status Message */}
            <div className="mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-lightPurple">
                  {ticketsLeft > 0 ? "Tickets Available" : "Tickets Sold Out"}
                </span>
                <span className={`font-bold ${ticketsLeft > 0 ? "text-yellow-400" : "text-deepPink"}`}>
                  {game.ticketsSold}/25
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mt-1">
                <div className={`${progressColor} h-2.5 rounded-full`} style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
  
              {/* Prize Pool & Referee */}
              <div className="flex justify-between items-center text-sm mt-3">
                <div>
                  <div className="text-lightPurple">Prize Pool</div>
                  <div className="text-lg font-bold text-limeGreenOpacity">{finalPrizePool.toFixed(4)} ETH</div>
                  <div className="text-xs text-gray-400 mt-1">Game ID: {game.gameId}</div>
                </div>
  
                <div className="flex flex-col items-end">
                  <span className="text-lightPurple text-sm">Referee</span>
                  <FarcasterAvatar address={game.deployer} showName size={20} className="rounded-full" />
                  </div>
              </div>
            </div>
          );
        })}
        {activeGames.length === 0 && (
          <div className="mt-4 text-center text-gray-400 flex flex-col items-center gap-2">
            <p>No active games found. Ready to be the first referee? Scroll down and create one!</p>
            <ChevronDown className="w-6 h-6 animate-bounce text-limeGreenOpacity" />
          </div>
        )}
      </div>
    </div>
  );
  
};

export default ActiveGamesBrowser;
