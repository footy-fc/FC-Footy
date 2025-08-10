import React, { useState } from 'react';
import { Info, ChevronDown, Users, Trophy, Flame, Clock } from "lucide-react";
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

const getTimeUntilMatch = (eventId: string) => {
  try {
    const parts = eventId.split("_");
    if (parts.length >= 5) {
      const matchTime = new Date(parseInt(parts[4]) * 1000);
      const now = new Date();
      const timeDiff = matchTime.getTime() - now.getTime();
      
      if (timeDiff > 0) {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
      }
    }
  } catch (error) {
    console.error("Error parsing match time:", error);
  }
  return null;
};

const getGameStatus = (game: SubgraphGame) => {
  const ticketsLeft = 25 - game.ticketsSold;
  const progressPercentage = (game.ticketsSold / 25) * 100;
  
  if (ticketsLeft === 0) return { status: 'Sold Out', color: 'text-deepPink', bgColor: 'bg-deepPink/20' };
  if (ticketsLeft <= 5) return { status: 'Almost Full', color: 'text-orange-400', bgColor: 'bg-orange-400/20' };
  if (progressPercentage >= 50) return { status: 'Half Full', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' };
  if (progressPercentage >= 25) return { status: 'Getting Busy', color: 'text-blue-400', bgColor: 'bg-blue-400/20' };
  return { status: 'Recently Deployed', color: 'text-green-400', bgColor: 'bg-green-400/20' };
};

const ActiveGamesBrowser: React.FC<ActiveGamesBrowserProps> = ({ initialGameId }) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedGame, setSelectedGame] = useState<string | null>(
    initialGameId || searchParams?.get('gameId') || null
  );
  const [isLoadingGame, setIsLoadingGame] = useState<boolean>(false);
  const [showInstructions, setShowInstructions] = useState(false);
  // Hide sort/filter affordances for now; keep defaults internally
  const [sortBy] = useState<'recent' | 'popular' | 'ending'>('recent');
  const [filterLeague] = useState<string>('all');

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
    .filter((game: SubgraphGame) => {
      if (filterLeague === 'all') return true;
      const eventDetails = parseEventId(game.eventId);
      return eventDetails?.leagueId === filterLeague;
    })
    .sort((a: SubgraphGame, b: SubgraphGame) => {
      if (sortBy === 'popular') {
        return b.ticketsSold - a.ticketsSold;
      }
      if (sortBy === 'ending') {
        const timeA = getTimeUntilMatch(a.eventId);
        const timeB = getTimeUntilMatch(b.eventId);
        if (timeA && timeB) {
          const hoursA = parseInt(timeA.split('h')[0]);
          const hoursB = parseInt(timeB.split('h')[0]);
          return hoursA - hoursB;
        }
        return 0;
      }
      // Default: recent
      return parseInt(b.createdAt) - parseInt(a.createdAt);
    })
    : [];

  const availableLeagues = React.useMemo(() => {
    const leagues = new Set<string>();
    data?.games?.forEach((game: SubgraphGame) => {
      const eventDetails = parseEventId(game.eventId);
      if (eventDetails?.leagueId) {
        leagues.add(eventDetails.leagueId);
      }
    });
    return Array.from(leagues).sort();
  }, [data?.games]);

  // Simple USD price fetcher for ETH affordance
  const [ethUsdPrice, setEthUsdPrice] = React.useState<number>(0);
  React.useEffect(() => {
    let cancelled = false;
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await res.json();
        if (!cancelled) setEthUsdPrice(Number(data?.ethereum?.usd || 0));
      } catch {}
    };
    fetchPrice();
    return () => { cancelled = true; };
  }, []);

  const PrizeUsdHint: React.FC<{ ethAmount: number }> = ({ ethAmount }) => {
    if (!ethUsdPrice || isNaN(ethAmount)) return null;
    const usd = ethAmount * ethUsdPrice;
    return (
      <div className="text-xs text-gray-400">≈ ${usd.toFixed(2)} USD</div>
    );
  };

  const handleGameSelect = (gameId: string) => {
    setSelectedGame(gameId);
    setIsLoadingGame(true);
    const params = new URLSearchParams(searchParams?.toString());
    params.delete('eventId'); 
    params.set('gameId', gameId);
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    setTimeout(() => setIsLoadingGame(false), 300);
  };

  const handleBack = () => {
    setSelectedGame(null);
    setIsLoadingGame(true);
    const params = new URLSearchParams(searchParams?.toString());
    params.delete('gameId');
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    setTimeout(() => setIsLoadingGame(false), 300);
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-limeGreenOpacity"></div>
          <span className="ml-2 text-gray-400">Loading active games...</span>
        </div>
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

      {/* Filters and Sorting hidden for now (limited referees/games) */}
  
      <div className="grid grid-cols-1 gap-4">
        {activeGames.map((game: SubgraphGame, idx: number) => {
          const eventDetails = parseEventId(game.eventId) || { homeTeam: "", awayTeam: "", leagueId: "" };
          const squarePriceEth = parseFloat(formatEther(BigInt(game.squarePrice)));
          const deployerFee = (game.deployerFeePercent / 100) * (25 * squarePriceEth);
          const communityFee = 0.04 * (25 * squarePriceEth);
          const finalPrizePool = 25 * squarePriceEth - deployerFee - communityFee;
          const ticketsLeft = 25 - game.ticketsSold;
          const deployedTime = formatShortDate(game.createdAt);
          const progressPercentage = (game.ticketsSold / 25) * 100;
          const timeUntilMatch = getTimeUntilMatch(game.eventId);
          const gameStatus = getGameStatus(game);
          const isHot = ticketsLeft <= 3 && ticketsLeft > 0;
          const isNew = Date.now() - parseInt(game.createdAt) * 1000 < 30 * 60 * 1000; // 30 minutes

          return (
            <div
              key={`${game.id}-${idx}`}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-limeGreenOpacity transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-xl"
              onClick={() => handleGameSelect(game.gameId)}
            >
              {/* Header with Status Badges */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {isNew && (
                    <div className="px-2 py-1 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                      <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span>
                      NEW
                    </div>
                  )}
                  {isHot && (
                    <div className="px-2 py-1 bg-red-600 text-white text-xs rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      HOT
                    </div>
                  )}
                  <div className={`px-2 py-1 text-xs rounded-full ${gameStatus.bgColor} ${gameStatus.color}`}>
                    {gameStatus.status}
                  </div>
                </div>

                {timeUntilMatch && (
                  <div className="flex items-center gap-1 text-blue-400 text-sm">
                    <Clock className="w-4 h-4" />
                    {timeUntilMatch}
                  </div>
                )}
              </div>

              {/* Teams & League */}
              <div className="flex justify-between items-center mb-3">
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
              <div className="text-xs text-lightPurple text-center mb-3 flex items-center justify-center gap-2">
                <span className="px-2 py-0.5 bg-blue-900 text-blue-200 rounded-full text-xs">
                  {getLeagueDisplayName(eventDetails.leagueId)}
                </span>
                <span className="flex items-center gap-1">
                  deployed {deployedTime}
                </span>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-lightPurple flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {ticketsLeft > 0 ? "Tickets Available" : "Tickets Sold Out"}
                  </span>
                  <span className={`font-bold ${ticketsLeft > 0 ? "text-yellow-400" : "text-deepPink"}`}>
                    {game.ticketsSold}/25
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      ticketsLeft === 0 ? "bg-deepPink" : 
                      ticketsLeft <= 5 ? "bg-orange-500" : 
                      progressPercentage >= 50 ? "bg-yellow-500" : 
                      progressPercentage >= 25 ? "bg-blue-500" : "bg-limeGreenOpacity"
                    }`} 
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
  
              {/* Prize Pool & Referee */}
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-lightPurple text-sm flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Prize Pool
                  </div>
                  <div className="text-lg font-bold text-limeGreenOpacity">{finalPrizePool.toFixed(4)} ETH</div>
                  <PrizeUsdHint ethAmount={finalPrizePool} />
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
          <div className="mt-8 text-center text-gray-400 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <p className="text-lg font-medium mb-2">No active games found</p>
              <p className="text-sm">Ready to be the first referee? Tap to create one!</p>
            </div>
            <ChevronDown className="w-6 h-6 animate-bounce text-limeGreenOpacity" />
          </div>
        )}
      </div>
    </div>
  );
  
};

export default ActiveGamesBrowser;
