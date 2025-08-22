import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { sdk } from '@farcaster/miniapp-sdk';

interface ScoreSquarePlayer {
  address: string;
  custodyAddress?: string;
  fid?: number;
  username?: string;
  displayName?: string;
  followerCount?: number;
  followingCount?: number;
  pfpUrl?: string;
  ticketsPurchased: number;
  gamesParticipated: number;
  gamesDeployed: number;
  points: number;
  hasFarcaster: boolean;
}

// Removed empty interface - no props needed

const ContestScoreSquare: React.FC = () => {
  const [players, setPlayers] = useState<ScoreSquarePlayer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserFid, setCurrentUserFid] = useState<number | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [isPrivilegedUser, setIsPrivilegedUser] = useState<boolean>(false);
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (1 day)

  // Privileged user FIDs
  const PRIVILEGED_FIDS = [4163, 420564];

  // Fetch current user's FID
  useEffect(() => {
    const fetchUserFid = async () => {
      try {
        await sdk.actions.ready();
        const context = await sdk.context;
        if (context?.user?.fid) {
          const fid = context.user.fid;
          setCurrentUserFid(fid);
          setIsPrivilegedUser(PRIVILEGED_FIDS.includes(fid));
        }
      } catch (err) {
        console.error('Error fetching user FID:', err);
      }
    };
    fetchUserFid();
  }, []);

  // Fetch ScoreSquare leaderboard data with caching
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const now = Date.now();
      
      // Check if we have cached data that's still valid
      const cachedData = localStorage.getItem('scoresquare-leaderboard');
      const cachedTimestamp = localStorage.getItem('scoresquare-leaderboard-timestamp');
      
      console.log('Cache check:', { 
        hasCachedData: !!cachedData, 
        hasTimestamp: !!cachedTimestamp,
        now,
        cachedTimestamp: cachedTimestamp ? parseInt(cachedTimestamp) : null,
        timeDiff: cachedTimestamp ? now - parseInt(cachedTimestamp) : null,
        cacheDuration: CACHE_DURATION,
        isExpired: cachedTimestamp ? (now - parseInt(cachedTimestamp) >= CACHE_DURATION) : true
      });
      
      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp);
        if (now - timestamp < CACHE_DURATION) {
          try {
            const parsedData = JSON.parse(cachedData);
            console.log('Using cached data, players count:', parsedData.length);
            setPlayers(parsedData);
            setLoading(false);
            return;
          } catch (err) {
            console.error('Error parsing cached data:', err);
          }
        } else {
          console.log('Cache expired, fetching fresh data');
        }
      } else {
        console.log('No cache found, fetching fresh data');
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/scoresquare-leaderboard');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Sort by points (descending) - total value of tickets purchased
        const sortedPlayers = data.allPlayers.sort((a: ScoreSquarePlayer, b: ScoreSquarePlayer) => (b.points || 0) - (a.points || 0));

        setPlayers(sortedPlayers);
        
        // Cache the data
        localStorage.setItem('scoresquare-leaderboard', JSON.stringify(sortedPlayers));
        localStorage.setItem('scoresquare-leaderboard-timestamp', now.toString());
        setLastFetch(now);
        
      } catch (err) {
        console.error('Error fetching ScoreSquare leaderboard:', err);
        setError('Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Removed unused handleRowClick function

  const handlePfpClick = async (player: ScoreSquarePlayer) => {
    if (!player.fid) return;
    
    try {
      await sdk.haptics.impactOccurred('light');
      // Open profile using URL instead of SDK method
      const profileUrl = `https://warpcast.com/${player.username || `user/${player.fid}`}`;
      await sdk.actions.openUrl(profileUrl);
    } catch (error) {
      console.error('Error opening profile:', error);
    }
  };

  const handleUsernameClick = async (player: ScoreSquarePlayer, rank: number) => {
    try {
      await sdk.haptics.impactOccurred('light');
      
      const message = `🎮 ${player.hasFarcaster ? player.displayName || player.username : `Anon (${player.address.slice(0, 8)}...)`} is ranked #${rank} on the ScoreSquare leaderboard with ${Math.round(((player.points || 0) * 1000))} points! 🏆`;
      
      await sdk.actions.composeCast({
        text: message,
        embeds: ['https://fc-footy.vercel.app/?tab=contests']
      });
    } catch (error) {
      console.error('Error composing cast:', error);
    }
  };

  const handleRefresh = () => {
    // Only privileged users can refresh
    if (!isPrivilegedUser) return;
    
    // Clear cache and refetch
    localStorage.removeItem('scoresquare-leaderboard');
    localStorage.removeItem('scoresquare-leaderboard-timestamp');
    setLastFetch(0);
    // Trigger refetch by updating state
    setPlayers([]);
    setLoading(true);
  };

  if (loading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center">
        <div className="text-center text-notWhite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-limeGreenOpacity mx-auto mb-2"></div>
          Loading ScoreSquare leaderboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center">
        <div className="text-center text-fontRed">
          <div className="mb-2">❌ {error}</div>
          {isPrivilegedUser && (
            <button 
              onClick={handleRefresh}
              className="px-4 py-2 bg-limeGreenOpacity text-darkPurple rounded-lg hover:bg-limeGreenOpacity/80 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with refresh info - only visible to privileged users */}
      {isPrivilegedUser && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-lightPurple">
            Last updated: {lastFetch ? new Date(lastFetch).toLocaleTimeString() : 'Never'}
          </div>
          <button 
            onClick={handleRefresh}
            className="text-xs text-limeGreenOpacity hover:text-limeGreenOpacity/80 transition-colors"
            title="Refresh data"
          >
            🔄 Refresh
          </button>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="w-full h-[500px] overflow-y-auto">
        <table className="w-full bg-darkPurple">
          <thead className="bg-darkPurple sticky top-0 z-10">
            <tr>
              <th className="h-12 px-1 border-b border-limeGreenOpacity text-notWhite text-center font-medium w-12">
                Rank
              </th>
              <th className="h-12 px-1 border-b border-limeGreenOpacity text-notWhite text-center font-medium w-16">
                Profile
              </th>
              <th className="h-12 px-1 border-b border-limeGreenOpacity text-notWhite text-left font-medium">
                Player
              </th>
              <th className="h-12 px-1 border-b border-limeGreenOpacity text-notWhite text-center font-medium w-16">
                Games
              </th>
              <th className="h-12 px-1 border-b border-limeGreenOpacity text-notWhite text-center font-medium w-20">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const isUserRow = currentUserFid && player.fid === currentUserFid;
              
              return (
                <tr
                  key={player.address}
                  className={`border-b border-limeGreenOpacity transition-colors text-lightPurple text-sm ${
                    isUserRow
                      ? 'bg-limeGreenOpacity/20 border-limeGreenOpacity/50 font-bold'
                      : 'hover:bg-purplePanel'
                  }`}
                >
                  <td className="py-2 px-1 text-center text-lightPurple font-bold">
                    {index + 1}
                  </td>
                  <td className="py-2 px-1 flex items-center justify-center">
                    <div 
                      onClick={() => handlePfpClick(player)}
                      className={`cursor-pointer ${player.fid ? 'hover:opacity-80 transition-opacity' : ''}`}
                      title={player.fid ? 'Tap to view profile' : ''}
                    >
                      {player.hasFarcaster && player.pfpUrl ? (
                        <Image
                          src={player.pfpUrl}
                          alt="Player Avatar"
                          className="rounded-full w-8 h-8"
                          width={32}
                          height={32}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/defifa_spinner.gif';
                          }}
                        />
                      ) : (
                        <Image
                          src="/defifa_spinner.gif"
                          alt="Default Avatar"
                          className="rounded-full w-8 h-8"
                          width={32}
                          height={32}
                        />
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-1 text-lightPurple font-medium text-left">
                    <div className="flex flex-col">
                      <div 
                        onClick={() => handleUsernameClick(player, index + 1)}
                        className="cursor-pointer hover:text-limeGreenOpacity transition-colors"
                        title="Tap to compose cast about this player"
                      >
                        <span className="font-semibold">
                          {player.hasFarcaster ? player.displayName || player.username : `Anon (${player.address.slice(0, 8)}...)`}
                        </span>
                        {player.hasFarcaster && player.followerCount && (
                          <span className="text-xs text-gray-400">
                            {player.followerCount.toLocaleString()} followers
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-1 text-center text-lightPurple">
                    {player.gamesParticipated}
                  </td>
                  <td className="py-2 px-1 text-center text-lightPurple">
                    {Math.round(((player.points || 0) * 1000))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {players.length === 0 && (
        <div className="text-center text-lightPurple py-8">
          No ScoreSquare players found.
        </div>
      )}
    </div>
  );
};

export default ContestScoreSquare;
