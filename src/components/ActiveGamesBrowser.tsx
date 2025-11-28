import React, { useState } from 'react';
import { Info, ChevronDown, Users, Trophy, Flame, Share2 } from "lucide-react";
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
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
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

/*   const availableLeagues = React.useMemo(() => {
    const leagues = new Set<string>();
    data?.games?.forEach((game: SubgraphGame) => {
      const eventDetails = parseEventId(game.eventId);
      if (eventDetails?.leagueId) {
        leagues.add(eventDetails.leagueId);
      }
    });
    return Array.from(leagues).sort();
  }, [data?.games]); */

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

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (typeof navigator !== 'undefined' && navigator.share && shareUrl) {
        await navigator.share({ title: 'FC Footy - Active Games', url: shareUrl });
        setShareFeedback('Shared!');
      } else if (typeof navigator !== 'undefined' && navigator.clipboard && shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback('Link copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed', err);
      setShareFeedback('Unable to share right now');
    }

    setTimeout(() => setShareFeedback(null), 2000);
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
        <h2 className="text-xl text-notWhite font-bold mb-4">Select Game</h2>
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
      <div className="p-3 bg-midnight/80 border border-brightPink/35 rounded-2xl shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
        {isLoadingGame && <p className="text-center mt-2 text-lightPurple">Loading game...</p>}
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-white font-semibold px-3 py-2 rounded-full bg-slateViolet border border-brightPink/40 hover:border-brightPink transition-all"
          >
            <span className="text-brightPink">←</span>
            Active Games
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="px-4 py-2 rounded-full bg-brightPink text-white text-sm shadow-[0_8px_20px_rgba(231,46,119,0.3)] hover:bg-deepPink transition-colors"
            >
              {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-full bg-slateViolet text-lightPurple text-sm border border-brightPink/40 hover:text-white hover:border-brightPink transition-colors"
            >
              Share this game
            </button>
          </div>
        </div>
        {showInstructions && (
          <div className="mb-3">
            <UserInstructions />
          </div>
        )}
        {shareFeedback && (
          <div className="text-xs text-lightPurple mb-3">{shareFeedback}</div>
        )}
        {game && <BlockchainScoreSquareDisplay eventId={game.eventId} />}
      </div>
    );
  }

  return (
    <div className="p-4 overflow-x-hidden w-full bg-midnight/80 border border-brightPink/30 rounded-2xl shadow-[0_18px_38px_rgba(0,0,0,0.45)]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-brightPink mb-1">Score Square</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl text-white font-bold">Active Games</h1>
            <span className="h-[3px] w-12 bg-brightPink rounded-full"></span>
          </div>
          <p className="text-sm text-lightPurple mt-1">Pick your squares before they fill up.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-brightPink text-white text-sm shadow-[0_8px_20px_rgba(231,46,119,0.35)] hover:bg-deepPink transition-colors"
        >
          <Info className="w-4 h-4" />
          {showInstructions ? 'Hide instructions' : 'Show instructions'}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slateViolet text-lightPurple text-sm border border-brightPink/40 hover:text-white hover:border-brightPink transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share this view
        </button>
        {shareFeedback && (
          <span className="text-xs text-lightPurple self-center">{shareFeedback}</span>
        )}
      </div>

      {showInstructions && (
        <div className="mb-4">
          <UserInstructions />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {activeGames.map((game: SubgraphGame, idx: number) => {
          const eventDetails = parseEventId(game.eventId) || { homeTeam: "", awayTeam: "", leagueId: "" };
          const squarePriceEth = parseFloat(formatEther(BigInt(game.squarePrice)));
          const deployerFee = (game.deployerFeePercent / 100) * (25 * squarePriceEth);
          const communityFee = 0.04 * (25 * squarePriceEth);
          const finalPrizePool = 25 * squarePriceEth - deployerFee - communityFee;
          const ticketsLeft = 25 - game.ticketsSold;
          //const deployedTime = formatShortDate(game.createdAt);
          const progressPercentage = (game.ticketsSold / 25) * 100;
          //const timeUntilMatch = getTimeUntilMatch(game.eventId);
          const gameStatus = getGameStatus(game);
          const isHot = ticketsLeft <= 3 && ticketsLeft > 0;
          const isNew = Date.now() - parseInt(game.createdAt) * 1000 < 30 * 60 * 1000; // 30 minutes

          return (
            <div
              key={`${game.id}-${idx}`}
              className="relative bg-slateViolet/80 rounded-2xl p-4 border border-brightPink/35 hover:border-brightPink transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-[0_16px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_18px_36px_rgba(231,46,119,0.25)] overflow-hidden"
              onClick={() => handleGameSelect(game.gameId)}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brightPink/60 to-transparent" />
              {/* Compact Header */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {isNew && (
                    <div className="px-3 py-1 bg-brightPink/20 text-brightPink text-[11px] rounded-full flex items-center gap-1 border border-brightPink/40">
                      <span className="w-1.5 h-1.5 bg-brightPink rounded-full animate-pulse"></span>
                      New
                    </div>
                  )}
                  {isHot && (
                    <div className="px-3 py-1 bg-orange-500/20 text-orange-200 text-[11px] rounded-full flex items-center gap-1 border border-orange-400/40">
                      <Flame className="w-3 h-3" />
                      Hot
                    </div>
                  )}
                  <div className="px-3 py-1 bg-midnight/70 text-brightPink text-[11px] rounded-full border border-brightPink/30">
                    {gameStatus.status}
                  </div>
                  <span className="px-3 py-1 bg-midnight/80 text-lightPurple rounded-full text-[11px] border border-brightPink/20">
                    {getLeagueDisplayName(eventDetails.leagueId)}
                  </span>
                </div>
                <span className="text-xs text-lightPurple">Tickets available • {ticketsLeft > 0 ? `${ticketsLeft} left` : 'Sold out'}</span>
              </div>

              {/* Teams */}
              <div className="grid grid-cols-3 items-center gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Image
                    src={getTeamLogo(eventDetails?.homeTeam, getLeagueCode(eventDetails?.leagueId))}
                    alt={eventDetails?.homeTeam}
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
                    alt={eventDetails?.awayTeam}
                    width={44}
                    height={44}
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-lightPurple flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {ticketsLeft > 0 ? `${ticketsLeft} tickets left` : "Tickets Sold Out"}
                  </span>
                  <span className={`font-semibold ${ticketsLeft > 0 ? "text-brightPink" : "text-deepPink"}`}>
                    {game.ticketsSold}/25 sold
                  </span>
                </div>
                <div className="w-full bg-midnight rounded-full h-2.5 border border-brightPink/30">
                  <div
                    className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-brightPink via-deepPink to-limeGreenOpacity"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 items-start">
                <div className="bg-midnight/70 border border-brightPink/25 rounded-xl p-3">
                  <div className="text-lightPurple text-xs flex items-center gap-1 uppercase tracking-wide">
                    <Trophy className="w-3 h-3" />
                    Prize pool
                  </div>
                  <div className="text-base font-bold text-white">{finalPrizePool.toFixed(4)} ETH</div>
                  <PrizeUsdHint ethAmount={finalPrizePool} />
                </div>
                <div className="bg-midnight/70 border border-brightPink/25 rounded-xl p-3">
                  <div className="text-lightPurple text-xs uppercase tracking-wide">Ticket price</div>
                  <div className="text-base text-white">{squarePriceEth.toFixed(4)} ETH</div>
                  <PrizeUsdHint ethAmount={squarePriceEth} />
                </div>
              </div>

              {/* Footer: Referee + Game ID */}
              <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                <div className="text-lightPurple text-xs flex items-center gap-2">
                    Referee:
                  <FarcasterAvatar address={game.deployer} showName size={22} className="rounded-full" />
                </div>
                <span className="px-3 py-1 bg-slateViolet/80 border border-brightPink/25 rounded-full text-[11px] text-lightPurple">Game ID: {game.gameId}</span>
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
