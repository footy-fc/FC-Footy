/* eslint-disable */

import React, { useState, useEffect } from 'react';
import { zeroAddress } from 'viem';
import frameSdk from "@farcaster/frame-sdk";
import FarcasterAvatar from '../FarcasterAvatar';
import { fetchFarcasterProfileByAddress } from '../../utils/fetchFarcasterProfile';
import LoadingSpinner from '../game/LoadingSpinner';
import { useGameContext } from '../../context/GameContext';
import { Trophy, Users, Target, Clock } from 'lucide-react';

interface SquareGridProps {
  players: (string | null)[];
  cart?: number[];
  isReferee: boolean;
  handleSquareClick: (index: number) => void;
  handleTapSquare: (index: number) => void;
  gameState: "waiting for VAR" | "active" | "completed" | "loading" | "cancelled";  
  selectedWinners: {
    halftime: number | null;
    final: number | null;
  };
}

const SquareGrid: React.FC<SquareGridProps> = ({ 
  players, 
  cart = [],  
  isReferee,
  handleTapSquare, 
  handleSquareClick,
  gameState,
  selectedWinners,
}) => {
  const { 
    homeScore, 
    awayScore, 
    gameDataState, 
    isMatchLive, 
    timeUntilMatch,
    matchEvents 
  } = useGameContext();
  const ticketsSold = gameDataState?.ticketsSold || 0;
  const homeTeam = gameDataState?.eventId?.split("_")[2] ?? "HOME";
  const awayTeam = gameDataState?.eventId?.split("_")[3] ?? "AWAY";

  const [profiles, setProfiles] = useState<Record<string, { username: string; pfp: string; fid?: number }>>({});
  const [isFrameContext, setIsFrameContext] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [hoveredSquare, setHoveredSquare] = useState<number | null>(null);
  const [recentPurchases, setRecentPurchases] = useState<number[]>([]);

  const isValidScore = (value: string | number) => !isNaN(Number(value)) && value !== '-';
  const currentWinningSquare =
    ticketsSold >= 25 && isValidScore(homeScore) && isValidScore(awayScore)
      ? Number(homeScore) * 5 + Number(awayScore)
      : null;

  // ✅ Persist finalized winners
  const finalizedWinners = gameDataState?.winningSquares ?? [];

  useEffect(() => {
    const checkFrameContext = async () => {
      try {
        const context = await frameSdk.context;
        setIsFrameContext(!!context);
      } catch (error) {
        setIsFrameContext(false);
      }
    };
    checkFrameContext();
  }, []);

  useEffect(() => {
    const fetchProfiles = async () => {
      if (hasLoaded) return;
      setLoading(true);

      const validPlayers = players
        .filter((player): player is string => !!player && player !== zeroAddress)
        .filter((player, index, self) => self.indexOf(player) === index);

        if (validPlayers.length === 0) {
          setLoading(false);
          setHasLoaded(true);
          return;
        }
        

      const profileUpdates: Record<string, { username: string; pfp: string }> = {};
      for (const address of validPlayers) {
        if (!profiles[address]) { 
          const profile = await fetchFarcasterProfileByAddress(address);
          profileUpdates[address] = {
            username: profile?.username || "Anon",
            pfp: typeof profile?.pfp === "string" ? profile.pfp : profile?.pfp?.url ?? "/defifa_spinner.gif",
          };
        }
      }

      setProfiles(prevProfiles => ({ ...prevProfiles, ...profileUpdates }));
      setLoading(false);
      setHasLoaded(true);
    };

    fetchProfiles();
    const interval = setInterval(fetchProfiles, 5000);
    return () => clearInterval(interval);
  }, [players, hasLoaded]);

  // Track recent purchases for animation
  useEffect(() => {
    const newPurchases = players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => player && player !== zeroAddress)
      .map(({ index }) => index);
    
    setRecentPurchases(newPurchases);
  }, [players]);

  if (loading && !hasLoaded) {
    return (
      <div className="flex flex-col items-center w-full">
        <LoadingSpinner gameDataState={null} loadingStartTime={Date.now()} setLoading={setLoading} setError={() => {}} />
        <p className="mt-2 text-gray-400">Fetching players & profiles...</p>
      </div>
    );
  }

  // ✅ Add column and row labels ONLY if tickets are sold out (>=25)
  const showLabels = ticketsSold >= 25;
  const columnLabels = ["0", "1", "2", "3", "4+"];
  const rowLabels = ["0", "1", "2", "3", "4+"];

  const getSquareStatus = (index: number) => {
    const isHalftimeWinner = selectedWinners?.halftime === index || finalizedWinners[0] === index;
    const isFinalWinner = selectedWinners?.final === index || finalizedWinners[1] === index;
    const isWinningSquare = finalizedWinners.includes(index);
    const isSelected = cart.includes(index);
    const isOwned = !!players[index] && players[index] !== zeroAddress;
    const isCurrentWinning = currentWinningSquare === index;
    const isRecentlyPurchased = recentPurchases.includes(index);

    return {
      isHalftimeWinner,
      isFinalWinner,
      isWinningSquare,
      isSelected,
      isOwned,
      isCurrentWinning,
      isRecentlyPurchased
    };
  };

  const getSquareClasses = (index: number) => {
    const status = getSquareStatus(index);
    const baseClasses = "w-12 h-12 flex flex-col items-center justify-center rounded-lg border transition-all duration-300 transform hover:scale-105";
    
    if (status.isWinningSquare) {
      return `${baseClasses} bg-green-600 border-green-400 shadow-lg shadow-green-500/50 animate-pulse`;
    }
    if (status.isHalftimeWinner) {
      return `${baseClasses} bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/50`;
    }
    if (status.isFinalWinner) {
      return `${baseClasses} bg-yellow-600 border-yellow-400 shadow-lg shadow-yellow-500/50`;
    }
    if (status.isCurrentWinning && ticketsSold >= 25) {
      return `${baseClasses} bg-limeGreen border-limeGreenOpacity shadow-lg shadow-limeGreen/50 animate-pulse`;
    }
    if (status.isSelected) {
      return `${baseClasses} bg-gray-700 border-gray-600 shadow-lg`;
    }
    if (status.isOwned) {
      return `${baseClasses} bg-gray-800 border-gray-700 hover:border-gray-600`;
    }
    if (status.isRecentlyPurchased) {
      return `${baseClasses} bg-gray-800 border-gray-700 animate-bounce`;
    }
    return `${baseClasses} bg-gray-900 border-gray-800 hover:border-gray-700 hover:bg-gray-800`;
  };

  const getSquareContent = (index: number) => {
    const status = getSquareStatus(index);
    const player = players[index];
    const profile = profiles[player || ""];

    if (status.isOwned) {
      return (
        <div className="flex flex-col items-center">
          <FarcasterAvatar 
            address={player as string} 
            size={32} 
            className="mb-1"
            disableClick={isReferee && gameState === "waiting for VAR"} 
          />
          {status.isWinningSquare && (
            <Trophy className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1" />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center">
        <span className="text-gray-600 text-xs">{index}</span>
        {status.isSelected && (
          <div className="absolute inset-0 bg-blue-500/20 rounded-lg animate-pulse" />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full mt-2">
      {/* Enhanced Header */}
      <div className="text-center mb-4 text-lightPurple">
        {showLabels ? (
          <p>
            Each square represents a possible scoreline, with{' '}
            <span className="text-notWhite font-semibold">{homeTeam}</span> score along the side and{' '}
            <span className="text-notWhite font-semibold">{awayTeam}</span> score along the top.
          </p>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-limeGreenOpacity" />
              <span>{ticketsSold}/25 tickets sold</span>
            </div>
            {isMatchLive && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400">LIVE</span>
              </div>
            )}
            {timeUntilMatch && !isMatchLive && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400">Starts in {timeUntilMatch}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: showLabels ? "auto repeat(5, 1fr)" : "repeat(5, 1fr)" }}>
        {/* Column Labels (Home Scores) */}
        {showLabels && <div></div>}
        {showLabels && columnLabels.map((label, i) => (
          <div key={`col-${i}`} className="text-center text-gray-400 font-semibold p-2">
            {label}
          </div>
        ))}

        {/* Grid with Row Labels */}
        {players.map((player, index) => { 
          const rowIndex = Math.floor(index / 5);
          const colIndex = index % 5;
          const status = getSquareStatus(index);
          
          return (
            <React.Fragment key={index}>
              {/* Row Labels (Away Scores) */}
              {colIndex === 0 && showLabels && (
                <div className="text-right text-gray-400 font-semibold flex items-center justify-end p-2">
                  <span>{rowLabels[rowIndex]}</span>
                </div>
              )}

              <button
                onClick={() => {
                  if (status.isOwned && !isReferee) return;
                  if (isReferee && gameState === "waiting for VAR") {
                    handleTapSquare(index);
                  } else {
                    handleSquareClick(index);
                  }
                }}
                onMouseEnter={() => setHoveredSquare(index)}
                onMouseLeave={() => setHoveredSquare(null)}
                disabled={status.isOwned && !isReferee}
                className={`relative ${getSquareClasses(index)} ${
                  status.isOwned && !isReferee ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                }`}
              >
                {getSquareContent(index)}
                
                {/* Hover tooltip */}
                {hoveredSquare === index && (
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {status.isOwned ? (
                      <div className="text-center">
                        <div className="font-semibold">{profiles[player || ""]?.username || "Unknown"}</div>
                        <div className="text-gray-300">Square {index}</div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="font-semibold">Available</div>
                        <div className="text-gray-300">Click to select</div>
                      </div>
                    )}
                  </div>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-900 border border-gray-800 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-700 border border-gray-600 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-800 border border-gray-700 rounded"></div>
          <span>Owned</span>
        </div>
        {ticketsSold >= 25 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-limeGreen border border-limeGreenOpacity rounded animate-pulse"></div>
            <span>Current Score</span>
          </div>
        )}
        {finalizedWinners.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-600 border border-green-400 rounded"></div>
            <span>Winner</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SquareGrid;
